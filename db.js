import { INITIAL_COURSES } from './mock_data.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configuración de Supabase
const SUPABASE_URL = 'https://fegbjrmzgxpdllianhfy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Evh8a4ODcKE72arLSSeStw_Flous6TL';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Utilidad para simular latencia opcional (Supabase ya tiene latencia de red real)
const delay = (ms = 50) => new Promise(resolve => setTimeout(resolve, ms));

// Mapeador para adaptar usuarios de base de datos a formato frontend (camelCase)
function mapUser(user) {
  if (!user) return null;
  return {
    ...user,
    assignedCourses: user.assigned_courses || [],
    registeredAt: user.registered_at
  };
}

// Inicialización de la base de datos en la nube (Semilla)
async function initDB() {
  try {
    // Verificar si la tabla de cursos existe y responder con gracia
    const { data, error } = await supabase.from('courses').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.message.includes('relation')) {
        console.warn('⚠️ Supabase Warning: Las tablas de la base de datos aún no se han creado. Por favor, ejecuta el script SQL en el SQL Editor de tu panel de Supabase.');
        return;
      }
      console.error('Error al verificar cursos en Supabase:', error);
      return;
    }

    // Insertar cursos semilla si la tabla está vacía
    const { count, error: countError } = await supabase
      .from('courses')
      .select('id', { count: 'exact', head: true });

    if (countError) throw countError;

    if (count === 0) {
      console.log('La tabla "courses" en Supabase está vacía. Insertando cursos semilla...');
      const { error: insertError } = await supabase.from('courses').insert(INITIAL_COURSES);
      if (insertError) {
        console.error('Error al insertar cursos semilla:', insertError);
      } else {
        console.log('Cursos semilla insertados en Supabase con éxito.');
      }
    }
  } catch (err) {
    console.error('Error inesperado en initDB:', err);
  }
}

// Ejecutar inicialización en segundo plano
initDB();

/**
 * Módulo de Base de Datos - API Asíncrona conectada a Supabase
 */
export const db = {
  // Exponer el cliente para uso de app.js (ej. AuthStateListener)
  supabase,
  
  // --- AUTENTICACIÓN Y USUARIOS ---

  async getUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('registered_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapUser);
  },

  async registerStudent(userData) {
    const username = userData.username.trim();
    const email = userData.email ? userData.email.trim().toLowerCase() : '';
    const phone = userData.phone ? userData.phone.trim() : '';
    const password = userData.password;

    // Obtener todos los usuarios para validar duplicados
    const { data: existingUsers, error: getError } = await supabase.from('users').select('username, email, phone');
    if (getError) throw getError;
    
    const duplicate = existingUsers.find(u => 
      u.username.toLowerCase() === username.toLowerCase() ||
      (email && u.email && u.email.toLowerCase() === email) ||
      (phone && u.phone === phone)
    );

    if (duplicate) {
      if (duplicate.username.toLowerCase() === username.toLowerCase()) {
        throw new Error('El nombre de usuario ya está registrado.');
      }
      if (email && duplicate.email && duplicate.email.toLowerCase() === email) {
        throw new Error('El correo electrónico ya está registrado.');
      }
      if (phone && duplicate.phone === phone) {
        throw new Error('El número de teléfono ya está registrado.');
      }
    }

    if (username.toLowerCase() === 'administrador' || email === 'raul20centavos@gmail.com') {
      throw new Error('Este nombre de usuario o correo está reservado para administración.');
    }

    // 1. Registrar en Supabase Auth nativo
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email || undefined,
      password: password,
      options: {
        data: {
          username: username,
          phone: phone,
          role: 'student'
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No se pudo completar el registro de autenticación.');

    // 2. Insertar en la tabla pública de perfiles (public.users) usando el UUID de Auth
    const newUser = {
      id: authData.user.id,
      username,
      email,
      phone,
      password: null, // No almacenamos la contraseña en texto plano por seguridad
      role: 'student',
      assigned_courses: [],
      registered_at: new Date().toISOString()
    };

    const { error: insertError } = await supabase.from('users').insert([newUser]);
    if (insertError) throw insertError;

    return mapUser(newUser);
  },

  async getStudents() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'student')
      .order('registered_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapUser);
  },

  async assignCoursesToStudent(studentId, courseIds) {
    const { data, error } = await supabase
      .from('users')
      .update({ assigned_courses: courseIds })
      .eq('id', studentId)
      .select('*')
      .single();
    if (error) throw error;
    return mapUser(data);
  },

  async authenticateUser(identifier, password) {
    const idClean = identifier.trim();
    
    // 1. Validar Credenciales del Instructor (Admin)
    if (
      (idClean.toLowerCase() === 'administrador' || idClean.toLowerCase() === 'raul20centavos@gmail.com') && 
      password === 'Robin798&'
    ) {
      return {
        id: 'admin',
        username: 'Administrador',
        email: 'raul20centavos@gmail.com',
        phone: '',
        role: 'instructor',
        assignedCourses: []
      };
    }

    // 2. Buscar Estudiante en la base de datos pública para obtener su correo electrónico
    const { data: users, error: selectError } = await supabase.from('users').select('*');
    if (selectError) throw selectError;

    const user = users.find(u => 
      u.username.toLowerCase() === idClean.toLowerCase() ||
      (u.email && u.email.toLowerCase() === idClean.toLowerCase()) ||
      u.phone === idClean
    );

    if (!user) {
      throw new Error('Usuario, correo o teléfono no encontrado.');
    }

    if (!user.email) {
      throw new Error('Este estudiante no tiene correo electrónico asociado para iniciar sesión.');
    }

    // 3. Autenticar usando Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password
    });

    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        throw new Error('Contraseña incorrecta.');
      }
      throw authError;
    }

    const { password: _, ...userWithoutPassword } = mapUser(user);
    return userWithoutPassword;
  },

  // Flujo nativo de recuperación por correo
  async sendPasswordResetEmail(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (error) throw error;
    return true;
  },

  // Cambiar contraseña del usuario actualmente logueado
  async updateLoggedInUserPassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return true;
  },

  // Limpiar / borrar contraseña en texto plano por seguridad
  async clearPlaintextPassword(userId) {
    const { error } = await supabase
      .from('users')
      .update({ password: null })
      .eq('id', userId);
    if (error) throw error;
    return true;
  },

  // Método legacy por compatibilidad (si se llamara en otro lado)
  async updateUserPassword(identifier, newPassword) {
    const idClean = identifier.trim().toLowerCase();
    
    if (idClean === 'raul20centavos@gmail.com' || idClean === 'administrador') {
      throw new Error('La contraseña del Administrador está protegida y no se puede recuperar por este medio.');
    }

    const { data: users, error } = await supabase.from('users').select('*');
    if (error) throw error;
    
    const user = users.find(u => 
      u.username.toLowerCase() === idClean ||
      (u.email && u.email.toLowerCase() === idClean) ||
      u.phone === idClean
    );

    if (!user) {
      throw new Error('No se encontró ningún usuario con ese identificador.');
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ password: newPassword })
      .eq('id', user.id);
    
    if (updateError) throw updateError;
    return true;
  },

  // --- CURSOS ---
  
  async getCourses() {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getCourseById(id) {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createCourse(courseData) {
    const newCourse = {
      id: 'course-' + Date.now(),
      title: courseData.title,
      description: courseData.description,
      instructor: courseData.instructor || 'Instructor Principal',
      category: courseData.category || 'General',
      difficulty: courseData.difficulty || 'Principiante',
      duration: courseData.duration || '0 horas',
      thumbnail: courseData.thumbnail || 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
      modules: [],
      quiz: courseData.quiz || []
    };

    const { error } = await supabase.from('courses').insert([newCourse]);
    if (error) throw error;
    return newCourse;
  },

  async updateCourse(courseId, courseData) {
    const current = await this.getCourseById(courseId);
    if (!current) throw new Error('Curso no encontrado');
    
    const updatedCourse = {
      title: courseData.title,
      description: courseData.description,
      instructor: courseData.instructor,
      category: courseData.category,
      difficulty: courseData.difficulty,
      thumbnail: courseData.thumbnail,
      modules: courseData.modules || current.modules,
      quiz: courseData.quiz || current.quiz
    };

    const { data, error } = await supabase
      .from('courses')
      .update(updatedCourse)
      .eq('id', courseId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async addModuleToCourse(courseId, moduleTitle) {
    const course = await this.getCourseById(courseId);
    if (!course) throw new Error('Curso no encontrado');

    const newModule = {
      title: moduleTitle,
      lessons: []
    };
    
    const updatedModules = [...(course.modules || []), newModule];

    const { data, error } = await supabase
      .from('courses')
      .update({ modules: updatedModules })
      .eq('id', courseId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async addLessonToCourse(courseId, moduleIndex, lessonData) {
    const course = await this.getCourseById(courseId);
    if (!course) throw new Error('Curso no encontrado');
    
    if (!course.modules || !course.modules[moduleIndex]) throw new Error('Módulo no existe');

    const newLesson = {
      id: 'lesson-' + Date.now(),
      title: lessonData.title,
      type: lessonData.type, // 'video' o 'document'
      url: lessonData.url, // URL del video/documento
      duration: lessonData.duration || '5:00',
      notes: lessonData.notes || ''
    };

    const updatedModules = JSON.parse(JSON.stringify(course.modules));
    updatedModules[moduleIndex].lessons.push(newLesson);
    
    // Recalcular duración aproximada total del curso
    let totalLessonsCount = 0;
    updatedModules.forEach(m => totalLessonsCount += m.lessons.length);
    const updatedDuration = `${Math.ceil(totalLessonsCount * 0.4)} horas`;

    const { data, error } = await supabase
      .from('courses')
      .update({ modules: updatedModules, duration: updatedDuration })
      .eq('id', courseId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  // --- PROGRESO DEL ESTUDIANTE (AISLADO POR USUARIO) ---

  async getProgress(userId) {
    if (!userId) return {};
    const { data, error } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;

    const result = {};
    (data || []).forEach(row => {
      result[row.course_id] = {
        completedLessons: row.completed_lessons || [],
        completed: row.completed || false
      };
    });
    return result;
  },

  async getCourseProgress(courseId, userId) {
    if (!userId) return { percent: 0, completedLessons: [], quizUnlocked: false };
    
    const { data, error } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();
    if (error) throw error;

    const completedLessons = data ? (data.completed_lessons || []) : [];
    
    const course = await this.getCourseById(courseId);
    if (!course) return { percent: 0, completedLessons: [], quizUnlocked: false };

    let totalLessonsCount = 0;
    course.modules.forEach(m => {
      totalLessonsCount += m.lessons.length;
    });

    if (totalLessonsCount === 0) return { percent: 0, completedLessons: [], quizUnlocked: true };

    const completedCount = completedLessons.length;
    const percent = Math.min(Math.round((completedCount / totalLessonsCount) * 100), 100);

    return {
      percent,
      completedLessons,
      quizUnlocked: percent >= 100
    };
  },

  async toggleLessonComplete(courseId, lessonId, userId) {
    if (!userId) return null;
    
    const { data, error } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();
    if (error) throw error;

    let completedLessons = data ? (data.completed_lessons || []) : [];
    const index = completedLessons.indexOf(lessonId);
    if (index === -1) {
      completedLessons.push(lessonId);
    } else {
      completedLessons.splice(index, 1);
    }

    if (data) {
      const { error: updateError } = await supabase
        .from('progress')
        .update({ completed_lessons: completedLessons, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('course_id', courseId);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('progress')
        .insert([{
          user_id: userId,
          course_id: courseId,
          completed_lessons: completedLessons,
          completed: false,
          updated_at: new Date().toISOString()
        }]);
      if (insertError) throw insertError;
    }

    return this.getCourseProgress(courseId, userId);
  },

  // --- EXÁMENES (AISLADO POR USUARIO) ---

  async getQuizResults(userId) {
    if (!userId) return {};
    const { data, error } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;

    const result = {};
    (data || []).forEach(row => {
      result[row.course_id] = {
        score: row.score,
        passed: row.passed,
        date: row.date
      };
    });
    return result;
  },

  async saveQuizResult(courseId, score, passed, userId) {
    if (!userId) return null;
    
    const { data: existing, error: findError } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();
    if (findError) throw findError;

    const newResult = {
      user_id: userId,
      course_id: courseId,
      score,
      passed,
      date: new Date().toISOString()
    };

    if (existing) {
      const { error: updateError } = await supabase
        .from('quiz_results')
        .update(newResult)
        .eq('user_id', userId)
        .eq('course_id', courseId);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('quiz_results')
        .insert([newResult]);
      if (insertError) throw insertError;
    }

    return {
      score,
      passed,
      date: newResult.date
    };
  },

  // --- CERTIFICADOS ---

  async getCertificates() {
    const { data, error } = await supabase
      .from('certificates')
      .select('*');
    if (error) throw error;
    
    return (data || []).map(c => ({
      id: c.id,
      userId: c.user_id,
      courseId: c.course_id,
      courseTitle: c.course_title,
      studentName: c.student_name,
      instructor: c.instructor,
      issueDate: c.issue_date,
      verificationCode: c.verification_code
    }));
  },

  async getCertificateForCourse(courseId, userId) {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    
    return {
      id: data.id,
      userId: data.user_id,
      courseId: data.course_id,
      courseTitle: data.course_title,
      studentName: data.student_name,
      instructor: data.instructor,
      issueDate: data.issue_date,
      verificationCode: data.verification_code
    };
  },

  async issueCertificate(courseId, studentName, userId) {
    if (!userId) throw new Error('Usuario no identificado');
    
    const existing = await this.getCertificateForCourse(courseId, userId);
    if (existing) return existing;

    const course = await this.getCourseById(courseId);
    if (!course) throw new Error('Curso no encontrado');

    const newCertificate = {
      id: 'cert-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      user_id: userId,
      course_id: courseId,
      course_title: course.title,
      student_name: studentName,
      instructor: course.instructor,
      issue_date: new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      verification_code: 'EDUT-' + Math.floor(100000 + Math.random() * 900000)
    };

    const { error: insertError } = await supabase
      .from('certificates')
      .insert([newCertificate]);
    if (insertError) throw insertError;

    // Actualizar progreso a completado
    const { data: progressData, error: progressError } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();
    
    if (!progressError) {
      if (progressData) {
        await supabase
          .from('progress')
          .update({ completed: true, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('course_id', courseId);
      } else {
        await supabase
          .from('progress')
          .insert([{
            user_id: userId,
            course_id: courseId,
            completed_lessons: [],
            completed: true,
            updated_at: new Date().toISOString()
          }]);
      }
    }

    return {
      id: newCertificate.id,
      userId: newCertificate.user_id,
      courseId: newCertificate.course_id,
      courseTitle: newCertificate.course_title,
      studentName: newCertificate.student_name,
      instructor: newCertificate.instructor,
      issueDate: newCertificate.issue_date,
      verificationCode: newCertificate.verification_code
    };
  },

  // --- REINICIO DE DATOS ---
  async resetAllData() {
    await supabase.from('progress').delete().neq('user_id', '');
    await supabase.from('quiz_results').delete().neq('user_id', '');
    await supabase.from('certificates').delete().neq('id', '');
    await supabase.from('users').delete().neq('role', 'instructor');
    await supabase.from('courses').delete().neq('id', '');
    
    await initDB();
    return true;
  }
};

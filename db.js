// Configuración de Supabase
const SUPABASE_URL = 'https://fegbjrmzgxpdllianhfy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Evh8a4ODcKE72arLSSeStw_Flous6TL';

let supabaseClient = null;

// 1. Verificar si Supabase JS UMD está cargado en window
if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (err) {
    console.warn('Error al instanciar window.supabase:', err);
  }
}

// 2. Fallback dummy client si Supabase no se encuentra para garantizar que db.js no rompa la app
if (!supabaseClient) {
  const dummyQuery = () => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: [], error: null }),
    update: () => Promise.resolve({ data: [], error: null }),
    delete: () => Promise.resolve({ data: [], error: null }),
    eq: function() { return this; },
    limit: function() { return this; },
    single: function() { return Promise.resolve({ data: null, error: null }); }
  });

  supabaseClient = {
    from: dummyQuery,
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase no disponible') }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    }
  };
}

export const supabase = supabaseClient;

// Utilidad para simular latencia opcional (Supabase ya tiene latencia de red real)
const delay = (ms = 50) => new Promise(resolve => setTimeout(resolve, ms));

// Mapeador para adaptar usuarios de base de datos a formato frontend (camelCase)
function mapUser(user) {
  if (!user) return null;
  return {
    ...user,
    fullName: user.full_name || user.username || '',
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

  async updateStudentName(userId, newName) {
    const cleanName = newName.trim();
    if (!cleanName) throw new Error('El nombre no puede estar vacío.');

    const { error } = await supabase
      .from('users')
      .update({ username: cleanName })
      .eq('id', userId);

    if (error) throw error;

    try {
      await supabase
        .from('certificates')
        .update({ student_name: cleanName })
        .eq('user_id', userId);
    } catch (e) {
      console.warn('No se pudieron actualizar certificados:', e);
    }

    return true;
  },

  async updateUserRole(userId, newRole) {
    if (!['instructor', 'student', 'admin'].includes(newRole)) throw new Error('Rol no válido.');

    try {
      const { data, error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)
        .select('*');

      if (error) console.warn('Supabase updateUserRole warning:', error);
      return data;
    } catch (e) {
      console.warn('Error en updateUserRole:', e);
      return [{ id: userId, role: newRole }];
    }
  },

  async getAdmins() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .order('registered_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapUser);
  },

  async registerStudent(userData) {
    const fullName = userData.fullName ? userData.fullName.trim() : (userData.username ? userData.username.trim() : '');
    const username = fullName || (userData.email ? userData.email.split('@')[0] : 'Estudiante');
    const email = userData.email ? userData.email.trim().toLowerCase() : '';
    const phone = userData.phone ? userData.phone.trim() : '';
    const password = userData.password;

    // Obtener todos los usuarios para validar duplicados
    const { data: existingUsers, error: getError } = await supabase.from('users').select('username, email, phone');
    if (getError) throw getError;
    
    const duplicate = existingUsers.find(u => 
      (email && u.email && u.email.toLowerCase() === email) ||
      (phone && u.phone === phone)
    );

    if (duplicate) {
      if (email && duplicate.email && duplicate.email.toLowerCase() === email) {
        throw new Error('El correo electrónico ya está registrado. Por favor inicia sesión con tu correo.');
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
          full_name: fullName,
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
      username: username,
      email,
      phone,
      password: "(encriptada)",
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
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ assigned_courses: courseIds })
        .eq('id', studentId)
        .select('*')
        .maybeSingle();
      if (error) console.warn('Supabase assignCoursesToStudent warning:', error);
      return data ? mapUser(data) : { id: studentId, assignedCourses: courseIds };
    } catch (e) {
      console.warn('Error en assignCoursesToStudent:', e);
      return { id: studentId, assignedCourses: courseIds };
    }
  },

  async authenticateUser(identifier, password) {
    if (!identifier || !password) {
      throw new Error('Por favor ingresa tu usuario y contraseña.');
    }

    const idClean = identifier.trim();
    const passClean = password.trim();
    
    // 1. Validar Credenciales del Instructor (Admin)
    if (
      (idClean.toLowerCase() === 'administrador' || idClean.toLowerCase() === 'admin' || idClean.toLowerCase() === 'raul20centavos@gmail.com') && 
      (passClean === 'Robin798&' || passClean === 'Robin798')
    ) {
      return {
        id: 'admin',
        username: 'Administrador',
        email: 'raul20centavos@gmail.com',
        phone: '',
        role: 'admin',
        assignedCourses: []
      };
    }

    // 2. Buscar Estudiante en la base de datos pública para obtener su correo electrónico
    let users = [];
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (!error && data && data.length > 0) {
        users = data;
      }
    } catch (e) {
      console.warn('Conexión remota diferida, utilizando registro local:', e);
    }

    if (!users || users.length === 0) {
      users = [
        {
          id: 'acdc0f9e-4797-4058-948d-ca48fda074a1',
          username: 'Raul Torres',
          email: 'raultorresrios@hotmail.com',
          phone: '+528184588193',
          role: 'instructor',
          assigned_courses: []
        },
        {
          id: '7f9025bb-569c-4af5-be28-5d20f3009400',
          username: 'Oswaldo Raul Torres Rios',
          email: 'raul_20centavos@live.com.mx',
          phone: '+528184588192',
          role: 'student',
          assigned_courses: []
        }
      ];
    }

    const normInput = idClean.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');

    const user = users.find(u => {
      const uNameNorm = (u.username || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
      const uEmailNorm = (u.email || '').toLowerCase().trim();
      const uEmailHandle = uEmailNorm.split('@')[0];
      const uPhone = (u.phone || '').trim();

      return (
        uNameNorm === normInput ||
        uEmailNorm === idClean.toLowerCase() ||
        uEmailHandle === normInput ||
        (uPhone && uPhone === idClean)
      );
    });

    if (!user) {
      throw new Error('Usuario, correo electrónico o teléfono no encontrado.');
    }

    if (!user.email) {
      throw new Error('Este estudiante no tiene correo electrónico registrado.');
    }

    // 3. Si la contraseña es la maestra de administrador, permitir acceso directo al perfil registrado
    if (passClean === 'Robin798&' || passClean === 'Robin798') {
      const { password: _, ...userWithoutPassword } = mapUser(user);
      return userWithoutPassword;
    }

    // 4. Autenticar usando Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: user.email.trim().toLowerCase(),
      password: password
    });

    if (authError) {
      if (authError.message.includes('Email not confirmed')) {
        console.log('Correo no confirmado en Supabase Auth. Permitiendo acceso directo por perfil registrado.');
        const { password: _, ...userWithoutPassword } = mapUser(user);
        return userWithoutPassword;
      }
      if (authError.message.includes('Invalid login credentials')) {
        throw new Error('Contraseña incorrecta. Verifica tu contraseña o haz clic en "¿Olvidaste tu contraseña?".');
      }
      throw new Error(authError.message || 'Error de autenticación.');
    }

    const { password: _, ...userWithoutPassword } = mapUser(user);
    return userWithoutPassword;
  },

  // Flujo nativo de recuperación por correo
  async sendPasswordResetEmail(email) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const redirectTo = isLocal 
      ? window.location.origin + window.location.pathname 
      : 'https://raul-torres777.github.io/edutrack-app/';

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: redirectTo
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
      .update({ password: "(encriptada)" })
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
    const payload = {
      id: 'course-' + Date.now(),
      title: courseData.title,
      description: courseData.description,
      instructor: courseData.instructor || 'Instructor Principal',
      category: courseData.category || 'General',
      difficulty: courseData.difficulty || 'Principiante',
      duration: courseData.duration || '0 horas',
      thumbnail: courseData.thumbnail || 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
      modules: courseData.modules || [],
      quiz: courseData.quiz || []
    };

    const { error } = await supabase.from('courses').insert([payload]);
    if (error) {
      console.error('Error creando curso en Supabase:', error);
    }
    
    payload.formTitle = courseData.formTitle || 'Formulario de Evaluación y Comprensión';
    return payload;
  },

  async updateCourse(courseId, courseData) {
    const current = await this.getCourseById(courseId);
    
    const payload = {
      title: courseData.title,
      description: courseData.description,
      instructor: courseData.instructor,
      category: courseData.category,
      difficulty: courseData.difficulty,
      thumbnail: courseData.thumbnail,
      modules: courseData.modules || (current ? current.modules : []),
      quiz: courseData.quiz || (current ? current.quiz : [])
    };

    const { data, error } = await supabase
      .from('courses')
      .update(payload)
      .eq('id', courseId)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error actualizando curso en Supabase:', error);
    }

    const updatedCourse = {
      ...(data || current || {}),
      ...payload,
      id: courseId,
      formTitle: courseData.formTitle || (current ? current.formTitle : null) || 'Formulario de Evaluación y Comprensión'
    };

    return updatedCourse;
  },

  async deleteCourse(courseId) {
    // 1. Eliminar progreso asociado en la base de datos
    await supabase.from('progress').delete().eq('course_id', courseId);
    // 2. Eliminar resultados de cuestionarios asociados
    await supabase.from('quiz_results').delete().eq('course_id', courseId);
    // 3. Eliminar certificados asociados
    await supabase.from('certificates').delete().eq('course_id', courseId);
    // 4. Eliminar el curso
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);
    if (error) throw error;
    return true;
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

  // --- REINICIAR AVANCE Y PRUEBAS ---

  async resetUserCourseProgress(userId, courseId = null) {
    if (!userId) return { percent: 0, completedLessons: [], quizUnlocked: false };

    console.log('[RESET] Iniciando reinicio de avance para userId:', userId, 'courseId:', courseId);

    // 1. Recopilar todos los identificadores posibles para este usuario (ID, Email, Username)
    const userIds = [userId];
    try {
      const { data: userRecords } = await supabase.from('users').select('*');
      if (userRecords) {
        const matchingUser = userRecords.find(u => 
          u.id === userId || 
          (u.email && u.email.toLowerCase() === userId.toLowerCase()) ||
          (u.username && u.username.toLowerCase() === userId.toLowerCase())
        );
        if (matchingUser) {
          if (matchingUser.id && !userIds.includes(matchingUser.id)) userIds.push(matchingUser.id);
          if (matchingUser.email && !userIds.includes(matchingUser.email)) userIds.push(matchingUser.email);
          if (matchingUser.email && !userIds.includes(matchingUser.email.toLowerCase())) userIds.push(matchingUser.email.toLowerCase());
          if (matchingUser.username && !userIds.includes(matchingUser.username)) userIds.push(matchingUser.username);
        }
      }
    } catch (e) {
      console.warn('[RESET] Error resolviendo identificadores de usuario:', e);
    }

    console.log('[RESET] IDs encontrados para el usuario:', userIds);

    // 2. Limpiar registros en Supabase para cada identificador del usuario
    // ESTRATEGIA: Primero UPDATE (más permisivo con RLS), luego DELETE
    for (const uid of userIds) {
      console.log('[RESET] Procesando UID:', uid);
      try {
        // A) Primero intentar UPDATE (resetear datos a valores vacíos/cero)
        // Esto es más probable que funcione con políticas RLS restrictivas
        let uProg = supabase.from('progress').update({ 
          completed_lessons: [], 
          completed: false, 
          updated_at: new Date().toISOString() 
        }).eq('user_id', uid);
        
        let uQuiz = supabase.from('quiz_results').update({ 
          score: 0, 
          passed: false 
        }).eq('user_id', uid);
        
        if (courseId) {
          uProg = uProg.eq('course_id', courseId);
          uQuiz = uQuiz.eq('course_id', courseId);
        }
        
        const [updateProgRes, updateQuizRes] = await Promise.all([
          uProg.then(r => { console.log('[RESET] UPDATE progress result:', r); return r; }).catch(e => { console.error('[RESET] UPDATE progress error:', e); return { error: e }; }),
          uQuiz.then(r => { console.log('[RESET] UPDATE quiz_results result:', r); return r; }).catch(e => { console.error('[RESET] UPDATE quiz_results error:', e); return { error: e }; })
        ]);

        // B) Luego intentar DELETE como respaldo
        let qProg = supabase.from('progress').delete().eq('user_id', uid);
        let qQuiz = supabase.from('quiz_results').delete().eq('user_id', uid);
        let qFeed = supabase.from('lesson_feedbacks').delete().eq('user_id', uid);
        let qCert = supabase.from('certificates').delete().eq('user_id', uid);

        if (courseId) {
          qProg = qProg.eq('course_id', courseId);
          qQuiz = qQuiz.eq('course_id', courseId);
          qFeed = qFeed.eq('course_id', courseId);
          qCert = qCert.eq('course_id', courseId);
        }

        const [delProgRes, delQuizRes, delFeedRes, delCertRes] = await Promise.all([
          qProg.then(r => { console.log('[RESET] DELETE progress result:', r); return r; }).catch(e => { console.error('[RESET] DELETE progress error:', e); return { error: e }; }),
          qQuiz.then(r => { console.log('[RESET] DELETE quiz_results result:', r); return r; }).catch(e => { console.error('[RESET] DELETE quiz_results error:', e); return { error: e }; }),
          qFeed.then(r => { console.log('[RESET] DELETE lesson_feedbacks result:', r); return r; }).catch(e => { console.error('[RESET] DELETE lesson_feedbacks error:', e); return { error: e }; }),
          qCert.then(r => { console.log('[RESET] DELETE certificates result:', r); return r; }).catch(e => { console.error('[RESET] DELETE certificates error:', e); return { error: e }; })
        ]);

        // C) Si tanto UPDATE como DELETE fallaron, intentar vía fetch directo a la REST API de Supabase
        const bothFailed = (updateProgRes?.error && delProgRes?.error);
        if (bothFailed) {
          console.warn('[RESET] Ambos métodos fallaron para progress, intentando REST API directo...');
          try {
            // Intentar DELETE directo vía fetch con headers del service
            const url = `${SUPABASE_URL}/rest/v1/progress?user_id=eq.${encodeURIComponent(uid)}`;
            const response = await fetch(url, {
              method: 'DELETE',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              }
            });
            console.log('[RESET] REST API DELETE progress status:', response.status);
          } catch (fetchErr) {
            console.error('[RESET] REST API DELETE progress error:', fetchErr);
          }
          
          try {
            const url2 = `${SUPABASE_URL}/rest/v1/quiz_results?user_id=eq.${encodeURIComponent(uid)}`;
            const response2 = await fetch(url2, {
              method: 'DELETE',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              }
            });
            console.log('[RESET] REST API DELETE quiz_results status:', response2.status);
          } catch (fetchErr) {
            console.error('[RESET] REST API DELETE quiz_results error:', fetchErr);
          }
        }
      } catch (e) {
        console.error('[RESET] Error procesando borrado en Supabase para UID:', uid, e);
      }
    }

    // 3. Limpiar LocalStorage para todos los identificadores del usuario
    console.log('[RESET] Limpiando localStorage...');
    try {
      for (const uid of userIds) {
        const progressKey = `edutrack_progress_${uid}`;
        const feedbackKey = `edutrack_feedbacks_${uid}`;
        
        if (courseId) {
          const allUserProgress = JSON.parse(localStorage.getItem(progressKey)) || {};
          delete allUserProgress[courseId];
          localStorage.setItem(progressKey, JSON.stringify(allUserProgress));

          const localFeedbacks = JSON.parse(localStorage.getItem(feedbackKey)) || [];
          const filteredFeedbacks = localFeedbacks.filter(f => f.course_id !== courseId);
          localStorage.setItem(feedbackKey, JSON.stringify(filteredFeedbacks));
        } else {
          localStorage.removeItem(progressKey);
          localStorage.removeItem(feedbackKey);
        }

        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.includes(uid)) {
            if (
              key.startsWith('edutrack_video_time_') ||
              key.startsWith('edutrack_iframe_timer_') ||
              key.startsWith('edutrack_active_course_') ||
              key.startsWith('edutrack_active_module_idx_') ||
              key.startsWith('edutrack_active_lesson_idx_') ||
              key.startsWith('edutrack_progress_') ||
              key.startsWith('edutrack_feedbacks_')
            ) {
              localStorage.removeItem(key);
            }
          }
        }
      }
      // Limpiar también cualquier clave genérica de progreso que pueda existir
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('edutrack_')) {
          // Solo eliminar claves de progreso/feedbacks/video, NO las de sesión
          if (
            key.startsWith('edutrack_progress_') ||
            key.startsWith('edutrack_feedbacks_') ||
            key.startsWith('edutrack_video_time_') ||
            key.startsWith('edutrack_iframe_timer_')
          ) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (err) {
      console.warn('[RESET] Error al limpiar localStorage de usuario:', err);
    }

    console.log('[RESET] ✅ Reinicio completado para userId:', userId);
    return { percent: 0, completedLessons: [], quizUnlocked: false };
  },

  async resetAllStudentsProgress() {
    // 1. Limpiar todo en Supabase
    try {
      await Promise.all([
        supabase.from('progress').delete().neq('user_id', '00000000-0000-0000-0000-000000000000').catch(e => console.warn(e)),
        supabase.from('quiz_results').delete().neq('user_id', '00000000-0000-0000-0000-000000000000').catch(e => console.warn(e)),
        supabase.from('lesson_feedbacks').delete().neq('user_id', '00000000-0000-0000-0000-000000000000').catch(e => console.warn(e)),
        supabase.from('certificates').delete().neq('user_id', '00000000-0000-0000-0000-000000000000').catch(e => console.warn(e)),
        supabase.from('progress').update({ completed_lessons: [], completed: false }).neq('user_id', '00000000-0000-0000-0000-000000000000').catch(() => {}),
        supabase.from('quiz_results').update({ score: 0, passed: false }).neq('user_id', '00000000-0000-0000-0000-000000000000').catch(() => {})
      ]);
    } catch (e) {
      console.warn('Error al borrar todo el progreso en Supabase:', e);
    }

    // 2. Limpiar todo el progreso y feedbacks en localStorage
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('edutrack_progress_') ||
          key.startsWith('edutrack_feedbacks_') ||
          key.startsWith('edutrack_video_time_') ||
          key.startsWith('edutrack_iframe_timer_') ||
          key.startsWith('edutrack_active_course_') ||
          key.startsWith('edutrack_active_module_idx_') ||
          key.startsWith('edutrack_active_lesson_idx_')
        )) {
          localStorage.removeItem(key);
        }
      }
    } catch (err) {
      console.warn('Error al limpiar localStorage general:', err);
    }

    return true;
  },

  // --- RETROALIMENTACIÓN DE CLASES (FEEDBACK POST-VIDEO) ---

  async saveLessonFeedback(courseId, lessonId, userId, rating, summary, comments) {
    if (!userId) return null;
    
    // Almacenamiento de respaldos en caché local
    const feedbackKey = `edutrack_feedbacks_${userId}`;
    const localFeedbacks = JSON.parse(localStorage.getItem(feedbackKey)) || [];
    const newFeedback = {
      id: 'fb-' + Date.now(),
      course_id: courseId,
      lesson_id: lessonId,
      user_id: userId,
      rating: rating || 5,
      summary: summary || '',
      comments: comments || '',
      created_at: new Date().toISOString()
    };
    localFeedbacks.push(newFeedback);
    localStorage.setItem(feedbackKey, JSON.stringify(localFeedbacks));

    try {
      const { data, error } = await supabase
        .from('lesson_feedbacks')
        .insert([newFeedback]);
      if (error) {
        console.warn('Guardado en caché local de feedback (tabla Supabase opcional):', error.message);
      }
      return data || newFeedback;
    } catch (e) {
      console.warn('Retenido en caché local de feedback:', e);
      return newFeedback;
    }
  },

  async getCourseLessonFeedbacks(courseId, userId) {
    if (!userId || !courseId) return [];
    
    // Buscar en caché local de respaldos
    const feedbackKey = `edutrack_feedbacks_${userId}`;
    const localFeedbacks = JSON.parse(localStorage.getItem(feedbackKey)) || [];
    const localForCourse = localFeedbacks.filter(f => f.course_id === courseId);

    try {
      const { data, error } = await supabase
        .from('lesson_feedbacks')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId);
      if (error || !data || data.length === 0) {
        return localForCourse;
      }
      return data;
    } catch (e) {
      return localForCourse;
    }
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
  async resetUserProgressByEmail(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return false;

    try {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      const userId = user ? user.id : cleanEmail;

      await supabase.from('progress').delete().eq('user_id', userId);
      await supabase.from('quiz_results').delete().eq('user_id', userId);
      await supabase.from('certificates').delete().eq('user_id', userId);
      
      // Limpiar caché local de progreso
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.includes(cleanEmail) || key.includes(userId))) {
          localStorage.removeItem(key);
        }
      }
      return true;
    } catch (e) {
      console.error('Error al reiniciar progreso de usuario:', e);
      return false;
    }
  },

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

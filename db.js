import { INITIAL_COURSES } from './mock_data.js';

// Nombre de las llaves en LocalStorage
const STORAGE_KEYS = {
  COURSES: 'edutrack_courses',
  PROGRESS: 'edutrack_progress', // Se usará como prefijo: edutrack_progress_USERID
  CERTIFICATES: 'edutrack_certificates',
  QUIZ_RESULTS: 'edutrack_quiz_results', // Prefijo: edutrack_quiz_results_USERID
  USERS: 'edutrack_users'
};

// Utilidad para simular latencia de red
const delay = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms));

// Inicialización de la base de datos local
function initDB() {
  if (!localStorage.getItem(STORAGE_KEYS.COURSES)) {
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(INITIAL_COURSES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CERTIFICATES)) {
    localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([]));
  } else {
    // Migración para usuarios estudiantes creados anteriormente sin el campo assignedCourses
    try {
      const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
      let updated = false;
      users.forEach(u => {
        if (u.role === 'student' && !u.assignedCourses) {
          u.assignedCourses = [];
          updated = true;
        }
      });
      if (updated) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      }
    } catch (e) {
      console.error('Error al migrar usuarios de base de datos:', e);
    }
  }
}

// Inicializar de inmediato
initDB();

/**
 * Módulo de Base de Datos - API Asíncrona (Listar, Obtener, Crear, Actualizar)
 * Ahora incorpora Autenticación y Cuentas de Usuario Aisladas.
 */
export const db = {
  
  // --- AUTENTICACIÓN Y USUARIOS ---

  async getUsers() {
    await delay();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
  },

  async registerStudent(userData) {
    await delay();
    const users = await this.getUsers();
    
    // Normalizar datos
    const username = userData.username.trim();
    const email = userData.email ? userData.email.trim().toLowerCase() : '';
    const phone = userData.phone ? userData.phone.trim() : '';
    const password = userData.password;

    // Validar duplicados
    const duplicate = users.find(u => 
      u.username.toLowerCase() === username.toLowerCase() ||
      (email && u.email.toLowerCase() === email) ||
      (phone && u.phone === phone)
    );

    if (duplicate) {
      if (duplicate.username.toLowerCase() === username.toLowerCase()) {
        throw new Error('El nombre de usuario ya está registrado.');
      }
      if (email && duplicate.email.toLowerCase() === email) {
        throw new Error('El correo electrónico ya está registrado.');
      }
      if (phone && duplicate.phone === phone) {
        throw new Error('El número de teléfono ya está registrado.');
      }
    }

    // El instructor no puede ser registrado públicamente
    if (username.toLowerCase() === 'administrador' || email === 'raul20centavos@gmail.com') {
      throw new Error('Este nombre de usuario o correo está reservado para administración.');
    }

    const newUser = {
      id: 'user-' + Date.now(),
      username,
      email,
      phone,
      password, // En producción se debe usar hashing (ej. bcrypt), para esta SPA simulada guardamos texto plano
      role: 'student',
      assignedCourses: [],
      registeredAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    
    // Retornar usuario sin la contraseña
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  },

  async getStudents() {
    await delay();
    const users = await this.getUsers();
    return users.filter(u => u.role === 'student');
  },

  async assignCoursesToStudent(studentId, courseIds) {
    await delay();
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === studentId);
    if (index === -1) throw new Error('Estudiante no encontrado');
    users[index].assignedCourses = courseIds;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return users[index];
  },

  async authenticateUser(identifier, password) {
    await delay();
    const idClean = identifier.trim();
    
    // 1. Validar Credenciales del Instructor (Admin)
    if (
      (idClean.toLowerCase() === 'administrador' || idClean.toLowerCase() === 'raul20centavos@gmail.com') && 
      password === 'admin123'
    ) {
      return {
        id: 'admin',
        username: 'Administrador',
        email: 'raul20centavos@gmail.com',
        phone: '',
        role: 'instructor'
      };
    }

    // 2. Buscar Estudiante en localStorage
    const users = await this.getUsers();
    const user = users.find(u => 
      u.username.toLowerCase() === idClean.toLowerCase() ||
      u.email.toLowerCase() === idClean.toLowerCase() ||
      u.phone === idClean
    );

    if (!user) {
      throw new Error('Usuario, correo o teléfono no encontrado.');
    }

    if (user.password !== password) {
      throw new Error('Contraseña incorrecta.');
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async updateUserPassword(identifier, newPassword) {
    await delay();
    const idClean = identifier.trim().toLowerCase();
    const users = await this.getUsers();
    
    const userIndex = users.findIndex(u => 
      u.email.toLowerCase() === idClean || 
      u.phone === idClean ||
      u.username.toLowerCase() === idClean
    );

    if (userIndex === -1) {
      // Si intenta cambiar la contraseña del administrador raul20centavos@gmail.com
      if (idClean === 'raul20centavos@gmail.com' || idClean === 'administrador') {
        throw new Error('La contraseña del Administrador está protegida y no se puede recuperar por este medio.');
      }
      throw new Error('No se encontró ningún usuario con ese identificador.');
    }

    users[userIndex].password = newPassword;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return true;
  },

  // --- CURSOS ---
  
  async getCourses() {
    await delay();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES)) || [];
  },

  async getCourseById(id) {
    await delay();
    const courses = await this.getCourses();
    return courses.find(c => c.id === id) || null;
  },

  async createCourse(courseData) {
    await delay();
    const courses = await this.getCourses();
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
    courses.push(newCourse);
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
    return newCourse;
  },

  async updateCourse(courseId, courseData) {
    await delay();
    const courses = await this.getCourses();
    const index = courses.findIndex(c => c.id === courseId);
    if (index === -1) throw new Error('Curso no encontrado');
    
    courses[index] = {
      ...courses[index],
      title: courseData.title,
      description: courseData.description,
      instructor: courseData.instructor,
      category: courseData.category,
      difficulty: courseData.difficulty,
      thumbnail: courseData.thumbnail,
      modules: courseData.modules || courses[index].modules,
      quiz: courseData.quiz || courses[index].quiz
    };
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
    return courses[index];
  },

  async addModuleToCourse(courseId, moduleTitle) {
    await delay();
    const courses = await this.getCourses();
    const courseIndex = courses.findIndex(c => c.id === courseId);
    if (courseIndex === -1) throw new Error('Curso no encontrado');

    const newModule = {
      title: moduleTitle,
      lessons: []
    };
    
    courses[courseIndex].modules.push(newModule);
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
    return courses[courseIndex];
  },

  async addLessonToCourse(courseId, moduleIndex, lessonData) {
    await delay();
    const courses = await this.getCourses();
    const courseIndex = courses.findIndex(c => c.id === courseId);
    if (courseIndex === -1) throw new Error('Curso no encontrado');
    
    const course = courses[courseIndex];
    if (!course.modules[moduleIndex]) throw new Error('Módulo no existe');

    const newLesson = {
      id: 'lesson-' + Date.now(),
      title: lessonData.title,
      type: lessonData.type, // 'video' o 'document'
      url: lessonData.url, // URL del video/documento
      duration: lessonData.duration || '5:00',
      notes: lessonData.notes || ''
    };

    course.modules[moduleIndex].lessons.push(newLesson);
    
    // Recalcular duración aproximada total del curso
    let totalLessonsCount = 0;
    course.modules.forEach(m => totalLessonsCount += m.lessons.length);
    course.duration = `${Math.ceil(totalLessonsCount * 0.4)} horas`;

    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
    return course;
  },

  // --- PROGRESO DEL ESTUDIANTE (AISLADO POR USUARIO) ---

  async getProgress(userId) {
    await delay();
    if (!userId) return {};
    return JSON.parse(localStorage.getItem(`${STORAGE_KEYS.PROGRESS}_${userId}`)) || {};
  },

  async getCourseProgress(courseId, userId) {
    await delay();
    if (!userId) return { percent: 0, completedLessons: [], quizUnlocked: false };
    
    const progress = await this.getProgress(userId);
    const courseProgress = progress[courseId] || { completedLessons: [], completed: false };
    
    const course = await this.getCourseById(courseId);
    if (!course) return { percent: 0, completedLessons: [], quizUnlocked: false };

    let totalLessonsCount = 0;
    course.modules.forEach(m => {
      totalLessonsCount += m.lessons.length;
    });

    if (totalLessonsCount === 0) return { percent: 0, completedLessons: [], quizUnlocked: true };

    const completedCount = courseProgress.completedLessons.length;
    const percent = Math.min(Math.round((completedCount / totalLessonsCount) * 100), 100);

    return {
      percent,
      completedLessons: courseProgress.completedLessons,
      quizUnlocked: percent >= 100
    };
  },

  async toggleLessonComplete(courseId, lessonId, userId) {
    await delay();
    if (!userId) return null;
    
    const progress = await this.getProgress(userId);
    if (!progress[courseId]) {
      progress[courseId] = { completedLessons: [], completed: false };
    }

    const index = progress[courseId].completedLessons.indexOf(lessonId);
    if (index === -1) {
      progress[courseId].completedLessons.push(lessonId);
    } else {
      progress[courseId].completedLessons.splice(index, 1);
    }

    localStorage.setItem(`${STORAGE_KEYS.PROGRESS}_${userId}`, JSON.stringify(progress));
    return this.getCourseProgress(courseId, userId);
  },

  // --- EXÁMENES (AISLADO POR USUARIO) ---

  async getQuizResults(userId) {
    await delay();
    if (!userId) return {};
    return JSON.parse(localStorage.getItem(`${STORAGE_KEYS.QUIZ_RESULTS}_${userId}`)) || {};
  },

  async saveQuizResult(courseId, score, passed, userId) {
    await delay();
    if (!userId) return null;
    
    const results = await this.getQuizResults(userId);
    results[courseId] = {
      score,
      passed,
      date: new Date().toISOString()
    };
    localStorage.setItem(`${STORAGE_KEYS.QUIZ_RESULTS}_${userId}`, JSON.stringify(results));
    return results[courseId];
  },

  // --- CERTIFICADOS ---

  async getCertificates() {
    await delay();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CERTIFICATES)) || [];
  },

  async getCertificateForCourse(courseId, userId) {
    await delay();
    if (!userId) return null;
    const certificates = await this.getCertificates();
    return certificates.find(cert => cert.courseId === courseId && cert.userId === userId) || null;
  },

  async issueCertificate(courseId, studentName, userId) {
    await delay();
    if (!userId) throw new Error('Usuario no identificado');
    
    const certificates = await this.getCertificates();
    
    // Verificar si ya existe uno para este usuario y curso
    const existing = certificates.find(cert => cert.courseId === courseId && cert.userId === userId);
    if (existing) return existing;

    const course = await this.getCourseById(courseId);
    if (!course) throw new Error('Curso no encontrado');

    const newCertificate = {
      id: 'cert-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      userId,
      courseId,
      courseTitle: course.title,
      studentName,
      instructor: course.instructor,
      issueDate: new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      verificationCode: 'EDUT-' + Math.floor(100000 + Math.random() * 900000)
    };

    certificates.push(newCertificate);
    localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(certificates));
    
    // Marcar el curso como completado/aprobado en el progreso del usuario
    const progress = await this.getProgress(userId);
    if (progress[courseId]) {
      progress[courseId].completed = true;
      localStorage.setItem(`${STORAGE_KEYS.PROGRESS}_${userId}`, JSON.stringify(progress));
    }

    return newCertificate;
  },

  // --- REINICIO DE DATOS ---
  async resetAllData() {
    await delay();
    // Limpiar localStorage completamente o llaves específicas
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (Object.values(STORAGE_KEYS).some(prefix => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    initDB();
    return true;
  }
};

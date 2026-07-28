import { db } from './db.js?v=13';

// === ESTADO GLOBAL DE LA APP ===
let currentUser = null; // Almacenará el usuario logueado en la sesión
let currentRole = 'student'; // 'student' o 'instructor'
let activeCourse = null;
let activeLesson = null;
let activeModuleIndex = 0;
let activeLessonIndex = 0;
let activeStudentCategory = 'Todos';
let activeInstructorCategory = 'Todos';
let selectedCategory = 'Programación';

let quizState = {
  courseId: null,
  questions: [],
  currentQuestionIndex: 0,
  answers: []
};

let recoveryCodeState = {
  code: null,
  identifier: null
};

let editingCourse = null;
let activeEditingModuleIndex = null;
let editingLessonIndex = null;
let selectedLocalFile = null;
let iframeCompletionTimer = null;
let maxTimeWatched = 0;
let lastActiveVideoTime = 0;

// === SELECCIÓN DE ELEMENTOS DEL DOM ===
const DOM = {
  logoBtn: document.getElementById('logo-btn'),
  tabStudent: document.getElementById('tab-student'),
  tabInstructor: document.getElementById('tab-instructor'),
  navigationTabs: document.querySelector('.navigation-tabs'),
  themeToggle: document.getElementById('theme-toggle'),
  btnResetDb: document.getElementById('btn-reset-db'),
  userDisplayName: document.getElementById('user-display-name'),
  userProfileBadge: document.getElementById('user-profile-badge'),
  userAvatarChar: document.getElementById('user-avatar-char'),
  btnLogout: document.getElementById('btn-logout'),
  
  // Vistas
  viewAuth: document.getElementById('view-auth'),
  viewStudentDashboard: document.getElementById('view-student-dashboard'),
  viewCoursePlayer: document.getElementById('view-course-player'),
  viewQuiz: document.getElementById('view-quiz'),
  viewQuizResult: document.getElementById('view-quiz-result'),
  viewCertificate: document.getElementById('view-certificate'),
  viewInstructorDashboard: document.getElementById('view-instructor-dashboard'),
  viewCourseEditor: document.getElementById('view-course-editor'),
  
  // Auth Form Selector Panels
  authTabBar: document.getElementById('auth-tab-bar'),
  authErrorMsg: document.getElementById('auth-error-msg'),
  authErrorText: document.getElementById('auth-error-text'),
  authSuccessMsg: document.getElementById('auth-success-msg'),
  authSuccessText: document.getElementById('auth-success-text'),
  authLoginForm: document.getElementById('auth-login-form'),
  authRegisterForm: document.getElementById('auth-register-form'),
  authRecoveryPanel: document.getElementById('auth-recovery-panel'),
  
  // Auth Input Fields
  loginIdentifier: document.getElementById('login-identifier'),
  loginPassword: document.getElementById('login-password'),
  registerFullName: document.getElementById('register-fullname'),
  registerEmail: document.getElementById('register-email'),
  registerPhone: document.getElementById('register-phone'),
  registerPassword: document.getElementById('register-password'),
  registerConfirmPassword: document.getElementById('register-confirm-password'),
  
  // Student Profile Elements
  modalStudentProfile: document.getElementById('modal-student-profile'),
  profileAvatarLarge: document.getElementById('profile-avatar-large'),
  profileFullName: document.getElementById('profile-full-name'),
  profileEmail: document.getElementById('profile-email'),
  profilePhone: document.getElementById('profile-phone'),
  profileProgressList: document.getElementById('profile-progress-list'),
  profileCertificatesList: document.getElementById('profile-certificates-list'),
  
  // Recovery Input Fields
  recoveryIdentifier: document.getElementById('recovery-identifier'),
  simulatedCodeDisplay: document.getElementById('simulated-code-display'),
  recoveryCodeInput: document.getElementById('recovery-code-input'),
  recoveryNewPassword: document.getElementById('recovery-new-password'),
  recoveryConfirmPassword: document.getElementById('recovery-confirm-password'),
  
  // Elementos del Estudiante
  studentCoursesGrid: document.getElementById('student-courses-grid'),
  videoPlayer: document.getElementById('course-video-player'),
  iframePlayer: document.getElementById('course-iframe-player'),
  playerLessonTitle: document.getElementById('player-lesson-title'),
  playerLessonNotes: document.getElementById('player-lesson-notes'),
  playerResourcesList: document.getElementById('player-resources-list'),
  playerCourseTitle: document.getElementById('player-course-title'),
  playerProgressText: document.getElementById('player-progress-text'),
  playerProgressFill: document.getElementById('player-progress-fill'),
  playerSyllabusList: document.getElementById('player-syllabus-list'),
  btnStartQuiz: document.getElementById('btn-start-quiz'),
  btnPlayerBack: document.getElementById('btn-player-back'),
  videoCompletionContainer: document.getElementById('video-completion-container'),
  videoCompletionText: document.getElementById('video-completion-text'),
  btnCompleteIframeVideo: document.getElementById('btn-complete-iframe-video'),
  customPlayerControls: document.getElementById('custom-player-controls'),
  btnVideoRewind: document.getElementById('btn-video-rewind'),
  btnVideoForward: document.getElementById('btn-video-forward'),
  selectVideoSpeed: document.getElementById('select-video-speed'),
  iframePopoutBlocker: document.getElementById('iframe-popout-blocker'),
  lessonFeedbackContainer: document.getElementById('lesson-feedback-container'),
  formLessonFeedback: document.getElementById('form-lesson-feedback'),
  feedbackSummary: document.getElementById('feedback-summary'),
  feedbackComments: document.getElementById('feedback-comments'),
  starRatingGroup: document.getElementById('star-rating-group'),
  starRatingText: document.getElementById('star-rating-text'),
  btnSubmitFeedback: document.getElementById('btn-submit-feedback'),
  editCourseFormTitle: document.getElementById('edit-course-form-title'),
  playerFormCustomTitle: document.getElementById('player-form-custom-title'),
  feedbackQuestionsDynamicGroup: document.getElementById('feedback-questions-dynamic-group'),
  questionsGroupWrapper: document.getElementById('questions-group-wrapper'),
  groupQuestionsCounter: document.getElementById('group-questions-counter'),
  
  // Elementos del Quiz
  quizCourseTitle: document.getElementById('quiz-course-title'),
  quizQuestionNumber: document.getElementById('quiz-question-number'),
  quizProgressPercent: document.getElementById('quiz-progress-percent'),
  quizQuestionText: document.getElementById('quiz-question-text'),
  quizOptionsGroup: document.getElementById('quiz-options-group'),
  btnQuizNext: document.getElementById('btn-quiz-next'),
  btnQuizExit: document.getElementById('btn-quiz-exit'),
  quizResultCard: document.getElementById('quiz-result-card'),
  
  // Elementos del Certificado
  certDisplayStudent: document.getElementById('cert-display-student'),
  certDisplayCourse: document.getElementById('cert-display-course'),
  certDisplaySignature: document.getElementById('cert-display-signature'),
  certDisplayInstructor: document.getElementById('cert-display-instructor'),
  certDisplayDate: document.getElementById('cert-display-date'),
  certDisplayCode: document.getElementById('cert-display-code'),
  btnPrintCertificate: document.getElementById('btn-print-certificate'),
  btnDownloadCertificate: document.getElementById('btn-download-certificate'),
  certCanvas: document.getElementById('cert-canvas'),
  
  // Elementos del Instructor
  instructorCoursesGrid: document.getElementById('instructor-courses-grid'),
  studentRegistryRows: document.getElementById('student-registry-rows'),
  btnNewCourse: document.getElementById('btn-new-course'),
  btnEditorBack: document.getElementById('btn-editor-back'),
  btnEditorSaveCourse: document.getElementById('btn-editor-save-course'),
  btnEditorAddModule: document.getElementById('btn-editor-add-module'),
  btnRenameCategory: document.getElementById('btn-rename-category'),
  btnDeleteCategory: document.getElementById('btn-delete-category'),
  btnEditorAddQuestion: document.getElementById('btn-editor-add-question'),
  curriculumBuilderList: document.getElementById('curriculum-builder-list'),
  quizBuilderQuestionsList: document.getElementById('quiz-builder-questions-list'),
  
  // Formulario General del Curso
  formCourseGeneral: document.getElementById('form-course-general'),
  editCourseTitle: document.getElementById('edit-course-title'),
  editCourseDescription: document.getElementById('edit-course-description'),
  editCourseInstructor: document.getElementById('edit-course-instructor'),
  categoryDropdownTrigger: document.getElementById('category-dropdown-trigger'),
  categoryDropdownMenu: document.getElementById('category-dropdown-menu'),
  selectedCategoryText: document.getElementById('selected-category-text'),
  editCourseDifficulty: document.getElementById('edit-course-difficulty'),
  editCourseTheme: document.getElementById('edit-course-theme'),
  
  // Estadísticas del Panel
  statTotalCourses: document.getElementById('stat-total-courses'),
  statTotalCertificates: document.getElementById('stat-total-certificates'),
  statActiveStudents: document.getElementById('stat-active-students'),
  
  // Modales
  modalAddModule: document.getElementById('modal-add-module'),
  modalAddLesson: document.getElementById('modal-add-lesson'),
  newModuleTitle: document.getElementById('new-module-title'),
  btnSubmitAddModule: document.getElementById('btn-submit-add-module'),
  
  newLessonTitle: document.getElementById('new-lesson-title'),
  newLessonType: document.getElementById('new-lesson-type'),
  newLessonDuration: document.getElementById('new-lesson-duration'),
  newLessonSourceType: document.getElementById('new-lesson-source-type'),
  newLessonUrl: document.getElementById('new-lesson-url'),
  newLessonFileInput: document.getElementById('new-lesson-file-input'),
  newLessonNotes: document.getElementById('new-lesson-notes'),
  btnSubmitAddLesson: document.getElementById('btn-submit-add-lesson'),
  fileUploadStatus: document.getElementById('file-upload-status'),
  filenamePreview: document.getElementById('filename-preview'),

  // Instructor: Gestión de Estudiantes
  btnInsCoursesTab: document.getElementById('btn-ins-courses-tab'),
  btnInsStudentsTab: document.getElementById('btn-ins-students-tab'),
  insCoursesSection: document.getElementById('ins-courses-section'),
  insStudentsSection: document.getElementById('ins-students-section'),
  studentSearchInput: document.getElementById('student-search-input'),
  studentsTableBody: document.getElementById('students-table-body'),
  modalAssignCourses: document.getElementById('modal-assign-courses'),
  assignStudentName: document.getElementById('assign-student-name'),
  assignStudentEmail: document.getElementById('assign-student-email'),
  assignCoursesList: document.getElementById('assign-courses-list'),
  btnSubmitAssignCourses: document.getElementById('btn-submit-assign-courses')
};

// === EVENT LISTENERS INICIALES ===
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Configuración del Tema
  const savedTheme = localStorage.getItem('edutrack_theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    if (DOM.themeToggle) DOM.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    if (DOM.themeToggle) DOM.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  }
  
  if (DOM.themeToggle) DOM.themeToggle.addEventListener('click', toggleTheme);
  if (DOM.btnResetDb) DOM.btnResetDb.addEventListener('click', resetDatabase);
  if (DOM.btnLogout) DOM.btnLogout.addEventListener('click', logoutUser);
  
  // Roles de Usuario
  if (DOM.tabStudent) DOM.tabStudent.addEventListener('click', () => switchRole('student'));
  if (DOM.tabInstructor) DOM.tabInstructor.addEventListener('click', () => switchRole('instructor'));
  if (DOM.logoBtn) DOM.logoBtn.addEventListener('click', navigateToDashboard);

  // Formulario y Pestañas de Autenticación
  const authLoginForm = document.getElementById('auth-login-form');
  if (authLoginForm) {
    authLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitLogin();
    });
  }

  const authRegisterForm = document.getElementById('auth-register-form');
  if (authRegisterForm) {
    authRegisterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitRegister();
    });
  }

  const btnTabLogin = document.getElementById('btn-tab-login');
  if (btnTabLogin) {
    btnTabLogin.addEventListener('click', () => switchAuthTab('login'));
  }

  const btnTabRegister = document.getElementById('btn-tab-register');
  if (btnTabRegister) {
    btnTabRegister.addEventListener('click', () => switchAuthTab('register'));
  }

  // Pestañas del Panel de Instructor
  if (DOM.btnInsCoursesTab) DOM.btnInsCoursesTab.addEventListener('click', () => switchInstructorTab('courses'));
  if (DOM.btnInsStudentsTab) DOM.btnInsStudentsTab.addEventListener('click', () => switchInstructorTab('students'));
  if (DOM.studentSearchInput) DOM.studentSearchInput.addEventListener('input', filterStudentsTable);
  if (DOM.btnSubmitAssignCourses) DOM.btnSubmitAssignCourses.addEventListener('click', submitCourseAssignment);
  
  // Navegaciones de Botones de Volver
  if (DOM.btnPlayerBack) {
    DOM.btnPlayerBack.addEventListener('click', () => {
      if (currentUser) {
        localStorage.removeItem(`edutrack_active_course_${currentUser.id}`);
      }
      showView('view-student-dashboard');
    });
  }
  if (DOM.btnEditorBack) DOM.btnEditorBack.addEventListener('click', () => showView('view-instructor-dashboard'));
  
  // Registrar Botones de Cerrar Modales
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });
  
  // Control de Formularios en Clases Modales
  if (DOM.newLessonSourceType) DOM.newLessonSourceType.addEventListener('change', toggleLessonSourceFields);
  if (DOM.newLessonFileInput) DOM.newLessonFileInput.addEventListener('change', handleLessonFileSelect);
  
  // Botones del Editor
  if (DOM.btnNewCourse) DOM.btnNewCourse.addEventListener('click', () => startNewCourseEditor());
  if (DOM.btnEditorAddModule) DOM.btnEditorAddModule.addEventListener('click', openAddModuleModal);
  if (DOM.btnEditorAddQuestion) DOM.btnEditorAddQuestion.addEventListener('click', () => addQuestionField());
  if (DOM.btnEditorSaveCourse) DOM.btnEditorSaveCourse.addEventListener('click', saveCourseFromEditor);
  
  // Control de Dropdown de Categorías Personalizado
  if (DOM.categoryDropdownTrigger) {
    DOM.categoryDropdownTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (DOM.categoryDropdownMenu) {
        const isVisible = DOM.categoryDropdownMenu.style.display === 'block';
        DOM.categoryDropdownMenu.style.display = isVisible ? 'none' : 'block';
      }
    });
  }
  
  document.addEventListener('click', () => {
    if (DOM.categoryDropdownMenu) {
      DOM.categoryDropdownMenu.style.display = 'none';
    }
  });
  
  if (DOM.btnSubmitAddModule) DOM.btnSubmitAddModule.addEventListener('click', submitAddModule);
  if (DOM.btnSubmitAddLesson) DOM.btnSubmitAddLesson.addEventListener('click', submitAddLesson);
  
  // Botones del Quiz
  if (DOM.btnQuizNext) DOM.btnQuizNext.addEventListener('click', handleQuizNext);
  if (DOM.btnQuizExit) DOM.btnQuizExit.addEventListener('click', exitQuiz);
  if (DOM.btnStartQuiz) DOM.btnStartQuiz.addEventListener('click', () => startQuiz(activeCourse ? activeCourse.id : null));
  
  // Impresión y Descarga de Certificado
  if (DOM.btnPrintCertificate) DOM.btnPrintCertificate.addEventListener('click', () => window.print());
  if (DOM.btnDownloadCertificate) DOM.btnDownloadCertificate.addEventListener('click', downloadCertificatePNG);
  
  // Listeners de enlaces en el Reproductor de Vídeo
  if (DOM.videoPlayer) {
    DOM.videoPlayer.addEventListener('ended', autoMarkLessonComplete);
    DOM.videoPlayer.addEventListener('timeupdate', () => {
      if (currentRole === 'student' && activeLesson && !isLessonCompletedLocal(activeLesson.id)) {
        if (DOM.videoPlayer.currentTime >= maxTimeWatched) {
          maxTimeWatched = DOM.videoPlayer.currentTime;
          if (currentUser) {
            localStorage.setItem(`edutrack_video_time_${currentUser.id}_${activeLesson.id}`, DOM.videoPlayer.currentTime);
          }
        }
        if (Math.abs(DOM.videoPlayer.currentTime - lastActiveVideoTime) <= 2) {
          lastActiveVideoTime = DOM.videoPlayer.currentTime;
        }
      }
    });

    DOM.videoPlayer.addEventListener('seeking', () => {
      if (currentRole === 'student' && activeLesson && !isLessonCompletedLocal(activeLesson.id)) {
        if (DOM.videoPlayer.currentTime > maxTimeWatched + 1.5) {
          DOM.videoPlayer.currentTime = lastActiveVideoTime;
        }
      }
    });
  }

  if (DOM.btnVideoRewind) {
    DOM.btnVideoRewind.addEventListener('click', () => {
      if (DOM.videoPlayer) {
        DOM.videoPlayer.currentTime = Math.max(0, DOM.videoPlayer.currentTime - 10);
      }
    });
  }

  if (DOM.btnVideoForward) {
    DOM.btnVideoForward.addEventListener('click', () => {
      if (DOM.videoPlayer) {
        const targetTime = DOM.videoPlayer.currentTime + 10;
        if (currentRole === 'student' && activeLesson && !isLessonCompletedLocal(activeLesson.id)) {
          if (targetTime > maxTimeWatched) {
            DOM.videoPlayer.currentTime = maxTimeWatched;
            return;
          }
        }
        DOM.videoPlayer.currentTime = Math.min(DOM.videoPlayer.duration || 0, targetTime);
      }
    });
  }

  if (DOM.selectVideoSpeed) {
    DOM.selectVideoSpeed.addEventListener('change', (e) => {
      if (DOM.videoPlayer) {
        DOM.videoPlayer.playbackRate = parseFloat(e.target.value) || 1.0;
      }
    });
  }

  if (DOM.btnCompleteIframeVideo) {
    DOM.btnCompleteIframeVideo.addEventListener('click', showLessonFeedbackForm);
  }

  if (DOM.starRatingGroup) {
    DOM.starRatingGroup.querySelectorAll('.star-icon').forEach(star => {
      star.addEventListener('click', (e) => {
        const rating = parseInt(e.target.getAttribute('data-rating'), 10) || 5;
        updateStarRatingUI(rating);
      });
    });
  }
  
  // Manejador de Pestañas del Reproductor
  document.querySelectorAll('.player-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.player-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      
      e.target.classList.add('active');
      const targetId = e.target.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
    });
  });

  // Escuchar clicks genéricos para volver al dashboard de estudiante
  document.querySelectorAll('.btn-back-dashboard').forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentUser) {
        localStorage.removeItem(`edutrack_active_course_${currentUser.id}`);
      }
      showView('view-student-dashboard');
    });
  });
  
  // --- ESCUCHAR EVENTOS DE RECUPERACIÓN DE CONTRASEÑA EN SUPABASE ---
  db.supabase.auth.onAuthStateChange(async (event, session) => {
    const isRecovery = window.location.hash.includes('type=recovery') || window.location.hash.includes('recovery');

    if (event === 'PASSWORD_RECOVERY' || ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && isRecovery)) {
      console.log('Recuperación de contraseña nativa detectada. Mostrando formulario de nueva contraseña.');
      // Ocultar pantalla de auth normal, mostrar panel de recuperación
      DOM.authTabBar.style.display = 'none';
      DOM.authLoginForm.classList.remove('active');
      DOM.authRegisterForm.classList.remove('active');
      DOM.authRecoveryPanel.classList.add('active');
      
      // Mostrar el Paso 3 directamente (establecer nueva contraseña)
      document.getElementById('recovery-step-1').style.display = 'none';
      document.getElementById('recovery-step-2').style.display = 'none';
      document.getElementById('recovery-step-3').style.display = 'block';
      DOM.recoveryNewPassword.value = '';
      DOM.recoveryConfirmPassword.value = '';
      
      // Mostrar la vista de login/auth por si acaso
      showView('view-auth');
    } else if (event === 'SIGNED_IN' && session) {
      const isConfirmation = window.location.hash.includes('access_token');
      
      if (!isRecovery && isConfirmation) {
        console.log('Usuario confirmado por correo (SIGNED_IN). Sincronizando perfil...');
        try {
          const users = await db.getUsers();
          const student = users.find(u => u.id === session.user.id);
          if (student) {
            currentUser = student;
            localStorage.setItem('edutrack_current_user', JSON.stringify(student));
            setupAuthenticatedUI();
            switchRole('student');
            
            // Limpiar el hash de la URL para que no quede expuesto el token
            if (window.location.hash) {
              window.history.replaceState(null, null, window.location.pathname);
            }
          }
        } catch (err) {
          console.error('Error al sincronizar sesión tras confirmación:', err);
        }
      }
    }
  });

  // --- CARGAR SESIÓN DE USUARIO ---
  checkUserSession();
}

// === TEMA CLARO / OSCURO ===
function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  localStorage.setItem('edutrack_theme', isLight ? 'light' : 'dark');
  DOM.themeToggle.innerHTML = isLight ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// === REESTABLECER BASE DE DATOS ===
async function resetDatabase() {
  if (confirm('¿Estás seguro de que deseas restablecer la base de datos? Se perderán todos los cursos creados, estudiantes registrados y progresos.')) {
    await db.resetAllData();
    localStorage.removeItem('edutrack_current_user');
    // Limpiar todas las claves de edutrack en localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('edutrack_')) {
        localStorage.removeItem(key);
      }
    });
    alert('Base de datos restablecida correctamente.');
    window.location.reload();
  }
}

// === COMPROBAR SESIÓN DE USUARIO ===
async function checkUserSession() {
  // Si estamos en medio de un redireccionamiento de recuperación de contraseña de Supabase,
  // evitamos cargar la interfaz normal y esperamos al listener de auth
  if (window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token')) {
    console.log('Esperando redirección de recuperación de contraseña...');
    showView('view-auth');
    return;
  }

  const sessionData = localStorage.getItem('edutrack_current_user');
  
  if (sessionData) {
    const cachedUser = JSON.parse(sessionData);
    
    if (cachedUser.role === 'instructor') {
      currentUser = cachedUser;
      setupAuthenticatedUI();
      switchRole('instructor');
    } else {
      // Recargar estudiante desde Supabase Auth y sincronizar perfil
      try {
        const { data: { session }, error } = await db.supabase.auth.getSession();
        if (session && session.user) {
          const users = await db.getUsers();
          const student = users.find(u => u.id === session.user.id);
          if (student) {
            currentUser = student;
            localStorage.setItem('edutrack_current_user', JSON.stringify(student));
          } else {
            currentUser = cachedUser;
          }
        } else {
          // Mantener al estudiante logueado con cachedUser si existe
          if (cachedUser) {
            currentUser = cachedUser;
          } else {
            currentUser = null;
            localStorage.removeItem('edutrack_current_user');
            setupLoggedOutUI();
            showView('view-auth');
            return;
          }
        }
      } catch (err) {
        console.error('Error al sincronizar sesión del estudiante:', err);
        currentUser = cachedUser;
      }
      setupAuthenticatedUI();
      switchRole('student');

      // Auto-restaurar curso activo tras refrescar
      const storedActiveCourse = localStorage.getItem(`edutrack_active_course_${currentUser.id}`);
      if (storedActiveCourse) {
        startCourse(storedActiveCourse);
      }
    }
  } else {
    // Si no hay sesión local, verificar si hay una sesión activa de Supabase Auth
    try {
      const { data: { session }, error } = await db.supabase.auth.getSession();
      if (session && session.user) {
        const users = await db.getUsers();
        const student = users.find(u => u.id === session.user.id);
        if (student) {
          currentUser = student;
          localStorage.setItem('edutrack_current_user', JSON.stringify(student));
          setupAuthenticatedUI();
          switchRole('student');
          
          // Auto-restaurar curso activo tras refrescar
          const storedActiveCourse = localStorage.getItem(`edutrack_active_course_${currentUser.id}`);
          if (storedActiveCourse) {
            startCourse(storedActiveCourse);
          }
          return;
        }
      }
    } catch (err) {
      console.error('Error al comprobar sesión automática en Supabase:', err);
    }

    currentUser = null;
    setupLoggedOutUI();
    showView('view-auth');
  }
}

function setupAuthenticatedUI() {
  const displayName = currentUser.fullName || currentUser.username || 'Usuario';
  if (DOM.userDisplayName) DOM.userDisplayName.textContent = displayName;
  if (DOM.userAvatarChar) DOM.userAvatarChar.textContent = displayName.charAt(0).toUpperCase();
  if (DOM.userProfileBadge) DOM.userProfileBadge.style.display = 'flex';
  if (DOM.btnLogout) DOM.btnLogout.style.display = 'flex';
  
  // Mostrar u ocultar pestañas de rol según permisos
  if (currentUser.role === 'instructor') {
    if (DOM.navigationTabs) DOM.navigationTabs.style.display = 'flex';
  } else {
    // Los estudiantes no pueden cambiar de rol ni ver el panel administrativo
    if (DOM.navigationTabs) DOM.navigationTabs.style.display = 'none';
  }
}

function setupLoggedOutUI() {
  if (DOM.userProfileBadge) DOM.userProfileBadge.style.display = 'none';
  if (DOM.btnLogout) DOM.btnLogout.style.display = 'none';
  if (DOM.navigationTabs) DOM.navigationTabs.style.display = 'none';
  
  // Limpiar inputs de forma segura
  if (DOM.loginIdentifier) DOM.loginIdentifier.value = '';
  if (DOM.loginPassword) DOM.loginPassword.value = '';
  if (DOM.registerFullName) DOM.registerFullName.value = '';
  if (DOM.registerEmail) DOM.registerEmail.value = '';
  if (DOM.registerPhone) DOM.registerPhone.value = '';
  if (DOM.registerPassword) DOM.registerPassword.value = '';
  if (DOM.registerConfirmPassword) DOM.registerConfirmPassword.value = '';
}

// === ENRUTAMIENTO DE ROL ===
function switchRole(role) {
  if (!currentUser) return;
  
  // Prevenir hack de acceso al panel de instructor si es estudiante
  if (role === 'instructor' && currentUser.role !== 'instructor') {
    alert('Acceso no autorizado.');
    switchRole('student');
    return;
  }

  currentRole = role;
  DOM.tabStudent.classList.toggle('active', role === 'student');
  DOM.tabInstructor.classList.toggle('active', role === 'instructor');
  
  if (role === 'student') {
    showView('view-student-dashboard');
    loadStudentDashboard();
  } else {
    showView('view-instructor-dashboard');
    loadInstructorDashboard();
  }
}

function navigateToDashboard() {
  if (!currentUser) return;
  navigateToDashboardInternal();
}

function navigateToDashboardInternal() {
  if (currentRole === 'student') {
    showView('view-student-dashboard');
    loadStudentDashboard();
  } else {
    showView('view-instructor-dashboard');
    loadInstructorDashboard();
  }
}

function showView(viewId) {
  // Si no está logueado, bloquear navegación a cualquier pantalla que no sea auth
  if (!currentUser && viewId !== 'view-auth') {
    viewId = 'view-auth';
  }
  
  // Pausar video si cambiamos de vista
  if (viewId !== 'view-course-player') {
    if (DOM.videoPlayer) DOM.videoPlayer.pause();
    if (DOM.iframePlayer) DOM.iframePlayer.src = '';
  }
  
  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  const activePanel = document.getElementById(viewId);
  if (activePanel) {
    activePanel.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ==================== FLUJO DE AUTENTICACIÓN (LOGIN, REGISTRO, RECUPERACIÓN) ====================

// Alternar pestañas en el panel de Login / Registro
function switchAuthTab(tab) {
  if (DOM.authErrorMsg) DOM.authErrorMsg.style.display = 'none';
  if (DOM.authSuccessMsg) DOM.authSuccessMsg.style.display = 'none';
  
  const isLogin = tab === 'login';
  const btnLogin = document.getElementById('btn-tab-login');
  const btnRegister = document.getElementById('btn-tab-register');

  if (btnLogin) btnLogin.classList.toggle('active', isLogin);
  if (btnRegister) btnRegister.classList.toggle('active', !isLogin);
  
  if (DOM.authLoginForm) DOM.authLoginForm.classList.toggle('active', isLogin);
  if (DOM.authRegisterForm) DOM.authRegisterForm.classList.toggle('active', !isLogin);
  if (DOM.authRecoveryPanel) DOM.authRecoveryPanel.classList.remove('active');
}

// Ejecutar Login
async function submitLogin() {
  DOM.authErrorMsg.style.display = 'none';
  DOM.authSuccessMsg.style.display = 'none';
  
  const identifier = DOM.loginIdentifier ? DOM.loginIdentifier.value.trim() : '';
  const password = DOM.loginPassword ? DOM.loginPassword.value.trim() : '';
  
  if (!identifier || !password) {
    DOM.authErrorText.textContent = 'Por favor ingresa tu usuario y contraseña.';
    DOM.authErrorMsg.style.display = 'flex';
    return;
  }

  try {
    const user = await db.authenticateUser(identifier, password);
    currentUser = user;
    localStorage.setItem('edutrack_current_user', JSON.stringify(user));
    
    // Configurar interfaz y redirección
    setupAuthenticatedUI();
    
    if (user.role === 'instructor') {
      switchRole('instructor');
    } else {
      switchRole('student');
    }
  } catch (err) {
    console.error('Error de login:', err);
    DOM.authErrorText.textContent = err.message || 'Error al iniciar sesión.';
    DOM.authErrorMsg.style.display = 'flex';
  }
}

// Ejecutar Registro Estudiante
async function submitRegister() {
  if (DOM.authErrorMsg) DOM.authErrorMsg.style.display = 'none';
  if (DOM.authSuccessMsg) DOM.authSuccessMsg.style.display = 'none';
  
  const fullName = DOM.registerFullName ? DOM.registerFullName.value.trim() : '';
  const email = DOM.registerEmail ? DOM.registerEmail.value.trim() : '';
  const phone = DOM.registerPhone ? DOM.registerPhone.value.trim() : '';
  const password = DOM.registerPassword ? DOM.registerPassword.value : '';
  const confirmPassword = DOM.registerConfirmPassword ? DOM.registerConfirmPassword.value : '';
  
  if (!fullName || !email || !password || !confirmPassword) {
    DOM.authErrorText.textContent = 'Por favor completa todos los campos del formulario de registro.';
    DOM.authErrorMsg.style.display = 'flex';
    return;
  }

  if (password !== confirmPassword) {
    DOM.authErrorText.textContent = 'Las contraseñas no coinciden. Por favor verifícalas e inténtalo de nuevo.';
    DOM.authErrorMsg.style.display = 'flex';
    return;
  }

  try {
    const registeredUser = await db.registerStudent({ fullName, username: fullName, email, phone, password });
    
    // Mostrar éxito y redirigir
    DOM.authSuccessText.textContent = '¡Registro exitoso! Iniciando sesión automáticamente...';
    DOM.authSuccessMsg.style.display = 'flex';
    
    // Limpiar campos y cambiar pestaña
    if (DOM.registerFullName) DOM.registerFullName.value = '';
    if (DOM.registerEmail) DOM.registerEmail.value = '';
    if (DOM.registerPhone) DOM.registerPhone.value = '';
    if (DOM.registerPassword) DOM.registerPassword.value = '';
    if (DOM.registerConfirmPassword) DOM.registerConfirmPassword.value = '';
    
    setTimeout(async () => {
      try {
        const user = await db.authenticateUser(email, password);
        currentUser = user;
        localStorage.setItem('edutrack_current_user', JSON.stringify(user));
        setupAuthenticatedUI();
        switchRole('student');
      } catch (loginErr) {
        if (registeredUser) {
          currentUser = registeredUser;
          localStorage.setItem('edutrack_current_user', JSON.stringify(registeredUser));
          setupAuthenticatedUI();
          switchRole('student');
        } else {
          switchAuthTab('login');
        }
      }
    }, 1200);
  } catch (err) {
    DOM.authErrorText.textContent = err.message;
    DOM.authErrorMsg.style.display = 'flex';
  }
}

// Iniciar Recuperación de Contraseña
function startRecoveryFlow() {
  DOM.authErrorMsg.style.display = 'none';
  DOM.authSuccessMsg.style.display = 'none';
  
  // Ocultar pestañas y formularios comunes, mostrar panel de recuperación
  DOM.authTabBar.style.display = 'none';
  DOM.authLoginForm.classList.remove('active');
  DOM.authRegisterForm.classList.remove('active');
  DOM.authRecoveryPanel.classList.add('active');
  
  // Mostrar Paso 1
  document.getElementById('recovery-step-1').style.display = 'block';
  document.getElementById('recovery-step-2').style.display = 'none';
  document.getElementById('recovery-step-3').style.display = 'none';
  
  DOM.recoveryIdentifier.value = '';
}

function cancelRecoveryFlow() {
  DOM.authTabBar.style.display = 'flex';
  switchAuthTab('login');
}

// Enviar correo de restablecimiento nativo de Supabase
async function sendRecoveryEmail() {
  DOM.authErrorMsg.style.display = 'none';
  DOM.authSuccessMsg.style.display = 'none';
  
  const identifier = DOM.recoveryIdentifier.value.trim();
  if (!identifier) {
    alert('Ingresa tu usuario, correo o celular.');
    return;
  }
  
  try {
    // Validar si existe el usuario
    const users = await db.getUsers();
    const cleanId = identifier.toLowerCase();
    
    const user = users.find(u => 
      u.email.toLowerCase() === cleanId || 
      u.phone === cleanId ||
      u.username.toLowerCase() === cleanId
    );
    
    if (!user) {
      if (cleanId === 'raul20centavos@gmail.com' || cleanId === 'administrador') {
        throw new Error('La cuenta de Administrador no puede ser restablecida localmente.');
      }
      throw new Error('No se encontró ningún estudiante registrado con ese identificador.');
    }

    if (!user.email) {
      throw new Error('Este estudiante no tiene correo electrónico asociado para enviarle el restablecimiento.');
    }
    
    // Guardar identificador para saber a quién actualizar
    recoveryCodeState = {
      code: 'native_flow',
      identifier: user.username
    };

    // Disparar correo de Supabase Auth
    await db.sendPasswordResetEmail(user.email);
    
    // Ocultar campos y mostrar mensaje de éxito
    DOM.authSuccessText.textContent = `Se ha enviado un enlace de recuperación a: ${user.email.substring(0, 3)}***@${user.email.split('@')[1]}. Por favor, revisa tu correo y haz clic en el enlace.`;
    DOM.authSuccessMsg.style.display = 'flex';
    
    const btn = document.getElementById('btn-recovery-send');
    if (btn) {
      btn.disabled = true;
      setTimeout(() => { btn.disabled = false; }, 30000);
    }
  } catch (err) {
    DOM.authErrorText.textContent = err.message;
    DOM.authErrorMsg.style.display = 'flex';
  }
}

// Validar código ingresado (legacy / no-op)
function verifyRecoveryCode() {
  DOM.authErrorMsg.style.display = 'none';
  DOM.authErrorText.textContent = 'El flujo ahora utiliza recuperación por correo directa. Por favor, haz clic en el enlace recibido.';
  DOM.authErrorMsg.style.display = 'flex';
}

// Guardar nueva contraseña en Supabase Auth
async function saveNewPassword() {
  DOM.authErrorMsg.style.display = 'none';
  DOM.authSuccessMsg.style.display = 'none';
  const newPass = DOM.recoveryNewPassword.value;
  const confirmPass = DOM.recoveryConfirmPassword.value;
  
  if (!newPass) {
    alert('Ingresa tu nueva contraseña.');
    return;
  }
  
  if (newPass !== confirmPass) {
    DOM.authErrorText.textContent = 'Las contraseñas no coinciden.';
    DOM.authErrorMsg.style.display = 'flex';
    return;
  }
  
  try {
    // 1. Obtener la sesión activa de recuperación de Supabase Auth
    const { data: { session } } = await db.supabase.auth.getSession();
    if (session && session.user) {
      // 2. Actualizar contraseña nativa en Auth
      await db.updateLoggedInUserPassword(newPass);
      // 3. Limpiar contraseña en texto plano en public.users
      await db.clearPlaintextPassword(session.user.id);
    } else {
      throw new Error('No hay ninguna sesión activa de recuperación de contraseña. Por favor, solicita un nuevo enlace de recuperación.');
    }
    
    DOM.authSuccessText.textContent = 'Contraseña restablecida con éxito. Redirigiendo al inicio de sesión...';
    DOM.authSuccessMsg.style.display = 'flex';
    
    setTimeout(() => {
      logoutUser();
      cancelRecoveryFlow();
    }, 2000);
  } catch (err) {
    DOM.authErrorText.textContent = err.message;
    DOM.authErrorMsg.style.display = 'flex';
  }
}

// Cerrar Sesión del Usuario
function logoutUser() {
  currentUser = null;
  localStorage.removeItem('edutrack_current_user');
  // Limpiar curso y lección activos, y progresos temporales
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('edutrack_active_') || key.startsWith('edutrack_video_time_') || key.startsWith('edutrack_iframe_timer_')) {
      localStorage.removeItem(key);
    }
  });
  db.supabase.auth.signOut().catch(err => console.error('Error al cerrar sesión en Supabase:', err));
  setupLoggedOutUI();
  showView('view-auth');
}

// === INSTRUCTOR: CONTROL DE ESTUDIANTES ===
let currentSelectedStudentId = null;

// Abrir Modal de Asignación de Cursos
async function openAssignCoursesModal(studentId) {
  currentSelectedStudentId = studentId;
  DOM.assignCoursesList.innerHTML = '<div style="padding: 20px; color: var(--text-secondary); text-align: center;"><i class="fas fa-circle-notch fa-spin"></i> Cargando catálogo...</div>';
  DOM.modalAssignCourses.classList.add('active');
  
  try {
    const students = await db.getStudents();
    const student = students.find(s => s.id === studentId);
    if (!student) {
      alert('Estudiante no encontrado.');
      closeAllModals();
      return;
    }
    
    DOM.assignStudentName.textContent = student.username;
    DOM.assignStudentEmail.textContent = student.email || student.phone || 'N/A';
    
    const courses = await db.getCourses();
    const assignedIds = student.assignedCourses || [];
    
    if (courses.length === 0) {
      DOM.assignCoursesList.innerHTML = '<div style="padding: 20px; color: var(--text-secondary); text-align: center;">No hay cursos creados en el catálogo.</div>';
      return;
    }
    
    DOM.assignCoursesList.innerHTML = courses.map(course => {
      const isChecked = assignedIds.includes(course.id) ? 'checked' : '';
      return `
        <label class="course-checkbox-item">
          <input type="checkbox" value="${course.id}" ${isChecked}>
          <span class="course-name">${course.title}</span>
        </label>
      `;
    }).join('');
    
  } catch (err) {
    console.error('Error al abrir modal de asignación:', err);
    alert('Ocurrió un error al cargar la información del alumno.');
    closeAllModals();
  }
}

// Guardar Asignación de Cursos
async function submitCourseAssignment() {
  if (!currentSelectedStudentId) return;
  
  // Obtener los cursos marcados
  const checkedBoxes = DOM.assignCoursesList.querySelectorAll('input[type="checkbox"]:checked');
  const courseIds = Array.from(checkedBoxes).map(cb => cb.value);
  
  DOM.btnSubmitAssignCourses.disabled = true;
  DOM.btnSubmitAssignCourses.textContent = 'Guardando...';
  
  try {
    await db.assignCoursesToStudent(currentSelectedStudentId, courseIds);
    closeAllModals();
    await loadInstructorStudentsTable();
  } catch (err) {
    console.error('Error al guardar asignación:', err);
    alert('Error al guardar la asignación: ' + err.message);
  } finally {
    DOM.btnSubmitAssignCourses.disabled = false;
    DOM.btnSubmitAssignCourses.textContent = 'Guardar Asignación';
  }
}

// ==================== FLUJO ESTUDIANTE ====================

// Cargar catálogo de cursos en el Dashboard
async function loadStudentDashboard() {
  if (!currentUser) return;
  DOM.studentCoursesGrid.innerHTML = '<div style="text-align: center; grid-column: 1/-1; padding: 40px; color: var(--text-secondary);"><i class="fas fa-circle-notch fa-spin fa-2x"></i><p style="margin-top: 10px;">Cargando catálogo...</p></div>';
  
  try {
    // Sincronizar estudiante de la base de datos
    const users = await db.getUsers();
    const latestStudent = users.find(u => u.id === currentUser.id);
    if (latestStudent) {
      currentUser = latestStudent;
      localStorage.setItem('edutrack_current_user', JSON.stringify(latestStudent));
      setupAuthenticatedUI();
    }

    const allCourses = await db.getCourses();
    const assignedIds = currentUser.assignedCourses || [];
    
    // Filtrar para mostrar sólo los asignados
    const studentCourses = allCourses.filter(c => assignedIds.includes(c.id));
    
    // Renderizar los filtros de categorías
    renderCategoryFilters('student-category-filters', studentCourses, activeStudentCategory, 'filterStudentCategory');
    
    // Filtrar por categoría activa
    const courses = activeStudentCategory === 'Todos' 
      ? studentCourses 
      : studentCourses.filter(c => c.category === activeStudentCategory);
    
    if (studentCourses.length === 0) {
      DOM.studentCoursesGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <i class="fas fa-graduation-cap"></i>
          <h3>No tienes cursos asignados</h3>
          <p>Actualmente no tienes cursos asignados. Ponte en contacto con tu instructor para que te asigne a tus cursos correspondientes.</p>
        </div>
      `;
      return;
    }
    
    if (courses.length === 0) {
      DOM.studentCoursesGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1; padding: 30px;">
          <i class="fas fa-search"></i>
          <h3>Sin cursos</h3>
          <p>No tienes cursos asignados en la categoría <strong>"${activeStudentCategory}"</strong>.</p>
        </div>
      `;
      return;
    }
    
    let html = '';
    
    for (const course of courses) {
      const progress = await db.getCourseProgress(course.id, currentUser.id);
      const isQuizPassed = await checkIfQuizPassed(course.id);
      
      let actionButtonsHtml = '';
      
      if (progress.percent === 100 && isQuizPassed) {
        actionButtonsHtml = `
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-success" style="flex: 1;" onclick="viewCertificate('${course.id}')">
              <i class="fas fa-award"></i> Certificado
            </button>
            <button class="btn btn-secondary" style="flex: 1;" onclick="startCourse('${course.id}')">
              <i class="fas fa-book-open"></i> Repasar
            </button>
          </div>
        `;
      } else {
        let actionBtnText = 'Comenzar Curso';
        let actionBtnClass = 'btn-primary';
        let actionOnClick = `startCourse('${course.id}')`;
        
        if (progress.percent > 0 && progress.percent < 100) {
          actionBtnText = 'Continuar Curso';
          actionBtnClass = 'btn-primary';
        } else if (progress.percent === 100) {
          actionBtnText = 'Tomar Cuestionario';
          actionBtnClass = 'btn-primary';
          actionOnClick = `startQuiz('${course.id}')`;
        }
        
        actionButtonsHtml = `
          <button class="btn ${actionBtnClass} btn-block" onclick="${actionOnClick}">
            ${actionBtnText}
          </button>
        `;
      }
      
      let lessonCount = 0;
      course.modules.forEach(m => lessonCount += m.lessons.length);
      
      html += `
        <div class="course-card">
          <div class="course-card-header" style="background: ${course.thumbnail || 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'}">
            <span class="course-card-tag">${course.category}</span>
            <h3>${course.title}</h3>
          </div>
          <div class="course-card-body">
            <p>${course.description}</p>
            
            <div class="course-meta">
              <span><i class="fas fa-user"></i> ${course.instructor}</span>
              <span><i class="fas fa-clock"></i> ${course.duration}</span>
            </div>
            
            <div class="course-progress-container">
              <div class="progress-label">
                <span>Progreso</span>
                <span>${progress.percent}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width: ${progress.percent}%"></div>
              </div>
            </div>
            
            ${actionButtonsHtml}
          </div>
        </div>
      `;
    }
    
    DOM.studentCoursesGrid.innerHTML = html;
  } catch (error) {
    console.error(error);
    alert('Error en loadStudentDashboard: ' + error.message);
    DOM.studentCoursesGrid.innerHTML = '<p style="color: var(--danger-color); text-align: center; grid-column: 1/-1;">Error al cargar los cursos.</p>';
  }
}

// Validar si el estudiante ya aprobó el examen de un curso
async function checkIfQuizPassed(courseId) {
  if (!currentUser) return false;
  const quizResults = await db.getQuizResults(currentUser.id);
  return quizResults[courseId] && quizResults[courseId].passed;
}

// Iniciar el visualizador del curso (Player)
async function startCourse(courseId) {
  try {
    const course = await db.getCourseById(courseId);
    if (!course) return;
    
    activeCourse = course;
    DOM.playerCourseTitle.textContent = course.title;
    
    // Cargar progreso del curso
    await updatePlayerProgress();
    
    // Renderizar temario
    renderPlayerSyllabus();
    
    // Seleccionar primera clase o lección previamente activa por defecto
    let firstLesson = null;
    if (currentUser) {
      const storedModuleIdx = localStorage.getItem(`edutrack_active_module_idx_${currentUser.id}_${courseId}`);
      const storedLessonIdx = localStorage.getItem(`edutrack_active_lesson_idx_${currentUser.id}_${courseId}`);
      if (storedModuleIdx !== null && storedLessonIdx !== null) {
        const mIdx = parseInt(storedModuleIdx, 10);
        const lIdx = parseInt(storedLessonIdx, 10);
        if (course.modules[mIdx] && course.modules[mIdx].lessons[lIdx]) {
          firstLesson = course.modules[mIdx].lessons[lIdx];
          activeModuleIndex = mIdx;
          activeLessonIndex = lIdx;
        }
      }
    }
    
    if (!firstLesson) {
      for (const m of course.modules) {
        if (m.lessons.length > 0) {
          firstLesson = m.lessons[0];
          activeModuleIndex = course.modules.indexOf(m);
          activeLessonIndex = 0;
          break;
        }
      }
    }
    
    if (firstLesson) {
      selectPlayerLesson(firstLesson, activeModuleIndex, activeLessonIndex);
      showView('view-course-player');
    } else {
      alert('Este curso aún no tiene lecciones creadas por el instructor.');
      if (currentUser.role === 'instructor') {
        loadCourseEditor(courseId);
      }
    }
  } catch (error) {
    console.error(error);
    alert('Error al cargar la clase.');
  }
}

// Actualizar barra de progreso del player y sincronizar caché local
async function updatePlayerProgress() {
  if (!currentUser) return;
  const progress = await db.getCourseProgress(activeCourse.id, currentUser.id);
  DOM.playerProgressText.textContent = `${progress.percent}%`;
  DOM.playerProgressFill.style.width = `${progress.percent}%`;
  
  // Guardar en la caché local para desbloqueo secuencial síncrono instantáneo
  const allUserProgress = JSON.parse(localStorage.getItem(`edutrack_progress_${currentUser.id}`)) || {};
  allUserProgress[activeCourse.id] = {
    completedLessons: progress.completedLessons || [],
    completed: progress.percent === 100
  };
  localStorage.setItem(`edutrack_progress_${currentUser.id}`, JSON.stringify(allUserProgress));
  
  // Habilitar botón de quiz si el progreso es 100%
  const isQuizPassed = await checkIfQuizPassed(activeCourse.id);
  if (progress.percent === 100 && !isQuizPassed) {
    DOM.btnStartQuiz.disabled = false;
    DOM.btnStartQuiz.innerHTML = '<i class="fas fa-award"></i> Realizar Cuestionario Final';
  } else if (isQuizPassed) {
    DOM.btnStartQuiz.disabled = false;
    DOM.btnStartQuiz.innerHTML = '<i class="fas fa-award"></i> Ver Certificado';
    DOM.btnStartQuiz.onclick = () => viewCertificate(activeCourse.id);
  } else {
    DOM.btnStartQuiz.disabled = true;
    DOM.btnStartQuiz.innerHTML = '<i class="fas fa-lock"></i> Completa todas las clases para evaluar';
    DOM.btnStartQuiz.onclick = null;
  }
}

// Renderizar lista de módulos y lecciones en la barra lateral del reproductor
function renderPlayerSyllabus() {
  let html = '';
  
  activeCourse.modules.forEach((mod, mIdx) => {
    html += `
      <div class="module-group">
        <div class="module-title">${mod.title}</div>
    `;
    
    mod.lessons.forEach((les, lIdx) => {
      const isLocked = currentRole === 'student' && !isLessonUnlocked(les.id);
      const isCompleted = isLessonCompletedLocal(les.id);
      const isActive = activeLesson && activeLesson.id === les.id;
      const typeIcon = les.type === 'video' ? 'fa-play-circle' : 'fa-file-alt';
      
      let checkboxContent = '<i class="fas fa-check"></i>';
      let checkboxClass = isCompleted ? 'completed' : '';
      if (isLocked) {
        checkboxContent = '<i class="fas fa-lock" style="font-size: 0.7rem;"></i>';
        checkboxClass = 'locked';
      }
      
      const itemClass = isLocked ? 'locked' : (isActive ? 'active' : '');
      
      html += `
        <div class="lesson-item ${itemClass}" data-lesson-id="${les.id}" onclick="selectLessonById('${les.id}', ${mIdx}, ${lIdx})">
          <div class="lesson-checkbox ${checkboxClass}" onclick="event.stopPropagation(); toggleLessonCheckbox('${les.id}')">
            ${checkboxContent}
          </div>
          <div class="lesson-info">
            <div class="lesson-title-text">${les.title}</div>
            <div class="lesson-meta">
              <i class="far ${typeIcon}"></i>
              <span>${les.duration}</span>
            </div>
          </div>
        </div>
      `;
    });
    
    html += `</div>`;
  });
  
  DOM.playerSyllabusList.innerHTML = html;
}

// Comprobación síncrona rápida de si una lección está completada
function isLessonCompletedLocal(lessonId) {
  if (!currentUser) return false;
  const progress = JSON.parse(localStorage.getItem(`edutrack_progress_${currentUser.id}`)) || {};
  const courseProgress = progress[activeCourse.id];
  return courseProgress && courseProgress.completedLessons.includes(lessonId);
}

// Comprobación de si una lección está desbloqueada (secuencialmente)
function isLessonUnlocked(lessonId) {
  if (!activeCourse) return false;
  if (currentRole === 'instructor') return true;
  
  const progress = JSON.parse(localStorage.getItem(`edutrack_progress_${currentUser.id}`)) || {};
  const courseProgress = progress[activeCourse.id];
  
  // Si el curso completo está finalizado, o si esta lección en específico ya fue completada
  if (courseProgress && (courseProgress.completed || courseProgress.completedLessons.includes(lessonId))) {
    return true;
  }
  
  const allLessons = [];
  activeCourse.modules.forEach(mod => {
    allLessons.push(...mod.lessons);
  });
  
  const index = allLessons.findIndex(l => l.id === lessonId);
  if (index <= 0) return true; // La primera lección siempre está desbloqueada
  
  // Está desbloqueada si todas las lecciones anteriores están completadas
  for (let i = 0; i < index; i++) {
    if (!isLessonCompletedLocal(allLessons[i].id)) {
      return false;
    }
  }
  return true;
}

// Seleccionar lección por ID
window.selectLessonById = function(lessonId, mIdx, lIdx) {
  if (!isLessonUnlocked(lessonId)) {
    alert('Esta lección está bloqueada. Debes completar las lecciones anteriores en orden.');
    return;
  }
  const mod = activeCourse.modules[mIdx];
  const les = mod.lessons[lIdx];
  selectPlayerLesson(les, mIdx, lIdx);
};

// Alternar checkbox de lección completada al hacer click directo
window.toggleLessonCheckbox = async function(lessonId) {
  if (!currentUser) return;
  // Bloquear a los estudiantes el marcar/desmarcar de forma manual
  if (currentRole === 'student') {
    return;
  }
  const progress = await db.toggleLessonComplete(activeCourse.id, lessonId, currentUser.id);
  await updatePlayerProgress();
  renderPlayerSyllabus();
};

// Convertir URL de video compartida (YouTube, Vimeo, Google Drive) a formato embed para Iframe
function getEmbedUrl(url) {
  if (!url) return '';
  
  // YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split(/[?#]/)[0];
    } else if (url.includes('v=')) {
      videoId = url.split('v=')[1].split(/[&#]/)[0];
    } else if (url.includes('embed/')) {
      videoId = url.split('embed/')[1].split(/[?#]/)[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}?controls=1&rel=0&playsinline=1&modestbranding=1&enablejsapi=1` : url;
  }
  
  // Vimeo
  if (url.includes('vimeo.com')) {
    if (url.includes('player.vimeo.com/video/')) {
      return url.includes('?') ? `${url}&playsinline=1&controls=1` : `${url}?playsinline=1&controls=1`;
    }
    const parts = url.split('/');
    const videoId = parts[parts.length - 1].split(/[?#]/)[0];
    return `https://player.vimeo.com/video/${videoId}?playsinline=1&controls=1`;
  }
  
  // Google Drive
  if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
    let fileId = '';
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) {
      fileId = match[1];
    }
    return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url;
  }
  
  return ''; // Si no coincide con ninguno, asumimos archivo de video directo (mp4, etc.)
}

// Cargar y reproducir lección en el reproductor de clases
function selectPlayerLesson(lesson, mIdx, lIdx) {
  activeLesson = lesson;
  activeModuleIndex = mIdx;
  activeLessonIndex = lIdx;
  
  if (currentUser && currentRole === 'student') {
    localStorage.setItem(`edutrack_active_course_${currentUser.id}`, activeCourse.id);
    localStorage.setItem(`edutrack_active_module_idx_${currentUser.id}_${activeCourse.id}`, mIdx);
    localStorage.setItem(`edutrack_active_lesson_idx_${currentUser.id}_${activeCourse.id}`, lIdx);
  }
  
  DOM.playerLessonTitle.textContent = lesson.title;
  DOM.playerLessonNotes.textContent = lesson.notes || 'No hay apuntes o anotaciones registradas para esta clase por el instructor.';
  
  // Resaltar en la lista lateral
  document.querySelectorAll('.lesson-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-lesson-id') === lesson.id);
  });
  
  // Limpiar recursos
  DOM.playerResourcesList.innerHTML = '';
  
  // Configurar recursos/documentos
  if (lesson.type === 'document' || (activeCourse.modules[mIdx].lessons.some(l => l.type === 'document'))) {
    let resourcesHtml = '';
    
    if (lesson.type === 'document') {
      resourcesHtml += `
        <div class="resource-item">
          <div class="resource-info">
            <div class="resource-icon"><i class="fas fa-file-pdf"></i></div>
            <div class="resource-details">
              <h4>${lesson.title} (Documento Principal)</h4>
              <span>Descargar recurso para lectura</span>
            </div>
          </div>
          <a class="btn btn-secondary" href="${lesson.url}" target="_blank" download="${lesson.title}.pdf">
            <i class="fas fa-download"></i> Descargar
          </a>
        </div>
      `;
    }
    
    resourcesHtml += `
      <div class="resource-item">
        <div class="resource-info">
          <div class="resource-icon"><i class="fas fa-link"></i></div>
          <div class="resource-details">
            <h4>Lectura Complementaria de Apoyo</h4>
            <span>Enlace web recomendado por el docente</span>
          </div>
        </div>
        <a class="btn btn-secondary" href="https://developer.mozilla.org/es/" target="_blank">
          <i class="fas fa-external-link-alt"></i> Visitar
        </a>
      </div>
    `;
    
    DOM.playerResourcesList.innerHTML = resourcesHtml;
  } else {
    DOM.playerResourcesList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No se han adjuntado archivos o lecturas para esta clase en específico.</p>';
  }

  // Limpiar cualquier temporizador activo previo y reiniciar variables de progreso de video nativo
  if (iframeCompletionTimer) {
    clearInterval(iframeCompletionTimer);
    iframeCompletionTimer = null;
  }
  maxTimeWatched = 0;
  lastActiveVideoTime = 0;
  
  // Ocultar por defecto los controles de finalización
  if (DOM.videoCompletionContainer) {
    DOM.videoCompletionContainer.style.display = 'none';
  }
  if (DOM.btnCompleteIframeVideo) {
    DOM.btnCompleteIframeVideo.style.display = 'none';
  }
  if (DOM.customPlayerControls) {
    DOM.customPlayerControls.style.display = 'none';
  }
  if (DOM.iframePopoutBlocker) {
    DOM.iframePopoutBlocker.style.display = 'none';
  }
  if (DOM.lessonFeedbackContainer) {
    DOM.lessonFeedbackContainer.style.display = 'none';
  }

  // Cargar video en reproductor HTML5 o Iframe
  if (lesson.type === 'video') {
    const embedUrl = getEmbedUrl(lesson.url);
    const isCompleted = isLessonCompletedLocal(lesson.id);

    if (currentRole === 'student') {
      if (DOM.videoCompletionContainer) {
        DOM.videoCompletionContainer.style.display = 'flex';
      }
    }

    if (embedUrl) {
      // Usar Iframe (YouTube, Vimeo, Google Drive)
      if (DOM.videoPlayer) {
        DOM.videoPlayer.style.display = 'none';
        DOM.videoPlayer.src = '';
      }
      if (DOM.iframePlayer) {
        DOM.iframePlayer.style.display = 'block';
        DOM.iframePlayer.src = embedUrl;
      }
      if (DOM.iframePopoutBlocker) {
        DOM.iframePopoutBlocker.style.display = 'block';
      }

      if (currentRole === 'student') {
        if (isCompleted) {
          if (DOM.videoCompletionText) {
            DOM.videoCompletionText.innerHTML = '<i class="fas fa-check-circle" style="color: var(--success-color);"></i> Has completado esta clase.';
          }
          if (DOM.btnCompleteIframeVideo) {
            DOM.btnCompleteIframeVideo.style.display = 'none';
          }
        } else {
          if (DOM.btnCompleteIframeVideo) {
            DOM.btnCompleteIframeVideo.style.display = 'block';
            DOM.btnCompleteIframeVideo.disabled = true;
          }
          
          const iframeStorageKey = `edutrack_iframe_timer_${currentUser.id}_${lesson.id}`;
          let secondsLeft = 60; // Fijado a 1 minuto (60 segundos) por requerimiento
          const cachedSeconds = localStorage.getItem(iframeStorageKey);
          if (cachedSeconds !== null) {
            const parsedSeconds = parseInt(cachedSeconds, 10);
            if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
              secondsLeft = Math.min(parsedSeconds, 60);
            }
          }

          const formatSeconds = (totalSeconds) => {
            const hrs = Math.floor(totalSeconds / 3600);
            const mins = Math.floor((totalSeconds % 3600) / 60);
            const secs = totalSeconds % 60;
            if (hrs > 0) {
              return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            return `${mins}:${secs.toString().padStart(2, '0')}`;
          };
          
          if (DOM.btnCompleteIframeVideo) {
            DOM.btnCompleteIframeVideo.innerHTML = `<i class="fas fa-lock"></i> Habilitando en ${formatSeconds(secondsLeft)}...`;
          }
          if (DOM.videoCompletionText) {
            DOM.videoCompletionText.innerHTML = '<i class="fas fa-clock" style="color: var(--primary-color);"></i> Reproduce el video para habilitar la finalización.';
          }

          iframeCompletionTimer = setInterval(() => {
            secondsLeft--;
            localStorage.setItem(iframeStorageKey, secondsLeft);
            if (secondsLeft <= 0) {
              clearInterval(iframeCompletionTimer);
              iframeCompletionTimer = null;
              localStorage.removeItem(iframeStorageKey);
              if (DOM.btnCompleteIframeVideo) {
                DOM.btnCompleteIframeVideo.disabled = false;
                DOM.btnCompleteIframeVideo.innerHTML = '<i class="fas fa-check-circle"></i> Marcar como Completado';
              }
              if (DOM.videoCompletionText) {
                DOM.videoCompletionText.innerHTML = '<i class="fas fa-info-circle" style="color: var(--primary-color);"></i> Ya puedes marcar esta clase como completada.';
              }
            } else {
              if (DOM.btnCompleteIframeVideo) {
                DOM.btnCompleteIframeVideo.innerHTML = `<i class="fas fa-lock"></i> Habilitando en ${formatSeconds(secondsLeft)}...`;
              }
            }
          }, 1000);
        }
      }
    } else {
      // Usar Reproductor de Video Nativo (Directo MP4, Blob local)
      if (DOM.iframePlayer) {
        DOM.iframePlayer.style.display = 'none';
        DOM.iframePlayer.src = '';
      }
      if (DOM.videoPlayer) {
        DOM.videoPlayer.style.display = 'block';
        DOM.videoPlayer.src = lesson.url;
        DOM.videoPlayer.load();

        if (DOM.customPlayerControls) {
          DOM.customPlayerControls.style.display = 'flex';
        }

        // Restaurar tiempo guardado para reproductor nativo
        const nativeStorageKey = `edutrack_video_time_${currentUser.id}_${lesson.id}`;
        const savedTime = localStorage.getItem(nativeStorageKey);
        if (savedTime && currentRole === 'student' && !isCompleted) {
          const parsedTime = parseFloat(savedTime);
          if (!isNaN(parsedTime)) {
            const setTime = () => {
              DOM.videoPlayer.currentTime = parsedTime;
              maxTimeWatched = parsedTime;
              lastActiveVideoTime = parsedTime;
            };
            DOM.videoPlayer.addEventListener('loadedmetadata', setTime, { once: true });
          }
        }

        DOM.videoPlayer.play().catch(e => {
          console.log("Auto-reproducción bloqueada por políticas del navegador.");
        });
      }

      if (currentRole === 'student') {
        if (isCompleted) {
          if (DOM.videoCompletionText) {
            DOM.videoCompletionText.innerHTML = '<i class="fas fa-check-circle" style="color: var(--success-color);"></i> Has completado esta clase.';
          }
        } else {
          if (DOM.videoCompletionText) {
            DOM.videoCompletionText.innerHTML = '<i class="fas fa-info-circle" style="color: var(--primary-color);"></i> El video debe reproducirse por completo para marcar la clase como terminada.';
          }
        }
      }
    }
  } else {
    // Si es documento, ocultar ambos y mostrar poster de documento
    if (DOM.iframePlayer) {
      DOM.iframePlayer.style.display = 'none';
      DOM.iframePlayer.src = '';
    }
    if (DOM.videoPlayer) {
      DOM.videoPlayer.style.display = 'block';
      DOM.videoPlayer.src = '';
      DOM.videoPlayer.poster = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="%23131b2e"/><text x="50%" y="45%" font-family="sans-serif" font-size="28" fill="%2394a3b8" text-anchor="middle">Esta lección es de tipo Documento</text><text x="50%" y="55%" font-family="sans-serif" font-size="16" fill="%2364748b" text-anchor="middle">Puedes descargar y leer el archivo en la pestaña "Material de Apoyo"</text></svg>';
    }
    
    if (currentRole === 'student' && !isLessonCompletedLocal(lesson.id)) {
      db.toggleLessonComplete(activeCourse.id, lesson.id, currentUser.id).then(() => {
        updatePlayerProgress();
        renderPlayerSyllabus();
      });
    }
  }
}

let selectedFeedbackRating = 5;

function showLessonFeedbackForm() {
  if (currentRole === 'instructor' || (activeLesson && isLessonCompletedLocal(activeLesson.id))) {
    autoMarkLessonComplete();
    return;
  }
  
  if (DOM.playerFormCustomTitle && activeCourse) {
    const formTitle = activeCourse.formTitle || 'Formulario de Evaluación y Comprensión';
    DOM.playerFormCustomTitle.innerHTML = `<i class="fas fa-clipboard-check" style="color: var(--accent-color);"></i> ${formTitle}`;
  }

  // Renderizar las preguntas asignadas específicamente a esta lección (o fallback al curso)
  const currentQuestions = (activeLesson && activeLesson.quiz && activeLesson.quiz.length > 0)
    ? activeLesson.quiz
    : (activeCourse ? activeCourse.quiz : []);

  if (DOM.feedbackQuestionsDynamicGroup) {
    if (currentQuestions && currentQuestions.length > 0) {
      const totalQuestions = currentQuestions.length;
      if (DOM.questionsGroupWrapper) DOM.questionsGroupWrapper.style.display = 'block';
      if (DOM.groupQuestionsCounter) DOM.groupQuestionsCounter.textContent = `${totalQuestions} preguntas en el grupo`;

      let qHtml = '';
      currentQuestions.forEach((q, qIdx) => {
        qHtml += `
          <div class="feedback-question-card" style="background: var(--bg-tertiary); padding: 16px; border-radius: 12px; border: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
              <span class="question-badge" style="background: rgba(99, 102, 241, 0.12); color: var(--accent-color); font-size: 0.75rem; font-weight: 600; padding: 3px 8px; border-radius: 6px;">
                Pregunta ${qIdx + 1} de ${totalQuestions}
              </span>
              <span style="color: var(--danger-color); font-size: 0.8rem; font-weight: 600;">* Obligatoria</span>
            </div>
            <p style="font-weight: 600; margin-bottom: 12px; color: var(--text-primary); font-size: 0.95rem;">
              ${q.question}
            </p>
            <div class="feedback-options-list" style="display: flex; flex-direction: column; gap: 8px;">
        `;
        (q.options || []).forEach((opt, optIdx) => {
          if (opt && opt.trim()) {
            qHtml += `
              <label style="display: flex; align-items: center; gap: 10px; font-size: 0.9rem; color: var(--text-secondary); cursor: pointer; padding: 8px 12px; border-radius: 8px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); transition: background 0.2s ease;">
                <input type="radio" name="form_question_${qIdx}" value="${optIdx}" required style="accent-color: var(--primary-color); transform: scale(1.1);">
                <span>${opt}</span>
              </label>
            `;
          }
        });
        qHtml += `
            </div>
          </div>
        `;
      });
      DOM.feedbackQuestionsDynamicGroup.innerHTML = qHtml;
    } else {
      if (DOM.questionsGroupWrapper) DOM.questionsGroupWrapper.style.display = 'none';
      DOM.feedbackQuestionsDynamicGroup.innerHTML = '';
    }
  }

  if (DOM.lessonFeedbackContainer) {
    DOM.lessonFeedbackContainer.style.display = 'block';
    DOM.lessonFeedbackContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  if (DOM.feedbackSummary) {
    DOM.feedbackSummary.value = '';
  }
  if (DOM.feedbackComments) {
    DOM.feedbackComments.value = '';
  }
  updateStarRatingUI(5);
}

function updateStarRatingUI(rating) {
  selectedFeedbackRating = rating;
  if (!DOM.starRatingGroup) return;
  const stars = DOM.starRatingGroup.querySelectorAll('.star-icon');
  stars.forEach((star, index) => {
    if (index < rating) {
      star.classList.add('active');
      star.classList.remove('inactive');
    } else {
      star.classList.remove('active');
      star.classList.add('inactive');
    }
  });
  if (DOM.starRatingText) {
    DOM.starRatingText.textContent = `${rating} de 5 estrellas`;
  }
}

window.submitLessonFeedback = async function() {
  if (!currentUser || !activeCourse || !activeLesson) return;
  
  const summary = DOM.feedbackSummary ? DOM.feedbackSummary.value.trim() : '';
  const comments = DOM.feedbackComments ? DOM.feedbackComments.value.trim() : '';
  
  if (!summary) {
    alert('Por favor escribe un breve resumen de lo que aprendiste en esta clase.');
    if (DOM.feedbackSummary) DOM.feedbackSummary.focus();
    return;
  }
  
  if (DOM.btnSubmitFeedback) {
    DOM.btnSubmitFeedback.disabled = true;
    DOM.btnSubmitFeedback.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando y desbloqueando...';
  }
  
  try {
    await db.saveLessonFeedback(activeCourse.id, activeLesson.id, currentUser.id, selectedFeedbackRating, summary, comments);
  } catch (err) {
    console.error('Error guardando feedback:', err);
  }
  
  if (DOM.lessonFeedbackContainer) {
    DOM.lessonFeedbackContainer.style.display = 'none';
  }
  if (DOM.btnSubmitFeedback) {
    DOM.btnSubmitFeedback.disabled = false;
    DOM.btnSubmitFeedback.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Formulario y Desbloquear Siguiente Clase';
  }
  
  await autoMarkLessonComplete();
};

// Marcar lección actual como completada al finalizar el video
async function autoMarkLessonComplete() {
  if (!currentUser) return;
  if (activeLesson && !isLessonCompletedLocal(activeLesson.id)) {
    // Limpiar localStorage de progreso temporal de esta lección al completarse
    localStorage.removeItem(`edutrack_video_time_${currentUser.id}_${activeLesson.id}`);
    localStorage.removeItem(`edutrack_iframe_timer_${currentUser.id}_${activeLesson.id}`);
    
    await db.toggleLessonComplete(activeCourse.id, activeLesson.id, currentUser.id);
    await updatePlayerProgress();
    renderPlayerSyllabus();
    advanceToNextLesson();
  } else {
    advanceToNextLesson();
  }
}

function advanceToNextLesson() {
  let nextModIdx = activeModuleIndex;
  let nextLesIdx = activeLessonIndex + 1;
  
  if (nextLesIdx >= activeCourse.modules[nextModIdx].lessons.length) {
    nextModIdx++;
    nextLesIdx = 0;
  }
  
  if (nextModIdx < activeCourse.modules.length && activeCourse.modules[nextModIdx].lessons.length > 0) {
    const nextLesson = activeCourse.modules[nextModIdx].lessons[nextLesIdx];
    selectPlayerLesson(nextLesson, nextModIdx, nextLesIdx);
  } else {
    if (currentUser) {
      localStorage.removeItem(`edutrack_active_course_${currentUser.id}`);
      localStorage.removeItem(`edutrack_active_module_idx_${currentUser.id}_${activeCourse.id}`);
      localStorage.removeItem(`edutrack_active_lesson_idx_${currentUser.id}_${activeCourse.id}`);
    }
    alert('¡Felicidades! Has terminado de revisar todas las clases del curso.');
  }
}

// ==================== SISTEMA DE EXAMEN (QUIZZES) ====================

function getCourseAllQuestions(course) {
  let questions = [];
  if (course.quiz && Array.isArray(course.quiz) && course.quiz.length > 0) {
    questions = questions.concat(course.quiz);
  }
  if (course.modules && Array.isArray(course.modules)) {
    course.modules.forEach(m => {
      if (m.lessons && Array.isArray(m.lessons)) {
        m.lessons.forEach(l => {
          if (l.quiz && Array.isArray(l.quiz) && l.quiz.length > 0) {
            questions = questions.concat(l.quiz);
          }
        });
      }
    });
  }
  return questions;
}

async function startQuiz(courseId) {
  try {
    const course = await db.getCourseById(courseId);
    if (!course) return;
    
    const allQuestions = getCourseAllQuestions(course);
    if (allQuestions.length === 0) {
      alert('Este curso aún no tiene preguntas de evaluación configuradas por el docente.');
      return;
    }
    
    quizState.courseId = courseId;
    quizState.questions = allQuestions;
    quizState.currentQuestionIndex = 0;
    quizState.answers = [];
    
    DOM.quizCourseTitle.textContent = course.title;
    showView('view-quiz');
    renderQuizQuestion();
  } catch (error) {
    console.error(error);
  }
}

function renderQuizQuestion() {
  const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
  const qNum = quizState.currentQuestionIndex + 1;
  const qTotal = quizState.questions.length;
  
  DOM.quizQuestionNumber.textContent = `Pregunta ${qNum} de ${qTotal}`;
  
  const percent = Math.round((quizState.currentQuestionIndex / qTotal) * 100);
  DOM.quizProgressPercent.textContent = `${percent}% Completado`;
  
  DOM.quizQuestionText.textContent = currentQuestion.question;
  
  let optionsHtml = '';
  currentQuestion.options.forEach((opt, idx) => {
    const letter = String.fromCharCode(65 + idx);
    const isSelected = quizState.answers[quizState.currentQuestionIndex] === idx;
    
    optionsHtml += `
      <button class="option-btn ${isSelected ? 'selected' : ''}" onclick="selectQuizOption(${idx})">
        <div class="option-letter">${letter}</div>
        <div>${opt}</div>
      </button>
    `;
  });
  
  DOM.quizOptionsGroup.innerHTML = optionsHtml;
  
  if (quizState.currentQuestionIndex === qTotal - 1) {
    DOM.btnQuizNext.innerHTML = 'Finalizar Examen <i class="fas fa-check-double"></i>';
  } else {
    DOM.btnQuizNext.innerHTML = 'Siguiente Pregunta <i class="fas fa-arrow-right"></i>';
  }
}

window.selectQuizOption = function(optionIndex) {
  quizState.answers[quizState.currentQuestionIndex] = optionIndex;
  document.querySelectorAll('.option-btn').forEach((btn, idx) => {
    btn.classList.toggle('selected', idx === optionIndex);
  });
};

async function handleQuizNext() {
  const currentAnswer = quizState.answers[quizState.currentQuestionIndex];
  
  if (currentAnswer === undefined) {
    alert('Por favor selecciona una opción antes de continuar.');
    return;
  }
  
  if (quizState.currentQuestionIndex < quizState.questions.length - 1) {
    quizState.currentQuestionIndex++;
    renderQuizQuestion();
  } else {
    await evaluateQuiz();
  }
}

async function evaluateQuiz() {
  if (!currentUser) return;
  
  // 1. Evaluación de preguntas del examen con comparación numérica exacta
  let correctAnswersCount = 0;
  const questionDetails = [];

  quizState.questions.forEach((q, idx) => {
    const userAns = quizState.answers[idx];
    const isCorrect = userAns !== undefined && Number(userAns) === Number(q.correctIndex);
    if (isCorrect) {
      correctAnswersCount++;
    }
    questionDetails.push({
      question: q.question,
      options: q.options,
      correctIndex: Number(q.correctIndex),
      userAnswerIndex: userAns !== undefined ? Number(userAns) : null,
      isCorrect
    });
  });

  const quizPercent = Math.round((correctAnswersCount / quizState.questions.length) * 100);
  
  // 2. Obtener promedio de formularios de lección
  let lessonFormsAvg = 100;
  let hasLessonForms = false;
  try {
    const feedbacks = await db.getCourseLessonFeedbacks(quizState.courseId, currentUser.id);
    if (feedbacks && feedbacks.length > 0) {
      hasLessonForms = true;
      const sum = feedbacks.reduce((acc, fb) => acc + (fb.rating ? Math.round((fb.rating / 5) * 100) : 100), 0);
      lessonFormsAvg = Math.round(sum / feedbacks.length);
    }
  } catch (err) {
    console.warn('Error leyendo formularios de lección:', err);
  }

  // 3. Promedio final acumulado (50% examen + 50% formularios de lección si existen, o 100% examen)
  const finalScorePercent = hasLessonForms 
    ? Math.round((quizPercent + lessonFormsAvg) / 2)
    : quizPercent;
  
  // 4. REGLA ESTRICTA DE ACREDITACIÓN:
  // El alumno DEBE obtener al menos 70% en el examen Y al menos 70% en la nota final acumulada.
  const passed = (quizPercent >= 70) && (finalScorePercent >= 70);
  
  await db.saveQuizResult(quizState.courseId, finalScorePercent, passed, currentUser.id);
  
  // 5. Construir Desglose Visual de Preguntas (Directrices de respuestas correctas e incorrectas)
  let breakdownHtml = '<div style="margin-top: 20px; text-align: left;">';
  breakdownHtml += '<h4 style="margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px; color: var(--text-primary);"><i class="fas fa-list-ol"></i> Desglose de Respuestas de tu Examen:</h4>';
  
  questionDetails.forEach((item, idx) => {
    const userOptionText = item.userAnswerIndex !== null ? item.options[item.userAnswerIndex] : 'Sin responder';
    const correctOptionText = item.options[item.correctIndex];

    if (item.isCorrect) {
      breakdownHtml += `
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 10px;">
          <div style="color: #10b981; font-weight: 600; font-size: 0.9rem;">
            <i class="fas fa-check-circle"></i> Pregunta ${idx + 1}: ${item.question}
          </div>
          <div style="font-size: 0.85rem; color: var(--text-primary); margin-top: 4px;">
            Tu respuesta: <strong style="color: #10b981;">"${userOptionText}"</strong> (✓ Correcto)
          </div>
        </div>
      `;
    } else {
      breakdownHtml += `
        <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 10px;">
          <div style="color: #ef4444; font-weight: 600; font-size: 0.9rem;">
            <i class="fas fa-times-circle"></i> Pregunta ${idx + 1}: ${item.question}
          </div>
          <div style="font-size: 0.85rem; color: #ef4444; margin-top: 4px;">
            Tu respuesta: <strong>"${userOptionText}"</strong> (✗ Incorrecto)
          </div>
        </div>
      `;
    }
  });
  breakdownHtml += '</div>';

  let resultHtml = '';
  
  if (passed) {
    resultHtml += `
      <div class="result-icon-container pass">
        <i class="fas fa-award"></i>
      </div>
      <h2 style="color: #10b981;">¡ESTADO: ACREDITADO!</h2>
      <div class="quiz-result-score" style="color: #10b981;">${finalScorePercent}%</div>
      <p style="font-size: 1rem; color: var(--text-primary);">
        ¡Felicidades! Has acreditado el curso sumando tus evaluaciones y examen.<br>
        <span class="badge badge-success" style="font-size: 0.85rem; margin-top: 8px; display: inline-block; padding: 6px 12px;">
          <i class="fas fa-check-circle"></i> Examen: ${quizPercent}% | Promedio Final: ${finalScorePercent}% (Acreditado >= 70%)
        </span>
      </p>
      
      ${breakdownHtml}

      <div class="form-group" style="max-width: 420px; margin: 20px auto 25px auto; text-align: left;">
        <label for="student-cert-name" style="font-weight:600;">Nombre completo para tu reconocimiento oficial:</label>
        <input type="text" class="form-control" id="student-cert-name" placeholder="Tu Nombre Completo" required value="${currentUser.fullName || currentUser.username}">
      </div>
      
      <div style="display: flex; gap: 15px; justify-content: center; margin-top: 15px;">
        <button class="btn btn-secondary" onclick="showView('view-student-dashboard')">Volver a Cursos</button>
        <button class="btn btn-success" onclick="issueStudentCertificate('${quizState.courseId}')">Generar Reconocimiento <i class="fas fa-award"></i></button>
      </div>
    `;
  } else {
    resultHtml += `
      <div class="result-icon-container fail">
        <i class="fas fa-times-circle"></i>
      </div>
      <h2 style="color: #ef4444;">¡ESTADO: DESACREDITADO!</h2>
      <div class="quiz-result-score" style="color: #ef4444;">${finalScorePercent}%</div>
      <p style="font-size: 1rem; color: var(--text-primary);">
        ${quizPercent < 70 ? `Obtuviste <strong>${quizPercent}%</strong> en el examen. Se requiere un mínimo del <strong>70% en el examen</strong> para acreditar.` : `Tu promedio acumulado final fue de <strong>${finalScorePercent}%</strong> (menor al 70% requerido).`}<br>
        <span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); font-size: 0.85rem; margin-top: 8px; display: inline-block; padding: 6px 12px;">
          <i class="fas fa-exclamation-triangle"></i> Desacreditado: Se requiere 70% o más para recibir el reconocimiento
        </span>
      </p>
      
      ${breakdownHtml}

      <div style="display: flex; gap: 15px; justify-content: center; margin-top: 20px;">
        <button class="btn btn-secondary" onclick="showView('view-student-dashboard')">Volver a Cursos</button>
        <button class="btn btn-primary" onclick="startQuiz('${quizState.courseId}')">Reintentar Evaluación <i class="fas fa-redo"></i></button>
      </div>
    `;
  }
  
  DOM.quizResultCard.innerHTML = resultHtml;
  showView('view-quiz-result');
}

window.issueStudentCertificate = async function(courseId) {
  if (!currentUser) return;
  const nameInput = document.getElementById('student-cert-name');
  const studentName = nameInput ? nameInput.value.trim() : currentUser.username;
  
  if (!studentName) {
    alert('Ingresa tu nombre completo.');
    return;
  }
  
  try {
    await db.issueCertificate(courseId, studentName, currentUser.id);
    viewCertificate(courseId);
  } catch (err) {
    console.error(err);
  }
};

function exitQuiz() {
  if (confirm('¿Seguro que deseas salir del cuestionario? Perderás tu progreso actual.')) {
    showView('view-student-dashboard');
    loadStudentDashboard();
  }
}

// ==================== GENERADOR Y VISUALIZADOR DE CERTIFICADOS ====================

async function viewCertificate(courseId) {
  if (!currentUser) return;
  try {
    const cert = await db.getCertificateForCourse(courseId, currentUser.id);
    if (!cert) {
      alert('Aún no has desbloqueado este certificado.');
      return;
    }
    
    DOM.certDisplayStudent.textContent = cert.studentName;
    DOM.certDisplayCourse.textContent = cert.courseTitle;
    DOM.certDisplaySignature.textContent = cert.instructor;
    DOM.certDisplayInstructor.textContent = cert.instructor;
    DOM.certDisplayDate.textContent = cert.issueDate;
    DOM.certDisplayCode.textContent = cert.verificationCode;
    
    drawCertificateCanvas(cert);
    showView('view-certificate');
  } catch (error) {
    console.error(error);
  }
}

function drawCertificateCanvas(cert) {
  const canvas = DOM.certCanvas;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  
  ctx.fillStyle = '#faf8f5';
  ctx.fillRect(0, 0, w, h);
  
  const grad = ctx.createRadialGradient(w/2, h/2, 200, w/2, h/2, w/2);
  grad.addColorStop(0, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(226,232,240,0.4)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  
  ctx.lineWidth = 40;
  ctx.strokeStyle = '#1e293b';
  ctx.strokeRect(20, 20, w - 40, h - 40);
  
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#d97706';
  ctx.strokeRect(55, 55, w - 110, h - 110);
  
  ctx.lineWidth = 2;
  ctx.strokeRect(67, 67, w - 134, h - 134);
  
  drawCorners(ctx, 55, w - 55, 55, h - 55);
  
  ctx.fillStyle = '#4f46e5';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎓 EDUTRACK PLATFORM', w/2, 180);
  
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('CERTIFICADO DE FINALIZACIÓN', w/2, 260);
  
  ctx.fillStyle = '#64748b';
  ctx.font = '300 italic 28px sans-serif';
  ctx.fillText('Otorgado con orgullo a:', w/2, 400);
  
  ctx.fillStyle = '#0f172a';
  ctx.font = 'italic 76px Georgia, serif';
  ctx.fillText(cert.studentName, w/2, 520);
  
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(w/2 - 400, 580);
  ctx.lineTo(w/2 + 400, 580);
  ctx.stroke();
  
  ctx.fillStyle = '#475569';
  ctx.font = '28px sans-serif';
  ctx.fillText('Por haber completado y aprobado con éxito la currícula total del curso formativo:', w/2, 650);
  
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 46px sans-serif';
  ctx.fillText(cert.courseTitle, w/2, 730);
  
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(250, 1050);
  ctx.lineTo(550, 1050);
  ctx.stroke();
  
  ctx.fillStyle = '#4f46e5';
  ctx.font = 'italic 40px Georgia, serif';
  ctx.fillText(cert.instructor, 400, 1010);
  
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(cert.instructor, 400, 1085);
  
  ctx.fillStyle = '#64748b';
  ctx.font = '18px sans-serif';
  ctx.fillText('Instructor del Curso', 400, 1120);
  
  drawGoldSeal(ctx, w/2, 1040);
  drawMockQRCode(ctx, w - 500, 960, 140);
  
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = '18px sans-serif';
  ctx.fillText(`Fecha Emisión: ${cert.issueDate}`, w - 340, 1030);
  ctx.fillText(`ID Registro: ${cert.verificationCode}`, w - 340, 1065);
}

function drawCorners(ctx, x1, x2, y1, y2) {
  const size = 30;
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x1 + size, y1); ctx.lineTo(x1, y1); ctx.lineTo(x1, y1 + size); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2 - size, y1); ctx.lineTo(x2, y1); ctx.lineTo(x2, y1 + size); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1 + size, y2); ctx.lineTo(x1, y2); ctx.lineTo(x1, y2 - size); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2 - size, y2); ctx.lineTo(x2, y2); ctx.lineTo(x2, y2 - size); ctx.stroke();
}

function drawGoldSeal(ctx, cx, cy) {
  const radius = 70;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#d97706';
  for (let i = 0; i < 30; i++) {
    ctx.rotate(Math.PI / 15);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-10, -radius - 10);
    ctx.lineTo(0, -radius - 20);
    ctx.lineTo(10, -radius - 10);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  
  const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
  grad.addColorStop(0, '#fcd34d');
  grad.addColorStop(1, '#b45309');
  
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 8, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.fillStyle = '#78350f';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('APROBADO', cx, cy - 8);
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('EDUTRACK ACADEMY', cx, cy + 12);
}

function drawMockQRCode(ctx, x, y, size) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 10, y - 10, size + 20, size + 20);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 10, y - 10, size + 20, size + 20);
  
  ctx.fillStyle = '#000000';
  const finderSize = size * 0.28;
  drawFinderPattern(ctx, x, y, finderSize);
  drawFinderPattern(ctx, x + size - finderSize, y, finderSize);
  drawFinderPattern(ctx, x, y + size - finderSize, finderSize);
  
  const gridCount = 14;
  const cellSize = size / gridCount;
  for (let r = 0; r < gridCount; r++) {
    for (let c = 0; c < gridCount; c++) {
      const isTopLeft = r < 4 && c < 4;
      const isTopRight = r < 4 && c >= gridCount - 4;
      const isBottomLeft = r >= gridCount - 4 && c < 4;
      if (!isTopLeft && !isTopRight && !isBottomLeft) {
        if (Math.random() > 0.45) {
          ctx.fillRect(x + c * cellSize, y + r * cellSize, cellSize + 0.5, cellSize + 0.5);
        }
      }
    }
  }
}

function drawFinderPattern(ctx, px, py, size) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(px, py, size, size);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(px + size * 0.2, py + size * 0.2, size * 0.6, size * 0.6);
  ctx.fillStyle = '#000000';
  ctx.fillRect(px + size * 0.35, py + size * 0.35, size * 0.3, size * 0.3);
}

function downloadCertificatePNG() {
  const link = document.createElement('a');
  link.download = `Certificado_${activeCourse.title.replace(/\s+/g, '_')}.png`;
  link.href = DOM.certCanvas.toDataURL('image/png');
  link.click();
}

// Obtener la lista de categorías (combinando localStorage y base de datos)
async function getCategoriesList() {
  const defaultCats = ['Programación', 'Diseño', 'Negocios', 'Fotografía', 'Idiomas', 'Música'];
  let localCats = localStorage.getItem('edutrack_categories');
  if (localCats) {
    try {
      localCats = JSON.parse(localCats);
    } catch (e) {
      localCats = defaultCats;
    }
  } else {
    localCats = defaultCats;
    localStorage.setItem('edutrack_categories', JSON.stringify(localCats));
  }
  
  try {
    const courses = await db.getCourses();
    const dbCategories = courses.map(c => c.category).filter(Boolean);
    const merged = [...new Set([...localCats, ...dbCategories])];
    return merged;
  } catch (err) {
    console.error('Error al obtener cursos para categorías:', err);
    return localCats;
  }
}

// Poblar dinámicamente el selector de categorías de cursos (Dropdown Personalizado)
async function populateCategoriesDatalist() {
  const menu = DOM.categoryDropdownMenu;
  if (!menu) return;
  try {
    const allCategories = await getCategoriesList();
    
    let html = allCategories.map(cat => `
      <div class="custom-dropdown-item" onclick="selectDropdownCategory('${cat}')">
        <span>${cat}</span>
        <div class="item-actions">
          <i class="fas fa-pencil-alt" onclick="renameDropdownCategory(event, '${cat}')" title="Editar nombre"></i>
          <i class="fas fa-trash" onclick="deleteDropdownCategory(event, '${cat}')" title="Eliminar"></i>
        </div>
      </div>
    `).join('');
    
    html += `
      <div class="custom-dropdown-item create-new-item" onclick="createDropdownCategory()">
        <i class="fas fa-plus"></i>
        <span>+ Crear Nueva Categoría...</span>
      </div>
    `;
    
    menu.innerHTML = html;
  } catch (err) {
    console.error('Error al poblar dropdown de categorías:', err);
  }
}

// Cambiar la categoría seleccionada
window.selectDropdownCategory = function(catName) {
  selectedCategory = catName;
  if (DOM.selectedCategoryText) {
    DOM.selectedCategoryText.textContent = catName;
  }
  if (DOM.categoryDropdownMenu) {
    DOM.categoryDropdownMenu.style.display = 'none';
  }
};

// Crear nueva categoría inline por diálogo prompt
window.createDropdownCategory = async function() {
  const newCat = prompt('Escribe el nombre de la nueva categoría:');
  if (newCat && newCat.trim()) {
    const catClean = newCat.trim();
    
    let cats = await getCategoriesList();
    if (!cats.includes(catClean)) {
      cats.push(catClean);
      localStorage.setItem('edutrack_categories', JSON.stringify(cats));
    }
    
    selectDropdownCategory(catClean);
    await populateCategoriesDatalist();
  }
};

// Renombrar categoría globalmente
window.renameDropdownCategory = async function(e, oldName) {
  e.stopPropagation();
  const newName = prompt(`Cambiar nombre de la categoría "${oldName}" a:`, oldName);
  if (newName && newName.trim() && newName.trim() !== oldName) {
    const nameClean = newName.trim();
    try {
      // 1. Actualizar en localStorage
      let cats = await getCategoriesList();
      cats = cats.map(c => c === oldName ? nameClean : c);
      localStorage.setItem('edutrack_categories', JSON.stringify(cats));
      
      // 2. Actualizar en la base de datos de Supabase para cursos vinculados
      const courses = await db.getCourses();
      const coursesToUpdate = courses.filter(c => c.category === oldName);
      for (const course of coursesToUpdate) {
        course.category = nameClean;
        await db.updateCourse(course.id, course);
      }
      
      alert(`Categoría renombrada con éxito.`);
      
      if (selectedCategory === oldName) {
        selectDropdownCategory(nameClean);
      }
      
      await populateCategoriesDatalist();
      await loadInstructorDashboard();
      await loadStudentDashboard();
    } catch (err) {
      console.error(err);
      alert('Error al renombrar la categoría: ' + err.message);
    }
  }
};

// Eliminar categoría globalmente
window.deleteDropdownCategory = async function(e, catName) {
  e.stopPropagation();
  if (confirm(`¿Estás seguro de eliminar la categoría "${catName}"?\nTodos los cursos en esta categoría se cambiarán a "General".`)) {
    try {
      // 1. Actualizar en localStorage
      let cats = await getCategoriesList();
      cats = cats.filter(c => c !== catName);
      localStorage.setItem('edutrack_categories', JSON.stringify(cats));
      
      // 2. Actualizar en la base de datos de Supabase para cursos vinculados
      const courses = await db.getCourses();
      const coursesToUpdate = courses.filter(c => c.category === catName);
      for (const course of coursesToUpdate) {
        course.category = 'General';
        await db.updateCourse(course.id, course);
      }
      
      alert(`Categoría "${catName}" eliminada con éxito.`);
      
      if (selectedCategory === catName) {
        selectDropdownCategory('General');
      }
      
      await populateCategoriesDatalist();
      await loadInstructorDashboard();
      await loadStudentDashboard();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar la categoría: ' + err.message);
    }
  }
};



// Renderizar filtros de categorías dinámicos
function renderCategoryFilters(containerId, courses, activeCategory, onClickCallbackName) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const categories = ['Todos', ...new Set(courses.map(c => c.category).filter(Boolean))];
  
  container.innerHTML = categories.map(cat => {
    const isActive = cat === activeCategory;
    return `
      <button class="category-filter-btn ${isActive ? 'active' : ''}" onclick="${onClickCallbackName}('${cat}')">
        ${cat}
      </button>
    `;
  }).join('');
}

// Controladores globales para clics en los filtros de categorías
window.filterStudentCategory = function(category) {
  activeStudentCategory = category;
  loadStudentDashboard();
};

window.filterInstructorCategory = function(category) {
  activeInstructorCategory = category;
  loadInstructorDashboard();
};

// ==================== PANEL INSTRUCTOR / ADMINISTRADOR ====================

async function loadInstructorDashboard() {
  switchInstructorTab('courses');
  try {
    await populateCategoriesDatalist();
    const courses = await db.getCourses();
    const certificates = await db.getCertificates();
    
    DOM.statTotalCourses.textContent = courses.length;
    DOM.statTotalCertificates.textContent = certificates.length;
    
    // Contar usuarios con rol student que se han evaluado
    const users = await db.getUsers();
    let quizTakers = 0;
    
    for (const u of users) {
      const uResults = await db.getQuizResults(u.id);
      if (Object.keys(uResults).length > 0) quizTakers++;
    }
    DOM.statActiveStudents.textContent = quizTakers;
    
    // Renderizar los filtros de categorías
    renderCategoryFilters('instructor-category-filters', courses, activeInstructorCategory, 'filterInstructorCategory');
    
    const coursesToRender = activeInstructorCategory === 'Todos'
      ? courses
      : courses.filter(c => c.category === activeInstructorCategory);
      
    if (courses.length === 0) {
      DOM.instructorCoursesGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <i class="fas fa-folder-plus"></i>
          <h3>No has creado cursos</h3>
          <p>Comienza a compartir tus conocimientos creando un curso y subiendo tu plan de estudios.</p>
        </div>
      `;
    } else if (coursesToRender.length === 0) {
      DOM.instructorCoursesGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1; padding: 30px;">
          <i class="fas fa-search"></i>
          <h3>Sin cursos</h3>
          <p>No tienes cursos administrados en la categoría <strong>"${activeInstructorCategory}"</strong>.</p>
        </div>
      `;
    } else {
      let coursesHtml = '';
      coursesToRender.forEach(course => {
        let lessonCount = 0;
        course.modules.forEach(m => lessonCount += m.lessons.length);
        
        coursesHtml += `
          <div class="course-card">
            <div class="course-card-header" style="background: ${course.thumbnail || 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)'}">
              <span class="course-card-tag">${course.category}</span>
              <h3>${course.title}</h3>
            </div>
            <div class="course-card-body">
              <p>${course.description}</p>
              <div class="course-meta">
                <span><i class="fas fa-list"></i> ${course.modules.length} Módulos</span>
                <span><i class="fas fa-video"></i> ${lessonCount} Clases</span>
              </div>
              <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button class="btn btn-secondary" style="flex: 1;" onclick="loadCourseEditor('${course.id}')">
                  <i class="fas fa-edit"></i> Administrar
                </button>
                <button class="btn btn-danger" style="padding: 10px 15px;" onclick="deleteCourse('${course.id}')" title="Eliminar Curso">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      });
      DOM.instructorCoursesGrid.innerHTML = coursesHtml;
    }
    
    if (certificates.length === 0) {
      DOM.studentRegistryRows.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 30px;">
            Aún no se han emitido certificados a ningún alumno.
          </td>
        </tr>
      `;
    } else {
      let tableRows = '';
      certificates.forEach(cert => {
        tableRows += `
          <tr>
            <td><strong style="font-family: monospace;">${cert.verificationCode}</strong></td>
            <td>${cert.studentName}</td>
            <td>${cert.courseTitle}</td>
            <td>${cert.issueDate}</td>
            <td><span class="badge badge-success">Aprobado / Certificado</span></td>
          </tr>
        `;
      });
      DOM.studentRegistryRows.innerHTML = tableRows;
    }
  } catch (error) {
    console.error(error);
    alert('Error al cargar el panel de administrador: ' + error.message);
  }
}

let allInstructorStudents = [];

function switchInstructorTab(tab) {
  if (tab === 'courses') {
    if (DOM.btnInsCoursesTab) DOM.btnInsCoursesTab.classList.add('active');
    if (DOM.btnInsStudentsTab) DOM.btnInsStudentsTab.classList.remove('active');
    if (DOM.insCoursesSection) DOM.insCoursesSection.classList.add('active');
    if (DOM.insStudentsSection) DOM.insStudentsSection.classList.remove('active');
  } else {
    if (DOM.btnInsStudentsTab) DOM.btnInsStudentsTab.classList.add('active');
    if (DOM.btnInsCoursesTab) DOM.btnInsCoursesTab.classList.remove('active');
    if (DOM.insStudentsSection) DOM.insStudentsSection.classList.add('active');
    if (DOM.insCoursesSection) DOM.insCoursesSection.classList.remove('active');
    loadInstructorStudentsTable();
  }
}

async function loadInstructorStudentsTable() {
  if (!DOM.studentsTableBody) return;
  try {
    DOM.studentsTableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 30px;">
          <i class="fas fa-spinner fa-spin"></i> Cargando lista de usuarios...
        </td>
      </tr>
    `;
    const users = await db.getUsers();
    allInstructorStudents = users;
    renderStudentsTableRows(allInstructorStudents);
  } catch (err) {
    console.error('Error al cargar lista de usuarios:', err);
    DOM.studentsTableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--danger-color); padding: 30px;">
          Error al cargar usuarios: ${err.message}
        </td>
      </tr>
    `;
  }
}

function filterStudentsTable() {
  const query = DOM.studentSearchInput ? DOM.studentSearchInput.value.trim().toLowerCase() : '';
  if (!query) {
    renderStudentsTableRows(allInstructorStudents);
    return;
  }
  const filtered = allInstructorStudents.filter(s => 
    (s.username && s.username.toLowerCase().includes(query)) ||
    (s.email && s.email.toLowerCase().includes(query)) ||
    (s.phone && s.phone.includes(query))
  );
  renderStudentsTableRows(filtered);
}

async function renderStudentsTableRows(studentsList) {
  if (!DOM.studentsTableBody) return;
  if (!studentsList || studentsList.length === 0) {
    DOM.studentsTableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 30px;">
          No se encontraron usuarios registrados.
        </td>
      </tr>
    `;
    return;
  }

  const courses = await db.getCourses();
  const courseMap = {};
  courses.forEach(c => {
    courseMap[c.id] = c.title;
  });

  let rowsHtml = '';

  studentsList.forEach(student => {
    const regDate = student.registeredAt ? new Date(student.registeredAt).toLocaleDateString() : 'N/A';
    const assignedIds = student.assignedCourses || [];
    const displayName = student.fullName || student.username || 'Usuario';
    const isInstructor = student.role === 'instructor';
    
    let coursesTags = '<span style="color: var(--text-secondary); font-size: 0.8rem; font-style: italic;">Sin cursos asignados</span>';
    if (assignedIds.length > 0) {
      coursesTags = assignedIds.map(id => {
        const title = courseMap[id] || id;
        return `<span class="badge" style="background: rgba(99, 102, 241, 0.15); color: var(--primary-color); border: 1px solid rgba(99, 102, 241, 0.3); font-size: 0.75rem; margin-right: 4px; margin-bottom: 4px; display: inline-block;">${title}</span>`;
      }).join('');
    }

    rowsHtml += `
      <tr>
        <td>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div>
              <strong style="color: var(--text-primary); font-size: 0.95rem;">${displayName}</strong>
              ${isInstructor ? '<span class="badge badge-success" style="font-size: 0.7rem; margin-left: 6px;"><i class="fas fa-user-shield"></i> Admin</span>' : ''}
            </div>
            <button class="btn btn-secondary btn-sm" onclick="editStudentName('${student.id}', '${displayName.replace(/'/g, "\\'")}')" style="padding: 2px 8px; font-size: 0.75rem;" title="Corregir Nombre del Alumno">
              <i class="fas fa-edit" style="color: var(--accent-color);"></i> Editar Nombre
            </button>
          </div>
        </td>
        <td>${student.email || 'N/A'}</td>
        <td>${student.phone || 'N/A'}</td>
        <td>${regDate}</td>
        <td>${coursesTags}</td>
        <td style="text-align: center; white-space: nowrap;">
          <button class="btn btn-primary btn-sm" onclick="openAssignCoursesModal('${student.id}')" style="padding: 4px 10px; font-size: 0.75rem;">
            <i class="fas fa-book-reader"></i> Asignar Cursos
          </button>
          <button class="btn ${isInstructor ? 'btn-danger' : 'btn-success'} btn-sm" onclick="toggleUserRole('${student.id}')" style="padding: 4px 10px; font-size: 0.75rem; margin-left: 4px;" title="${isInstructor ? 'Quitar permisos de administrador' : 'Promover a administrador'}">
            <i class="fas ${isInstructor ? 'fa-user-slash' : 'fa-user-shield'}"></i> ${isInstructor ? 'Quitar Admin' : 'Hacer Admin'}
          </button>
        </td>
      </tr>
    `;
  });

  DOM.studentsTableBody.innerHTML = rowsHtml;
}

window.toggleUserRole = async function(userId) {
  let student = (allInstructorStudents || []).find(u => u.id === userId);
  if (!student) {
    try {
      const users = await db.getUsers();
      student = users.find(u => u.id === userId);
    } catch (e) {}
  }
  
  if (!student) {
    alert('No se pudo encontrar la información del usuario.');
    return;
  }

  const studentName = student.fullName || student.username || student.email || 'Usuario';
  const isCurrentlyAdmin = student.role === 'instructor';
  const newRole = isCurrentlyAdmin ? 'student' : 'instructor';
  const roleLabel = newRole === 'instructor' ? 'Administrador / Instructor' : 'Estudiante';
  
  const confirmMsg = isCurrentlyAdmin
    ? `¿Estás seguro de que deseas quitar los permisos de Administrador a "${studentName}"?\n\nVolverá a ser Estudiante y se le revocará el acceso al panel de administración.`
    : `¿Estás seguro de que deseas promover a "${studentName}" a Administrador / Instructor?\n\nTendrá acceso completo a crear cursos, administrar temarios y gestionar alumnos.`;

  if (confirm(confirmMsg)) {
    try {
      await db.updateUserRole(userId, newRole);
      
      student.role = newRole;
      
      alert(`¡El rol de "${studentName}" ha sido actualizado con éxito a ${roleLabel}!`);
      
      if (currentUser && currentUser.id === userId) {
        currentUser.role = newRole;
        localStorage.setItem('edutrack_current_user', JSON.stringify(currentUser));
        setupAuthenticatedUI();
      }
      
      await loadInstructorStudentsTable();
    } catch (err) {
      console.error('Error al cambiar rol:', err);
      alert('Error al cambiar el rol: ' + (err.message || err));
    }
  }
};

window.editStudentName = async function(userId, currentName) {
  const newName = prompt(`Corregir el nombre del alumno "${currentName}" a:`, currentName);
  if (newName && newName.trim() && newName.trim() !== currentName) {
    const cleanName = newName.trim();
    try {
      await db.updateStudentName(userId, cleanName);
      alert(`Nombre actualizado a "${cleanName}" correctamente.`);
      
      if (currentUser && currentUser.id === userId) {
        currentUser.username = cleanName;
        if (DOM.userDisplayName) DOM.userDisplayName.textContent = cleanName;
      }

      await loadInstructorDashboard();
      await loadInstructorStudentsTable();
    } catch (err) {
      console.error(err);
      alert('Error al actualizar el nombre del estudiante: ' + err.message);
    }
  }
};

async function startNewCourseEditor() {
  await populateCategoriesDatalist();
  editingCourse = {
    id: null,
    title: '',
    description: '',
    instructor: currentUser ? currentUser.username : 'Instructor Principal',
    category: 'Programación',
    difficulty: 'Principiante',
    thumbnail: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    modules: [],
    quiz: []
  };
  
  DOM.editCourseTitle.value = '';
  DOM.editCourseDescription.value = '';
  DOM.editCourseInstructor.value = editingCourse.instructor;
  selectDropdownCategory('Programación');
  DOM.editCourseDifficulty.value = 'Principiante';
  DOM.editCourseTheme.value = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  
  DOM.curriculumBuilderList.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-layer-group"></i>
      <h4>No hay módulos</h4>
      <p>Crea módulos organizacionales para estructurar tus clases.</p>
    </div>
  `;
  DOM.quizBuilderQuestionsList.innerHTML = '';
  showView('view-course-editor');
}

async function loadCourseEditor(courseId) {
  try {
    await populateCategoriesDatalist();
    const course = await db.getCourseById(courseId);
    if (!course) return;
    
    editingCourse = JSON.parse(JSON.stringify(course));
    
    DOM.editCourseTitle.value = editingCourse.title;
    DOM.editCourseDescription.value = editingCourse.description;
    DOM.editCourseInstructor.value = editingCourse.instructor;
    
    selectDropdownCategory(editingCourse.category || 'Programación');
    
    DOM.editCourseDifficulty.value = editingCourse.difficulty;
    DOM.editCourseTheme.value = editingCourse.thumbnail;
    
    renderEditorCurriculum();
    renderEditorQuiz();
    showView('view-course-editor');
  } catch (err) {
    console.error(err);
  }
}

let lessonAccordionStates = {};
let lessonQuestionCollapsedStates = {};

window.toggleLessonQuizAccordion = function(mIdx, lIdx) {
  const key = `${mIdx}_${lIdx}`;
  lessonAccordionStates[key] = !lessonAccordionStates[key];
  renderEditorCurriculum();
};

window.toggleLessonQuestionCollapse = function(mIdx, lIdx, qIdx) {
  const key = `${mIdx}_${lIdx}_${qIdx}`;
  lessonQuestionCollapsedStates[key] = !lessonQuestionCollapsedStates[key];
  renderEditorCurriculum();
};

window.addLessonQuizQuestion = function(mIdx, lIdx) {
  if (!editingCourse.modules[mIdx] || !editingCourse.modules[mIdx].lessons[lIdx]) return;
  const lesson = editingCourse.modules[mIdx].lessons[lIdx];
  if (!lesson.quiz) lesson.quiz = [];
  lesson.quiz.push({
    question: 'Nueva Pregunta de Evaluación',
    options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
    correctIndex: 0
  });
  lessonAccordionStates[`${mIdx}_${lIdx}`] = true;
  renderEditorCurriculum();
};

window.removeLessonQuizQuestion = function(mIdx, lIdx, qIdx) {
  if (!editingCourse.modules[mIdx] || !editingCourse.modules[mIdx].lessons[lIdx]) return;
  const lesson = editingCourse.modules[mIdx].lessons[lIdx];
  if (lesson.quiz) {
    lesson.quiz.splice(qIdx, 1);
    renderEditorCurriculum();
  }
};

window.moveLessonQuizQuestion = function(mIdx, lIdx, qIdx, dir) {
  if (!editingCourse.modules[mIdx] || !editingCourse.modules[mIdx].lessons[lIdx]) return;
  const quiz = editingCourse.modules[mIdx].lessons[lIdx].quiz;
  if (!quiz) return;
  
  if (dir === 'up' && qIdx > 0) {
    const temp = quiz[qIdx];
    quiz[qIdx] = quiz[qIdx - 1];
    quiz[qIdx - 1] = temp;
  } else if (dir === 'down' && qIdx < quiz.length - 1) {
    const temp = quiz[qIdx];
    quiz[qIdx] = quiz[qIdx + 1];
    quiz[qIdx + 1] = temp;
  }
  renderEditorCurriculum();
};

window.updateLessonQuizQuestion = function(mIdx, lIdx, qIdx, field, val) {
  if (editingCourse.modules[mIdx] && editingCourse.modules[mIdx].lessons[lIdx]) {
    const quiz = editingCourse.modules[mIdx].lessons[lIdx].quiz;
    if (quiz && quiz[qIdx]) {
      quiz[qIdx][field] = val;
    }
  }
};

window.updateLessonQuizOption = function(mIdx, lIdx, qIdx, optIdx, val) {
  if (editingCourse.modules[mIdx] && editingCourse.modules[mIdx].lessons[lIdx]) {
    const quiz = editingCourse.modules[mIdx].lessons[lIdx].quiz;
    if (quiz && quiz[qIdx]) {
      if (!quiz[qIdx].options) quiz[qIdx].options = ['', '', '', ''];
      quiz[qIdx].options[optIdx] = val;
    }
  }
};

function renderLessonQuizQuestionsHtml(mIdx, lIdx, questions) {
  if (!questions || questions.length === 0) {
    return `<p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0; text-align: center; padding: 12px; background: rgba(255,255,255,0.02); border-radius: 8px;">No has agregado preguntas a este video. Haz clic en "+ Agregar Pregunta a este Video".</p>`;
  }

  return questions.map((q, qIdx) => {
    const isCollapsed = lessonQuestionCollapsedStates[`${mIdx}_${lIdx}_${qIdx}`] || false;
    const textPreview = q.question ? `: ${q.question.substring(0, 30)}...` : '';
    
    return `
      <div class="lesson-q-card ${isCollapsed ? 'collapsed' : ''}" style="background: var(--bg-tertiary); padding: 12px; border-radius: 10px; border: 1px solid var(--border-color); margin-bottom: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: ${isCollapsed ? '0' : '10px'};">
          <span style="font-weight: 600; font-size: 0.85rem; color: var(--accent-color); flex: 1; cursor: pointer;" onclick="toggleLessonQuestionCollapse(${mIdx}, ${lIdx}, ${qIdx})">
            Pregunta ${qIdx + 1}${textPreview}
          </span>
          <div style="display: flex; gap: 4px;">
            <button type="button" class="btn btn-secondary btn-sm" title="Mover Arriba" onclick="moveLessonQuizQuestion(${mIdx}, ${lIdx}, ${qIdx}, 'up')" ${qIdx === 0 ? 'disabled' : ''} style="padding: 2px 6px; font-size: 0.7rem;">
              <i class="fas fa-arrow-up"></i>
            </button>
            <button type="button" class="btn btn-secondary btn-sm" title="Mover Abajo" onclick="moveLessonQuizQuestion(${mIdx}, ${lIdx}, ${qIdx}, 'down')" ${qIdx === questions.length - 1 ? 'disabled' : ''} style="padding: 2px 6px; font-size: 0.7rem;">
              <i class="fas fa-arrow-down"></i>
            </button>
            <button type="button" class="btn btn-secondary btn-sm" title="Contraer/Expandir" onclick="toggleLessonQuestionCollapse(${mIdx}, ${lIdx}, ${qIdx})" style="padding: 2px 6px; font-size: 0.7rem;">
              <i class="fas ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
            </button>
            <button type="button" class="btn btn-secondary btn-sm" title="Eliminar Pregunta" onclick="removeLessonQuizQuestion(${mIdx}, ${lIdx}, ${qIdx})" style="padding: 2px 6px; font-size: 0.7rem; color: var(--danger-color);">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>

        <div class="q-card-body" style="display: ${isCollapsed ? 'none' : 'block'};">
          <div class="form-group" style="margin-bottom: 8px;">
            <label style="font-size: 0.8rem;">Texto de la Pregunta</label>
            <input type="text" class="form-control form-control-sm" placeholder="¿Qué significa...?" value="${q.question || ''}" oninput="updateLessonQuizQuestion(${mIdx}, ${lIdx}, ${qIdx}, 'question', this.value)" onchange="updateLessonQuizQuestion(${mIdx}, ${lIdx}, ${qIdx}, 'question', this.value)" style="padding: 6px 10px; font-size: 0.85rem;">
          </div>
          <div class="form-row" style="margin-bottom: 8px; gap: 8px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label style="font-size: 0.75rem;">Opción A</label>
              <input type="text" class="form-control form-control-sm" placeholder="Opción A" value="${(q.options && q.options[0]) || ''}" oninput="updateLessonQuizOption(${mIdx}, ${lIdx}, ${qIdx}, 0, this.value)" onchange="updateLessonQuizOption(${mIdx}, ${lIdx}, ${qIdx}, 0, this.value)" style="padding: 6px 10px; font-size: 0.85rem;">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label style="font-size: 0.75rem;">Opción B</label>
              <input type="text" class="form-control form-control-sm" placeholder="Opción B" value="${(q.options && q.options[1]) || ''}" oninput="updateLessonQuizOption(${mIdx}, ${lIdx}, ${qIdx}, 1, this.value)" onchange="updateLessonQuizOption(${mIdx}, ${lIdx}, ${qIdx}, 1, this.value)" style="padding: 6px 10px; font-size: 0.85rem;">
            </div>
          </div>
          <div class="form-row" style="margin-bottom: 8px; gap: 8px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label style="font-size: 0.75rem;">Opción C</label>
              <input type="text" class="form-control form-control-sm" placeholder="Opción C" value="${(q.options && q.options[2]) || ''}" oninput="updateLessonQuizOption(${mIdx}, ${lIdx}, ${qIdx}, 2, this.value)" onchange="updateLessonQuizOption(${mIdx}, ${lIdx}, ${qIdx}, 2, this.value)" style="padding: 6px 10px; font-size: 0.85rem;">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label style="font-size: 0.75rem;">Opción D</label>
              <input type="text" class="form-control form-control-sm" placeholder="Opción D" value="${(q.options && q.options[3]) || ''}" oninput="updateLessonQuizOption(${mIdx}, ${lIdx}, ${qIdx}, 3, this.value)" onchange="updateLessonQuizOption(${mIdx}, ${lIdx}, ${qIdx}, 3, this.value)" style="padding: 6px 10px; font-size: 0.85rem;">
            </div>
          </div>
          <div class="form-group" style="margin-bottom: 0; margin-top: 8px;">
            <label style="font-size: 0.75rem; font-weight: 600; color: var(--accent-color);">Opción Correcta</label>
            <select class="form-control form-control-sm" onchange="updateLessonQuizQuestion(${mIdx}, ${lIdx}, ${qIdx}, 'correctIndex', parseInt(this.value, 10))" style="padding: 6px 10px; font-size: 0.85rem; background: var(--bg-secondary);">
              <option value="0" ${(q.correctIndex === 0 || !q.correctIndex) ? 'selected' : ''}>Opción A</option>
              <option value="1" ${q.correctIndex === 1 ? 'selected' : ''}>Opción B</option>
              <option value="2" ${q.correctIndex === 2 ? 'selected' : ''}>Opción C</option>
              <option value="3" ${q.correctIndex === 3 ? 'selected' : ''}>Opción D</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Renderizar lista de módulos y lecciones en el editor del curso
function renderEditorCurriculum() {
  let html = '';
  
  editingCourse.modules.forEach((mod, mIdx) => {
    html += `
      <div class="builder-module-card">
        <div class="builder-module-header">
          <h4 style="margin: 0; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-folder" style="color: var(--primary-color);"></i>
            <span>Módulo ${mIdx + 1}: ${mod.title}</span>
          </h4>
          <div class="builder-module-actions">
            <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="openAddLessonModal(${mIdx})">
              <i class="fas fa-plus"></i> Agregar Clase
            </button>
            <button class="btn btn-danger" style="padding: 6px 12px; font-size: 0.8rem;" onclick="deleteModule(${mIdx})">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
        <div class="builder-lessons-list">
    `;
    
    if (mod.lessons.length === 0) {
      html += `<p style="color: var(--text-secondary); font-size: 0.85rem; text-align: center; padding: 10px;">Este módulo no tiene clases cargadas.</p>`;
    } else {
      mod.lessons.forEach((les, lIdx) => {
        const icon = les.type === 'video' ? 'fas fa-video' : 'fas fa-file-pdf';
        const quizQuestions = les.quiz || [];
        const isAccordionOpen = lessonAccordionStates[`${mIdx}_${lIdx}`] || false;

        html += `
          <div class="builder-lesson-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 10px; margin-bottom: 10px; overflow: hidden;">
            <div class="builder-lesson-row" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; border-bottom: ${isAccordionOpen ? '1px solid var(--border-color)' : 'none'};">
              <div class="builder-lesson-info" style="display: flex; align-items: center; gap: 10px;">
                <i class="${icon}"></i>
                <span class="lesson-title">${les.title} <span style="font-size: 0.75rem; color: var(--text-secondary);">(${les.duration})</span></span>
              </div>
              <div class="builder-lesson-actions" style="display: flex; gap: 6px; align-items: center;">
                <button class="btn btn-secondary btn-sm" onclick="toggleLessonQuizAccordion(${mIdx}, ${lIdx})" style="padding: 4px 10px; font-size: 0.75rem; color: var(--accent-color);" title="Gestionar Formulario de este Video">
                  <i class="fas fa-clipboard-list"></i> Formulario (${quizQuestions.length}) <i class="fas ${isAccordionOpen ? 'fa-chevron-up' : 'fa-chevron-down'}"></i>
                </button>
                <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="moveLesson(${mIdx}, ${lIdx}, 'up')" ${lIdx === 0 ? 'disabled' : ''} title="Mover arriba">
                  <i class="fas fa-arrow-up"></i>
                </button>
                <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="moveLesson(${mIdx}, ${lIdx}, 'down')" ${lIdx === mod.lessons.length - 1 ? 'disabled' : ''} title="Mover abajo">
                  <i class="fas fa-arrow-down"></i>
                </button>
                <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="openEditLessonModal(${mIdx}, ${lIdx})" title="Editar Clase">
                  <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; color: var(--danger-color);" onclick="deleteLesson(${mIdx}, ${lIdx})" title="Eliminar">
                  <i class="fas fa-trash-alt"></i> Eliminar
                </button>
              </div>
            </div>

            <!-- Bloque Desplegable de Formulario por Video -->
            <div class="lesson-quiz-accordion-body" style="display: ${isAccordionOpen ? 'block' : 'none'}; padding: 15px; background: rgba(0,0,0,0.2);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border-color);">
                <h5 style="margin: 0; color: var(--accent-color); font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
                  <i class="fas fa-clipboard-check"></i> Formulario del Video (${quizQuestions.length} preguntas)
                </h5>
                <button type="button" class="btn btn-secondary btn-sm" onclick="addLessonQuizQuestion(${mIdx}, ${lIdx})" style="padding: 4px 10px; font-size: 0.75rem;">
                  <i class="fas fa-plus"></i> Agregar Pregunta a este Video
                </button>
              </div>

              <div class="lesson-quiz-questions-list" style="display: flex; flex-direction: column; gap: 8px;">
                ${renderLessonQuizQuestionsHtml(mIdx, lIdx, quizQuestions)}
              </div>
            </div>
          </div>
        `;
      });
    }
    
    html += `
        </div>
      </div>
    `;
  });
  
  DOM.curriculumBuilderList.innerHTML = html;
}

function openAddModuleModal() {
  DOM.newModuleTitle.value = '';
  DOM.modalAddModule.classList.add('active');
}

function submitAddModule() {
  const title = DOM.newModuleTitle.value.trim();
  if (!title) {
    alert('Ingresa el nombre del módulo.');
    return;
  }
  
  editingCourse.modules.push({
    title,
    lessons: []
  });
  
  closeAllModals();
  renderEditorCurriculum();
}

window.deleteModule = function(mIdx) {
  if (confirm('¿Seguro que deseas eliminar este módulo y todas las clases contenidas en él?')) {
    editingCourse.modules.splice(mIdx, 1);
    renderEditorCurriculum();
  }
};

window.openAddLessonModal = function(moduleIndex) {
  activeEditingModuleIndex = moduleIndex;
  editingLessonIndex = null;
  
  DOM.newLessonTitle.value = '';
  DOM.newLessonType.value = 'video';
  DOM.newLessonDuration.value = '10:00';
  DOM.newLessonSourceType.value = 'file';
  DOM.newLessonUrl.value = '';
  DOM.newLessonFileInput.value = '';
  DOM.newLessonNotes.value = '';
  DOM.fileUploadStatus.textContent = 'Arrastra o selecciona un video o PDF';
  DOM.filenamePreview.style.display = 'none';
  selectedLocalFile = null;
  
  // Reset titles
  DOM.modalAddLesson.querySelector('.modal-header h3').textContent = 'Agregar Nueva Clase';
  document.getElementById('btn-submit-add-lesson').textContent = 'Agregar Clase';
  
  toggleLessonSourceFields();
  DOM.modalAddLesson.classList.add('active');
};

window.openEditLessonModal = function(moduleIndex, lessonIndex) {
  activeEditingModuleIndex = moduleIndex;
  editingLessonIndex = lessonIndex;
  
  const lesson = editingCourse.modules[moduleIndex].lessons[lessonIndex];
  
  DOM.newLessonTitle.value = lesson.title;
  DOM.newLessonType.value = lesson.type;
  DOM.newLessonDuration.value = lesson.duration || '';
  DOM.newLessonNotes.value = lesson.notes || '';
  
  if (lesson.url && (lesson.url.startsWith('http') || lesson.url.startsWith('https') || lesson.url.startsWith('blob:'))) {
    DOM.newLessonSourceType.value = 'url';
    DOM.newLessonUrl.value = lesson.url;
  } else {
    DOM.newLessonSourceType.value = 'url';
    DOM.newLessonUrl.value = lesson.url || '';
  }
  
  DOM.newLessonFileInput.value = '';
  DOM.fileUploadStatus.textContent = 'Selecciona un archivo si deseas cambiar el archivo actual';
  DOM.filenamePreview.style.display = 'none';
  selectedLocalFile = null;
  
  // Set titles for edit mode
  DOM.modalAddLesson.querySelector('.modal-header h3').textContent = 'Editar Clase';
  document.getElementById('btn-submit-add-lesson').textContent = 'Guardar Cambios';
  
  toggleLessonSourceFields();
  DOM.modalAddLesson.classList.add('active');
};

function toggleLessonSourceFields() {
  const type = DOM.newLessonSourceType.value;
  if (type === 'file') {
    document.getElementById('group-lesson-file').style.display = 'block';
    document.getElementById('group-lesson-url').style.display = 'none';
  } else {
    document.getElementById('group-lesson-file').style.display = 'none';
    document.getElementById('group-lesson-url').style.display = 'block';
  }
}

function handleLessonFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    selectedLocalFile = file;
    DOM.fileUploadStatus.textContent = 'Archivo seleccionado para carga interactiva:';
    DOM.filenamePreview.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
    DOM.filenamePreview.style.display = 'block';
    
    if (file.type.startsWith('video/')) {
      DOM.newLessonType.value = 'video';
      DOM.newLessonDuration.value = '08:30';
    } else if (file.type === 'application/pdf') {
      DOM.newLessonType.value = 'document';
      DOM.newLessonDuration.value = '15 min';
    }
  }
}

function submitAddLesson() {
  const title = DOM.newLessonTitle.value.trim();
  const type = DOM.newLessonType.value;
  const duration = DOM.newLessonDuration.value.trim();
  const sourceType = DOM.newLessonSourceType.value;
  const notes = DOM.newLessonNotes.value.trim();
  
  if (!title) {
    alert('Ingresa el título de la clase.');
    return;
  }
  
  let targetUrl = '';
  
  if (sourceType === 'url') {
    targetUrl = DOM.newLessonUrl.value.trim();
    if (!targetUrl) {
      alert('Ingresa la URL del video o documento.');
      return;
    }
  } else {
    // Si estamos editando y no seleccionamos un nuevo archivo local, mantenemos el URL existente
    if (editingLessonIndex !== null && !selectedLocalFile) {
      const existingLesson = editingCourse.modules[activeEditingModuleIndex].lessons[editingLessonIndex];
      targetUrl = existingLesson.url;
    } else {
      if (!selectedLocalFile) {
        alert('Por favor selecciona un archivo.');
        return;
      }
      targetUrl = URL.createObjectURL(selectedLocalFile);
    }
  }
  
  if (editingLessonIndex !== null) {
    // Editar lección existente
    const lesson = editingCourse.modules[activeEditingModuleIndex].lessons[editingLessonIndex];
    lesson.title = title;
    lesson.type = type;
    lesson.url = targetUrl;
    lesson.duration = duration || (type === 'video' ? '10:00' : '10 min de lectura');
    lesson.notes = notes;
  } else {
    // Agregar nueva lección
    const newLesson = {
      id: 'lesson-' + Date.now(),
      title,
      type,
      url: targetUrl,
      duration: duration || (type === 'video' ? '10:00' : '10 min de lectura'),
      notes
    };
    editingCourse.modules[activeEditingModuleIndex].lessons.push(newLesson);
  }
  
  closeAllModals();
  renderEditorCurriculum();
}

window.deleteLesson = function(mIdx, lIdx) {
  if (confirm('¿Deseas eliminar esta clase?')) {
    editingCourse.modules[mIdx].lessons.splice(lIdx, 1);
    renderEditorCurriculum();
  }
};

window.moveLesson = function(mIdx, lIdx, direction) {
  const lessons = editingCourse.modules[mIdx].lessons;
  if (direction === 'up' && lIdx > 0) {
    const temp = lessons[lIdx];
    lessons[lIdx] = lessons[lIdx - 1];
    lessons[lIdx - 1] = temp;
  } else if (direction === 'down' && lIdx < lessons.length - 1) {
    const temp = lessons[lIdx];
    lessons[lIdx] = lessons[lIdx + 1];
    lessons[lIdx + 1] = temp;
  }
  renderEditorCurriculum();
};

function renderEditorQuiz() {
  DOM.quizBuilderQuestionsList.innerHTML = '';
  if (DOM.editCourseFormTitle) {
    DOM.editCourseFormTitle.value = editingCourse.formTitle || 'Formulario de Evaluación y Comprensión';
  }
  if (!editingCourse.quiz || editingCourse.quiz.length === 0) {
    editingCourse.quiz = [];
    addQuestionField();
    return;
  }
  editingCourse.quiz.forEach((q, idx) => {
    addQuestionField(q, idx);
  });
}

window.moveQuestionUp = function(btn) {
  const card = btn.closest('.quiz-question-editor-card');
  if (card && card.previousElementSibling) {
    card.parentElement.insertBefore(card, card.previousElementSibling);
    updateQuestionIndices();
  }
};

window.moveQuestionDown = function(btn) {
  const card = btn.closest('.quiz-question-editor-card');
  if (card && card.nextElementSibling) {
    card.parentElement.insertBefore(card.nextElementSibling, card);
    updateQuestionIndices();
  }
};

window.toggleQuestionCollapse = function(btn) {
  const card = btn.closest('.quiz-question-editor-card');
  if (card) {
    card.classList.toggle('collapsed');
    const icon = card.querySelector('.collapse-icon');
    if (icon) {
      icon.className = card.classList.contains('collapsed') ? 'fas fa-chevron-down collapse-icon' : 'fas fa-chevron-up collapse-icon';
    }
  }
};

function updateQuestionIndices() {
  const list = DOM.quizBuilderQuestionsList;
  if (!list) return;
  const cards = list.querySelectorAll('.quiz-question-editor-card');
  cards.forEach((card, idx) => {
    const titleEl = card.querySelector('.q-card-title');
    const qInput = card.querySelector('.q-text-input');
    const textVal = qInput ? qInput.value.trim() : '';
    const textPreview = textVal ? `: ${textVal}` : '';
    if (titleEl) {
      titleEl.textContent = `Pregunta ${idx + 1}${textPreview}`;
    }
  });
}

function addQuestionField(questionData = null, index = null) {
  const list = DOM.quizBuilderQuestionsList;
  const cardIndex = index !== null ? index + 1 : list.children.length + 1;
  
  const qText = questionData ? questionData.question : '';
  const opt0 = questionData ? questionData.options[0] : '';
  const opt1 = questionData ? questionData.options[1] : '';
  const opt2 = questionData ? questionData.options[2] : '';
  const opt3 = questionData ? questionData.options[3] : '';
  const correctIdx = questionData ? questionData.correctIndex : 0;
  
  const textPreview = qText ? `: ${qText}` : '';

  const div = document.createElement('div');
  div.className = 'form-group quiz-question-editor-card';
  div.style = 'background: var(--bg-tertiary); padding: 18px; border-radius: 14px; border: 1px solid var(--border-color); position: relative; margin-bottom: 12px; transition: all 0.2s ease;';
  div.innerHTML = `
    <div class="q-card-header" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--border-color);">
      <h4 class="q-card-title" style="margin: 0; color: var(--accent-color); font-size: 1rem; flex: 1; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" onclick="toggleQuestionCollapse(this)">
        Pregunta ${cardIndex}${textPreview}
      </h4>
      <div class="q-card-actions" style="display: flex; align-items: center; gap: 6px;">
        <button type="button" class="btn btn-secondary btn-sm" title="Mover Arriba" onclick="moveQuestionUp(this)" style="padding: 4px 8px; font-size: 0.75rem;">
          <i class="fas fa-arrow-up"></i>
        </button>
        <button type="button" class="btn btn-secondary btn-sm" title="Mover Abajo" onclick="moveQuestionDown(this)" style="padding: 4px 8px; font-size: 0.75rem;">
          <i class="fas fa-arrow-down"></i>
        </button>
        <button type="button" class="btn btn-secondary btn-sm" title="Contraer / Expandir" onclick="toggleQuestionCollapse(this)" style="padding: 4px 8px; font-size: 0.75rem;">
          <i class="fas fa-chevron-up collapse-icon"></i>
        </button>
        <button type="button" class="btn btn-secondary btn-sm" title="Eliminar Pregunta" onclick="this.closest('.quiz-question-editor-card').remove(); updateQuestionIndices();" style="padding: 4px 8px; font-size: 0.75rem; color: var(--danger-color);">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    </div>
    
    <div class="q-card-body">
      <div class="form-group">
        <label>Texto de la Pregunta</label>
        <input type="text" class="form-control q-text-input" placeholder="¿Cuál es...?" value="${qText}" required oninput="updateQuestionIndices()">
      </div>
      
      <div class="form-row" style="margin-bottom: 10px;">
        <div class="form-group">
          <label>Opción A</label>
          <input type="text" class="form-control q-opt-0" placeholder="Opción A" value="${opt0}" required>
        </div>
        <div class="form-group">
          <label>Opción B</label>
          <input type="text" class="form-control q-opt-1" placeholder="Opción B" value="${opt1}" required>
        </div>
      </div>
      
      <div class="form-row" style="margin-bottom: 10px;">
        <div class="form-group">
          <label>Opción C</label>
          <input type="text" class="form-control q-opt-2" placeholder="Opción C" value="${opt2}">
        </div>
        <div class="form-group">
          <label>Opción D</label>
          <input type="text" class="form-control q-opt-3" placeholder="Opción D" value="${opt3}">
        </div>
      </div>
      
      <div class="form-group" style="margin-bottom: 0;">
        <label>Opción Correcta</label>
        <select class="form-control q-correct-select">
          <option value="0" ${correctIdx === 0 ? 'selected' : ''}>Opción A</option>
          <option value="1" ${correctIdx === 1 ? 'selected' : ''}>Opción B</option>
          <option value="2" ${correctIdx === 2 ? 'selected' : ''}>Opción C</option>
          <option value="3" ${correctIdx === 3 ? 'selected' : ''}>Opción D</option>
        </select>
      </div>
    </div>
  `;
  list.appendChild(div);
  updateQuestionIndices();
}

async function saveCourseFromEditor() {
  const title = DOM.editCourseTitle.value.trim();
  const description = DOM.editCourseDescription.value.trim();
  const instructor = DOM.editCourseInstructor.value.trim();
  const category = selectedCategory;
  const difficulty = DOM.editCourseDifficulty.value;
  const theme = DOM.editCourseTheme.value;
  
  if (!title || !description || !instructor) {
    alert('Por favor completa todos los campos generales del curso.');
    return;
  }
  
  const quizQuestions = [];
  const questionCards = DOM.quizBuilderQuestionsList.children;
  for (const card of questionCards) {
    const qInput = card.querySelector('.q-text-input');
    const qText = qInput ? qInput.value.trim() : '';
    const opt0 = card.querySelector('.q-opt-0') ? card.querySelector('.q-opt-0').value.trim() : '';
    const opt1 = card.querySelector('.q-opt-1') ? card.querySelector('.q-opt-1').value.trim() : '';
    const opt2 = card.querySelector('.q-opt-2') ? card.querySelector('.q-opt-2').value.trim() : '';
    const opt3 = card.querySelector('.q-opt-3') ? card.querySelector('.q-opt-3').value.trim() : '';
    const selectEl = card.querySelector('.q-correct-select');
    const correctVal = selectEl ? parseInt(selectEl.value, 10) : 0;
    
    if (qText) {
      const opts = [
        opt0 || 'Opción A',
        opt1 || 'Opción B'
      ];
      if (opt2) opts.push(opt2);
      if (opt3) opts.push(opt3);
      quizQuestions.push({
        question: qText,
        options: opts,
        correctIndex: isNaN(correctVal) ? 0 : correctVal
      });
    }
  }
  
  // Limpiar y asegurar preguntas en cada lección del temario
  if (editingCourse.modules) {
    editingCourse.modules.forEach(mod => {
      if (mod.lessons) {
        mod.lessons.forEach(les => {
          if (les.quiz) {
            les.quiz = les.quiz.filter(q => q && q.question && q.question.trim() !== '').map(q => {
              const rawOpts = q.options || [];
              const opts = [
                (rawOpts[0] && rawOpts[0].trim()) ? rawOpts[0].trim() : 'Opción A',
                (rawOpts[1] && rawOpts[1].trim()) ? rawOpts[1].trim() : 'Opción B'
              ];
              if (rawOpts[2] && rawOpts[2].trim()) opts.push(rawOpts[2].trim());
              if (rawOpts[3] && rawOpts[3].trim()) opts.push(rawOpts[3].trim());
              return {
                question: q.question.trim(),
                options: opts,
                correctIndex: q.correctIndex || 0
              };
            });
          }
        });
      }
    });
  }

  editingCourse.title = title;
  editingCourse.description = description;
  editingCourse.instructor = instructor;
  editingCourse.category = category;
  editingCourse.difficulty = difficulty;
  editingCourse.thumbnail = theme;
  editingCourse.formTitle = DOM.editCourseFormTitle ? DOM.editCourseFormTitle.value.trim() : 'Formulario de Evaluación y Comprensión';
  editingCourse.quiz = quizQuestions;
  
  try {
    let savedCourse = null;
    if (editingCourse.id) {
      savedCourse = await db.updateCourse(editingCourse.id, editingCourse);
      alert('Curso actualizado correctamente.');
    } else {
      savedCourse = await db.createCourse(editingCourse);
      alert('Curso creado con éxito.');
    }

    if (savedCourse) {
      if (activeCourse && activeCourse.id === savedCourse.id) {
        activeCourse = savedCourse;
      }
      const courses = await db.getCourses();
      const idx = courses.findIndex(c => c.id === savedCourse.id);
      if (idx !== -1) {
        courses[idx] = savedCourse;
      } else {
        courses.push(savedCourse);
      }
      localStorage.setItem('edutrack_courses', JSON.stringify(courses));
    }

    showView('view-instructor-dashboard');
    loadInstructorDashboard();
  } catch (err) {
    console.error(err);
    alert('Error al guardar el curso.');
  }
}

function closeAllModals() {
  if (DOM.modalAddModule) DOM.modalAddModule.classList.remove('active');
  if (DOM.modalAddLesson) DOM.modalAddLesson.classList.remove('active');
  if (DOM.modalAssignCourses) DOM.modalAssignCourses.classList.remove('active');
  if (DOM.modalStudentProfile) DOM.modalStudentProfile.classList.remove('active');
}
window.closeAllModals = closeAllModals;

async function openStudentProfileModal() {
  if (!currentUser) return;
  if (!DOM.modalStudentProfile) return;

  const displayName = currentUser.fullName || currentUser.username || 'Estudiante';
  const initial = displayName.charAt(0).toUpperCase();

  if (DOM.profileAvatarLarge) DOM.profileAvatarLarge.textContent = initial;
  if (DOM.profileFullName) DOM.profileFullName.textContent = displayName;
  if (DOM.profileEmail) DOM.profileEmail.innerHTML = `<i class="fas fa-envelope"></i> ${currentUser.email || 'No registrado'}`;
  if (DOM.profilePhone) DOM.profilePhone.innerHTML = `<i class="fas fa-phone"></i> ${currentUser.phone || 'Sin teléfono'}`;

  // 1. Cargar Avances de Cursos
  if (DOM.profileProgressList) {
    DOM.profileProgressList.innerHTML = `
      <div style="color: var(--text-secondary); text-align: center; padding: 15px;">
        <i class="fas fa-spinner fa-spin"></i> Cargando tus avances...
      </div>
    `;
    try {
      const courses = await db.getCourses();
      let userCertificates = [];
      try {
        userCertificates = await db.getUserCertificates(currentUser.id);
      } catch (e) {
        userCertificates = [];
      }
      const userCertCourseIds = userCertificates.map(c => c.courseId);

      let progressHtml = '';

      courses.forEach(course => {
        let totalLessons = 0;
        let completedLessons = 0;

        course.modules.forEach(m => {
          m.lessons.forEach(l => {
            totalLessons++;
            if (isLessonCompletedLocal(l.id)) {
              completedLessons++;
            }
          });
        });

        const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
        const isCert = userCertCourseIds.includes(course.id) || percent === 100;

        progressHtml += `
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="color: var(--text-primary); font-size: 0.9rem;">${course.title}</strong>
              <span class="badge ${isCert ? 'badge-success' : 'badge-primary'}" style="font-size: 0.75rem;">
                ${isCert ? '¡Completado y Certificado!' : `${percent}% Completado`}
              </span>
            </div>
            <div style="width: 100%; background: var(--bg-tertiary); height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
              <div style="width: ${percent}%; background: var(--accent-color); height: 100%; transition: width 0.3s ease;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.75rem; color: var(--text-secondary);">${completedLessons} de ${totalLessons} clases completadas</span>
              <button class="btn btn-secondary btn-sm" onclick="closeAllModals(); startCourse('${course.id}')" style="padding: 3px 8px; font-size: 0.75rem;">
                <i class="fas fa-play"></i> Continuar
              </button>
            </div>
          </div>
        `;
      });

      DOM.profileProgressList.innerHTML = progressHtml || '<p style="color: var(--text-secondary);">No tienes cursos en progreso.</p>';
    } catch (e) {
      console.error(e);
      DOM.profileProgressList.innerHTML = '<p style="color: var(--danger-color);">Error al cargar avances.</p>';
    }
  }

  // 2. Cargar Certificados / Reconocimientos Obtenidos
  if (DOM.profileCertificatesList) {
    try {
      let userCertificates = [];
      try {
        userCertificates = await db.getUserCertificates(currentUser.id);
      } catch (e) {
        userCertificates = [];
      }

      if (!userCertificates || userCertificates.length === 0) {
        DOM.profileCertificatesList.innerHTML = `
          <div style="text-align: center; color: var(--text-secondary); padding: 15px; background: rgba(255,255,255,0.01); border-radius: 8px;">
            <i class="fas fa-award fa-2x" style="margin-bottom: 8px; color: var(--border-color);"></i>
            <p style="margin: 0; font-size: 0.85rem;">Aún no has completado un curso. ¡Finaliza un curso para obtener tu reconocimiento oficial!</p>
          </div>
        `;
      } else {
        let certHtml = '';
        userCertificates.forEach(cert => {
          certHtml += `
            <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h5 style="margin: 0 0 3px 0; color: #10b981; font-size: 0.9rem;">
                  <i class="fas fa-award"></i> Reconocimiento: ${cert.courseTitle}
                </h5>
                <span style="font-size: 0.75rem; color: var(--text-secondary);">Emitido el: ${cert.issueDate} | Código: <code>${cert.verificationCode}</code></span>
              </div>
              <button class="btn btn-success btn-sm" onclick="closeAllModals(); viewCertificate('${cert.courseId}')" style="padding: 4px 10px; font-size: 0.75rem;">
                <i class="fas fa-eye"></i> Ver Reconocimiento
              </button>
            </div>
          `;
        });
        DOM.profileCertificatesList.innerHTML = certHtml;
      }
    } catch (e) {
      console.error(e);
      DOM.profileCertificatesList.innerHTML = '<p style="color: var(--danger-color);">Error al cargar reconocimientos.</p>';
    }
  }

  DOM.modalStudentProfile.classList.add('active');
}
window.openStudentProfileModal = openStudentProfileModal;

// Exponer funciones globales para interactividad inline en HTML5
window.startCourse = startCourse;
window.viewCertificate = viewCertificate;
window.startQuiz = startQuiz;
window.loadCourseEditor = loadCourseEditor;
window.openAddLessonModal = openAddLessonModal;
window.showView = showView;
window.switchAuthTab = switchAuthTab;
window.submitLogin = submitLogin;
window.submitRegister = submitRegister;
window.startRecoveryFlow = startRecoveryFlow;
window.cancelRecoveryFlow = cancelRecoveryFlow;
window.sendRecoveryEmail = sendRecoveryEmail;
window.verifyRecoveryCode = verifyRecoveryCode;
window.saveNewPassword = saveNewPassword;
window.openAssignCoursesModal = openAssignCoursesModal;

async function deleteCourse(courseId) {
  try {
    const course = await db.getCourseById(courseId);
    if (!course) {
      alert('Curso no encontrado.');
      return;
    }
    if (confirm(`¿Estás seguro de que deseas eliminar el curso "${course.title}"? Esta acción no se puede deshacer y borrará todo su temario asociado, progreso de alumnos y certificados.`)) {
      await db.deleteCourse(courseId);
      alert('Curso eliminado con éxito.');
      await loadInstructorDashboard();
    }
  } catch (err) {
    console.error('Error al eliminar el curso:', err);
    alert('Ocurrió un error al intentar eliminar el curso: ' + (err.message || err));
  }
}

window.deleteCourse = deleteCourse;

// --- CONTROLADOR GLOBAL DE ERRORES (DIAGNÓSTICO) ---
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason);
  showGlobalError('Error en la base de datos o aplicación: ' + (event.reason ? event.reason.message || event.reason : 'Error desconocido'));
});

window.addEventListener('error', event => {
  console.error('Unhandled runtime error:', event.error);
  showGlobalError('Error de ejecución: ' + (event.error ? event.error.message || event.error : event.message));
});

function showGlobalError(message) {
  let container = document.getElementById('global-error-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'global-error-container';
    container.style.position = 'fixed';
    container.style.top = '10px';
    container.style.left = '50%';
    container.style.transform = 'translateX(-50%)';
    container.style.background = 'rgba(220, 53, 69, 0.95)';
    container.style.color = '#fff';
    container.style.padding = '12px 24px';
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    container.style.zIndex = '10000';
    container.style.fontSize = '14px';
    container.style.fontFamily = 'sans-serif';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '10px';
    document.body.appendChild(container);
  }
  container.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <span>${message}</span> <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#fff;cursor:pointer;font-weight:bold;margin-left:10px;">&times;</button>`;
}

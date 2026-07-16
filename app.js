import { db } from './db.js?v=6';

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
let selectedLocalFile = null;

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
  registerUsername: document.getElementById('register-username'),
  registerEmail: document.getElementById('register-email'),
  registerPhone: document.getElementById('register-phone'),
  registerPassword: document.getElementById('register-password'),
  
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
    DOM.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    DOM.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  }
  
  DOM.themeToggle.addEventListener('click', toggleTheme);
  DOM.btnResetDb.addEventListener('click', resetDatabase);
  DOM.btnLogout.addEventListener('click', logoutUser);
  
  // Roles de Usuario
  DOM.tabStudent.addEventListener('click', () => switchRole('student'));
  DOM.tabInstructor.addEventListener('click', () => switchRole('instructor'));
  DOM.logoBtn.addEventListener('click', navigateToDashboard);

  // Pestañas del Panel de Instructor
  DOM.btnInsCoursesTab.addEventListener('click', () => switchInstructorTab('courses'));
  DOM.btnInsStudentsTab.addEventListener('click', () => switchInstructorTab('students'));
  DOM.studentSearchInput.addEventListener('input', filterStudentsTable);
  DOM.btnSubmitAssignCourses.addEventListener('click', submitCourseAssignment);
  
  // Navegaciones de Botones de Volver
  DOM.btnPlayerBack.addEventListener('click', () => showView('view-student-dashboard'));
  DOM.btnEditorBack.addEventListener('click', () => showView('view-instructor-dashboard'));
  
  // Registrar Botones de Cerrar Modales
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });
  
  // Control de Formularios en Clases Modales
  DOM.newLessonSourceType.addEventListener('change', toggleLessonSourceFields);
  DOM.newLessonFileInput.addEventListener('change', handleLessonFileSelect);
  
  // Botones del Editor
  DOM.btnNewCourse.addEventListener('click', () => startNewCourseEditor());
  DOM.btnEditorAddModule.addEventListener('click', openAddModuleModal);
  DOM.btnEditorAddQuestion.addEventListener('click', () => addQuestionField());
  DOM.btnEditorSaveCourse.addEventListener('click', saveCourseFromEditor);
  
  // Control de Dropdown de Categorías Personalizado
  DOM.categoryDropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = DOM.categoryDropdownMenu.style.display === 'block';
    DOM.categoryDropdownMenu.style.display = isVisible ? 'none' : 'block';
  });
  
  document.addEventListener('click', () => {
    if (DOM.categoryDropdownMenu) {
      DOM.categoryDropdownMenu.style.display = 'none';
    }
  });
  
  DOM.btnSubmitAddModule.addEventListener('click', submitAddModule);
  DOM.btnSubmitAddLesson.addEventListener('click', submitAddLesson);
  
  // Botones del Quiz
  DOM.btnQuizNext.addEventListener('click', handleQuizNext);
  DOM.btnQuizExit.addEventListener('click', exitQuiz);
  DOM.btnStartQuiz.addEventListener('click', () => startQuiz(activeCourse.id));
  
  // Impresión y Descarga de Certificado
  DOM.btnPrintCertificate.addEventListener('click', () => window.print());
  DOM.btnDownloadCertificate.addEventListener('click', downloadCertificatePNG);
  
  // Listeners de enlaces en el Reproductor de Vídeo
  DOM.videoPlayer.addEventListener('ended', autoMarkLessonComplete);
  
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
    btn.addEventListener('click', () => showView('view-student-dashboard'));
  });
  
  // --- ESCUCHAR EVENTOS DE RECUPERACIÓN DE CONTRASEÑA EN SUPABASE ---
  db.supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
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
          // Si expiró la sesión de Supabase Auth, forzar deslogueo
          currentUser = null;
          localStorage.removeItem('edutrack_current_user');
          setupLoggedOutUI();
          showView('view-auth');
          return;
        }
      } catch (err) {
        console.error('Error al sincronizar sesión del estudiante:', err);
        currentUser = cachedUser;
      }
      setupAuthenticatedUI();
      switchRole('student');
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
  DOM.userDisplayName.textContent = currentUser.username;
  DOM.userAvatarChar.textContent = currentUser.username.charAt(0).toUpperCase();
  DOM.userProfileBadge.style.display = 'flex';
  DOM.btnLogout.style.display = 'flex';
  
  // Mostrar u ocultar pestañas de rol según permisos
  if (currentUser.role === 'instructor') {
    DOM.navigationTabs.style.display = 'flex';
  } else {
    // Los estudiantes no pueden cambiar de rol ni ver el panel administrativo
    DOM.navigationTabs.style.display = 'none';
  }
}

function setupLoggedOutUI() {
  DOM.userProfileBadge.style.display = 'none';
  DOM.btnLogout.style.display = 'none';
  DOM.navigationTabs.style.display = 'none';
  
  // Limpiar inputs
  DOM.loginIdentifier.value = '';
  DOM.loginPassword.value = '';
  DOM.registerUsername.value = '';
  DOM.registerEmail.value = '';
  DOM.registerPhone.value = '';
  DOM.registerPassword.value = '';
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
  DOM.authErrorMsg.style.display = 'none';
  DOM.authSuccessMsg.style.display = 'none';
  
  const isLogin = tab === 'login';
  document.getElementById('btn-tab-login').classList.toggle('active', isLogin);
  document.getElementById('btn-tab-register').classList.toggle('active', !isLogin);
  
  DOM.authLoginForm.classList.toggle('active', isLogin);
  DOM.authRegisterForm.classList.toggle('active', !isLogin);
  DOM.authRecoveryPanel.classList.remove('active');
}

// Ejecutar Login
async function submitLogin() {
  DOM.authErrorMsg.style.display = 'none';
  DOM.authSuccessMsg.style.display = 'none';
  
  const identifier = DOM.loginIdentifier.value;
  const password = DOM.loginPassword.value;
  
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
    DOM.authErrorText.textContent = err.message;
    DOM.authErrorMsg.style.display = 'flex';
  }
}

// Ejecutar Registro Estudiante
async function submitRegister() {
  DOM.authErrorMsg.style.display = 'none';
  DOM.authSuccessMsg.style.display = 'none';
  
  const username = DOM.registerUsername.value;
  const email = DOM.registerEmail.value;
  const phone = DOM.registerPhone.value;
  const password = DOM.registerPassword.value;
  
  try {
    await db.registerStudent({ username, email, phone, password });
    
    // Mostrar éxito y redirigir
    DOM.authSuccessText.textContent = '¡Registro exitoso! Ya puedes iniciar sesión con tu cuenta creada.';
    DOM.authSuccessMsg.style.display = 'flex';
    
    // Limpiar campos y cambiar pestaña
    DOM.registerUsername.value = '';
    DOM.registerEmail.value = '';
    DOM.registerPhone.value = '';
    DOM.registerPassword.value = '';
    
    setTimeout(() => {
      switchAuthTab('login');
    }, 2000);
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
  db.supabase.auth.signOut().catch(err => console.error('Error al cerrar sesión en Supabase:', err));
  setupLoggedOutUI();
  showView('view-auth');
}

// === INSTRUCTOR: CONTROL DE ESTUDIANTES ===
let currentSelectedStudentId = null;

// Cambiar de pestaña en el Panel de Instructor
function switchInstructorTab(tab) {
  DOM.btnInsCoursesTab.classList.toggle('active', tab === 'courses');
  DOM.btnInsStudentsTab.classList.toggle('active', tab === 'students');
  
  DOM.insCoursesSection.classList.toggle('active', tab === 'courses');
  DOM.insStudentsSection.classList.toggle('active', tab === 'students');
  
  if (tab === 'students') {
    loadStudentRegistry();
  }
}

// Cargar y Renderizar Alumnos
async function loadStudentRegistry() {
  DOM.studentsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-secondary);"><i class="fas fa-circle-notch fa-spin fa-lg"></i> Cargando estudiantes...</td></tr>';
  
  try {
    const students = await db.getStudents();
    const courses = await db.getCourses();
    renderStudentTable(students, courses);
  } catch (err) {
    console.error('Error al cargar alumnos:', err);
    DOM.studentsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--danger-color);"><i class="fas fa-exclamation-triangle"></i> Error al cargar estudiantes.</td></tr>';
  }
}

// Renderizar Tabla de Alumnos
function renderStudentTable(students, courses) {
  if (students.length === 0) {
    DOM.studentsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-secondary);">No hay estudiantes registrados actualmente.</td></tr>';
    return;
  }
  
  const courseMap = {};
  courses.forEach(c => {
    courseMap[c.id] = c.title;
  });
  
  DOM.studentsTableBody.innerHTML = students.map(student => {
    const regDate = student.registeredAt ? new Date(student.registeredAt).toLocaleDateString() : 'N/A';
    
    // Crear badges para los cursos asignados
    const assignedIds = student.assignedCourses || [];
    let coursesBadges = '';
    if (assignedIds.length === 0) {
      coursesBadges = '<span class="assigned-course-badge empty">Ninguno</span>';
    } else {
      coursesBadges = assignedIds.map(id => {
        const title = courseMap[id] || id;
        return `<span class="assigned-course-badge" title="${title}">${title}</span>`;
      }).join(' ');
    }
    
    return `
      <tr data-student-id="${student.id}" class="student-row">
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="avatar-circle" style="width: 32px; height: 32px; font-size: 0.8rem; background: var(--bg-tertiary);">${student.username.charAt(0).toUpperCase()}</div>
            <span style="font-weight: 600; color: var(--text-primary);">${student.username}</span>
          </div>
        </td>
        <td>${student.email || 'N/A'}</td>
        <td>${student.phone || 'N/A'}</td>
        <td>${regDate}</td>
        <td>
          <div style="max-width: 300px; display: flex; flex-wrap: wrap;">
            ${coursesBadges}
          </div>
        </td>
        <td style="text-align: center;">
          <button class="btn btn-secondary btn-sm" onclick="openAssignCoursesModal('${student.id}')" style="padding: 6px 12px; font-size: 0.8rem;">
            <i class="fas fa-edit"></i> Asignar Cursos
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Filtrar Estudiantes por búsqueda
function filterStudentsTable() {
  const query = DOM.studentSearchInput.value.toLowerCase().trim();
  const rows = DOM.studentsTableBody.querySelectorAll('.student-row');
  
  rows.forEach(row => {
    const textContent = row.textContent.toLowerCase();
    if (textContent.includes(query)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

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
    loadStudentRegistry(); // Recargar tabla
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
      
      let actionBtnText = 'Comenzar Curso';
      let actionBtnClass = 'btn-primary';
      let actionOnClick = `startCourse('${course.id}')`;
      
      if (progress.percent > 0 && progress.percent < 100) {
        actionBtnText = 'Continuar Curso';
        actionBtnClass = 'btn-primary';
      } else if (progress.percent === 100) {
        if (isQuizPassed) {
          actionBtnText = 'Ver Certificado';
          actionBtnClass = 'btn-success';
          actionOnClick = `viewCertificate('${course.id}')`;
        } else {
          actionBtnText = 'Tomar Cuestionario';
          actionBtnClass = 'btn-primary';
          actionOnClick = `startQuiz('${course.id}')`;
        }
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
            
            <button class="btn ${actionBtnClass} btn-block" onclick="${actionOnClick}">
              ${actionBtnText}
            </button>
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
    
    // Seleccionar primera clase por defecto
    let firstLesson = null;
    for (const m of course.modules) {
      if (m.lessons.length > 0) {
        firstLesson = m.lessons[0];
        activeModuleIndex = course.modules.indexOf(m);
        activeLessonIndex = 0;
        break;
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

// Actualizar barra de progreso del player
async function updatePlayerProgress() {
  if (!currentUser) return;
  const progress = await db.getCourseProgress(activeCourse.id, currentUser.id);
  DOM.playerProgressText.textContent = `${progress.percent}%`;
  DOM.playerProgressFill.style.width = `${progress.percent}%`;
  
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
      const isCompleted = isLessonCompletedLocal(les.id);
      const isActive = activeLesson && activeLesson.id === les.id;
      const typeIcon = les.type === 'video' ? 'fa-play-circle' : 'fa-file-alt';
      
      html += `
        <div class="lesson-item ${isActive ? 'active' : ''}" data-lesson-id="${les.id}" onclick="selectLessonById('${les.id}', ${mIdx}, ${lIdx})">
          <div class="lesson-checkbox ${isCompleted ? 'completed' : ''}" onclick="event.stopPropagation(); toggleLessonCheckbox('${les.id}')">
            <i class="fas fa-check"></i>
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

// Seleccionar lección por ID
window.selectLessonById = function(lessonId, mIdx, lIdx) {
  const mod = activeCourse.modules[mIdx];
  const les = mod.lessons[lIdx];
  selectPlayerLesson(les, mIdx, lIdx);
};

// Alternar checkbox de lección completada al hacer click directo
window.toggleLessonCheckbox = async function(lessonId) {
  if (!currentUser) return;
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
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }
  
  // Vimeo
  if (url.includes('vimeo.com')) {
    if (url.includes('player.vimeo.com/video/')) {
      return url;
    }
    const parts = url.split('/');
    const videoId = parts[parts.length - 1].split(/[?#]/)[0];
    return `https://player.vimeo.com/video/${videoId}`;
  }
  
  // Google Drive
  if (url.includes('drive.google.com')) {
    let fileId = '';
    if (url.includes('/file/d/')) {
      fileId = url.split('/file/d/')[1].split('/')[0];
    } else if (url.includes('id=')) {
      fileId = url.split('id=')[1].split(/[&#]/)[0];
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
  
  // Cargar video en reproductor HTML5 o Iframe
  if (lesson.type === 'video') {
    const embedUrl = getEmbedUrl(lesson.url);
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
        DOM.videoPlayer.play().catch(e => {
          console.log("Auto-reproducción bloqueada por políticas del navegador.");
        });
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
    
    if (!isLessonCompletedLocal(lesson.id)) {
      toggleLessonCheckbox(lesson.id);
    }
  }
}

// Marcar lección actual como completada al finalizar el video
async function autoMarkLessonComplete() {
  if (!currentUser) return;
  if (activeLesson && !isLessonCompletedLocal(activeLesson.id)) {
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
    alert('¡Felicidades! Has terminado de revisar todas las clases del curso.');
  }
}

// ==================== SISTEMA DE EXAMEN (QUIZZES) ====================

async function startQuiz(courseId) {
  try {
    const course = await db.getCourseById(courseId);
    if (!course) return;
    
    if (!course.quiz || course.quiz.length === 0) {
      // Si el curso no tiene examen, emitir el certificado directamente con el nombre del usuario
      await db.issueCertificate(courseId, currentUser.username, currentUser.id);
      viewCertificate(courseId);
      return;
    }
    
    quizState.courseId = courseId;
    quizState.questions = course.quiz;
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
  let correctAnswersCount = 0;
  
  quizState.questions.forEach((q, idx) => {
    if (q.correctIndex === quizState.answers[idx]) {
      correctAnswersCount++;
    }
  });
  
  const scorePercent = Math.round((correctAnswersCount / quizState.questions.length) * 100);
  const passed = scorePercent >= 80;
  
  await db.saveQuizResult(quizState.courseId, scorePercent, passed, currentUser.id);
  
  let resultHtml = '';
  
  if (passed) {
    resultHtml += `
      <div class="result-icon-container pass">
        <i class="fas fa-award"></i>
      </div>
      <h2>¡Felicidades, aprobaste!</h2>
      <div class="quiz-result-score">${scorePercent}%</div>
      <p>Has aprobado el cuestionario con éxito.<br>Ya puedes generar tu certificado oficial y descargarlo.</p>
      
      <div class="form-group" style="max-width: 400px; margin: 0 auto 25px auto; text-align: left;">
        <label for="student-cert-name" style="font-weight:600;">Nombre completo para el certificado:</label>
        <input type="text" class="form-control" id="student-cert-name" placeholder="Tu Nombre Completo" required value="${currentUser.username}">
      </div>
      
      <div style="display: flex; gap: 15px; justify-content: center;">
        <button class="btn btn-secondary" onclick="showView('view-student-dashboard')">Volver a Cursos</button>
        <button class="btn btn-success" onclick="issueStudentCertificate('${quizState.courseId}')">Generar Certificado <i class="fas fa-arrow-right"></i></button>
      </div>
    `;
  } else {
    resultHtml += `
      <div class="result-icon-container fail">
        <i class="fas fa-times-circle"></i>
      </div>
      <h2>No alcanzaste el mínimo</h2>
      <div class="quiz-result-score" style="color: var(--danger-color);">${scorePercent}%</div>
      <p>Se requiere un puntaje mínimo del 80% para aprobar.<br>Repasa los temas del curso e inténtalo de nuevo.</p>
      <div style="display: flex; gap: 15px; justify-content: center;">
        <button class="btn btn-secondary" onclick="showView('view-student-dashboard')">Volver a Cursos</button>
        <button class="btn btn-primary" onclick="startQuiz('${quizState.courseId}')">Reintentar Examen <i class="fas fa-redo"></i></button>
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
              <button class="btn btn-secondary btn-block" onclick="loadCourseEditor('${course.id}')">
                <i class="fas fa-edit"></i> Administrar Temario
              </button>
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

function renderEditorCurriculum() {
  if (editingCourse.modules.length === 0) {
    DOM.curriculumBuilderList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-layer-group"></i>
        <h4>No hay módulos creados</h4>
        <p>Crea tu primer módulo organizador de clases haciendo click en "Agregar Módulo".</p>
      </div>
    `;
    return;
  }
  
  let html = '';
  editingCourse.modules.forEach((mod, mIdx) => {
    html += `
      <div class="builder-module">
        <div class="builder-module-header">
          <h4>${mod.title}</h4>
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
        html += `
          <div class="builder-lesson-row">
            <div class="builder-lesson-info">
              <i class="${icon}"></i>
              <span class="lesson-title">${les.title} <span style="font-size: 0.75rem; color: var(--text-secondary);">(${les.duration})</span></span>
            </div>
            <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; color: var(--danger-color);" onclick="deleteLesson(${mIdx}, ${lIdx})">
              <i class="fas fa-trash-alt"></i> Eliminar
            </button>
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
    if (!selectedLocalFile) {
      alert('Por favor selecciona un archivo.');
      return;
    }
    targetUrl = URL.createObjectURL(selectedLocalFile);
  }
  
  const newLesson = {
    id: 'lesson-' + Date.now(),
    title,
    type,
    url: targetUrl,
    duration: duration || (type === 'video' ? '10:00' : '10 min de lectura'),
    notes
  };
  
  editingCourse.modules[activeEditingModuleIndex].lessons.push(newLesson);
  closeAllModals();
  renderEditorCurriculum();
}

window.deleteLesson = function(mIdx, lIdx) {
  if (confirm('¿Deseas eliminar esta clase?')) {
    editingCourse.modules[mIdx].lessons.splice(lIdx, 1);
    renderEditorCurriculum();
  }
};

function renderEditorQuiz() {
  DOM.quizBuilderQuestionsList.innerHTML = '';
  if (!editingCourse.quiz || editingCourse.quiz.length === 0) {
    editingCourse.quiz = [];
    addQuestionField();
    return;
  }
  editingCourse.quiz.forEach((q, idx) => {
    addQuestionField(q, idx);
  });
}

function addQuestionField(questionData = null, index = null) {
  const list = DOM.quizBuilderQuestionsList;
  
  const qText = questionData ? questionData.question : '';
  const opt0 = questionData ? questionData.options[0] : '';
  const opt1 = questionData ? questionData.options[1] : '';
  const opt2 = questionData ? questionData.options[2] : '';
  const opt3 = questionData ? questionData.options[3] : '';
  const correctIdx = questionData ? questionData.correctIndex : 0;
  
  const div = document.createElement('div');
  div.className = 'form-group quiz-question-editor-card';
  div.style = 'background: var(--bg-tertiary); padding: 20px; border-radius: 14px; border: 1px solid var(--border-color); position: relative; margin-bottom: 10px;';
  div.innerHTML = `
    <button class="btn btn-secondary" style="position: absolute; top: 10px; right: 10px; padding: 4px 8px; color: var(--danger-color);" onclick="this.parentElement.remove()">
      <i class="fas fa-trash-alt"></i>
    </button>
    <h4 style="margin-bottom: 15px; color: var(--accent-color);">Pregunta</h4>
    
    <div class="form-group">
      <label>Texto de la Pregunta</label>
      <input type="text" class="form-control q-text-input" placeholder="¿Cuál es...?" value="${qText}" required>
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
  `;
  list.appendChild(div);
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
    const qText = card.querySelector('.q-text-input').value.trim();
    const opt0 = card.querySelector('.q-opt-0').value.trim();
    const opt1 = card.querySelector('.q-opt-1').value.trim();
    const opt2 = card.querySelector('.q-opt-2').value.trim();
    const opt3 = card.querySelector('.q-opt-3').value.trim();
    const correctVal = parseInt(card.querySelector('.q-correct-select').value);
    
    if (qText && opt0 && opt1) {
      const opts = [opt0, opt1];
      if (opt2) opts.push(opt2);
      if (opt3) opts.push(opt3);
      quizQuestions.push({
        question: qText,
        options: opts,
        correctIndex: correctVal
      });
    }
  }
  
  editingCourse.title = title;
  editingCourse.description = description;
  editingCourse.instructor = instructor;
  editingCourse.category = category;
  editingCourse.difficulty = difficulty;
  editingCourse.thumbnail = theme;
  editingCourse.quiz = quizQuestions;
  
  try {
    if (editingCourse.id) {
      await db.updateCourse(editingCourse.id, editingCourse);
      alert('Curso actualizado correctamente.');
    } else {
      const newCourse = await db.createCourse(editingCourse);
      newCourse.modules = editingCourse.modules;
      newCourse.quiz = editingCourse.quiz;
      const courses = await db.getCourses();
      const index = courses.findIndex(c => c.id === newCourse.id);
      if (index !== -1) {
        courses[index] = newCourse;
        localStorage.setItem('edutrack_courses', JSON.stringify(courses));
      }
      alert('Curso creado con éxito.');
    }
    showView('view-instructor-dashboard');
    loadInstructorDashboard();
  } catch (err) {
    console.error(err);
    alert('Error al guardar el curso.');
  }
}

function closeAllModals() {
  DOM.modalAddModule.classList.remove('active');
  DOM.modalAddLesson.classList.remove('active');
  DOM.modalAssignCourses.classList.remove('active');
  DOM.modalManageCategories.classList.remove('active');
}
window.closeAllModals = closeAllModals;

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
window.sendRecoveryCode = sendRecoveryCode;
window.sendRecoveryEmail = sendRecoveryEmail;
window.verifyRecoveryCode = verifyRecoveryCode;
window.saveNewPassword = saveNewPassword;
window.openAssignCoursesModal = openAssignCoursesModal;

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

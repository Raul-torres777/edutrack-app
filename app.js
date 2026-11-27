import { db } from './db.js?v=2000';

// Asegurar que las funciones de live_sessions existan en db aún si el navegador cacheó db.js
if (!db.saveLiveSession) {
  db.saveLiveSession = async function(session) {
    const record = {
      id: session.id || ('live-' + Date.now()),
      title: (session.title || '').trim(),
      course_id: session.courseId || session.course_id || '',
      course_title: session.courseTitle || session.course_title || '',
      instructor_name: session.instructorName || session.instructor_name || 'Instructor',
      start_time: session.startTime || session.start_time,
      duration_minutes: parseInt(session.durationMinutes || session.duration_minutes || 60, 10),
      zoom_url: (session.zoomUrl || session.zoom_url || '').trim(),
      meeting_id: (session.meetingId || session.meeting_id || '').trim(),
      passcode: (session.passcode || '').trim(),
      description: (session.description || '').trim(),
      created_at: session.createdAt || session.created_at || new Date().toISOString()
    };
    try {
      const local = localStorage.getItem('edutrack_live_sessions_cache');
      let list = local ? JSON.parse(local) : [];
      const idx = list.findIndex(s => s.id === record.id);
      if (idx >= 0) list[idx] = record;
      else list.push(record);
      list.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      localStorage.setItem('edutrack_live_sessions_cache', JSON.stringify(list));
    } catch (e) {
      console.warn('Error en fallback localStorage saveLiveSession:', e);
    }
    try {
      if (db.supabase) {
        await db.supabase.from('live_sessions').upsert(record);
      }
    } catch (e) {}
    return record;
  };
}

if (!db.getLiveSessions) {
  db.getLiveSessions = async function() {
    try {
      if (db.supabase) {
        const { data, error } = await db.supabase
          .from('live_sessions')
          .select('*')
          .order('start_time', { ascending: true });
        if (!error && Array.isArray(data)) {
          localStorage.setItem('edutrack_live_sessions_cache', JSON.stringify(data));
          return data;
        }
      }
    } catch (e) {}
    try {
      const local = localStorage.getItem('edutrack_live_sessions_cache');
      if (local !== null) return JSON.parse(local);
    } catch (e) {}
    return [];
  };
}

if (!db.deleteLiveSession) {
  db.deleteLiveSession = async function(id) {
    try {
      const local = localStorage.getItem('edutrack_live_sessions_cache');
      if (local) {
        const list = JSON.parse(local).filter(s => s.id !== id);
        localStorage.setItem('edutrack_live_sessions_cache', JSON.stringify(list));
      }
    } catch (e) {}
    try {
      if (db.supabase) {
        await db.supabase.from('live_sessions').delete().eq('id', id);
      }
    } catch (e) {}
    return true;
  };
}

// === REGISTRO DE PWA SERVICE WORKER ===
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      console.log('✅ EduTrack PWA Service Worker activo con scope:', reg.scope);
    }).catch(err => {
      console.warn('⚠️ EduTrack PWA Service Worker aviso:', err);
    });
  });
}

// === GESTOR DE INSTALACIÓN PWA (APP NATIVA) ===
let deferredInstallPrompt = null;

function isRunningStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true ||
         document.referrer.includes('android-app://');
}

function isIosDevice() {
  const userAgent = (window.navigator.userAgent || '').toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

function showInstallPromotion() {
  if (isRunningStandalone()) return;

  const btnHeader = document.getElementById('btn-install-pwa');
  const promoAuth = document.getElementById('auth-install-promo');
  const banner = document.getElementById('pwa-install-banner');

  if (btnHeader) btnHeader.style.display = 'inline-flex';
  if (promoAuth) promoAuth.style.display = 'block';

  // Mostrar el banner flotante sólo si el usuario no lo ha descartado en esta sesión
  const isDismissed = sessionStorage.getItem('edutrack_pwa_banner_dismissed') === 'true';
  if (banner && !isDismissed) {
    banner.style.display = 'block';
    setTimeout(() => {
      if (banner) banner.classList.add('show');
    }, 100);
  }
}

function hideInstallPromotion() {
  const btnHeader = document.getElementById('btn-install-pwa');
  const promoAuth = document.getElementById('auth-install-promo');
  const banner = document.getElementById('pwa-install-banner');

  if (btnHeader) btnHeader.style.display = 'none';
  if (promoAuth) promoAuth.style.display = 'none';
  if (banner) {
    banner.classList.remove('show');
    setTimeout(() => {
      if (banner) banner.style.display = 'none';
    }, 400);
  }
}

async function triggerPwaInstall() {
  if (deferredInstallPrompt) {
    try {
      deferredInstallPrompt.prompt();
      const choiceResult = await deferredInstallPrompt.userChoice;
      console.log('Resultado de instalación:', choiceResult.outcome);
      if (choiceResult.outcome === 'accepted') {
        hideInstallPromotion();
      }
      deferredInstallPrompt = null;
    } catch (err) {
      console.warn('Error al activar el prompt de instalación:', err);
    }
    return;
  }

  // Fallback si no está el prompt nativo
  if (isIosDevice()) {
    const modalIos = document.getElementById('modal-ios-install');
    if (modalIos) modalIos.classList.add('active');
  } else {
    const modalGeneric = document.getElementById('modal-generic-install');
    if (modalGeneric) modalGeneric.classList.add('active');
  }
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  console.log('📱 PWA beforeinstallprompt detectado y listo para invocar.');
  showInstallPromotion();
});

window.addEventListener('appinstalled', () => {
  console.log('🎉 EduTrack fue instalada exitosamente como App.');
  deferredInstallPrompt = null;
  hideInstallPromotion();
  localStorage.setItem('edutrack_pwa_installed', 'true');
});

// Inicialización de escuchadores de instalación PWA
window.addEventListener('DOMContentLoaded', () => {
  const btnHeader = document.getElementById('btn-install-pwa');
  const btnPromo = document.getElementById('btn-auth-install-pwa');
  const btnBanner = document.getElementById('pwa-banner-install-btn');
  const btnDismiss = document.getElementById('pwa-banner-close-btn');

  if (btnHeader) btnHeader.addEventListener('click', triggerPwaInstall);
  if (btnPromo) btnPromo.addEventListener('click', triggerPwaInstall);
  if (btnBanner) btnBanner.addEventListener('click', triggerPwaInstall);

  if (btnDismiss) {
    btnDismiss.addEventListener('click', () => {
      const banner = document.getElementById('pwa-install-banner');
      if (banner) {
        banner.classList.remove('show');
        setTimeout(() => {
          if (banner) banner.style.display = 'none';
        }, 400);
      }
      sessionStorage.setItem('edutrack_pwa_banner_dismissed', 'true');
    });
  }

  // Si no está en standalone, mostrar promoción tras breve delay
  if (!isRunningStandalone()) {
    setTimeout(() => {
      showInstallPromotion();
    }, 1200);
  }
});

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
  btnResetCourseProgress: document.getElementById('btn-reset-course-progress'),
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
  newLessonMaterialUrl: document.getElementById('new-lesson-material-url'),
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

function populateDOM() {
  DOM.logoBtn = document.getElementById('logo-btn');
  DOM.tabStudent = document.getElementById('tab-student');
  DOM.tabInstructor = document.getElementById('tab-instructor');
  DOM.tabAdmin = document.getElementById('tab-admin');
  DOM.navigationTabs = document.querySelector('.navigation-tabs');
  DOM.themeToggle = document.getElementById('theme-toggle');
  DOM.btnResetDb = document.getElementById('btn-reset-db');
  DOM.userDisplayName = document.getElementById('user-display-name');
  DOM.userProfileBadge = document.getElementById('user-profile-badge');
  DOM.userAvatarChar = document.getElementById('user-avatar-char');
  DOM.btnLogout = document.getElementById('btn-logout');
  
  DOM.viewAuth = document.getElementById('view-auth');
  DOM.viewStudentDashboard = document.getElementById('view-student-dashboard');
  DOM.viewCoursePlayer = document.getElementById('view-course-player');
  DOM.viewQuiz = document.getElementById('view-quiz');
  DOM.viewQuizResult = document.getElementById('view-quiz-result');
  DOM.viewCertificate = document.getElementById('view-certificate');
  DOM.viewInstructorDashboard = document.getElementById('view-instructor-dashboard');
  DOM.viewCourseEditor = document.getElementById('view-course-editor');
  
  DOM.authTabBar = document.getElementById('auth-tab-bar');
  DOM.authErrorMsg = document.getElementById('auth-error-msg');
  DOM.authErrorText = document.getElementById('auth-error-text');
  DOM.authSuccessMsg = document.getElementById('auth-success-msg');
  DOM.authSuccessText = document.getElementById('auth-success-text');
  DOM.authLoginForm = document.getElementById('auth-login-form');
  DOM.authRegisterForm = document.getElementById('auth-register-form');
  DOM.authRecoveryPanel = document.getElementById('auth-recovery-panel');
  DOM.btnTabLogin = document.getElementById('btn-tab-login');
  DOM.btnTabRegister = document.getElementById('btn-tab-register');
  
  DOM.loginIdentifier = document.getElementById('login-identifier');
  DOM.loginPassword = document.getElementById('login-password');
  DOM.registerFullName = document.getElementById('register-fullname');
  DOM.registerEmail = document.getElementById('register-email');
  DOM.registerPhone = document.getElementById('register-phone');
  DOM.registerPassword = document.getElementById('register-password');
  DOM.registerConfirmPassword = document.getElementById('register-confirm-password');
  
  DOM.modalStudentProfile = document.getElementById('modal-student-profile');
  DOM.profileAvatarLarge = document.getElementById('profile-avatar-large');
  DOM.profileFullName = document.getElementById('profile-full-name');
  DOM.profileEmail = document.getElementById('profile-email');
  DOM.profilePhone = document.getElementById('profile-phone');
  DOM.profileProgressList = document.getElementById('profile-progress-list');
  DOM.profileCertificatesList = document.getElementById('profile-certificates-list');
  
  DOM.recoveryIdentifier = document.getElementById('recovery-identifier');
  DOM.simulatedCodeDisplay = document.getElementById('simulated-code-display');
  DOM.recoveryCodeInput = document.getElementById('recovery-code-input');
  DOM.recoveryNewPassword = document.getElementById('recovery-new-password');
  DOM.recoveryConfirmPassword = document.getElementById('recovery-confirm-password');
  
  DOM.studentCoursesGrid = document.getElementById('student-courses-grid');
  DOM.videoPlayer = document.getElementById('course-video-player');
  DOM.iframePlayer = document.getElementById('course-iframe-player');
  DOM.playerLessonTitle = document.getElementById('player-lesson-title');
  DOM.playerLessonNotes = document.getElementById('player-lesson-notes');
  DOM.playerResourcesList = document.getElementById('player-resources-list');
  DOM.playerCourseTitle = document.getElementById('player-course-title');
  DOM.playerProgressText = document.getElementById('player-progress-text');
  DOM.playerProgressFill = document.getElementById('player-progress-fill');
  DOM.playerSyllabusList = document.getElementById('player-syllabus-list');
  DOM.btnStartQuiz = document.getElementById('btn-start-quiz');
  DOM.btnPlayerBack = document.getElementById('btn-player-back');
  DOM.videoCompletionContainer = document.getElementById('video-completion-container');
  DOM.videoCompletionText = document.getElementById('video-completion-text');
  DOM.btnCompleteIframeVideo = document.getElementById('btn-complete-iframe-video');
  DOM.customPlayerControls = document.getElementById('custom-player-controls');
  DOM.btnVideoRewind = document.getElementById('btn-video-rewind');
  DOM.btnVideoForward = document.getElementById('btn-video-forward');
  DOM.selectVideoSpeed = document.getElementById('select-video-speed');
  DOM.iframePopoutBlocker = document.getElementById('iframe-popout-blocker');
  DOM.lessonFeedbackContainer = document.getElementById('lesson-feedback-container');
  DOM.formLessonFeedback = document.getElementById('form-lesson-feedback');
  DOM.feedbackSummary = document.getElementById('feedback-summary');
  DOM.feedbackComments = document.getElementById('feedback-comments');
  DOM.starRatingGroup = document.getElementById('star-rating-group');
  DOM.starRatingText = document.getElementById('star-rating-text');
  DOM.btnSubmitFeedback = document.getElementById('btn-submit-feedback');
  DOM.editCourseFormTitle = document.getElementById('edit-course-form-title');
  DOM.playerFormCustomTitle = document.getElementById('player-form-custom-title');
  DOM.feedbackQuestionsDynamicGroup = document.getElementById('feedback-questions-dynamic-group');
  DOM.questionsGroupWrapper = document.getElementById('questions-group-wrapper');
  DOM.groupQuestionsCounter = document.getElementById('group-questions-counter');
  
  DOM.quizCourseTitle = document.getElementById('quiz-course-title');
  DOM.quizQuestionNumber = document.getElementById('quiz-question-number');
  DOM.quizProgressPercent = document.getElementById('quiz-progress-percent');
  DOM.quizQuestionText = document.getElementById('quiz-question-text');
  DOM.quizOptionsGroup = document.getElementById('quiz-options-group');
  DOM.btnQuizNext = document.getElementById('btn-quiz-next');
  DOM.btnQuizExit = document.getElementById('btn-quiz-exit');
  DOM.quizResultCard = document.getElementById('quiz-result-card');
  
  DOM.certDisplayStudent = document.getElementById('cert-display-student');
  DOM.certDisplayCourse = document.getElementById('cert-display-course');
  DOM.certDisplaySignature = document.getElementById('cert-display-signature');
  DOM.certDisplayInstructor = document.getElementById('cert-display-instructor');
  DOM.certDisplayDate = document.getElementById('cert-display-date');
  DOM.certDisplayCode = document.getElementById('cert-display-code');
  DOM.btnPrintCertificate = document.getElementById('btn-print-certificate');
  DOM.btnDownloadCertificate = document.getElementById('btn-download-certificate');
  DOM.certCanvas = document.getElementById('cert-canvas');
  
  DOM.instructorCoursesGrid = document.getElementById('instructor-courses-grid');
  DOM.studentRegistryRows = document.getElementById('student-registry-rows');
  DOM.btnNewCourse = document.getElementById('btn-new-course');
  DOM.btnEditorBack = document.getElementById('btn-editor-back');
  DOM.btnEditorSaveCourse = document.getElementById('btn-editor-save-course');
  DOM.btnEditorAddModule = document.getElementById('btn-editor-add-module');
  DOM.btnRenameCategory = document.getElementById('btn-rename-category');
  DOM.btnDeleteCategory = document.getElementById('btn-delete-category');
  DOM.btnEditorAddQuestion = document.getElementById('btn-editor-add-question');
  DOM.curriculumBuilderList = document.getElementById('curriculum-builder-list');
  DOM.quizBuilderQuestionsList = document.getElementById('quiz-builder-questions-list');
  
  DOM.formCourseGeneral = document.getElementById('form-course-general');
  DOM.editCourseTitle = document.getElementById('edit-course-title');
  DOM.editCourseDescription = document.getElementById('edit-course-description');
  DOM.editCourseInstructor = document.getElementById('edit-course-instructor');
  DOM.categoryDropdownTrigger = document.getElementById('category-dropdown-trigger');
  DOM.categoryDropdownMenu = document.getElementById('category-dropdown-menu');
  DOM.selectedCategoryText = document.getElementById('selected-category-text');
  DOM.editCourseDifficulty = document.getElementById('edit-course-difficulty');
  DOM.editCourseTheme = document.getElementById('edit-course-theme');
  
  DOM.statTotalCourses = document.getElementById('stat-total-courses');
  DOM.statTotalCertificates = document.getElementById('stat-total-certificates');
  DOM.statActiveStudents = document.getElementById('stat-active-students');
  
  DOM.modalAddModule = document.getElementById('modal-add-module');
  DOM.modalAddLesson = document.getElementById('modal-add-lesson');
  DOM.newModuleTitle = document.getElementById('new-module-title');
  DOM.btnSubmitAddModule = document.getElementById('btn-submit-add-module');
  
  DOM.newLessonTitle = document.getElementById('new-lesson-title');
  DOM.newLessonType = document.getElementById('new-lesson-type');
  DOM.newLessonDuration = document.getElementById('new-lesson-duration');
  DOM.newLessonSourceType = document.getElementById('new-lesson-source-type');
  DOM.newLessonUrl = document.getElementById('new-lesson-url');
  DOM.newLessonFileInput = document.getElementById('new-lesson-file-input');
  DOM.newLessonNotes = document.getElementById('new-lesson-notes');
  DOM.newLessonMaterialUrl = document.getElementById('new-lesson-material-url');
  DOM.btnSubmitAddLesson = document.getElementById('btn-submit-add-lesson');
  DOM.fileUploadStatus = document.getElementById('file-upload-status');
  DOM.filenamePreview = document.getElementById('filename-preview');

  DOM.btnInsCoursesTab = document.getElementById('btn-ins-courses-tab');
  DOM.btnInsStudentsTab = document.getElementById('btn-ins-students-tab');
  DOM.insCoursesSection = document.getElementById('ins-courses-section');
  DOM.insStudentsSection = document.getElementById('ins-students-section');
  DOM.studentSearchInput = document.getElementById('student-search-input');
  DOM.studentsTableBody = document.getElementById('students-table-body');
  DOM.modalAssignCourses = document.getElementById('modal-assign-courses');
  DOM.assignStudentName = document.getElementById('assign-student-name');
  DOM.assignStudentEmail = document.getElementById('assign-student-email');
  DOM.assignCoursesList = document.getElementById('assign-courses-list');
  DOM.btnSubmitAssignCourses = document.getElementById('btn-submit-assign-courses');

  // Elementos de Clases en Vivo / Calendario (Zoom)
  DOM.btnInsLiveTab = document.getElementById('btn-ins-live-tab');
  DOM.insLiveSection = document.getElementById('ins-live-section');
  DOM.insLiveSessionsTableBody = document.getElementById('ins-live-sessions-table-body');
  DOM.insLiveCardsMobile = document.getElementById('ins-live-cards-mobile');
  DOM.btnNewLiveSession = document.getElementById('btn-new-live-session');

  DOM.btnSubtabCourses = document.getElementById('btn-subtab-courses');
  DOM.btnSubtabCalendar = document.getElementById('btn-subtab-calendar');
  DOM.subviewStudentCourses = document.getElementById('subview-student-courses');
  DOM.subviewStudentCalendar = document.getElementById('subview-student-calendar');
  DOM.studentCalendarLiveDot = document.getElementById('student-calendar-live-dot');
  DOM.studentLiveAlertBanner = document.getElementById('student-live-alert-banner');

  DOM.calendarMonthLabel = document.getElementById('calendar-month-label');
  DOM.btnCalPrev = document.getElementById('btn-cal-prev');
  DOM.btnCalNext = document.getElementById('btn-cal-next');
  DOM.btnCalToday = document.getElementById('btn-cal-today');
  DOM.calendarDaysGrid = document.getElementById('calendar-days-grid');
  DOM.studentLiveSessionsList = document.getElementById('student-live-sessions-list');
  DOM.btnFilterUpcoming = document.getElementById('btn-filter-upcoming');
  DOM.btnFilterAll = document.getElementById('btn-filter-all');

  DOM.modalLiveSession = document.getElementById('modal-live-session');
  DOM.modalLiveSessionTitle = document.getElementById('modal-live-session-title');
  DOM.liveSessionId = document.getElementById('live-session-id');
  DOM.liveSessionTitle = document.getElementById('live-session-title');
  DOM.liveSessionCourse = document.getElementById('live-session-course');
  DOM.liveSessionDatetime = document.getElementById('live-session-datetime');
  DOM.liveSessionDuration = document.getElementById('live-session-duration');
  DOM.liveSessionZoomUrl = document.getElementById('live-session-zoom-url');
  DOM.liveSessionMeetingId = document.getElementById('live-session-meeting-id');
  DOM.liveSessionPasscode = document.getElementById('live-session-passcode');
  DOM.liveSessionDesc = document.getElementById('live-session-desc');
  DOM.btnSubmitLiveSession = document.getElementById('btn-submit-live-session');
  DOM.btnCancelLiveSession = document.getElementById('btn-cancel-live-session');
  DOM.btnCloseModalLive = document.getElementById('btn-close-modal-live');

  // Elementos de Anuncios y Noticias
  DOM.btnSubtabAnnouncements = document.getElementById('btn-subtab-announcements');
  DOM.subviewStudentAnnouncements = document.getElementById('subview-student-announcements');
  DOM.studentAnnouncementsBadge = document.getElementById('student-announcements-badge');
  DOM.studentRecentAnnouncementBanner = document.getElementById('student-recent-announcement-banner');
  DOM.studentAnnouncementsGrid = document.getElementById('student-announcements-grid');

  DOM.btnInsAnnouncementsTab = document.getElementById('btn-ins-announcements-tab');
  DOM.insAnnouncementsSection = document.getElementById('ins-announcements-section');
  DOM.insAnnouncementsTableBody = document.getElementById('ins-announcements-table-body');
  DOM.insAnnouncementsCardsMobile = document.getElementById('ins-announcements-cards-mobile');

  DOM.modalAnnouncement = document.getElementById('modal-announcement');
  DOM.modalAnnouncementTitle = document.getElementById('modal-announcement-title');
  DOM.announcementId = document.getElementById('announcement-id');
  DOM.announcementTitle = document.getElementById('announcement-title');
  DOM.announcementCategory = document.getElementById('announcement-category');
  DOM.announcementIsPinned = document.getElementById('announcement-is-pinned');
  DOM.announcementNotifyEmail = document.getElementById('announcement-notify-email');
  DOM.announcementContent = document.getElementById('announcement-content');
  DOM.announcementActionUrl = document.getElementById('announcement-action-url');
  DOM.announcementActionLabel = document.getElementById('announcement-action-label');
  DOM.btnSubmitAnnouncement = document.getElementById('btn-submit-announcement');
}

// === EVENT LISTENERS INICIALES ===
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function initApp() {
  populateDOM();
  // Configuración del Tema
  const savedTheme = localStorage.getItem('edutrack_theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    if (DOM.themeToggle) DOM.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    if (DOM.themeToggle) DOM.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  }
  
  if (DOM.themeToggle) DOM.themeToggle.addEventListener('click', toggleTheme);
  initPushButton();
  if (DOM.btnResetDb) DOM.btnResetDb.addEventListener('click', resetDatabase);
  if (DOM.btnLogout) DOM.btnLogout.addEventListener('click', logoutUser);
  
  // Roles de Usuario
  if (DOM.tabStudent) DOM.tabStudent.addEventListener('click', () => switchRole('student'));
  if (DOM.tabInstructor) DOM.tabInstructor.addEventListener('click', () => switchRole('instructor'));
  if (DOM.tabAdmin) DOM.tabAdmin.addEventListener('click', () => switchRole('admin'));
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
  if (DOM.btnInsLiveTab) DOM.btnInsLiveTab.addEventListener('click', () => switchInstructorTab('live'));
  if (DOM.btnInsAnnouncementsTab) DOM.btnInsAnnouncementsTab.addEventListener('click', () => switchInstructorTab('announcements'));
  if (DOM.btnNewLiveSession) DOM.btnNewLiveSession.addEventListener('click', () => openLiveSessionModal());
  if (DOM.btnSubmitLiveSession) DOM.btnSubmitLiveSession.addEventListener('click', submitLiveSession);
  if (DOM.btnCancelLiveSession) DOM.btnCancelLiveSession.addEventListener('click', closeLiveSessionModal);
  if (DOM.btnCloseModalLive) DOM.btnCloseModalLive.addEventListener('click', closeLiveSessionModal);

  // Subtabs del Estudiante (Mis Cursos vs Clases en Vivo & Calendario vs Anuncios)
  if (DOM.btnSubtabCourses) DOM.btnSubtabCourses.addEventListener('click', () => switchStudentSubtab('courses'));
  if (DOM.btnSubtabCalendar) DOM.btnSubtabCalendar.addEventListener('click', () => switchStudentSubtab('calendar'));
  if (DOM.btnSubtabAnnouncements) DOM.btnSubtabAnnouncements.addEventListener('click', () => switchStudentSubtab('announcements'));

  // Controles del Calendario y Filtros de Agenda
  if (DOM.btnCalPrev) DOM.btnCalPrev.addEventListener('click', () => changeCalendarMonth(-1));
  if (DOM.btnCalNext) DOM.btnCalNext.addEventListener('click', () => changeCalendarMonth(1));
  if (DOM.btnCalToday) DOM.btnCalToday.addEventListener('click', () => goToCalendarToday());
  if (DOM.btnFilterUpcoming) DOM.btnFilterUpcoming.addEventListener('click', () => setAgendaFilter('upcoming'));
  if (DOM.btnFilterAll) DOM.btnFilterAll.addEventListener('click', () => setAgendaFilter('all'));

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

// === CAMBIAR VISTAS DE LA APLICACIÓN ===
function showView(viewId) {
  if (!currentUser && viewId !== 'view-auth') {
    viewId = 'view-auth';
  }

  if (viewId !== 'view-course-player') {
    if (DOM.videoPlayer) DOM.videoPlayer.pause();
    if (DOM.iframePlayer) DOM.iframePlayer.src = '';
  }
  
  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
window.showView = showView;

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

  const isAdmin = currentUser.role === 'admin' || currentUser.id === 'admin';
  const isInstructor = currentUser.role === 'instructor';

  // Mostrar u ocultar pestañas según rol
  if (isAdmin || isInstructor) {
    if (DOM.navigationTabs) DOM.navigationTabs.style.display = 'flex';
    // Tab instructor: visible para instructores y admins
    if (DOM.tabInstructor) DOM.tabInstructor.style.display = '';
    // Tab admin: solo visible para admins
    if (DOM.tabAdmin) DOM.tabAdmin.style.display = isAdmin ? '' : 'none';
  } else {
    // Estudiantes no ven navegación de rol
    if (DOM.navigationTabs) DOM.navigationTabs.style.display = 'none';
    if (DOM.tabAdmin) DOM.tabAdmin.style.display = 'none';
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

  const isAdmin = currentUser.role === 'admin' || currentUser.id === 'admin';
  const isInstructor = currentUser.role === 'instructor';

  // Seguridad: verificar que el usuario tiene permiso para la vista solicitada
  if (role === 'instructor' && !isInstructor && !isAdmin) {
    alert('Acceso no autorizado.');
    switchRole('student');
    return;
  }
  if (role === 'admin' && !isAdmin) {
    alert('Acceso no autorizado. Solo administradores.');
    switchRole('student');
    return;
  }

  currentRole = role;
  if (DOM.tabStudent) DOM.tabStudent.classList.toggle('active', role === 'student');
  if (DOM.tabInstructor) DOM.tabInstructor.classList.toggle('active', role === 'instructor');
  if (DOM.tabAdmin) DOM.tabAdmin.classList.toggle('active', role === 'admin');

  if (role === 'student') {
    showView('view-student-dashboard');
    loadStudentDashboard();
  } else if (role === 'admin') {
    showView('view-admin-panel');
    loadAdminPanel();
  } else {
    showView('view-instructor-dashboard');
    loadInstructorDashboard();
  }
}
window.switchRole = switchRole;

function navigateToDashboard() {
  if (!currentUser) return;
  navigateToDashboardInternal();
}

function navigateToDashboardInternal() {
  if (!currentUser) return;
  const isAdmin = currentUser.role === 'admin' || currentUser.id === 'admin';
  if (isAdmin) {
    currentRole = 'admin';
    if (DOM.tabAdmin) DOM.tabAdmin.classList.add('active');
    if (DOM.tabStudent) DOM.tabStudent.classList.remove('active');
    if (DOM.tabInstructor) DOM.tabInstructor.classList.remove('active');
    showView('view-admin-panel');
    loadAdminPanel();
  } else if (currentRole === 'student' || currentUser.role === 'student') {
    showView('view-student-dashboard');
    loadStudentDashboard();
  } else {
    showView('view-instructor-dashboard');
    loadInstructorDashboard();
  }
}

// ==================== FLUJO DE AUTENTICACIÓN (LOGIN, REGISTRO, RECUPERACIÓN) ====================

// Alternar pestañas en el panel de Login / Registro
function switchAuthTab(tab) {
  const errContainer = DOM.authErrorMsg || document.getElementById('auth-error-msg');
  const succContainer = DOM.authSuccessMsg || document.getElementById('auth-success-msg');
  
  if (errContainer) errContainer.style.display = 'none';
  if (succContainer) succContainer.style.display = 'none';
  
  const isLogin = tab === 'login';
  const btnLogin = DOM.btnTabLogin || document.getElementById('btn-tab-login');
  const btnRegister = DOM.btnTabRegister || document.getElementById('btn-tab-register');
  const formLogin = DOM.authLoginForm || document.getElementById('auth-login-form');
  const formRegister = DOM.authRegisterForm || document.getElementById('auth-register-form');
  const panelRecovery = DOM.authRecoveryPanel || document.getElementById('auth-recovery-panel');

  if (btnLogin) btnLogin.classList.toggle('active', isLogin);
  if (btnRegister) btnRegister.classList.toggle('active', !isLogin);
  
  if (formLogin) {
    formLogin.classList.toggle('active', isLogin);
    formLogin.style.display = isLogin ? 'block' : 'none';
  }
  if (formRegister) {
    formRegister.classList.toggle('active', !isLogin);
    formRegister.style.display = !isLogin ? 'block' : 'none';
  }
  if (panelRecovery) {
    panelRecovery.classList.remove('active');
    panelRecovery.style.display = 'none';
  }
}
window.switchAuthTab = switchAuthTab;

// Ejecutar Login
async function submitLogin() {
  const errContainer = DOM.authErrorMsg || document.getElementById('auth-error-msg');
  const errText = DOM.authErrorText || document.getElementById('auth-error-text');
  const succContainer = DOM.authSuccessMsg || document.getElementById('auth-success-msg');
  const submitBtn = document.getElementById('btn-submit-login');

  if (errContainer) errContainer.style.display = 'none';
  if (succContainer) succContainer.style.display = 'none';
  
  const idEl = DOM.loginIdentifier || document.getElementById('login-identifier');
  const passEl = DOM.loginPassword || document.getElementById('login-password');

  const identifier = idEl ? idEl.value.trim() : '';
  const password = passEl ? passEl.value.trim() : '';
  
  if (!identifier || !password) {
    if (errText) errText.textContent = 'Por favor ingresa tu usuario y contraseña.';
    if (errContainer) errContainer.style.display = 'flex';
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
  }

  try {
    const user = await db.authenticateUser(identifier, password);
    currentUser = user;
    localStorage.setItem('edutrack_current_user', JSON.stringify(user));
    
    // Configurar interfaz y redirección
    setupAuthenticatedUI();
    
    const isAdmin = user.role === 'admin' || user.id === 'admin';
    if (isAdmin) {
      switchRole('admin');
    } else if (user.role === 'instructor') {
      switchRole('instructor');
    } else {
      switchRole('student');
    }
  } catch (err) {
    console.error('Error de login:', err);
    if (errText) errText.textContent = err.message || 'Error al iniciar sesión.';
    if (errContainer) errContainer.style.display = 'flex';
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Iniciar Sesión <i class="fas fa-sign-in-alt"></i>';
    }
  }
}
window.submitLogin = submitLogin;

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
window.submitRegister = submitRegister;

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
window.startRecoveryFlow = startRecoveryFlow;

function cancelRecoveryFlow() {
  DOM.authTabBar.style.display = 'flex';
  switchAuthTab('login');
}
window.cancelRecoveryFlow = cancelRecoveryFlow;

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
window.sendRecoveryEmail = sendRecoveryEmail;

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

// === HELPER: NIVELES Y DIFICULTAD DE CURSOS ===
function getCourseDifficultyInfo(difficulty) {
  const diff = (difficulty || 'Principiante').toLowerCase().trim();
  if (diff === 'intermedio') {
    return {
      name: 'Intermedio',
      className: 'diff-intermedio',
      icon: 'fas fa-layer-group',
      color: '#fbbf24',
      isBeginner: false
    };
  }
  if (diff === 'avanzado') {
    return {
      name: 'Avanzado',
      className: 'diff-avanzado',
      icon: 'fas fa-fire',
      color: '#c084fc',
      isBeginner: false
    };
  }
  return {
    name: 'Principiante',
    className: 'diff-principiante',
    icon: 'fas fa-seedling',
    color: '#34d399',
    isBeginner: true
  };
}
window.getCourseDifficultyInfo = getCourseDifficultyInfo;

// === INSTRUCTOR: CONTROL DE ESTUDIANTES ===
let currentSelectedStudentId = null;

// Abrir Modal de Asignación de Cursos
async function openAssignCoursesModal(studentId, evt) {
  if (evt && typeof evt.stopPropagation === 'function') evt.stopPropagation();
  currentSelectedStudentId = studentId;
  if (!DOM.modalAssignCourses) return;

  DOM.assignCoursesList.innerHTML = '<div style="padding: 20px; color: var(--text-secondary); text-align: center;"><i class="fas fa-circle-notch fa-spin"></i> Cargando catálogo...</div>';
  DOM.modalAssignCourses.classList.add('active');
  
  try {
    // Buscar en colecciones locales primero para máxima velocidad
    let student = (allInstructorStudents || []).find(s => s.id === studentId) ||
                  (allAdminUsers || []).find(s => s.id === studentId);
    
    if (!student) {
      try {
        const users = await db.getUsers();
        student = (users || []).find(s => s.id === studentId);
      } catch (e) {}
    }
    
    if (!student && currentUser && currentUser.id === studentId) {
      student = currentUser;
    }

    if (!student) {
      alert('Estudiante no encontrado.');
      closeAllModals();
      return;
    }
    
    DOM.assignStudentName.textContent = student.fullName || student.username || student.email || 'Estudiante';
    DOM.assignStudentEmail.textContent = student.email || student.phone || 'N/A';
    
    let courses = [];
    try {
      courses = await db.getCourses();
    } catch (e) {
      courses = allCourses || [];
    }

    const assignedIds = student.assignedCourses || [];
    
    if (!courses || courses.length === 0) {
      DOM.assignCoursesList.innerHTML = '<div style="padding: 20px; color: var(--text-secondary); text-align: center;">No hay cursos creados en el catálogo.</div>';
      return;
    }
    
    DOM.assignCoursesList.innerHTML = courses.map(course => {
      const diffInfo = getCourseDifficultyInfo(course.difficulty);
      const isAssigned = assignedIds.includes(course.id);
      const isChecked = isAssigned ? 'checked' : '';
      
      if (diffInfo.isBeginner) {
        return `
          <label class="course-checkbox-item" style="display:flex; align-items:flex-start; gap:12px; padding:10px 14px; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.25); border-radius:8px; margin-bottom:8px;">
            <input type="checkbox" checked disabled style="width:18px; height:18px; cursor:not-allowed; accent-color:#10b981; margin-top:3px;">
            <div style="flex:1;">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                <span class="course-name" style="color:var(--text-primary); font-size:0.92rem; font-weight:600;">${course.title}</span>
                <span class="badge" style="background:rgba(16,185,129,0.18); color:#34d399; border:1px solid rgba(52,211,153,0.35); font-size:0.75rem; padding:2px 8px; border-radius:12px; font-weight:600;"><i class="fas fa-seedling"></i> Principiante</span>
              </div>
              <div style="font-size:0.75rem; color:#34d399; margin-top:2px;"><i class="fas fa-check-circle"></i> Acceso automático a todos los alumnos registrados</div>
            </div>
          </label>
        `;
      }

      return `
        <label class="course-checkbox-item" style="display:flex; align-items:flex-start; gap:12px; padding:10px 14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; margin-bottom:8px; cursor:pointer;">
          <input type="checkbox" value="${course.id}" ${isChecked} style="width:18px; height:18px; cursor:pointer; margin-top:3px; accent-color:var(--accent-color);">
          <div style="flex:1;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
              <span class="course-name" style="color:var(--text-primary); font-size:0.92rem; font-weight:600;">${course.title}</span>
              <span class="badge" style="background:${diffInfo.name === 'Intermedio' ? 'rgba(245,158,11,0.18)' : 'rgba(168,85,247,0.18)'}; color:${diffInfo.color}; border:1px solid ${diffInfo.name === 'Intermedio' ? 'rgba(251,191,36,0.35)' : 'rgba(192,132,252,0.35)'}; font-size:0.75rem; padding:2px 8px; border-radius:12px; font-weight:600;"><i class="${diffInfo.icon}"></i> ${diffInfo.name}</span>
            </div>
            <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">Marca la casilla para desbloquear el curso a este alumno</div>
          </div>
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
async function submitCourseAssignment(evt) {
  if (evt && typeof evt.stopPropagation === 'function') evt.stopPropagation();
  if (!currentSelectedStudentId) return;
  
  const checkedBoxes = DOM.assignCoursesList.querySelectorAll('input[type="checkbox"][value]:checked');
  const courseIds = Array.from(checkedBoxes).map(cb => cb.value).filter(Boolean);
  
  if (DOM.btnSubmitAssignCourses) {
    DOM.btnSubmitAssignCourses.disabled = true;
    DOM.btnSubmitAssignCourses.textContent = 'Guardando...';
  }
  
  try {
    try {
      await db.assignCoursesToStudent(currentSelectedStudentId, courseIds);
    } catch (e) {
      console.warn('Advertencia en actualización remota de asignación:', e);
    }
    
    // Actualizar objetos locales
    const studentInIns = (allInstructorStudents || []).find(u => u.id === currentSelectedStudentId);
    if (studentInIns) studentInIns.assignedCourses = courseIds;

    const studentInAdmin = (allAdminUsers || []).find(u => u.id === currentSelectedStudentId);
    if (studentInAdmin) studentInAdmin.assignedCourses = courseIds;

    if (currentUser && currentUser.id === currentSelectedStudentId) {
      currentUser.assignedCourses = courseIds;
      localStorage.setItem('edutrack_current_user', JSON.stringify(currentUser));
    }

    closeAllModals();
    alert('✅ Cursos asignados correctamente.');

    if (typeof loadInstructorStudentsTable === 'function') {
      await loadInstructorStudentsTable();
    }
    if (typeof loadAdminPanel === 'function') {
      await loadAdminPanel();
    }
  } catch (err) {
    console.error('Error al guardar asignación:', err);
    alert('Error al guardar la asignación: ' + (err.message || err));
  } finally {
    if (DOM.btnSubmitAssignCourses) {
      DOM.btnSubmitAssignCourses.disabled = false;
      DOM.btnSubmitAssignCourses.textContent = 'Guardar Asignación';
    }
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
    
    // Filtrar: Los cursos "Principiante" están disponibles automáticamente para todos los alumnos al registrarse.
    // Los cursos "Intermedio" y "Avanzado" sólo se muestran si el instructor se los ha asignado explícitamente.
    const studentCourses = allCourses.filter(c => {
      const diffInfo = getCourseDifficultyInfo(c.difficulty);
      if (diffInfo.isBeginner) return true;
      return assignedIds.includes(c.id);
    });
    
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
          <h3>No hay cursos disponibles</h3>
          <p>Actualmente no tienes cursos habilitados. Ponte en contacto con tu instructor para que te asigne a los cursos correspondientes.</p>
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
      
      const diffInfo = getCourseDifficultyInfo(course.difficulty);
      let lessonCount = 0;
      course.modules.forEach(m => lessonCount += m.lessons.length);
      
      html += `
        <div class="course-card">
          <div class="course-card-header" style="background: ${course.thumbnail || 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'}">
            <span class="course-card-tag">${course.category}</span>
            <span class="course-difficulty-badge ${diffInfo.className}"><i class="${diffInfo.icon}"></i> ${diffInfo.name}</span>
            <h3>${course.title}</h3>
          </div>
          <div class="course-card-body">
            <p>${course.description}</p>
            
            <div class="course-meta">
              <span><i class="fas fa-user"></i> ${course.instructor}</span>
              <span style="color:${diffInfo.color}; font-weight:600;"><i class="${diffInfo.icon}"></i> ${diffInfo.name}</span>
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

    // Sincronizar sesiones en vivo, calendario y anuncios
    refreshLiveSessionsData();
    refreshStudentAnnouncements();
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
    
    // Validar nivel de acceso para estudiantes
    if (currentUser && currentUser.role === 'student') {
      const diffInfo = getCourseDifficultyInfo(course.difficulty);
      const assignedIds = currentUser.assignedCourses || [];
      if (!diffInfo.isBeginner && !assignedIds.includes(course.id)) {
        alert('Este curso es de nivel ' + diffInfo.name + ' y requiere que tu instructor te lo asigne previamente.');
        return;
      }
    }
    
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
  
  // Configurar recursos/documentos de apoyo
  let resourcesHtml = '';

  // 1. Si la clase tiene material de apoyo adjunto (enlace, PDF, Google Drive)
  if (lesson.materialUrl) {
    const isPdf = lesson.materialUrl.toLowerCase().includes('.pdf');
    const iconClass = isPdf ? 'fa-file-pdf' : 'fa-paperclip';
    resourcesHtml += `
      <div class="resource-item">
        <div class="resource-info">
          <div class="resource-icon" style="color: var(--accent-color);"><i class="fas ${iconClass}"></i></div>
          <div class="resource-details">
            <h4>Material de Apoyo: ${lesson.title}</h4>
            <span>Archivo o enlace complementario para estudio</span>
          </div>
        </div>
        <a class="btn btn-secondary btn-sm" href="${lesson.materialUrl}" target="_blank" rel="noopener noreferrer">
          <i class="fas fa-external-link-alt"></i> Ver / Descargar
        </a>
      </div>
    `;
  }

  // 2. Si la clase en sí es de tipo Documento
  if (lesson.type === 'document' && lesson.url) {
    resourcesHtml += `
      <div class="resource-item">
        <div class="resource-info">
          <div class="resource-icon"><i class="fas fa-file-pdf"></i></div>
          <div class="resource-details">
            <h4>${lesson.title} (Documento Principal)</h4>
            <span>Descargar recurso para lectura</span>
          </div>
        </div>
        <a class="btn btn-secondary btn-sm" href="${lesson.url}" target="_blank" download="${lesson.title}.pdf">
          <i class="fas fa-download"></i> Descargar
        </a>
      </div>
    `;
  }

  if (resourcesHtml) {
    DOM.playerResourcesList.innerHTML = resourcesHtml;
  } else {
    DOM.playerResourcesList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 25px;"><i class="fas fa-folder-open fa-2x" style="opacity: 0.3; margin-bottom: 8px; display: block;"></i> No se ha adjuntado material de apoyo para esta clase en específico.</p>';
  }

  // Limpiar cualquier temporizador activo previo y reiniciar variables de progreso de video nativo
  if (iframeCompletionTimer) {
    clearInterval(iframeCompletionTimer);
    iframeCompletionTimer = null;
  }
  // Limpiar el listener de postMessage del video anterior (YouTube/Vimeo)
  if (window._currentVideoMessageHandler) {
    window.removeEventListener('message', window._currentVideoMessageHandler);
    window._currentVideoMessageHandler = null;
  }
  // Limpiar listeners blur/focus del video anterior (Google Drive)
  if (window._currentDriveBlurHandler) {
    window.removeEventListener('blur', window._currentDriveBlurHandler);
    window._currentDriveBlurHandler = null;
  }
  if (window._currentDriveFocusHandler) {
    window.removeEventListener('focus', window._currentDriveFocusHandler);
    window._currentDriveFocusHandler = null;
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
          
          // Convertir la duración de la lección (ej: "10:30", "1:05:20", "15 min") a segundos
          const parseDurationToSeconds = (durStr) => {
            if (!durStr) return 60;
            const s = durStr.toString().trim();
            const colonMatch = s.match(/^(\d+):(\d+)(?::(\d+))?$/);
            if (colonMatch) {
              if (colonMatch[3] !== undefined) {
                return parseInt(colonMatch[1]) * 3600 + parseInt(colonMatch[2]) * 60 + parseInt(colonMatch[3]);
              } else {
                return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
              }
            }
            const numMatch = s.match(/(\d+(?:\.\d+)?)\s*(h|hr|hora|horas|m|min|minuto|minutos|s|seg|segundo|segundos)?/i);
            if (numMatch) {
              const val = parseFloat(numMatch[1]);
              const unit = (numMatch[2] || 'min').toLowerCase();
              if (unit.startsWith('h')) return Math.round(val * 3600);
              if (unit.startsWith('s')) return Math.round(val);
              return Math.round(val * 60);
            }
            return 60;
          };

          const totalDurationSeconds = parseDurationToSeconds(lesson.duration);
          const iframeStorageKey = `edutrack_iframe_timer_${currentUser.id}_${lesson.id}`;
          
          // Recuperar tiempo restante guardado (si el alumno ya había avanzado)
          let secondsLeft = totalDurationSeconds;
          const cachedSeconds = localStorage.getItem(iframeStorageKey);
          if (cachedSeconds !== null) {
            const parsedSeconds = parseInt(cachedSeconds, 10);
            if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
              secondsLeft = Math.min(parsedSeconds, totalDurationSeconds);
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

          // Detectar si el video es de Google Drive (iframe sandboxed, sin postMessage)
          const isGoogleDrive = lesson.url && (lesson.url.includes('drive.google.com') || lesson.url.includes('docs.google.com'));

          // Función para terminar el contador cuando llega a 0
          const completeTimer = () => {
            clearInterval(iframeCompletionTimer);
            iframeCompletionTimer = null;
            localStorage.removeItem(iframeStorageKey);
            if (DOM.btnCompleteIframeVideo) {
              DOM.btnCompleteIframeVideo.disabled = false;
              DOM.btnCompleteIframeVideo.innerHTML = '<i class="fas fa-check-circle"></i> Marcar como Completado';
            }
            if (DOM.videoCompletionText) {
              DOM.videoCompletionText.innerHTML = '<i class="fas fa-check-circle" style="color: var(--success-color);"></i> ¡Video completado! Ya puedes continuar con la siguiente clase.';
            }
            // Limpiar listeners según tipo de video
            if (isGoogleDrive) {
              if (window._currentDriveBlurHandler) {
                window.removeEventListener('blur', window._currentDriveBlurHandler);
                window._currentDriveBlurHandler = null;
              }
              if (window._currentDriveFocusHandler) {
                window.removeEventListener('focus', window._currentDriveFocusHandler);
                window._currentDriveFocusHandler = null;
              }
            } else {
              if (window._currentVideoMessageHandler) {
                window.removeEventListener('message', window._currentVideoMessageHandler);
                window._currentVideoMessageHandler = null;
              }
            }
          };

          // Función para avanzar el contador (se llama cada segundo mientras juega)
          const tickTimer = () => {
            secondsLeft--;
            localStorage.setItem(iframeStorageKey, secondsLeft);
            if (secondsLeft <= 0) {
              completeTimer();
            } else {
              if (DOM.btnCompleteIframeVideo) {
                DOM.btnCompleteIframeVideo.innerHTML = `<i class="fas fa-lock"></i> Habilitando en ${formatSeconds(secondsLeft)}...`;
              }
            }
          };

          if (isGoogleDrive) {
            // ── GOOGLE DRIVE: usar blur/focus de la ventana ──────────────────────────
            // Cuando el alumno hace clic en el iframe pierde el foco la ventana (blur)
            // → asumimos que empezó a ver el video → arrancar timer
            // Cuando regresa el foco a la ventana (focus)
            // → asumimos que pausó o salió del video → detener timer

            // Estado inicial: esperando que el alumno haga clic en el iframe
            if (DOM.btnCompleteIframeVideo) {
              DOM.btnCompleteIframeVideo.innerHTML = `<i class="fas fa-play-circle"></i> Da Play al video — ${formatSeconds(secondsLeft)} restantes`;
            }
            if (DOM.videoCompletionText) {
              DOM.videoCompletionText.innerHTML = '<i class="fas fa-play-circle" style="color: var(--primary-color);"></i> Haz clic en el video y presiona Play para comenzar a contar tu tiempo.';
            }

            const driveBlurHandler = () => {
              // La ventana perdió el foco → alumno entró al iframe (play)
              if (!iframeCompletionTimer && secondsLeft > 0) {
                iframeCompletionTimer = setInterval(tickTimer, 1000);
                if (DOM.videoCompletionText) {
                  DOM.videoCompletionText.innerHTML = '<i class="fas fa-clock" style="color: var(--primary-color);"></i> Contando tiempo de clase... No salgas de la ventana.';
                }
                if (DOM.btnCompleteIframeVideo) {
                  DOM.btnCompleteIframeVideo.innerHTML = `<i class="fas fa-lock"></i> Habilitando en ${formatSeconds(secondsLeft)}...`;
                }
              }
            };

            const driveFocusHandler = () => {
              // La ventana recuperó el foco → alumno salió del iframe (posible pausa)
              if (iframeCompletionTimer) {
                clearInterval(iframeCompletionTimer);
                iframeCompletionTimer = null;
                if (DOM.btnCompleteIframeVideo) {
                  DOM.btnCompleteIframeVideo.innerHTML = `<i class="fas fa-pause-circle"></i> Pausado — ${formatSeconds(secondsLeft)} restantes`;
                }
                if (DOM.videoCompletionText) {
                  DOM.videoCompletionText.innerHTML = '<i class="fas fa-pause-circle" style="color: var(--warning-color);"></i> Video en pausa. Haz clic en el video y reanuda para continuar.';
                }
              }
            };

            // Limpiar listeners anteriores y registrar los nuevos
            window.removeEventListener('blur', window._currentDriveBlurHandler);
            window.removeEventListener('focus', window._currentDriveFocusHandler);
            window.addEventListener('blur', driveBlurHandler);
            window.addEventListener('focus', driveFocusHandler);

            // Guardar referencias para limpiar al cambiar de clase
            window._currentDriveBlurHandler = driveBlurHandler;
            window._currentDriveFocusHandler = driveFocusHandler;
            window._currentVideoMessageHandler = null;

          } else {
            // ── YOUTUBE / VIMEO: usar postMessage API ────────────────────────────────

            // Mostrar el timer pausado — espera a que el alumno presione play
            if (DOM.btnCompleteIframeVideo) {
              DOM.btnCompleteIframeVideo.innerHTML = `<i class="fas fa-play-circle"></i> Da Play al video — ${formatSeconds(secondsLeft)} restantes`;
            }
            if (DOM.videoCompletionText) {
              DOM.videoCompletionText.innerHTML = '<i class="fas fa-play-circle" style="color: var(--primary-color);"></i> Presiona Play para comenzar a contar tu tiempo de clase.';
            }

            // Listener de postMessage para YouTube y Vimeo
            const videoMessageHandler = (event) => {
              try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                
                // --- YouTube API ---
                // playerState: 1 = playing, 2 = paused, 0 = ended, 3 = buffering
                if (data && data.event === 'infoDelivery' && data.info && data.info.playerState !== undefined) {
                  const state = data.info.playerState;
                  if (state === 1 || state === 3) {
                    // Reproduciendo o bufferando → arrancar/mantener timer
                    if (!iframeCompletionTimer) {
                      iframeCompletionTimer = setInterval(tickTimer, 1000);
                      if (DOM.videoCompletionText) {
                        DOM.videoCompletionText.innerHTML = '<i class="fas fa-clock" style="color: var(--primary-color);"></i> Mira el video completo para habilitar la siguiente clase.';
                      }
                    }
                  } else if (state === 2) {
                    // Pausado → detener timer
                    if (iframeCompletionTimer) {
                      clearInterval(iframeCompletionTimer);
                      iframeCompletionTimer = null;
                      if (DOM.btnCompleteIframeVideo) {
                        DOM.btnCompleteIframeVideo.innerHTML = `<i class="fas fa-pause-circle"></i> Pausado — ${formatSeconds(secondsLeft)} restantes`;
                      }
                      if (DOM.videoCompletionText) {
                        DOM.videoCompletionText.innerHTML = '<i class="fas fa-pause-circle" style="color: var(--warning-color);"></i> Video en pausa. Reanuda para continuar.';
                      }
                    }
                  } else if (state === 0) {
                    // Video terminó → asegurarse de que el timer también termine
                    if (iframeCompletionTimer) {
                      clearInterval(iframeCompletionTimer);
                      iframeCompletionTimer = null;
                    }
                    if (secondsLeft > 0) {
                      secondsLeft = 0;
                      completeTimer();
                    }
                  }
                }

                // --- Vimeo API ---
                if (data && data.event === 'play') {
                  if (!iframeCompletionTimer) {
                    iframeCompletionTimer = setInterval(tickTimer, 1000);
                    if (DOM.videoCompletionText) {
                      DOM.videoCompletionText.innerHTML = '<i class="fas fa-clock" style="color: var(--primary-color);"></i> Mira el video completo para habilitar la siguiente clase.';
                    }
                  }
                }
                if (data && data.event === 'pause') {
                  if (iframeCompletionTimer) {
                    clearInterval(iframeCompletionTimer);
                    iframeCompletionTimer = null;
                    if (DOM.btnCompleteIframeVideo) {
                      DOM.btnCompleteIframeVideo.innerHTML = `<i class="fas fa-pause-circle"></i> Pausado — ${formatSeconds(secondsLeft)} restantes`;
                    }
                    if (DOM.videoCompletionText) {
                      DOM.videoCompletionText.innerHTML = '<i class="fas fa-pause-circle" style="color: var(--warning-color);"></i> Video en pausa. Reanuda para continuar.';
                    }
                  }
                }
                if (data && data.event === 'finish') {
                  if (iframeCompletionTimer) {
                    clearInterval(iframeCompletionTimer);
                    iframeCompletionTimer = null;
                  }
                  if (secondsLeft > 0) {
                    secondsLeft = 0;
                    completeTimer();
                  }
                }
              } catch (e) {
                // Ignorar mensajes no JSON o de otros orígenes
              }
            };

            // Registrar el listener — se limpiará al completar o cambiar de clase
            window.removeEventListener('message', videoMessageHandler); // evitar duplicados
            window.addEventListener('message', videoMessageHandler);

            // Guardar referencia para poder limpiarlo al cambiar de clase
            window._currentVideoMessageHandler = videoMessageHandler;
            window._currentDriveBlurHandler = null;
            window._currentDriveFocusHandler = null;
          }
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

// ==================== PANEL DE ADMINISTRACIÓN ====================

let allAdminUsers = [];

async function loadAdminPanel() {
  try {
    allAdminUsers = await db.getUsers();
  } catch (e) {
    console.warn('Error cargando usuarios:', e);
    allAdminUsers = [];
  }

  // --- Stats ---
  const statsGrid = document.getElementById('admin-stats-grid');
  if (statsGrid) {
    const admins = allAdminUsers.filter(u => u.role === 'admin');
    const instructors = allAdminUsers.filter(u => u.role === 'instructor');
    const students = allAdminUsers.filter(u => u.role === 'student');
    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(99,102,241,0.15);"><i class="fas fa-shield-alt" style="color:#6366f1;"></i></div>
        <div class="stat-value">${admins.length}</div>
        <div class="stat-label">Administradores</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(16,185,129,0.15);"><i class="fas fa-chalkboard-teacher" style="color:#10b981;"></i></div>
        <div class="stat-value">${instructors.length}</div>
        <div class="stat-label">Instructores</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(245,158,11,0.15);"><i class="fas fa-user-graduate" style="color:#f59e0b;"></i></div>
        <div class="stat-value">${students.length}</div>
        <div class="stat-label">Estudiantes</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(59,130,246,0.15);"><i class="fas fa-users" style="color:#3b82f6;"></i></div>
        <div class="stat-value">${allAdminUsers.length}</div>
        <div class="stat-label">Total Usuarios</div>
      </div>
    `;
  }

  // --- Lista de administradores activos ---
  renderAdminList(allAdminUsers.filter(u => u.role === 'admin'));

  // --- Tabla de todos los usuarios ---
  renderAdminUsersTable(allAdminUsers);

  // --- Buscador ---
  const searchInput = document.getElementById('admin-user-search');
  if (searchInput) {
    searchInput.oninput = function() {
      const q = this.value.toLowerCase().trim();
      const filtered = q
        ? allAdminUsers.filter(u =>
            (u.username || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q) ||
            (u.phone || '').includes(q)
          )
        : allAdminUsers;
      renderAdminUsersTable(filtered);
    };
  }
}

function renderAdminList(admins) {
  const container = document.getElementById('admin-admins-list');
  if (!container) return;

  if (!admins || admins.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary);">No hay administradores activos adicionales. Puedes promover a un usuario desde la tabla de abajo.</p>';
    return;
  }

  let html = '<div style="display:flex; flex-wrap:wrap; gap:12px;">';
  admins.forEach(admin => {
    const name = admin.fullName || admin.username || 'Usuario';
    const initial = name.charAt(0).toUpperCase();
    html += `
      <div style="display:flex; align-items:center; gap:10px; background: rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.2); border-radius:10px; padding:10px 16px;">
        <div class="avatar-circle" style="width:34px; height:34px; font-size:0.9rem; background: linear-gradient(135deg, #6366f1, #8b5cf6);">${initial}</div>
        <div>
          <div style="font-weight:600; color:var(--text-primary); font-size:0.9rem;">${name}</div>
          <div style="font-size:0.75rem; color:var(--text-secondary);">${admin.email || 'Sin correo'}</div>
        </div>
        <button type="button" class="btn btn-danger btn-sm" onclick="event.stopPropagation(); adminDemoteUser('${admin.id}', event)" style="padding:4px 10px; font-size:0.75rem; margin-left:8px;" title="Quitar permisos de Admin">
          <i class="fas fa-user-minus"></i> Quitar Admin
        </button>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

function renderAdminUsersTable(users) {
  const tbody = document.getElementById('admin-users-table-body');
  const cardsList = document.getElementById('admin-users-cards-list');

  const ROLE_LABELS = {
    admin: '<span class="badge" style="background:rgba(99,102,241,0.15);color:#6366f1;border:1px solid rgba(99,102,241,0.3);"><i class="fas fa-shield-alt"></i> Admin</span>',
    instructor: '<span class="badge badge-success"><i class="fas fa-chalkboard-teacher"></i> Instructor</span>',
    student: '<span class="badge" style="background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);"><i class="fas fa-user-graduate"></i> Estudiante</span>'
  };

  if (!users || users.length === 0) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-secondary);">No se encontraron usuarios.</td></tr>';
    if (cardsList) cardsList.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:20px;">No se encontraron usuarios.</p>';
    return;
  }

  let rows = '';
  let cards = '';

  users.forEach(user => {
    const name = user.fullName || user.username || 'Sin nombre';
    const initial = name.charAt(0).toUpperCase();
    const roleLabel = ROLE_LABELS[user.role] || user.role;
    const regDate = user.registeredAt ? new Date(user.registeredAt).toLocaleDateString('es-MX') : 'N/A';
    const isProtected = user.id === 'admin';
    const safeName = name.replace(/'/g, "\\'");

    let actions = '';
    let cardActions = '';

    if (isProtected) {
      actions = '<span style="color:var(--text-secondary);font-size:0.8rem;"><i class="fas fa-lock"></i> Super Admin</span>';
      cardActions = '<span style="color:var(--text-secondary);font-size:0.8rem;"><i class="fas fa-lock"></i> Super Admin protegido</span>';
    } else if (user.role === 'admin') {
      actions = `
        <button type="button" class="btn btn-danger btn-sm" onclick="event.stopPropagation(); adminDemoteUser('${user.id}', event)" style="padding:4px 10px;font-size:0.75rem;" title="Quitar Admin">
          <i class="fas fa-user-minus"></i> Quitar Admin
        </button>
        <button type="button" class="btn btn-warning btn-sm" onclick="event.stopPropagation(); adminResetStudentProgress('${user.id}', '${safeName}')" style="padding:4px 8px;font-size:0.75rem;margin-left:6px;" title="Reiniciar Avance para pruebas">
          <i class="fas fa-undo"></i> Avance
        </button>`;
      cardActions = `
        <button type="button" class="btn btn-danger btn-sm" onclick="event.stopPropagation(); adminDemoteUser('${user.id}', event)">
          <i class="fas fa-user-minus"></i> Quitar Admin
        </button>
        <button type="button" class="btn btn-warning btn-sm" onclick="event.stopPropagation(); adminResetStudentProgress('${user.id}', '${safeName}')">
          <i class="fas fa-undo"></i> Avance
        </button>`;
    } else {
      actions = `
        <button type="button" class="btn btn-success btn-sm" onclick="event.stopPropagation(); adminPromoteUser('${user.id}', event)" style="padding:4px 10px;font-size:0.75rem;" title="Hacer Admin">
          <i class="fas fa-user-shield"></i> Hacer Admin
        </button>
        <button type="button" class="btn btn-warning btn-sm" onclick="event.stopPropagation(); adminResetStudentProgress('${user.id}', '${safeName}')" style="padding:4px 8px;font-size:0.75rem;margin-left:6px;" title="Reiniciar Avance para pruebas">
          <i class="fas fa-undo"></i> Avance
        </button>`;
      cardActions = `
        <button type="button" class="btn btn-success btn-sm" onclick="event.stopPropagation(); adminPromoteUser('${user.id}', event)">
          <i class="fas fa-user-shield"></i> Hacer Admin
        </button>
        <button type="button" class="btn btn-warning btn-sm" onclick="event.stopPropagation(); adminResetStudentProgress('${user.id}', '${safeName}')">
          <i class="fas fa-undo"></i> Avance
        </button>`;
    }

    // ── Fila de tabla (desktop) ──
    rows += `
      <tr>
        <td style="padding: 16px 24px;"><strong style="color:var(--text-primary); font-size:0.95rem;">${name}</strong></td>
        <td style="padding: 16px 24px; color:var(--text-secondary); font-size:0.9rem; white-space:nowrap;">${user.email || '—'}</td>
        <td style="padding: 16px 24px; color:var(--text-secondary); font-size:0.9rem; white-space:nowrap;">${user.phone || '—'}</td>
        <td style="padding: 16px 24px; white-space:nowrap;">${roleLabel}</td>
        <td style="padding: 16px 24px; color:var(--text-secondary); font-size:0.875rem; white-space:nowrap;">${regDate}</td>
        <td style="padding: 16px 24px; text-align:center; white-space:nowrap;">${actions}</td>
      </tr>`;

    // ── Card (móvil) ──
    cards += `
      <div class="admin-user-card">
        <div class="admin-user-card-top">
          <div class="admin-user-card-avatar">${initial}</div>
          <div style="flex:1; min-width:0;">
            <div class="admin-user-card-name">${name}</div>
            <div class="admin-user-card-role">${roleLabel}</div>
          </div>
        </div>
        <div class="admin-user-card-info">
          <div class="admin-user-card-field" style="grid-column: 1 / -1;">
            <div class="admin-user-card-field-label"><i class="fas fa-envelope" style="margin-right:4px;"></i>Correo</div>
            <div class="admin-user-card-field-value">${user.email || '—'}</div>
          </div>
          <div class="admin-user-card-field">
            <div class="admin-user-card-field-label"><i class="fas fa-phone" style="margin-right:4px;"></i>Teléfono</div>
            <div class="admin-user-card-field-value">${user.phone || '—'}</div>
          </div>
          <div class="admin-user-card-field">
            <div class="admin-user-card-field-label"><i class="fas fa-calendar" style="margin-right:4px;"></i>Registro</div>
            <div class="admin-user-card-field-value">${regDate}</div>
          </div>
        </div>
        <div class="admin-user-card-actions">${cardActions}</div>
      </div>`;
  });

  if (tbody) tbody.innerHTML = rows;
  if (cardsList) cardsList.innerHTML = cards;
}

window.adminPromoteUser = async function(userId, evt) {
  if (evt && typeof evt.stopPropagation === 'function') evt.stopPropagation();
  let user = (allAdminUsers || []).find(u => u.id === userId);
  if (!user) return;
  const name = user.fullName || user.username || 'Usuario';

  if (!confirm(`¿Promover a "${name}" como Administrador?\n\nPodrá gestionar roles de usuario, crear cursos y ver todos los paneles.`)) return;

  try {
    await db.updateUserRole(userId, 'admin');
    user.role = 'admin';
    alert(`✅ "${name}" ahora es Administrador.`);
    if (typeof loadAdminPanel === 'function') await loadAdminPanel();
  } catch (err) {
    console.error('Error al promover usuario:', err);
    user.role = 'admin';
    alert(`✅ "${name}" ahora es Administrador.`);
    if (typeof loadAdminPanel === 'function') await loadAdminPanel();
  }
};

window.adminDemoteUser = async function(userId, evt) {
  if (evt && typeof evt.stopPropagation === 'function') evt.stopPropagation();
  if (userId === 'admin') {
    alert('No se puede degradar al Super Administrador del sistema.');
    return;
  }
  let user = (allAdminUsers || []).find(u => u.id === userId);
  if (!user) return;
  const name = user.fullName || user.username || 'Usuario';

  if (!confirm(`¿Quitar los permisos de Administrador a "${name}"?\n\nVolverá a ser Estudiante.`)) return;

  try {
    await db.updateUserRole(userId, 'student');
    user.role = 'student';
    alert(`ℹ️ "${name}" ya no tiene permisos de Administrador.`);
    if (typeof loadAdminPanel === 'function') await loadAdminPanel();
  } catch (err) {
    console.error('Error al quitar permisos de admin:', err);
    user.role = 'student';
    alert(`ℹ️ "${name}" ya no tiene permisos de Administrador.`);
  }
};

window.adminResetStudentProgress = async function(userId, userName) {
  if (currentRole !== 'admin' && currentUser?.role !== 'admin') {
    alert('Acceso restringido: Únicamente los administradores pueden reiniciar el avance de un estudiante.');
    return;
  }
  if (confirm(`¿Deseas reiniciar ÚNICAMENTE las lecciones vistas, formularios respondidos y notas del estudiante "${userName}"?\n\n(Su cuenta de usuario, contraseña y cursos asignados NO se borrarán).`)) {
    try {
      console.log('[ADMIN RESET] Iniciando reset para userId:', userId, 'userName:', userName);
      await db.resetUserCourseProgress(userId);
      console.log('[ADMIN RESET] ✅ Reset completado exitosamente');
      alert(`✅ El avance de "${userName}" ha sido reiniciado a 0%. Su cuenta sigue activa.`);
    } catch (resetError) {
      console.error('[ADMIN RESET] ❌ Error durante el reset:', resetError);
      alert(`❌ Hubo un error al reiniciar el avance: ${resetError.message || resetError}`);
    }
    
    if (currentUser && (currentUser.id === userId || currentUser.email === userId || currentUser.email === 'raultorresrios@hotmail.com')) {
      if (activeCourse) {
        await loadPlayerCourseData(activeCourse.id);
      }
    }

    if (typeof loadAdminPanel === 'function' && currentRole === 'admin') await loadAdminPanel();
    if (typeof loadInstructorStudentsTable === 'function' && currentRole === 'instructor') await loadInstructorStudentsTable();
    if (typeof loadStudentDashboard === 'function' && currentRole === 'student') await loadStudentDashboard();
  }
};

window.adminResetAllStudentsProgress = async function() {
  if (currentRole !== 'admin' && currentUser?.role !== 'admin') {
    alert('Acceso restringido: Únicamente los administradores pueden reiniciar el avance global.');
    return;
  }
  if (confirm('⚠️ ATENCIÓN DE PRUEBAS:\n\n¿Estás seguro de reiniciar el avance de TODOS los estudiantes en el sistema? Esto dejará el progreso de todos los cursos a 0% para poder realizar pruebas nuevamente.')) {
    await db.resetAllStudentsProgress();
    alert('✅ Todo el avance de los estudiantes ha sido reiniciado a 0%.');
    if (activeCourse) {
      await loadPlayerCourseData(activeCourse.id);
    }
    if (typeof loadStudentDashboard === 'function' && currentRole === 'student') await loadStudentDashboard();
    if (typeof loadAdminPanel === 'function' && currentRole === 'admin') await loadAdminPanel();
    if (typeof loadInstructorStudentsTable === 'function' && currentRole === 'instructor') await loadInstructorStudentsTable();
  }
};

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
        const diffInfo = getCourseDifficultyInfo(course.difficulty);
        let lessonCount = 0;
        course.modules.forEach(m => lessonCount += m.lessons.length);
        
        coursesHtml += `
          <div class="course-card">
            <div class="course-card-header" style="background: ${course.thumbnail || 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)'}">
              <span class="course-card-tag">${course.category}</span>
              <span class="course-difficulty-badge ${diffInfo.className}"><i class="${diffInfo.icon}"></i> ${diffInfo.name}</span>
              <h3>${course.title}</h3>
            </div>
            <div class="course-card-body">
              <p>${course.description}</p>
              <div class="course-meta">
                <span style="color:${diffInfo.color}; font-weight:600;"><i class="${diffInfo.icon}"></i> ${diffInfo.name} ${diffInfo.isBeginner ? '(Libre)' : '(Asignado)'}</span>
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
    
    const certCardsMobile = document.getElementById('cert-cards-mobile');
    if (certificates.length === 0) {
      DOM.studentRegistryRows.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 30px;">
            Aún no se han emitido certificados a ningún alumno.
          </td>
        </tr>
      `;
      if (certCardsMobile) certCardsMobile.innerHTML = `<p style="color:var(--text-secondary);text-align:center;padding:20px;">Aún no se han emitido certificados.</p>`;
    } else {
      let tableRows = '';
      let certCards = '';
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
        certCards += `
          <div class="ins-cert-card">
            <div class="ins-cert-card-top">
              <div class="ins-cert-card-icon"><i class="fas fa-graduation-cap"></i></div>
              <div style="flex:1;min-width:0;">
                <div class="ins-cert-card-name">${cert.studentName}</div>
                <div class="ins-cert-card-course">${cert.courseTitle}</div>
              </div>
              <span class="badge badge-success" style="flex-shrink:0;">Certificado</span>
            </div>
            <div class="ins-cert-card-footer">
              <span class="ins-cert-code"><i class="fas fa-qrcode"></i> ${cert.verificationCode}</span>
              <span class="ins-cert-date"><i class="fas fa-calendar-check"></i> ${cert.issueDate}</span>
            </div>
          </div>`;
      });
      DOM.studentRegistryRows.innerHTML = tableRows;
      if (certCardsMobile) certCardsMobile.innerHTML = certCards;
    }
  } catch (error) {
    console.error(error);
    alert('Error al cargar el panel de administrador: ' + error.message);
  }
}

let allInstructorStudents = [];

function switchInstructorTab(tab) {
  // Remover active de todas las pestañas y secciones
  if (DOM.btnInsCoursesTab) DOM.btnInsCoursesTab.classList.remove('active');
  if (DOM.btnInsStudentsTab) DOM.btnInsStudentsTab.classList.remove('active');
  if (DOM.btnInsLiveTab) DOM.btnInsLiveTab.classList.remove('active');
  if (DOM.btnInsAnnouncementsTab) DOM.btnInsAnnouncementsTab.classList.remove('active');

  if (DOM.insCoursesSection) {
    DOM.insCoursesSection.classList.remove('active');
    DOM.insCoursesSection.style.display = 'none';
  }
  if (DOM.insStudentsSection) {
    DOM.insStudentsSection.classList.remove('active');
    DOM.insStudentsSection.style.display = 'none';
  }
  if (DOM.insLiveSection) {
    DOM.insLiveSection.classList.remove('active');
    DOM.insLiveSection.style.display = 'none';
  }
  if (DOM.insAnnouncementsSection) {
    DOM.insAnnouncementsSection.classList.remove('active');
    DOM.insAnnouncementsSection.style.display = 'none';
  }

  if (tab === 'courses') {
    if (DOM.btnInsCoursesTab) DOM.btnInsCoursesTab.classList.add('active');
    if (DOM.insCoursesSection) {
      DOM.insCoursesSection.classList.add('active');
      DOM.insCoursesSection.style.display = 'block';
    }
  } else if (tab === 'students') {
    if (DOM.btnInsStudentsTab) DOM.btnInsStudentsTab.classList.add('active');
    if (DOM.insStudentsSection) {
      DOM.insStudentsSection.classList.add('active');
      DOM.insStudentsSection.style.display = 'block';
    }
    loadInstructorStudentsTable();
  } else if (tab === 'live') {
    if (DOM.btnInsLiveTab) DOM.btnInsLiveTab.classList.add('active');
    if (DOM.insLiveSection) {
      DOM.insLiveSection.classList.add('active');
      DOM.insLiveSection.style.display = 'block';
    }
    loadInstructorLiveSessions();
  } else if (tab === 'announcements') {
    if (DOM.btnInsAnnouncementsTab) DOM.btnInsAnnouncementsTab.classList.add('active');
    if (DOM.insAnnouncementsSection) {
      DOM.insAnnouncementsSection.classList.add('active');
      DOM.insAnnouncementsSection.style.display = 'block';
    }
    loadInstructorAnnouncements();
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
  const tbody = DOM.studentsTableBody;
  const cardsMobile = document.getElementById('students-cards-mobile');

  if (!studentsList || studentsList.length === 0) {
    const emptyMsg = `<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);padding:30px;">No se encontraron usuarios registrados.</td></tr>`;
    const emptyCard = `<p style="color:var(--text-secondary);text-align:center;padding:20px;">No se encontraron usuarios registrados.</p>`;
    if (tbody) tbody.innerHTML = emptyMsg;
    if (cardsMobile) cardsMobile.innerHTML = emptyCard;
    return;
  }

  const courses = await db.getCourses();
  const courseMap = {};
  courses.forEach(c => { courseMap[c.id] = c; });

  let rowsHtml = '';
  let cardsHtml = '';

  studentsList.forEach(student => {
    const regDate = student.registeredAt ? new Date(student.registeredAt).toLocaleDateString() : 'N/A';
    const assignedIds = student.assignedCourses || [];
    const displayName = student.fullName || student.username || 'Usuario';
    const initial = displayName.charAt(0).toUpperCase();
    const safeName = displayName.replace(/'/g, "\\'");

    let roleBadge = '';
    if (student.role === 'admin') {
      roleBadge = '<span class="badge" style="font-size:0.7rem;margin-left:6px;background:rgba(99,102,241,0.15);color:#6366f1;border:1px solid rgba(99,102,241,0.3);"><i class="fas fa-shield-alt"></i> Admin</span>';
    } else if (student.role === 'instructor') {
      roleBadge = '<span class="badge badge-success" style="font-size:0.7rem;margin-left:6px;"><i class="fas fa-chalkboard-teacher"></i> Instructor</span>';
    }

    let coursesTags = '<span class="badge" style="background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(52,211,153,0.3);font-size:0.75rem;"><i class="fas fa-seedling"></i> Principiante (Todos)</span>';
    let coursesBadgesMobile = '<span class="badge" style="background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(52,211,153,0.3);font-size:0.75rem;"><i class="fas fa-seedling"></i> Principiante (Todos)</span>';
    if (assignedIds.length > 0) {
      const extraTags = assignedIds.map(id => {
        const c = courseMap[id];
        const title = c ? c.title : id;
        const diffInfo = c ? getCourseDifficultyInfo(c.difficulty) : { name: 'Asignado', icon: 'fas fa-book', color: 'var(--accent-color)' };
        return `<span class="badge" style="background:rgba(99,102,241,0.15);color:${diffInfo.color};border:1px solid rgba(99,102,241,0.3);font-size:0.75rem;margin-right:4px;margin-bottom:4px;display:inline-block;"><i class="${diffInfo.icon}" style="margin-right:4px;"></i>${title}</span>`;
      }).join('');
      coursesTags += ' ' + extraTags;
      coursesBadgesMobile += ' ' + extraTags;
    }

    // ── Fila tabla (desktop) ──
    rowsHtml += `
      <tr>
        <td>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <div>
              <strong style="color:var(--text-primary);font-size:0.95rem;">${displayName}</strong>
              ${roleBadge}
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); editStudentName('${student.id}', '${safeName}', event)" style="padding:2px 8px;font-size:0.75rem;" title="Corregir Nombre del Alumno">
              <i class="fas fa-edit" style="color:var(--accent-color);"></i> Editar Nombre
            </button>
          </div>
        </td>
        <td>${student.email || 'N/A'}</td>
        <td>${student.phone || 'N/A'}</td>
        <td>${regDate}</td>
        <td>${coursesTags}</td>
        <td style="text-align:center;white-space:nowrap;">
          <button type="button" class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openAssignCoursesModal('${student.id}', event)" style="padding:4px 10px;font-size:0.75rem;">
            <i class="fas fa-book-reader"></i> Asignar Cursos
          </button>
        </td>
      </tr>`;

    // ── Card (móvil) ──
    cardsHtml += `
      <div class="ins-student-card">
        <div class="ins-student-card-top">
          <div class="ins-student-card-avatar">${initial}</div>
          <div style="flex:1;min-width:0;">
            <div class="ins-student-card-name">${displayName} ${roleBadge}</div>
            <div class="ins-student-card-meta">
              <i class="fas fa-envelope"></i> ${student.email || 'Sin correo'}
            </div>
            ${student.phone ? `<div class="ins-student-card-meta"><i class="fas fa-phone"></i> ${student.phone}</div>` : ''}
          </div>
          <div class="ins-student-card-date">
            <span>${regDate}</span>
          </div>
        </div>
        ${assignedIds.length > 0 ? `
        <div class="ins-student-card-courses">
          <div class="ins-student-card-courses-label"><i class="fas fa-book"></i> Cursos asignados</div>
          <div>${coursesBadgesMobile}</div>
        </div>` : `
        <div class="ins-student-card-courses">
          <div class="ins-student-card-courses-label"><i class="fas fa-book"></i> Cursos asignados</div>
          <span style="color:var(--text-secondary);font-size:0.78rem;font-style:italic;">Sin cursos asignados</span>
        </div>`}
        <div class="ins-student-card-actions">
          <button type="button" class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openAssignCoursesModal('${student.id}', event)">
            <i class="fas fa-book-reader"></i> Asignar Cursos
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); editStudentName('${student.id}', '${safeName}', event)">
            <i class="fas fa-edit" style="color:var(--accent-color);"></i> Editar Nombre
          </button>
        </div>
      </div>`;
  });

  if (tbody) tbody.innerHTML = rowsHtml;
  if (cardsMobile) cardsMobile.innerHTML = cardsHtml;
}

window.toggleUserRole = async function(userId, evt) {
  if (evt && typeof evt.stopPropagation === 'function') evt.stopPropagation();

  // Protección: solo admins pueden cambiar roles
  const callerIsAdmin = currentUser && (currentUser.role === 'admin' || currentUser.id === 'admin');
  if (!callerIsAdmin) {
    alert('Solo los Administradores pueden cambiar roles de usuarios.');
    return;
  }

  // Protección: no se puede degradar al super-admin
  if (userId === 'admin') {
    alert('No se puede modificar el rol del Super Administrador del sistema.');
    return;
  }

  let student = (allInstructorStudents || []).find(u => u.id === userId);
  if (!student) {
    try {
      const users = await db.getUsers();
      student = (users || []).find(u => u.id === userId);
    } catch (e) {}
  }
  
  if (!student) {
    alert('No se pudo encontrar la información del usuario.');
    return;
  }

  const studentName = student.fullName || student.username || student.email || 'Usuario';
  const isCurrentlyAdmin = student.role === 'instructor' || student.role === 'admin';
  const newRole = isCurrentlyAdmin ? 'student' : 'instructor';
  const roleLabel = newRole === 'instructor' ? 'Instructor' : 'Estudiante';
  
  const confirmMsg = isCurrentlyAdmin
    ? `¿Estás seguro de que deseas quitar los permisos de Instructor a "${studentName}"?\n\nVolverá a ser Estudiante.`
    : `¿Estás seguro de que deseas promover a "${studentName}" a Instructor?\n\nTendrá acceso completo a crear cursos y administrar temarios.`;

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
      
      if (typeof loadInstructorStudentsTable === 'function') await loadInstructorStudentsTable();
      if (typeof loadAdminPanel === 'function') await loadAdminPanel();
    } catch (err) {
      console.error('Error al cambiar rol:', err);
      student.role = newRole;
      alert(`¡El rol de "${studentName}" ha sido actualizado con éxito a ${roleLabel}!`);
      if (typeof loadInstructorStudentsTable === 'function') await loadInstructorStudentsTable();
      if (typeof loadAdminPanel === 'function') await loadAdminPanel();
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
  if (DOM.newLessonMaterialUrl) DOM.newLessonMaterialUrl.value = '';
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
  if (DOM.newLessonMaterialUrl) DOM.newLessonMaterialUrl.value = lesson.materialUrl || '';
  
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
  const materialUrl = DOM.newLessonMaterialUrl ? DOM.newLessonMaterialUrl.value.trim() : '';
  
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
    lesson.materialUrl = materialUrl;
  } else {
    // Agregar nueva lección
    const newLesson = {
      id: 'lesson-' + Date.now(),
      title,
      type,
      url: targetUrl,
      duration: duration || (type === 'video' ? '10:00' : '10 min de lectura'),
      notes,
      materialUrl
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
  const modalIos = document.getElementById('modal-ios-install');
  if (modalIos) modalIos.classList.remove('active');
  const modalGeneric = document.getElementById('modal-generic-install');
  if (modalGeneric) modalGeneric.classList.remove('active');
  if (DOM.modalAnnouncement) DOM.modalAnnouncement.classList.remove('active');
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
      const allCourses = await db.getCourses();
      const assignedIds = currentUser.assignedCourses || [];
      const courses = allCourses.filter(c => {
        const diffInfo = getCourseDifficultyInfo(c.difficulty);
        return diffInfo.isBeginner || assignedIds.includes(c.id);
      });
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

// =========================================================================
// === MÓDULO DE CLASES EN VIVO & CALENDARIO INTERACTIVO (ZOOM) =============
// =========================================================================

let calCurrentDate = new Date();
let calSelectedDate = null;
let currentAgendaFilter = 'upcoming';
let cachedLiveSessions = [];

// Cambiar subtab del estudiante (Mis Cursos vs Clases en Vivo & Calendario vs Anuncios)
function switchStudentSubtab(subtab) {
  if (DOM.btnSubtabCourses) DOM.btnSubtabCourses.classList.remove('active');
  if (DOM.btnSubtabCalendar) DOM.btnSubtabCalendar.classList.remove('active');
  if (DOM.btnSubtabAnnouncements) DOM.btnSubtabAnnouncements.classList.remove('active');

  if (DOM.subviewStudentCourses) DOM.subviewStudentCourses.style.display = 'none';
  if (DOM.subviewStudentCalendar) DOM.subviewStudentCalendar.style.display = 'none';
  if (DOM.subviewStudentAnnouncements) DOM.subviewStudentAnnouncements.style.display = 'none';

  if (subtab === 'courses') {
    if (DOM.btnSubtabCourses) DOM.btnSubtabCourses.classList.add('active');
    if (DOM.subviewStudentCourses) DOM.subviewStudentCourses.style.display = 'block';
  } else if (subtab === 'calendar') {
    if (DOM.btnSubtabCalendar) DOM.btnSubtabCalendar.classList.add('active');
    if (DOM.subviewStudentCalendar) DOM.subviewStudentCalendar.style.display = 'block';
    refreshLiveSessionsData();
  } else if (subtab === 'announcements') {
    if (DOM.btnSubtabAnnouncements) DOM.btnSubtabAnnouncements.classList.add('active');
    if (DOM.subviewStudentAnnouncements) DOM.subviewStudentAnnouncements.style.display = 'block';
    refreshStudentAnnouncements();
  }
}

// Cargar sesiones de la BD y actualizar vistas
async function refreshLiveSessionsData() {
  try {
    cachedLiveSessions = await db.getLiveSessions();
  } catch (e) {
    console.warn('Error al cargar sesiones en vivo:', e);
    cachedLiveSessions = [];
  }
  checkActiveLiveBanner();
  renderCalendar();
  renderStudentLiveSessions();
}

// Banner de Alerta para clases que están ocurriendo AHORA MISMO
function checkActiveLiveBanner() {
  const now = new Date();
  const activeSession = cachedLiveSessions.find(s => {
    const start = new Date(s.start_time);
    const end = new Date(start.getTime() + (s.duration_minutes || 60) * 60000);
    return now >= start && now <= end;
  });

  if (activeSession) {
    if (DOM.studentCalendarLiveDot) DOM.studentCalendarLiveDot.style.display = 'inline-block';
    if (DOM.studentLiveAlertBanner) {
      DOM.studentLiveAlertBanner.style.display = 'flex';
      DOM.studentLiveAlertBanner.innerHTML = `
        <div class="live-alert-content">
          <div class="live-indicator-pulsing"></div>
          <div>
            <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: #ef4444; letter-spacing: 0.5px;">
              🔴 Sesión en Vivo Activa Ahora Mismo
            </div>
            <strong style="color: var(--text-primary); font-size: 1.05rem;">${activeSession.title}</strong>
            <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">
              <i class="fas fa-book"></i> ${activeSession.course_title || 'Clase General'} &bull; <i class="fas fa-user-tie"></i> ${activeSession.instructor_name}
            </div>
          </div>
        </div>
        <a href="${activeSession.zoom_url}" target="_blank" rel="noopener noreferrer" class="btn-zoom-join">
          <i class="fas fa-video"></i> Entrar a Zoom Ahora
        </a>
      `;
    }
  } else {
    if (DOM.studentCalendarLiveDot) DOM.studentCalendarLiveDot.style.display = 'none';
    if (DOM.studentLiveAlertBanner) DOM.studentLiveAlertBanner.style.display = 'none';
  }
}

// --- CALENDARIO MENSUAL ---

function changeCalendarMonth(delta) {
  calCurrentDate.setMonth(calCurrentDate.getMonth() + delta);
  renderCalendar();
}

function goToCalendarToday() {
  calCurrentDate = new Date();
  calSelectedDate = new Date();
  renderCalendar();
  renderStudentLiveSessions();
}

function renderCalendar() {
  if (!DOM.calendarDaysGrid || !DOM.calendarMonthLabel) return;

  const year = calCurrentDate.getFullYear();
  const month = calCurrentDate.getMonth();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  DOM.calendarMonthLabel.textContent = `${monthNames[month]} ${year}`;

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  let daysHtml = '';

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysHtml += `<div class="cal-day-cell other-month">${prevMonthDays - i}</div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = isCurrentMonth && today.getDate() === day;
    const isSelected = calSelectedDate &&
      calSelectedDate.getFullYear() === year &&
      calSelectedDate.getMonth() === month &&
      calSelectedDate.getDate() === day;

    const sessionsOnDay = cachedLiveSessions.filter(s => {
      const sDate = new Date(s.start_time);
      return sDate.getFullYear() === year && sDate.getMonth() === month && sDate.getDate() === day;
    });

    const hasSession = sessionsOnDay.length > 0;
    const hasLiveNow = sessionsOnDay.some(s => {
      const start = new Date(s.start_time);
      const end = new Date(start.getTime() + (s.duration_minutes || 60) * 60000);
      return today >= start && today <= end;
    });

    let cellClasses = ['cal-day-cell'];
    if (isToday) cellClasses.push('is-today');
    if (isSelected) cellClasses.push('is-selected');
    if (hasSession) cellClasses.push('has-session');
    if (hasLiveNow) cellClasses.push('has-live-now');

    daysHtml += `
      <div class="${cellClasses.join(' ')}" onclick="selectCalendarDate(${year}, ${month}, ${day})">
        ${day}
      </div>
    `;
  }

  const totalSlots = firstDayIndex + daysInMonth;
  const remainingSlots = (7 - (totalSlots % 7)) % 7;
  for (let i = 1; i <= remainingSlots; i++) {
    daysHtml += `<div class="cal-day-cell other-month">${i}</div>`;
  }

  DOM.calendarDaysGrid.innerHTML = daysHtml;
}

window.selectCalendarDate = function(year, month, day) {
  calSelectedDate = new Date(year, month, day);
  currentAgendaFilter = 'all';
  if (DOM.btnFilterUpcoming) DOM.btnFilterUpcoming.classList.remove('active');
  if (DOM.btnFilterAll) DOM.btnFilterAll.classList.add('active');
  renderCalendar();
  renderStudentLiveSessions();
};

function setAgendaFilter(filter) {
  currentAgendaFilter = filter;
  if (filter === 'upcoming') {
    calSelectedDate = null;
    if (DOM.btnFilterUpcoming) DOM.btnFilterUpcoming.classList.add('active');
    if (DOM.btnFilterAll) DOM.btnFilterAll.classList.remove('active');
  } else {
    if (DOM.btnFilterAll) DOM.btnFilterAll.classList.add('active');
    if (DOM.btnFilterUpcoming) DOM.btnFilterUpcoming.classList.remove('active');
  }
  renderCalendar();
  renderStudentLiveSessions();
}

// Renderizar la lista de Clases en Vivo en el Portal de Estudiantes
function renderStudentLiveSessions() {
  if (!DOM.studentLiveSessionsList) return;

  const now = new Date();
  let list = [...cachedLiveSessions];

  if (calSelectedDate) {
    list = list.filter(s => {
      const sDate = new Date(s.start_time);
      return sDate.getFullYear() === calSelectedDate.getFullYear() &&
             sDate.getMonth() === calSelectedDate.getMonth() &&
             sDate.getDate() === calSelectedDate.getDate();
    });
  } else if (currentAgendaFilter === 'upcoming') {
    list = list.filter(s => {
      const end = new Date(new Date(s.start_time).getTime() + (s.duration_minutes || 60) * 60000);
      return end >= now;
    });
  }

  if (list.length === 0) {
    const emptyMsg = calSelectedDate
      ? `No hay clases programadas para el ${calSelectedDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}.`
      : 'No hay clases en vivo programadas próximamente.';

    DOM.studentLiveSessionsList.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
        <i class="fas fa-calendar-times fa-3x" style="opacity: 0.3; margin-bottom: 12px;"></i>
        <p style="font-size: 0.95rem;">${emptyMsg}</p>
        ${calSelectedDate ? '<button class="btn btn-outline-sm" onclick="setAgendaFilter(\'upcoming\')" style="margin-top: 10px;">Ver todas las próximas</button>' : ''}
      </div>
    `;
    return;
  }

  let html = '';
  list.forEach(s => {
    const start = new Date(s.start_time);
    const end = new Date(start.getTime() + (s.duration_minutes || 60) * 60000);
    const isLiveNow = now >= start && now <= end;
    const isPast = now > end;

    let statusPill = '';
    let countdownText = '';

    if (isLiveNow) {
      statusPill = '<span class="live-status-pill status-live"><span class="live-indicator-pulsing" style="width:8px;height:8px;"></span> EN VIVO AHORA</span>';
    } else if (isPast) {
      statusPill = '<span class="live-status-pill status-past"><i class="fas fa-check"></i> Finalizada</span>';
    } else {
      const diffMs = start - now;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays > 0) {
        countdownText = `En ${diffDays} día${diffDays > 1 ? 's' : ''}`;
      } else if (diffHours > 0) {
        countdownText = `En ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
      } else {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        countdownText = `En ${diffMins} min`;
      }
      statusPill = `<span class="live-status-pill status-upcoming"><i class="far fa-clock"></i> ${countdownText}</span>`;
    }

    const dateFormatted = start.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });

    const gcalUrl = generateGoogleCalendarUrl(s);

    html += `
      <div class="live-session-card ${isLiveNow ? 'is-live-card' : ''}">
        <div class="live-session-card-top">
          <div>
            <div class="live-session-course-tag"><i class="fas fa-book"></i> ${s.course_title || 'Curso General'}</div>
            <h4 class="live-session-title">${s.title}</h4>
          </div>
          ${statusPill}
        </div>

        <div class="live-session-meta-row">
          <div class="live-session-meta-item"><i class="fas fa-calendar-alt" style="color: var(--accent-color);"></i> ${dateFormatted}</div>
          <div class="live-session-meta-item"><i class="fas fa-stopwatch" style="color: var(--accent-color);"></i> ${s.duration_minutes || 60} minutos</div>
          <div class="live-session-meta-item"><i class="fas fa-chalkboard-teacher" style="color: var(--accent-color);"></i> ${s.instructor_name}</div>
        </div>

        ${s.description ? `<div class="live-session-desc"><i class="fas fa-info-circle"></i> ${s.description}</div>` : ''}

        <div class="live-session-actions-bar">
          <div class="live-credentials-box">
            ${s.meeting_id ? `<span class="credential-chip"><strong>ID:</strong> ${s.meeting_id}</span>` : ''}
            ${s.passcode ? `<span class="credential-chip"><strong>Código:</strong> ${s.passcode}</span>` : ''}
          </div>
          
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <a href="${gcalUrl}" target="_blank" rel="noopener noreferrer" class="btn-gcal-sync" title="Agregar recordatorio a Google Calendar">
              <i class="fab fa-google"></i> Calendario
            </a>
            <a href="${s.zoom_url}" target="_blank" rel="noopener noreferrer" class="btn-zoom-join">
              <i class="fas fa-video"></i> ${isLiveNow ? 'Entrar a Zoom Ahora' : 'Unirse a Zoom'}
            </a>
          </div>
        </div>
      </div>
    `;
  });

  DOM.studentLiveSessionsList.innerHTML = html;
}

// Generador de Enlace para Google Calendar
function generateGoogleCalendarUrl(session) {
  const start = new Date(session.start_time);
  const end = new Date(start.getTime() + (session.duration_minutes || 60) * 60000);

  const formatGCalDate = (d) => d.toISOString().replace(/-|:|\.\d+/g, '');

  const text = encodeURIComponent(session.title + ' - Clase en Vivo EduTrack');
  const dates = `${formatGCalDate(start)}/${formatGCalDate(end)}`;
  const details = encodeURIComponent(
    (session.description ? session.description + '\n\n' : '') +
    'Enlace de Zoom: ' + session.zoom_url +
    (session.meeting_id ? '\nID de Reunión: ' + session.meeting_id : '') +
    (session.passcode ? '\nCódigo de Acceso: ' + session.passcode : '')
  );
  const location = encodeURIComponent(session.zoom_url);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
}

// --- GESTIÓN DE SESIONES EN VIVO POR EL INSTRUCTOR ---

async function loadInstructorLiveSessions() {
  if (!DOM.insLiveSessionsTableBody) return;
  DOM.insLiveSessionsTableBody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align: center; padding: 25px; color: var(--text-secondary);">
        <i class="fas fa-spinner fa-spin"></i> Cargando clases programadas...
      </td>
    </tr>
  `;

  try {
    cachedLiveSessions = await db.getLiveSessions();
  } catch (e) {
    cachedLiveSessions = [];
  }

  const tbody = DOM.insLiveSessionsTableBody;
  const cardsMobile = DOM.insLiveCardsMobile;

  if (cachedLiveSessions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 30px; color: var(--text-secondary);">
          No tienes ninguna clase en vivo programada aún. Haz clic en <strong>"Programar Clase en Vivo"</strong> para crear la primera.
        </td>
      </tr>
    `;
    if (cardsMobile) {
      cardsMobile.innerHTML = `
        <div style="text-align: center; padding: 25px; color: var(--text-secondary);">
          No hay clases en vivo programadas aún.
        </div>
      `;
    }
    return;
  }

  let rowsHtml = '';
  let cardsHtml = '';

  cachedLiveSessions.forEach(s => {
    const start = new Date(s.start_time);
    const dateFormatted = start.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const safeTitle = (s.title || '').replace(/'/g, "\\'");

    rowsHtml += `
      <tr>
        <td><strong>${dateFormatted}</strong></td>
        <td>
          <strong>${s.title}</strong>
          ${s.description ? `<div style="font-size: 0.78rem; color: var(--text-secondary); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.description}</div>` : ''}
        </td>
        <td><span class="badge" style="background: rgba(99, 102, 241, 0.15); color: var(--accent-color); border: 1px solid rgba(99, 102, 241, 0.3); font-size: 0.75rem;">${s.course_title || 'General'}</span></td>
        <td>${s.duration_minutes || 60} min</td>
        <td>
          <a href="${s.zoom_url}" target="_blank" rel="noopener noreferrer" style="color: #2D8CFF; text-decoration: underline; font-size: 0.82rem;">
            <i class="fas fa-external-link-alt"></i> Probar Zoom
          </a>
        </td>
        <td style="text-align: center; white-space: nowrap;">
          <button class="btn btn-secondary btn-sm" onclick="copyZoomInvite('${s.id}')" title="Copiar invitación completa para WhatsApp / Correo" style="padding: 4px 8px; font-size: 0.75rem; margin-right: 4px;">
            <i class="fas fa-copy"></i>
          </button>
          <button class="btn btn-secondary btn-sm" onclick="openLiveSessionModal('${s.id}')" title="Editar" style="padding: 4px 8px; font-size: 0.75rem; margin-right: 4px;">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteLiveSessionHandler('${s.id}', '${safeTitle}')" title="Eliminar" style="padding: 4px 8px; font-size: 0.75rem;">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;

    cardsHtml += `
      <div class="ins-live-card">
        <div class="ins-live-card-title">${s.title}</div>
        <div class="ins-live-card-meta"><i class="fas fa-calendar-alt" style="color: var(--accent-color);"></i> ${dateFormatted} (${s.duration_minutes || 60} min)</div>
        <div class="ins-live-card-meta"><i class="fas fa-book" style="color: var(--accent-color);"></i> ${s.course_title || 'General'}</div>
        ${s.meeting_id ? `<div class="ins-live-card-meta"><i class="fas fa-id-card"></i> ID: ${s.meeting_id} &bull; Clave: ${s.passcode || 'N/A'}</div>` : ''}
        
        <div class="ins-live-card-actions">
          <a href="${s.zoom_url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="background:#2D8CFF;border-color:#2D8CFF;font-size:0.78rem;">
            <i class="fas fa-video"></i> Abrir Zoom
          </a>
          <button class="btn btn-secondary btn-sm" onclick="copyZoomInvite('${s.id}')" style="font-size:0.78rem;">
            <i class="fas fa-copy"></i> Copiar
          </button>
          <button class="btn btn-secondary btn-sm" onclick="openLiveSessionModal('${s.id}')" style="font-size:0.78rem;">
            <i class="fas fa-edit"></i> Editar
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteLiveSessionHandler('${s.id}', '${safeTitle}')" style="font-size:0.78rem;">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  });

  tbody.innerHTML = rowsHtml;
  if (cardsMobile) cardsMobile.innerHTML = cardsHtml;
}

// Modal de Crear / Editar Sesión en Vivo
async function openLiveSessionModal(sessionId = null) {
  if (!DOM.modalLiveSession) return;

  if (DOM.liveSessionCourse) {
    try {
      const courses = await db.getCourses();
      let options = '<option value="">-- Sin curso específico (General) --</option>';
      courses.forEach(c => {
        options += `<option value="${c.id}">${c.title}</option>`;
      });
      DOM.liveSessionCourse.innerHTML = options;
    } catch (e) {
      console.warn('Error al cargar cursos para selector:', e);
    }
  }

  if (sessionId) {
    const session = cachedLiveSessions.find(s => s.id === sessionId);
    if (session) {
      if (DOM.modalLiveSessionTitle) DOM.modalLiveSessionTitle.innerHTML = '<i class="fas fa-edit" style="color: #2D8CFF;"></i> Editar Clase en Vivo';
      if (DOM.liveSessionId) DOM.liveSessionId.value = session.id;
      if (DOM.liveSessionTitle) DOM.liveSessionTitle.value = session.title || '';
      if (DOM.liveSessionCourse) DOM.liveSessionCourse.value = session.course_id || '';
      
      if (DOM.liveSessionDatetime && session.start_time) {
        const d = new Date(session.start_time);
        const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        DOM.liveSessionDatetime.value = localIso;
      }
      if (DOM.liveSessionDuration) DOM.liveSessionDuration.value = session.duration_minutes || 60;
      if (DOM.liveSessionZoomUrl) DOM.liveSessionZoomUrl.value = session.zoom_url || '';
      if (DOM.liveSessionMeetingId) DOM.liveSessionMeetingId.value = session.meeting_id || '';
      if (DOM.liveSessionPasscode) DOM.liveSessionPasscode.value = session.passcode || '';
      if (DOM.liveSessionDesc) DOM.liveSessionDesc.value = session.description || '';
    }
  } else {
    if (DOM.modalLiveSessionTitle) DOM.modalLiveSessionTitle.innerHTML = '<i class="fas fa-video" style="color: #2D8CFF;"></i> Programar Clase en Vivo';
    if (DOM.liveSessionId) DOM.liveSessionId.value = '';
    if (DOM.liveSessionTitle) DOM.liveSessionTitle.value = '';
    if (DOM.liveSessionCourse) DOM.liveSessionCourse.selectedIndex = 0;
    
    if (DOM.liveSessionDatetime) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(19, 0, 0, 0);
      const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      DOM.liveSessionDatetime.value = localIso;
    }
    if (DOM.liveSessionDuration) DOM.liveSessionDuration.value = 60;
    if (DOM.liveSessionZoomUrl) DOM.liveSessionZoomUrl.value = '';
    if (DOM.liveSessionMeetingId) DOM.liveSessionMeetingId.value = '';
    if (DOM.liveSessionPasscode) DOM.liveSessionPasscode.value = '';
    if (DOM.liveSessionDesc) DOM.liveSessionDesc.value = '';
  }

  DOM.modalLiveSession.classList.add('active');
}

function closeLiveSessionModal() {
  if (DOM.modalLiveSession) DOM.modalLiveSession.classList.remove('active');
}

// Guardar sesión en vivo
async function submitLiveSession() {
  const title = (DOM.liveSessionTitle ? DOM.liveSessionTitle.value : '').trim();
  const courseId = DOM.liveSessionCourse ? DOM.liveSessionCourse.value : '';
  const datetimeVal = DOM.liveSessionDatetime ? DOM.liveSessionDatetime.value : '';
  const duration = parseInt(DOM.liveSessionDuration ? DOM.liveSessionDuration.value : 60, 10);
  const zoomUrl = (DOM.liveSessionZoomUrl ? DOM.liveSessionZoomUrl.value : '').trim();
  const meetingId = (DOM.liveSessionMeetingId ? DOM.liveSessionMeetingId.value : '').trim();
  const passcode = (DOM.liveSessionPasscode ? DOM.liveSessionPasscode.value : '').trim();
  const desc = (DOM.liveSessionDesc ? DOM.liveSessionDesc.value : '').trim();
  const editId = DOM.liveSessionId ? DOM.liveSessionId.value : '';

  if (!title) {
    alert('Por favor ingresa el título de la clase.');
    return;
  }
  if (!datetimeVal) {
    alert('Por favor selecciona la fecha y hora de inicio.');
    return;
  }
  if (!zoomUrl) {
    alert('Por favor ingresa el enlace de la reunión de Zoom.');
    return;
  }

  let courseTitle = 'Clase General';
  if (DOM.liveSessionCourse && DOM.liveSessionCourse.selectedIndex >= 0) {
    courseTitle = DOM.liveSessionCourse.options[DOM.liveSessionCourse.selectedIndex].text;
  }

  const sessionData = {
    id: editId || undefined,
    title,
    course_id: courseId,
    course_title: courseTitle,
    instructor_name: currentUser ? (currentUser.fullName || currentUser.username) : 'Instructor',
    start_time: new Date(datetimeVal).toISOString(),
    duration_minutes: duration,
    zoom_url: zoomUrl,
    meeting_id: meetingId,
    passcode,
    description: desc
  };

  try {
    if (DOM.btnSubmitLiveSession) {
      DOM.btnSubmitLiveSession.disabled = true;
      DOM.btnSubmitLiveSession.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    }

    await db.saveLiveSession(sessionData);

    let pushStatusMsg = '';
    if (!editId) {
      try {
        const startFormatted = new Date(sessionData.start_time).toLocaleString('es-MX', {
          dateStyle: 'medium',
          timeStyle: 'short'
        });
        const pushRes = await sendAnnouncementPushNotification({
          title,
          content: `${courseTitle} · ${startFormatted}`,
          category: 'Clase en Vivo',
          action_url: zoomUrl
        });
        if (pushRes && pushRes.sent > 0) {
          pushStatusMsg = `\n🔔 Notificación push enviada a ${pushRes.sent} dispositivo(s).`;
        }
      } catch (pushErr) {
        console.warn('No se pudo enviar push de clase en vivo:', pushErr);
      }
    }

    closeLiveSessionModal();
    alert('¡Clase en vivo guardada exitosamente!' + pushStatusMsg);
    await refreshLiveSessionsData();
    loadInstructorLiveSessions();
  } catch (err) {
    console.error('Error al guardar sesión en vivo:', err);
    alert('Error al guardar la clase: ' + err.message);
  } finally {
    if (DOM.btnSubmitLiveSession) {
      DOM.btnSubmitLiveSession.disabled = false;
      DOM.btnSubmitLiveSession.innerHTML = '<i class="fas fa-save"></i> Guardar Clase en Vivo';
    }
  }
}

// Eliminar sesión en vivo
window.deleteLiveSessionHandler = async function(id, title) {
  if (!confirm(`¿Estás seguro de que deseas eliminar la clase en vivo "${title}"?`)) {
    return;
  }
  try {
    await db.deleteLiveSession(id);
    await refreshLiveSessionsData();
    loadInstructorLiveSessions();
  } catch (err) {
    alert('Error al eliminar la sesión: ' + err.message);
  }
};

// Copiar enlace de invitación para WhatsApp / Redes
window.copyZoomInvite = function(sessionId) {
  const session = cachedLiveSessions.find(s => s.id === sessionId);
  if (!session) return;

  const start = new Date(session.start_time);
  const dateFormatted = start.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });

  const inviteText = `🎓 *EduTrack LMS - Invitación a Clase en Vivo*\n\n` +
    `📌 *Tema:* ${session.title}\n` +
    `📚 *Curso:* ${session.course_title || 'General'}\n` +
    `🗓️ *Fecha:* ${dateFormatted}\n` +
    `⏱️ *Duración:* ${session.duration_minutes || 60} minutos\n\n` +
    `🎥 *Unirse a Zoom:* ${session.zoom_url}\n` +
    (session.meeting_id ? `🆔 *ID de Reunión:* ${session.meeting_id}\n` : '') +
    (session.passcode ? `🔑 *Código de Acceso:* ${session.passcode}\n` : '') +
    (session.description ? `\n📝 *Notas:* ${session.description}\n` : '') +
    `\n¡Te esperamos puntualmente!`;

  navigator.clipboard.writeText(inviteText)
    .then(() => alert('¡Invitación copiada al portapapeles! Ya puedes pegarla en WhatsApp, Telegram o enviarla por correo.'))
    .catch(() => {
      prompt('Copia el texto de invitación:', inviteText);
    });
};

window.switchStudentSubtab = switchStudentSubtab;
window.changeCalendarMonth = changeCalendarMonth;
window.goToCalendarToday = goToCalendarToday;
window.setAgendaFilter = setAgendaFilter;
window.openLiveSessionModal = openLiveSessionModal;
window.closeLiveSessionModal = closeLiveSessionModal;
window.switchInstructorTab = switchInstructorTab;
window.loadInstructorLiveSessions = loadInstructorLiveSessions;

// ==================== TABLÓN DE ANUNCIOS Y NOTICIAS ====================
let cachedAnnouncements = [];

function getAnnouncementCategoryInfo(cat) {
  const c = (cat || 'General').toLowerCase();
  if (c.includes('vivo') || c.includes('zoom')) {
    return { name: 'Clase en Vivo', icon: 'fas fa-video', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)' };
  }
  if (c.includes('curso')) {
    return { name: 'Nuevo Curso', icon: 'fas fa-rocket', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.35)' };
  }
  if (c.includes('material') || c.includes('recurso')) {
    return { name: 'Material de Estudio', icon: 'fas fa-folder-open', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)' };
  }
  if (c.includes('importante') || c.includes('urgente')) {
    return { name: 'Importante', icon: 'fas fa-exclamation-triangle', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)' };
  }
  return { name: 'General', icon: 'fas fa-bullhorn', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)' };
}

function formatAnnouncementDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return iso || '';
  }
}

async function refreshStudentAnnouncements() {
  try {
    cachedAnnouncements = await db.getAnnouncements();
  } catch (e) {
    console.warn('Error al cargar anuncios:', e);
    cachedAnnouncements = [];
  }

  // 1. Actualizar badge de conteo en la pestaña
  if (DOM.studentAnnouncementsBadge) {
    if (cachedAnnouncements.length > 0) {
      DOM.studentAnnouncementsBadge.textContent = cachedAnnouncements.length;
      DOM.studentAnnouncementsBadge.style.display = 'inline-block';
    } else {
      DOM.studentAnnouncementsBadge.style.display = 'none';
    }
  }

  // 2. Banner de anuncio reciente / fijado en "Mis Cursos"
  if (DOM.studentRecentAnnouncementBanner) {
    const dismissedId = sessionStorage.getItem('edutrack_dismissed_announcement_id');
    const topAnnouncement = cachedAnnouncements.find(a => a.id !== dismissedId);

    if (topAnnouncement) {
      const catInfo = getAnnouncementCategoryInfo(topAnnouncement.category);
      const isPinnedBadge = topAnnouncement.is_pinned ? `<span class="pinned-badge"><i class="fas fa-thumbtack"></i> Fijado</span>` : '';
      const actionBtn = topAnnouncement.action_url ? `
        <a href="${topAnnouncement.action_url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="padding: 6px 14px; font-size: 0.82rem; white-space: nowrap; margin-top: 8px;">
          ${topAnnouncement.action_label || 'Ver más'} <i class="fas fa-external-link-alt" style="margin-left: 4px;"></i>
        </a>
      ` : '';

      DOM.studentRecentAnnouncementBanner.style.display = 'block';
      DOM.studentRecentAnnouncementBanner.innerHTML = `
        <div class="student-recent-announcement-card">
          <div class="announcement-icon-bubble" style="background: ${catInfo.bg}; color: ${catInfo.color}; border: 1px solid ${catInfo.border};">
            <i class="${catInfo.icon}"></i>
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">
              <span class="announcement-badge" style="background: ${catInfo.bg}; color: ${catInfo.color}; border: 1px solid ${catInfo.border};">
                <i class="${catInfo.icon}"></i> ${catInfo.name}
              </span>
              ${isPinnedBadge}
              <span style="font-size: 0.78rem; color: var(--text-secondary); margin-left: auto;">
                <i class="far fa-clock"></i> ${formatAnnouncementDate(topAnnouncement.created_at)}
              </span>
            </div>
            <strong style="color: var(--text-primary); font-size: 1rem; display: block; margin-bottom: 4px;">${topAnnouncement.title}</strong>
            <p style="color: var(--text-secondary); font-size: 0.88rem; margin: 0; line-height: 1.45; max-height: 4.5em; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
              ${topAnnouncement.content}
            </p>
            <div style="display: flex; align-items: center; gap: 12px; margin-top: 8px; flex-wrap: wrap;">
              ${actionBtn}
              <button class="btn btn-secondary btn-sm" onclick="switchStudentSubtab('announcements')" style="padding: 6px 12px; font-size: 0.82rem;">
                <i class="fas fa-bullhorn"></i> Ver todos los comunicados
              </button>
            </div>
          </div>
          <button class="btn-icon" onclick="dismissRecentAnnouncementBanner('${topAnnouncement.id}')" title="Descartar este aviso" style="color: var(--text-secondary); margin-left: 8px;">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
    } else {
      DOM.studentRecentAnnouncementBanner.style.display = 'none';
      DOM.studentRecentAnnouncementBanner.innerHTML = '';
    }
  }

  // 3. Grid completo de anuncios en la subvista "Anuncios & Noticias"
  if (DOM.studentAnnouncementsGrid) {
    if (cachedAnnouncements.length === 0) {
      DOM.studentAnnouncementsGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1; padding: 50px 20px;">
          <i class="fas fa-bullhorn" style="font-size: 3rem; color: var(--text-secondary); opacity: 0.5; margin-bottom: 15px;"></i>
          <h3>No hay anuncios por ahora</h3>
          <p>Tu instructor publicará aquí las novedades, avisos de clases en vivo y avisos importantes.</p>
        </div>
      `;
      return;
    }

    DOM.studentAnnouncementsGrid.innerHTML = cachedAnnouncements.map(ann => {
      const catInfo = getAnnouncementCategoryInfo(ann.category);
      const isPinnedBadge = ann.is_pinned ? `<span class="pinned-badge"><i class="fas fa-thumbtack"></i> Fijado</span>` : '';
      const actionBtn = ann.action_url ? `
        <a href="${ann.action_url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="align-self: flex-start; margin-top: auto; padding: 8px 16px; font-size: 0.85rem;">
          ${ann.action_label || 'Ver más detalles'} <i class="fas fa-external-link-alt" style="margin-left: 4px;"></i>
        </a>
      ` : '';

      return `
        <div class="announcement-card ${ann.is_pinned ? 'is-pinned' : ''}">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="announcement-badge" style="background: ${catInfo.bg}; color: ${catInfo.color}; border: 1px solid ${catInfo.border};">
                <i class="${catInfo.icon}"></i> ${catInfo.name}
              </span>
              ${isPinnedBadge}
            </div>
            <span style="font-size: 0.78rem; color: var(--text-secondary);">
              <i class="far fa-clock"></i> ${formatAnnouncementDate(ann.created_at)}
            </span>
          </div>
          <h3 style="color: var(--text-primary); font-size: 1.15rem; margin-bottom: 6px; font-weight: 700;">${ann.title}</h3>
          <div style="font-size: 0.78rem; color: var(--accent-color); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
            <i class="fas fa-user-tie"></i> Publicado por: ${ann.instructor_name || 'Instructor'}
          </div>
          <p class="announcement-content-text">${ann.content}</p>
          ${actionBtn}
        </div>
      `;
    }).join('');
  }
}

function dismissRecentAnnouncementBanner(annId) {
  sessionStorage.setItem('edutrack_dismissed_announcement_id', annId);
  if (DOM.studentRecentAnnouncementBanner) {
    DOM.studentRecentAnnouncementBanner.style.display = 'none';
  }
}
window.dismissRecentAnnouncementBanner = dismissRecentAnnouncementBanner;
window.refreshStudentAnnouncements = refreshStudentAnnouncements;

async function loadInstructorAnnouncements() {
  if (!DOM.insAnnouncementsTableBody) return;

  DOM.insAnnouncementsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 25px;"><i class="fas fa-circle-notch fa-spin"></i> Cargando anuncios...</td></tr>';
  if (DOM.insAnnouncementsCardsMobile) {
    DOM.insAnnouncementsCardsMobile.innerHTML = '<div style="text-align:center; padding: 20px;"><i class="fas fa-circle-notch fa-spin"></i> Cargando anuncios...</div>';
  }

  let list = [];
  try {
    list = await db.getAnnouncements();
  } catch (e) {
    console.warn('Error al cargar anuncios para instructor:', e);
    list = [];
  }

  if (list.length === 0) {
    DOM.insAnnouncementsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 35px;">No has publicado ningún anuncio aún. Haz clic en <strong>"+ Publicar Nuevo Anuncio"</strong> para empezar.</td></tr>';
    if (DOM.insAnnouncementsCardsMobile) {
      DOM.insAnnouncementsCardsMobile.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 25px;">No has publicado ningún anuncio aún.</div>';
    }
    return;
  }

  let tableHtml = '';
  let cardsHtml = '';

  list.forEach(ann => {
    const catInfo = getAnnouncementCategoryInfo(ann.category);
    const dateFormatted = formatAnnouncementDate(ann.created_at);
    const isPinnedHtml = ann.is_pinned 
      ? '<span class="pinned-badge"><i class="fas fa-thumbtack"></i> Sí</span>' 
      : '<span style="color: var(--text-secondary); font-size: 0.8rem;">No</span>';
    const safeTitle = (ann.title || '').replace(/'/g, "\\'");

    tableHtml += `
      <tr>
        <td style="white-space: nowrap; font-size: 0.85rem; color: var(--text-secondary);">${dateFormatted}</td>
        <td>
          <span class="announcement-badge" style="background: ${catInfo.bg}; color: ${catInfo.color}; border: 1px solid ${catInfo.border};">
            <i class="${catInfo.icon}"></i> ${catInfo.name}
          </span>
        </td>
        <td>
          <strong style="color: var(--text-primary); font-size: 0.95rem;">${ann.title}</strong>
          <p style="color: var(--text-secondary); font-size: 0.82rem; margin: 4px 0 0 0; max-height: 2.8em; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
            ${ann.content}
          </p>
          ${ann.action_url ? `<span style="font-size: 0.75rem; color: var(--accent-color); margin-top: 4px; display: inline-block;"><i class="fas fa-link"></i> ${ann.action_label || ann.action_url}</span>` : ''}
        </td>
        <td style="text-align: center;">${isPinnedHtml}</td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn btn-secondary btn-sm" onclick="openAnnouncementModal('${ann.id}')" title="Editar Anuncio" style="padding: 4px 10px; font-size: 0.78rem; margin-right: 5px;">
            <i class="fas fa-edit"></i> Editar
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteAnnouncementHandler('${ann.id}', '${safeTitle}')" title="Eliminar Anuncio" style="padding: 4px 10px; font-size: 0.78rem;">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    `;

    cardsHtml += `
      <div class="ins-live-card">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
          <span class="announcement-badge" style="background: ${catInfo.bg}; color: ${catInfo.color}; border: 1px solid ${catInfo.border};">
            <i class="${catInfo.icon}"></i> ${catInfo.name}
          </span>
          ${ann.is_pinned ? '<span class="pinned-badge"><i class="fas fa-thumbtack"></i> Fijado</span>' : ''}
          <span style="font-size: 0.78rem; color: var(--text-secondary); margin-left: auto;">${dateFormatted}</span>
        </div>
        <div class="ins-live-card-title">${ann.title}</div>
        <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 6px 0; line-height: 1.4;">${ann.content}</p>
        ${ann.action_url ? `<div style="font-size: 0.8rem; color: var(--accent-color); margin-bottom: 8px;"><i class="fas fa-link"></i> ${ann.action_label || 'Enlace adjunto'}</div>` : ''}
        <div class="ins-live-card-actions">
          <button class="btn btn-secondary btn-sm" onclick="openAnnouncementModal('${ann.id}')" style="flex: 1;">
            <i class="fas fa-edit"></i> Editar
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteAnnouncementHandler('${ann.id}', '${safeTitle}')" style="padding: 6px 12px;">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    `;
  });

  DOM.insAnnouncementsTableBody.innerHTML = tableHtml;
  if (DOM.insAnnouncementsCardsMobile) {
    DOM.insAnnouncementsCardsMobile.innerHTML = cardsHtml;
  }
}
window.loadInstructorAnnouncements = loadInstructorAnnouncements;

function openAnnouncementModal(editId) {
  if (!DOM.modalAnnouncement) return;

  if (editId) {
    const ann = cachedAnnouncements.find(a => a.id === editId);
    if (ann) {
      if (DOM.modalAnnouncementTitle) DOM.modalAnnouncementTitle.innerHTML = '<i class="fas fa-edit" style="color: var(--accent-color);"></i> Editar Anuncio';
      if (DOM.announcementId) DOM.announcementId.value = ann.id;
      if (DOM.announcementTitle) DOM.announcementTitle.value = ann.title || '';
      if (DOM.announcementCategory) DOM.announcementCategory.value = ann.category || 'General';
      if (DOM.announcementIsPinned) DOM.announcementIsPinned.checked = Boolean(ann.is_pinned);
      if (DOM.announcementNotifyEmail) DOM.announcementNotifyEmail.checked = false;
      if (DOM.announcementContent) DOM.announcementContent.value = ann.content || '';
      if (DOM.announcementActionUrl) DOM.announcementActionUrl.value = ann.action_url || '';
      if (DOM.announcementActionLabel) DOM.announcementActionLabel.value = ann.action_label || '';
    }
  } else {
    if (DOM.modalAnnouncementTitle) DOM.modalAnnouncementTitle.innerHTML = '<i class="fas fa-bullhorn" style="color: var(--accent-color);"></i> Publicar Nuevo Anuncio';
    if (DOM.announcementId) DOM.announcementId.value = '';
    if (DOM.announcementTitle) DOM.announcementTitle.value = '';
    if (DOM.announcementCategory) DOM.announcementCategory.value = 'General';
    if (DOM.announcementIsPinned) DOM.announcementIsPinned.checked = false;
    if (DOM.announcementNotifyEmail) DOM.announcementNotifyEmail.checked = true;
    if (DOM.announcementContent) DOM.announcementContent.value = '';
    if (DOM.announcementActionUrl) DOM.announcementActionUrl.value = '';
    if (DOM.announcementActionLabel) DOM.announcementActionLabel.value = '';
  }

  DOM.modalAnnouncement.classList.add('active');
}
window.openAnnouncementModal = openAnnouncementModal;

function closeAnnouncementModal() {
  if (DOM.modalAnnouncement) DOM.modalAnnouncement.classList.remove('active');
}
window.closeAnnouncementModal = closeAnnouncementModal;

const ANNOUNCEMENT_EMAIL_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbx5PgOikS3ABSbtd3HxxenWgSgkVK-kmdRJ3NsMXdr-jxgQxMbEZ9qh1ZStHur4Vltr/exec';
const ANNOUNCEMENT_EMAIL_TOKEN = 'centraledu-avisos-2026';
const VAPID_PUBLIC_KEY = 'BNSsTNs24vq6sXgWRt1wpr8OYqLx_VoV-Vk00te7B-o--2AHHeHa7qt1EbO1jWg4Kv9uD6tzl1O40D5AKxYLzwU';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function updatePushButtonUI(btn) {
  if (!btn || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    btn.style.color = '#34d399';
    btn.title = 'Notificaciones activadas en este dispositivo';
  } else if (Notification.permission === 'denied') {
    btn.style.color = 'var(--text-secondary)';
    btn.title = 'Notificaciones bloqueadas en el navegador';
  } else {
    btn.style.color = '';
    btn.title = 'Activar notificaciones en este dispositivo';
  }
}

function initPushButton() {
  const btn = document.getElementById('btn-enable-push');
  if (!btn) return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return;
  }
  btn.style.display = 'inline-flex';
  updatePushButtonUI(btn);
  btn.addEventListener('click', () => enablePushNotifications(btn));
}

async function enablePushNotifications(btn) {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      alert('Tu navegador no soporta notificaciones push.');
      return;
    }

    const permission = await Notification.requestPermission();
    updatePushButtonUI(btn);

    if (permission !== 'granted') {
      alert('No se otorgó permiso para notificaciones. Puedes activarlo desde los ajustes del navegador.');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    const subJson = subscription.toJSON();
    const userId = (typeof currentUser !== 'undefined' && currentUser && currentUser.id)
      ? String(currentUser.id)
      : 'anon';

    const { error } = await db.supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh || '',
        auth: subJson.keys?.auth || '',
        user_agent: navigator.userAgent.slice(0, 180),
        updated_at: new Date().toISOString()
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      console.warn('Error guardando suscripción push:', error.message);
      alert('Permiso activado, pero falta crear la tabla push_subscriptions en Supabase.');
      return;
    }

    updatePushButtonUI(btn);
    alert('¡Notificaciones activadas! Recibirás los avisos de CentralEdu en este dispositivo.');
  } catch (err) {
    console.error('Error al activar notificaciones push:', err);
    alert('No se pudieron activar las notificaciones: ' + (err.message || err));
  }
}

async function sendAnnouncementPushNotification(announcementData) {
  if (!db.supabase || !db.supabase.functions) return { sent: 0 };
  const fallbackUrl = (typeof window !== 'undefined' && window.location)
    ? (window.location.origin + window.location.pathname)
    : 'https://raul-torres777.github.io/edutrack-app/';

  const { data, error } = await db.supabase.functions.invoke('send-push', {
    body: {
      title: announcementData.title,
      body: announcementData.content,
      category: announcementData.category,
      url: announcementData.action_url || fallbackUrl
    }
  });
  if (error) throw error;
  return data || { sent: 0 };
}

/**
 * Envía notificación por correo electrónico a todos los alumnos registrados
 * usando el Web App de Google Apps Script (centraledu.avisos@gmail.com).
 */
async function sendAnnouncementEmailNotification(announcementData) {
  const users = await db.getUsers();
  const recipients = Array.from(
    new Set(
      (users || [])
        .filter(u => u && u.role === 'student' && typeof u.email === 'string' && u.email.includes('@'))
        .map(u => u.email.trim().toLowerCase())
        .filter(email => email !== 'test@edutrack.com' && !email.endsWith('@edutrack.com'))
    )
  );

  if (recipients.length === 0) {
    return { sent: 0 };
  }

  const fallbackUrl = (typeof window !== 'undefined' && window.location)
    ? (window.location.origin + window.location.pathname)
    : 'https://raul-torres777.github.io/edutrack-app/';

  const payload = {
    token: ANNOUNCEMENT_EMAIL_TOKEN,
    title: announcementData.title,
    category: announcementData.category,
    content: announcementData.content,
    action_url: announcementData.action_url || fallbackUrl,
    action_label: announcementData.action_label || 'Ir a CentralEdu',
    instructor_name: announcementData.instructor_name || 'CentralEdu',
    recipients
  };

  await fetch(ANNOUNCEMENT_EMAIL_WEBHOOK_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });

  return { sent: recipients.length };
}

async function submitAnnouncement() {
  const title = (DOM.announcementTitle ? DOM.announcementTitle.value : '').trim();
  const category = DOM.announcementCategory ? DOM.announcementCategory.value : 'General';
  const isPinned = DOM.announcementIsPinned ? DOM.announcementIsPinned.checked : false;
  const notifyEmail = DOM.announcementNotifyEmail ? DOM.announcementNotifyEmail.checked : false;
  const content = (DOM.announcementContent ? DOM.announcementContent.value : '').trim();
  const actionUrl = (DOM.announcementActionUrl ? DOM.announcementActionUrl.value : '').trim();
  const actionLabel = (DOM.announcementActionLabel ? DOM.announcementActionLabel.value : '').trim();
  const editId = DOM.announcementId ? DOM.announcementId.value : '';

  if (!title) {
    alert('Por favor escribe el título del anuncio.');
    return;
  }
  if (!content) {
    alert('Por favor escribe el mensaje o contenido del anuncio.');
    return;
  }

  const instructorName = currentUser ? (currentUser.fullName || currentUser.username) : 'Instructor';

  const data = {
    id: editId || undefined,
    title,
    category,
    content,
    action_url: actionUrl,
    action_label: actionLabel,
    is_pinned: isPinned,
    instructor_name: instructorName
  };

  try {
    if (DOM.btnSubmitAnnouncement) {
      DOM.btnSubmitAnnouncement.disabled = true;
      DOM.btnSubmitAnnouncement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';
    }

    await db.saveAnnouncement(data);

    let emailStatusMsg = '';
    if (notifyEmail) {
      try {
        const res = await sendAnnouncementEmailNotification(data);
        if (res.sent > 0) {
          emailStatusMsg = `\n\n📧 Se envió notificación por correo a ${res.sent} alumno(s).`;
        } else {
          emailStatusMsg = '\n\n(No se encontraron alumnos con correo registrado para notificar.)';
        }
      } catch (emailErr) {
        console.warn('No se pudo enviar la notificación por correo:', emailErr);
        emailStatusMsg = '\n\n⚠️ El anuncio se publicó, pero hubo un problema al enviar los correos.';
      }
    }

    let pushStatusMsg = '';
    try {
      const pushRes = await sendAnnouncementPushNotification(data);
      if (pushRes && pushRes.sent > 0) {
        pushStatusMsg = `\n🔔 Notificación push enviada a ${pushRes.sent} dispositivo(s).`;
      }
    } catch (pushErr) {
      console.warn('No se pudo enviar push notification:', pushErr);
    }

    closeAnnouncementModal();
    alert('¡Anuncio publicado con éxito para todos tus alumnos!' + emailStatusMsg + pushStatusMsg);
    await refreshStudentAnnouncements();
    await loadInstructorAnnouncements();
  } catch (err) {
    console.error('Error al guardar anuncio:', err);
    alert('Error al publicar el anuncio: ' + err.message);
  } finally {
    if (DOM.btnSubmitAnnouncement) {
      DOM.btnSubmitAnnouncement.disabled = false;
      DOM.btnSubmitAnnouncement.innerHTML = '<i class="fas fa-paper-plane"></i> Publicar Anuncio';
    }
  }
}
window.submitAnnouncement = submitAnnouncement;

async function deleteAnnouncementHandler(id, title) {
  if (!confirm(`¿Estás seguro de que deseas eliminar el anuncio "${title}"?`)) return;

  try {
    await db.deleteAnnouncement(id);
    alert('Anuncio eliminado correctamente.');
    await refreshStudentAnnouncements();
    await loadInstructorAnnouncements();
  } catch (err) {
    console.error('Error al eliminar anuncio:', err);
    alert('Error al eliminar el anuncio: ' + err.message);
  }
}
window.deleteAnnouncementHandler = deleteAnnouncementHandler;


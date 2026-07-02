export const INITIAL_COURSES = [
  {
    id: "web-dev-101",
    title: "Introducción a Desarrollo Web Moderno",
    description: "Aprende los fundamentos de HTML5, CSS3 y JavaScript moderno desde cero. Crea tus primeras páginas web responsivas y dinámicas con proyectos prácticos.",
    instructor: "Ing. Carlos Mendoza",
    category: "Programación",
    difficulty: "Principiante",
    duration: "4.5 horas",
    thumbnail: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    modules: [
      {
        title: "Módulo 1: Fundamentos del Web",
        lessons: [
          {
            id: "web-dev-101-l1",
            title: "1.1 Cómo funciona el internet y la web",
            type: "video",
            url: "https://www.w3schools.com/html/mov_bbb.mp4", // Video de dominio público (Big Buck Bunny) para pruebas
            duration: "10:30",
            notes: "En esta clase aprenderemos la arquitectura cliente-servidor y el protocolo HTTP."
          },
          {
            id: "web-dev-101-l2",
            title: "1.2 Guía rápida de etiquetas HTML5 fundamentales",
            type: "document",
            url: "https://www.w3.org/TR/html52/html52.pdf",
            duration: "15 min de lectura",
            notes: "Documento oficial del estándar HTML5 con la descripción de todas las etiquetas semánticas."
          }
        ]
      },
      {
        title: "Módulo 2: Estilos con CSS3",
        lessons: [
          {
            id: "web-dev-101-l3",
            title: "2.1 Selectores, Box Model y Layouts modernos",
            type: "video",
            url: "https://www.w3schools.com/html/movie.mp4", // Otro video de prueba
            duration: "14:15",
            notes: "Aprende a maquetar usando Flexbox y CSS Grid de forma limpia."
          },
          {
            id: "web-dev-101-l4",
            title: "2.2 Cheat Sheet de CSS Flexbox y Grid",
            type: "document",
            url: "https://css-tricks.com/wp-content/uploads/2018/11/flexbox-cheat-sheet.pdf",
            duration: "10 min de lectura",
            notes: "Una hoja de referencia rápida para dominar la maquetación flexbox en tus proyectos diarios."
          }
        ]
      },
      {
        title: "Módulo 3: Lógica con JavaScript",
        lessons: [
          {
            id: "web-dev-101-l5",
            title: "3.1 Introducción a variables, funciones y control de flujo",
            type: "video",
            url: "https://www.w3schools.com/html/mov_bbb.mp4",
            duration: "18:45",
            notes: "Empezamos a dar vida a nuestras páginas web agregando interactividad básica con JavaScript."
          }
        ]
      }
    ],
    quiz: [
      {
        question: "¿Qué etiqueta HTML5 se utiliza para definir el contenido principal y único de una página?",
        options: ["<section>", "<main>", "<div>", "<article>"],
        correctIndex: 1
      },
      {
        question: "En el Box Model de CSS, ¿qué propiedad añade espacio interno alrededor del contenido?",
        options: ["margin", "border", "padding", "outline"],
        correctIndex: 2
      },
      {
        question: "¿Cuál de las siguientes declaraciones es correcta para definir una variable cuyo valor no cambiará?",
        options: ["let x = 10;", "var x = 10;", "const x = 10;", "constant x = 10;"],
        correctIndex: 2
      },
      {
        question: "¿Qué propiedad de CSS Grid define el espacio (brecha) entre filas y columnas?",
        options: ["grid-spacing", "gap", "margin-grid", "padding-grid"],
        correctIndex: 1
      }
    ]
  },
  {
    id: "ui-ux-design",
    title: "Diseño de Interfaces (UI/UX) con Figma",
    description: "Aprende a diseñar interfaces digitales que los usuarios amen. Domina Figma, crea prototipos interactivos, wireframes y sistemas de diseño completos.",
    instructor: "Ana Sofía Ramos",
    category: "Diseño",
    difficulty: "Intermedio",
    duration: "6.0 horas",
    thumbnail: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)",
    modules: [
      {
        title: "Módulo 1: Fundamentos de UX",
        lessons: [
          {
            id: "ui-ux-design-l1",
            title: "1.1 Introducción a UX: Empatía y Arquitectura de Información",
            type: "video",
            url: "https://www.w3schools.com/html/movie.mp4",
            duration: "12:20",
            notes: "Explicación del proceso de pensamiento de diseño (Design Thinking) y diseño centrado en el usuario."
          },
          {
            id: "ui-ux-design-l2",
            title: "1.2 Plantilla para entrevistas de usuarios (User Research)",
            type: "document",
            url: "https://pages.uxpin.com/wp-content/uploads/2016/06/User_Research_Guide.pdf",
            duration: "8 min de lectura",
            notes: "Una guía útil en PDF con preguntas clave para realizar investigación de usuarios."
          }
        ]
      },
      {
        title: "Módulo 2: Domina la interfaz de Figma",
        lessons: [
          {
            id: "ui-ux-design-l3",
            title: "2.1 Formas, vectores y Auto Layout en Figma",
            type: "video",
            url: "https://www.w3schools.com/html/mov_bbb.mp4",
            duration: "22:15",
            notes: "Aprende la herramienta más poderosa de Figma: Auto Layout, para hacer interfaces verdaderamente responsivas."
          }
        ]
      }
    ],
    quiz: [
      {
        question: "¿Qué es el 'Auto Layout' en Figma?",
        options: [
          "Una función para guardar archivos automáticamente.",
          "Una herramienta que alinea elementos dinámicamente según el contenido y tamaño de pantalla.",
          "Un plugin para exportar código HTML.",
          "El sistema de cuadrícula por defecto."
        ],
        correctIndex: 1
      },
      {
        question: "¿Cuál es el primer paso en el proceso de Design Thinking?",
        options: ["Idear", "Prototipar", "Empatizar", "Definir"],
        correctIndex: 2
      },
      {
        question: "¿Qué representa un 'Wireframe' de baja fidelidad?",
        options: [
          "El diseño final con colores y fuentes reales.",
          "El código CSS de la página.",
          "Un boceto o estructura básica que define la distribución de los elementos sin detalles visuales complejos.",
          "El logotipo de la aplicación."
        ],
        correctIndex: 2
      }
    ]
  }
];

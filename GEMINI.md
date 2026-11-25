# Contexto y Reglas de Desarrollo de EduTrack

## Visión General del Proyecto
EduTrack es una plataforma web progresiva (PWA) de aprendizaje en línea (LMS) y gestión escolar diseñada con tecnología web moderna sin frameworks pesados (Vanilla JS, HTML5, CSS3, FontAwesome).

## Arquitectura y Componentes
- **Frontend Principal**: `index.html` contiene la estructura completa de la interfaz (vistas de Estudiante, Instructor y Admin).
- **Lógica de la Aplicación**: `app.js` (módulo ES) orquesta los flujos de usuario, eventos, navegación, renderizado dinámico y lógica de cursos.
- **Capa de Datos y Almacenamiento**: `db.js` provee abstracción sobre `localStorage` y sincronización con Supabase (`supabase.js`).
- **PWA & Offline**: `manifest.json` y `sw.js` (Service Worker) permiten la instalación de la aplicación y el funcionamiento sin conexión.
- **Estilos**: `style.css` contiene el sistema de diseño completo con variables CSS, soporte de tema oscuro/claro y adaptabilidad responsiva.
- **Servidor de Desarrollo**: `server.js` (Node.js nativo) sirve la aplicación en `http://localhost:3000` con cabeceras CORS y MIME adecuadas.

## Guía de Desarrollo para Asistentes Antigravity
1. **Módulos ES**: Mantener la compatibilidad modular (`<script type="module">`). No usar sintaxis `require()` en el código del navegador.
2. **Servidor HTTP**: Siempre iniciar con `node server.js` o mediante los sets de arranque configurados en `.vscode/launch.json` (F5).
3. **Persistencia Híbrida**: Toda modificación que involucre datos debe persistir de forma segura en `localStorage` con sincronización idempotente hacia Supabase.
4. **PWA**: No romper la compatibilidad con el Service Worker (`sw.js`). Si se agregan recursos estáticos esenciales, registrarlos para caché.

# PRAXIA · Clínica de Citas Médicas

Autor: Henry Javier Medina Malpartida
Carrera: Ingeniería de Software – Universidad Nacional de Ingeniería (UNI)
Curso: Construcción de Software

---

## Descripción del Proyecto
PRAXIA es una aplicación web para agendamiento y gestión de citas médicas. Incluye dos vistas principales:

- Portal del Paciente: búsqueda de especialidades/médicos, selección de centro/horario y consulta de “Mis citas”.
- Portal del Médico: dashboard con próximas citas, gestión de agenda, sala de espera del día, listado de citas e información de pacientes.

El objetivo es digitalizar el flujo de atención, desde la reserva hasta la consulta, manteniendo una experiencia clara y consistente con la identidad visual de la clínica.

---

## Tecnologías Utilizadas

### Frontend
- React + Vite (TS) para una UI moderna y rápida.
- TypeScript para mayor mantenibilidad y DX..

### Backend
- Java 17 + Spring Boot (REST).
- Spring Data JPA sobre MySQL.
- Maven para gestión de dependencias.

### Base de datos
- MySQL (modelo clínico con tablas: `usuario`, `paciente`, `medico`, `agenda_medico`, `cita`, catálogos, auditoría, etc.).

---

## Funcionalidades

- Autenticación básica y carga de perfil (demo).
- Portal Paciente
  - Selección guiada de cita (especialidad → centro → médico → horario).
  - “Mis citas” (próximas y pasadas).
- Portal Médico
  - Dashboard con próximas citas (filtra por médico y estado reservado/confirmado).
  - Agenda (vista día/semana con slots generados por intervalo).
  - Sala de espera: citas del día del médico con “Marcar en sala / check‑in”.
  - Citas: historial con filtros (texto, estado, rango de fechas).
  - Pacientes: listado simple (demo).
- Notificaciones: boceto de bandeja (demo) con contador de no leídas.
- Mi cuenta: pantalla base para datos del usuario.

---

## Limitaciones actuales

- Conectividad del portal médico: si el backend no responde, el frontend usa datos mock como fallback.
- Agenda CRUD (crear/editar/eliminar) aún no está conectado a endpoints productivos.
- Check‑in de sala de espera: se intenta PUT/POST contra varias rutas; si fallan, aplica cambio local (no persiste).
- Enriquecimiento de nombre de paciente: heurística por `id_paciente` si el endpoint no lo devuelve.
- Dependencia de `localStorage` para el id del médico (`userId`) en modo demo.
- Validación y manejo de errores básicos; sin paginación/ordenamiento avanzados.
- Roles/permisos mínimos; hardening de seguridad pendiente.
- Tests E2E/CI-CD y accesibilidad (a11y) aún no implementados.
- Existen archivos de prototipo (Portal2/PortalClassic); la vista estable es `PortalStable`.

---

## Ejecución local (desarrollo)

1) Backend (Spring Boot)
- Requisitos: JDK 17+, Maven 3.9+, MySQL en marcha.
- Variables de conexión a BD en el `application.properties` del backend.
- Comando: `mvn spring-boot:run`

2) Frontend (Vite)
- Requisitos: Node 18+ y pnpm/npm.
- Crear `.env` en `frontend/` con:
  - `VITE_API_BASE_URL=http://localhost:8080`
- Comandos: `npm install` y `npm run dev`
- Rutas rápidas: `/login`, `/medico`, `/micuenta`.

Nota: para visualizar el portal médico en modo demo, asegura en `localStorage` el id del médico: `localStorage.setItem('userId', '1001')`.

---

## Estructura del repositorio

- `frontend/` UI del paciente y médico (React + Vite + TS).
- `backend/` API (Spring Boot, Maven).
- `database/` scripts SQL y ayudas de modelo.
- `Praxia/` metadatos para GitHub (este README, etc.).

---

## Objetivos del proyecto

- Digitalizar la reserva y atención de citas de forma eficiente.
- Mantener coherencia visual y usabilidad para pacientes y médicos.
- Respetar la integridad de los datos clínicos y auditoría.
- Evolucionar hacia acciones completas en agenda y sala de espera (CRUD y persistencia de estados), notificaciones reales y reportes.

---

## Créditos
Proyecto académico desarrollado en el curso “Construcción de Software” – UNI.

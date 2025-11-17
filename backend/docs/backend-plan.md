# Plan Técnico Backend Praxia

## 1. Objetivo
Reconstruir el backend de Praxia para operar sobre la base de datos clínica proporcionada, cumpliendo requisitos de negocio y marco legal (Ley N.º 29733 y reglamento 2024) y habilitando el frontend renovado.

## 2. Arquitectura Propuesta
- **Framework:** Spring Boot 3.3 (Java 17)
- **Capas:**
  1. Dominio (entidades JPA + enums de soporte)
  2. Repositorios (Spring Data JPA)
  3. Servicios (casos de uso y reglas: agendas, reservas, pagos, políticas)
  4. Controladores REST (DTOs request/response + validaciones)
  5. Infraestructura transversal (seguridad, auditoría, excepciones, configuración)
- **Integraciones:** MySQL 8, futura mensajería/email/SMS (placeholders), módulo de auditoría interno.

## 3. Modelo de Datos (JPA)
### 3.1 Catálogos
- `Documento`
- `EstadoUsuario`
- `TipoSeguro`
- `Especialidad`
- `CentroMedico`
- `ParametroClinica`
- `Rol`

### 3.2 Identidad
- `Usuario` (con enums `Sexo`, relaciones a documento, estado, roles)
- `ConsentimientoTratamiento`
- `VerificacionContacto`
- `UsuarioRol` (embeddable para PK compuesta o entidad simple)

### 3.3 Subtipos Dependientes
- `Paciente`
- `Medico`
- `MedicoCentro`
- `MedicoEspecialidad`

### 3.4 Agenda y Disponibilidad
- `AgendaMedico` (con enums `TipoAgenda`, `ModalidadAtencion`, `EstadoAgenda`)
- `BloqueoAgenda`

### 3.5 Citas
- `Cita` (con enums `EstadoCita`, `ModalidadAtencion`, `EstadoPago`)

### 3.6 Auditoría
- `AuditoriaEvento`

### 3.7 Vistas / Materializaciones
- `VwDisponibilidadBase` (mapeo read-only usando @Immutable / vista JPA).

Se contemplan entidades embebibles para audit trail `createdAt`, `updatedAt` si conviene.

## 4. Repositorios
Crear interfases `JpaRepository` para cada entidad principal.
- Definir queries clave: disponibilidad de agendas, conteo de citas por estado, búsqueda por documento/correo, reservas expiran a 20 minutos, etc.
- Vistas o consultas nativas para disponibilidad consolidada.

## 5. Servicios y Casos de Uso
1. **Identidad & Seguridad:** registro de usuario/paciente/médico, verificación de contacto, gestión de roles, autenticación (JWT pendiente de definir).
2. **Consentimiento & Políticas:** servicios para capturar/validar consentimientos, consulta de parámetros (`reserva_minutos`, `intervalo_defecto`, etc.).
3. **Agendas:** CRUD controlado de agendas, verificación de solapamientos, bloqueo de rangos, cálculo de slots.
4. **Reservas/Citas:**
   - Creación de cita con validación de disponibilidad (evitar doble booking).
   - Manejo de estados (`reservada`→`confirmada`→`atendida`/`no_asistio` / `cancelada`).
   - Expiración automática en `reserva_minutos` (job o verificación en consulta).
   - Gestión de pagos/cópago (estado y monto).
5. **Auditoría:** registro de eventos relevantes (acciones CRUD, login/logout).
6. **Reportes básicos:** endpoints para métricas (citas por estado, agendas activas, etc.).

## 6. API REST (borrador)
- `/auth/login`, `/auth/profile`
- `/usuarios` (CRUD + búsqueda por documento, correo)
- `/pacientes`, `/medicos`
- `/consentimientos`
- `/verificaciones`
- `/parametros`
- `/centros-medicos`, `/especialidades`, `/tipos-seguro`
- `/agendas` + `/agendas/{id}/slots`
- `/agendas/{id}/bloqueos`
- `/citas`
- `/auditoria`

Se definirán DTOs (requests/responses) para separar modelo expuesto.

## 7. Cumplimiento Legal y Seguridad
- **Consentimiento expreso:** endpoints para registrar/actualizar `ConsentimientoTratamiento` con IP y fecha.
- **Finalidad y minimización:** exponer sólo datos necesarios en respuestas (DTOs sanitizados).
- **Derechos ARCO:** endpoints para consultar/eliminar/bloquear usuarios bajo políticas.
- **Auditoría:** persistir `AuditoriaEvento` en cada operación sensible (agenda, cita, login/logout, accesos a datos sensibles).
- **Seguridad:**
  - Implementar JWT + roles (`admin`, `medico`, `paciente`, `operador`).
  - Policies: bloqueo de usuario, hash de contraseña (BCrypt), doble verificación.
- **Retención y caducidad:** revisar `ParametroClinica` para tiempos de retención/expiración.

## 8. Cross-cutting
- **Validación:** Bean Validation + mensajes en español.
- **Manejo de errores:** global exception handler (Problem Details).
- **Logs & auditoría técnica:** SLF4J con trazabilidad.
- **Tareas programadas:** expiración de reservas, recordatorios (colocar skeleton con `@Scheduled`).
- **Mapstruct o manual:** para mapear entidades ↔ DTO.

## 9. Migraciones y Seeds
- Utilizar `Flyway` o `Liquibase` para versionar el esquema (importar DDL inicial y data base).
- Scripts: 001_schema.sql, 002_seed_catalogos.sql, 003_seed_demo.sql.

## 10. Plan de Implementación Iterativo
1. **Fase 0 – Setup:** limpiar proyecto, configurar Flyway, dependencias (p.ex. MapStruct, Spring Security, JWT).
2. **Fase 1 – Identidad Base:** entidades catálogos + usuario + repositorios; endpoints CRUD básicos.
3. **Fase 2 – Paciente/Medico & Roles:** subtipos, relaciones, servicios de registro e inactivación.
4. **Fase 3 – Agendas:** agenda médica, bloqueos, disponibilidad base.
5. **Fase 4 – Citas & Pagos:** creación, transición de estados, expiraciones, pagos.
6. **Fase 5 – Consentimiento & Auditoría:** captura de consentimientos, logging de eventos, verificación contacto.
7. **Fase 6 – Seguridad:** JWT, control de roles, endpoints protegidos.
8. **Fase 7 – Reportes y pruebas:** endpoints de listados, testing unitario/integración, documentación OpenAPI.

Cada fase incluye pruebas unitarias + integración con base MySQL (testcontainers opcional) y actualización de documentación.

## 11. Próximos pasos inmediatos
- Configurar Flyway y añadir scripts de esquema + seed.
- Implementar entidades de catálogos y repositorios.
- Exponer endpoints de lectura de catálogos para que el frontend consuma datos reales.

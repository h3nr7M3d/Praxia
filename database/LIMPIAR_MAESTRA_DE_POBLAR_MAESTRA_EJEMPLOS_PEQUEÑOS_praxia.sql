USE praxia;
-- LIMPIAR_MAESTRAS DE POBLAR MAESTRA
-- =============================
-- 1) BITÁCORA
-- =============================
DELETE FROM bitacora_evento
WHERE (entidad = 'USUARIO' AND id_entidad IN (1,2,3,4))
   OR (entidad = 'PACIENTE_REPRESENTANTE'    AND id_entidad = 1)
   OR (entidad = 'MEDICO_CENTRO_ESPECIALIDAD' AND id_entidad = 1)
   OR (entidad = 'VERIFICACION_CONTACTO'     AND id_entidad = 1)
   OR (entidad = 'CONSENTIMIENTO'            AND id_entidad = 1);

-- =============================
-- 2) CONSENTIMIENTOS
-- =============================
DELETE FROM consentimiento_tratamiento
WHERE id_consentimiento IN (1,2);

-- =============================
-- 3) VERIFICACIONES DE CONTACTO
-- =============================
DELETE FROM verificacion_contacto
WHERE id_verificacion IN (1,2);

-- =============================
-- 4) PREFERENCIAS DE NOTIFICACIÓN
-- =============================
DELETE FROM usuario_preferencia_notif
WHERE id_usuario IN (1,2,3);

-- =============================
-- 5) REPRESENTANTE DE PACIENTE
-- =============================
DELETE FROM paciente_representante
WHERE id_autorizacion = 1;

-- =============================
-- 6) TABLAS SUPLE
-- =============================
DELETE FROM suple_medico_especialidad
WHERE id_medico = 2;

DELETE FROM suple_medico_centro
WHERE id_medico = 2;

-- =============================
-- 7) MEDICO_CENTRO_ESPECIALIDAD
-- =============================
DELETE FROM medico_centro_especialidad
WHERE id_medico_centro_especialidad = 1;

-- =============================
-- 8) CENTRO MÉDICO
-- =============================
DELETE FROM centro_medico
WHERE id_centro_medico = 1;

-- =============================
-- 9) PACIENTES
-- =============================
DELETE FROM paciente
WHERE id_paciente IN (3,4);

-- =============================
-- 10) MÉDICO
-- =============================
DELETE FROM medico
WHERE id_medico = 2;

-- =============================
-- 11) ROLES DE USUARIO
-- =============================
DELETE FROM usuario_rol
WHERE id_usuario IN (1,2,3,4);

-- =============================
-- 12) USUARIOS
-- =============================
DELETE FROM usuario
WHERE id_usuario IN (1,2,3,4);

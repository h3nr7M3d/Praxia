USE praxia;

-- ===========================
-- VERIFICACIÓN PREVIA CRÍTICA
-- ===========================

-- 1. Verificar que existe MCE para médico 2
SET @id_mce_juan = (
  SELECT id_medico_centro_especialidad
  FROM medico_centro_especialidad
  WHERE id_medico = 2
    AND vigente_desde <= CURDATE()
    AND vigente_hasta >= CURDATE()
  LIMIT 1
);

--  SI ESTO ES NULL, DETENER EJECUCIÓN
SELECT IF(@id_mce_juan IS NULL, 'ERROR: No existe MCE para médico 2', 'OK') as estado_mce;

-- 2. Obtener la tarifa CORRECTAMENTE desde MCE
SET @monto_consulta = (
  SELECT t.cantidad 
  FROM tarifa t 
  JOIN medico_centro_especialidad mce ON t.id_tarifa = mce.id_tarifa 
  WHERE mce.id_medico_centro_especialidad = @id_mce_juan
  LIMIT 1
);

SELECT IF(@monto_consulta IS NULL, 'ERROR: No se pudo obtener tarifa', CONCAT('Monto: ', @monto_consulta)) as estado_tarifa;

-- ===========================
-- VARIABLES CORREGIDAS
-- ===========================

-- Parámetros de negocio (con fallback)
SET @duracion_cita_min = COALESCE(
  (SELECT valor_int FROM parametro_negocio WHERE cod_parametro = 'DURACION_CITA_MIN'),
  20
);

SET @capacidad_slot_defecto = COALESCE(
  (SELECT valor_int FROM parametro_negocio WHERE cod_parametro = 'CAPACIDAD_SLOT_DEFECTO'),
  1
);

-- Estados
SET @std_agenda_activa      = 'ACTIVA';
SET @tipo_agenda_recurrente = 'RECURRENTE';
SET @std_cita_reservada     = 'RESERVADA';
SET @std_cita_confirmada    = 'CONFIRMADA';
SET @std_pago_pagado        = 'PAGADO';

-- Método de pago
SET @id_metodo_efectivo = (
  SELECT id_metodo_pago FROM metodo_pago WHERE nmb_metodo_pago = 'EFECTIVO' LIMIT 1
);

--  FECHA FUTURA para evitar problemas
SET @fecha_agenda_futura = DATE_ADD(CURDATE(), INTERVAL 7 DAY);

-- ===========================
-- AGENDA CORREGIDA
-- ===========================

INSERT INTO agenda (
  fch_agenda,
  hora_inicio,
  hora_fin,
  observaciones,
  fch_registro_agenda,
  fch_actualizacion_agenda,
  id_usuario_creador,
  id_usuario_actualizador,
  nmb_std_agenda,
  id_medico_centro_especialidad,
  nmb_tipo_agenda,
  intervalo_min,
  capacidad_slot,
  duracion_real_cita_min
) VALUES (
  @fecha_agenda_futura,    -- FECHA FUTURA
  '09:00:00',
  '13:00:00',              --  4 horas en lugar de 2
  'Jornada completa de consultas generales',
  NOW(),
  NOW(),
  1,
  1,
  @std_agenda_activa,
  @id_mce_juan,
  @tipo_agenda_recurrente,
  @duracion_cita_min,
  @capacidad_slot_defecto,
  @duracion_cita_min
);

SET @id_agenda_juan = LAST_INSERT_ID();

SELECT CONCAT('Agenda creada ID: ', @id_agenda_juan) as estado_agenda;

-- ===========================
-- SLOTS DE AGENDA CORREGIDOS
-- ===========================

INSERT INTO agenda_slot (
  id_agenda,
  hora_inicio_slot,
  hora_fin_slot,
  capacidad,
  ocupados,
  std_slot
) VALUES
(@id_agenda_juan, '09:00:00', '09:20:00', @capacidad_slot_defecto, 0, 'DISPONIBLE'),
(@id_agenda_juan, '09:20:00', '09:40:00', @capacidad_slot_defecto, 0, 'DISPONIBLE'),
(@id_agenda_juan, '09:40:00', '10:00:00', @capacidad_slot_defecto, 0, 'DISPONIBLE'),
(@id_agenda_juan, '10:00:00', '10:20:00', @capacidad_slot_defecto, 0, 'DISPONIBLE'),
(@id_agenda_juan, '10:20:00', '10:40:00', @capacidad_slot_defecto, 0, 'DISPONIBLE'),
(@id_agenda_juan, '10:40:00', '11:00:00', @capacidad_slot_defecto, 0, 'DISPONIBLE'),
(@id_agenda_juan, '11:00:00', '11:20:00', @capacidad_slot_defecto, 0, 'DISPONIBLE'),
(@id_agenda_juan, '11:20:00', '11:40:00', @capacidad_slot_defecto, 0, 'DISPONIBLE'),
(@id_agenda_juan, '11:40:00', '12:00:00', @capacidad_slot_defecto, 0, 'DISPONIBLE'),
(@id_agenda_juan, '12:00:00', '12:20:00', @capacidad_slot_defecto, 0, 'DISPONIBLE'),
(@id_agenda_juan, '12:20:00', '12:40:00', @capacidad_slot_defecto, 0, 'DISPONIBLE'),
(@id_agenda_juan, '12:40:00', '13:00:00', @capacidad_slot_defecto, 0, 'DISPONIBLE');

--  OBTENER ID DEL SLOT CORRECTAMENTE
SET @id_slot_0900 = LAST_INSERT_ID() - 11;

SELECT CONCAT('Slot 09:00 ID: ', @id_slot_0900) as estado_slot;

-- ===========================
-- CITA CORREGIDA
-- ===========================

INSERT INTO citas (
  hora_inicio_cita,
  hora_fin_cita,
  motivo,
  fch_registro_cita,
  fch_actualizacion_cita,
  id_usuario_creador,
  id_usuario_actualizador,
  id_paciente,
  id_agenda,
  nmb_std_cita,
  id_slot
) VALUES (
  '09:00:00',
  '09:20:00',
  'Consulta general por chequeo médico anual',
  NOW(),
  NOW(),
  3,
  3,
  3,
  @id_agenda_juan,
  @std_cita_reservada,
  @id_slot_0900
);

SET @id_cita_carlos = LAST_INSERT_ID();

-- Actualizar slot
UPDATE agenda_slot
SET ocupados = ocupados + 1,
    std_slot = 'OCUPADO'
WHERE id_slot = @id_slot_0900;

SELECT CONCAT('Cita creada ID: ', @id_cita_carlos) as estado_cita;

-- ===========================
-- CONFIRMACIÓN Y PAGO CORREGIDOS
-- ===========================

UPDATE citas
SET nmb_std_cita = @std_cita_confirmada,
    fch_actualizacion_cita = NOW(),
    id_usuario_actualizador = 1
WHERE id_cita = @id_cita_carlos;

INSERT INTO pago (
  id_cita,
  monto_total,
  std_pago,
  id_metodo_pago,
  referencia_externa,
  fch_registro_pago,
  fch_actualizacion_pago,
  id_usuario_registra
) VALUES (
  @id_cita_carlos,
  @monto_consulta,
  @std_pago_pagado,
  @id_metodo_efectivo,
  'CAJA-LOCAL-0001',
  NOW(),
  NOW(),
  1
);

SET @id_pago_carlos = LAST_INSERT_ID();

-- ===========================
-- FACTURA CORREGIDA
-- ===========================

INSERT INTO factura (
  id_pago,
  tipo_comprobante,
  serie,
  numero,
  ruc_emisor,
  ruc_dni_receptor,
  razon_social_receptor,
  monto_total,
  fch_emision,
  enlace_pdf,
  enlace_xml
) VALUES (
  @id_pago_carlos,
  'BOLETA',
  'B001',
  '00000001',
  '20123456789',
  '87654321',
  'Carlos Pérez',
  @monto_consulta,
  NOW(),
  NULL,
  NULL
);

-- ===========================
-- VERIFICACIÓN FINAL
-- ===========================

SELECT 
    'OPERATIVAS CREADAS EXITOSAMENTE' as resultado,
    @id_cita_carlos as id_cita,
    @monto_consulta as monto_pagado,
    @std_cita_confirmada as estado_cita,
    @fecha_agenda_futura as fecha_cita;
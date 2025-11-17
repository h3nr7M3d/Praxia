USE praxia;

-- ===========================
-- 12. VARIABLES PARA OPERATIVAS (CORREGIDAS)
-- ===========================

-- Médico-Centro-Especialidad: tomamos cualquier MCE vigente del médico 2
SET @id_mce_juan = (
  SELECT id_medico_centro_especialidad
  FROM medico_centro_especialidad
  WHERE id_medico = 2
    AND vigente_desde <= CURDATE()
    AND vigente_hasta >= CURDATE()
  ORDER BY vigente_desde DESC
  LIMIT 1
);

-- Opcional: ver qué valor tomó (para depurar)
SELECT @id_mce_juan AS id_mce_juan;

-- Si @id_mce_juan sigue siendo NULL, NO va a funcionar nada de abajo.
-- Asegúrate de tener al menos un registro en medico_centro_especialidad para el médico 2.

-- Parámetros de negocio (con fallback)
SET @duracion_cita_min = COALESCE(
  (SELECT valor_int FROM parametro_negocio WHERE cod_parametro = 'DURACION_CITA_MIN'),
  20
);

SET @capacidad_slot_defecto = COALESCE(
  (SELECT valor_int FROM parametro_negocio WHERE cod_parametro = 'CAPACIDAD_SLOT_DEFECTO'),
  1
);

-- Estados / tipos de catálogos (ajusta si tus catálogos usan otros textos)
SET @std_agenda_activa      = 'ACTIVA';
SET @tipo_agenda_recurrente = 'RECURRENTE';
SET @std_cita_reservada     = 'RESERVADA';
SET @std_cita_confirmada    = 'CONFIRMADA';
SET @std_pago_pagado        = 'PAGADO';

-- Método de pago EFECTIVO
SET @id_metodo_efectivo = (
  SELECT id_metodo_pago
  FROM metodo_pago
  WHERE nmb_metodo_pago = 'EFECTIVO'
  LIMIT 1
);

-- Monto de la consulta desde la tarifa
SET @monto_consulta = (
  SELECT cantidad FROM tarifa WHERE id_tarifa = @id_tarifa_consulta_gen_pres
);

-- ===========================
-- 13. AGENDA PARA JUAN MEDINA
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
  '2025-11-14',
  '09:00:00',
  '11:00:00',
  'Consulta general – turno mañana',
  NOW(),
  NOW(),
  1,                      -- creado por ADMIN
  1,
  @std_agenda_activa,
  @id_mce_juan,           -- ya no debería ser NULL
  @tipo_agenda_recurrente,
  @duracion_cita_min,
  @capacidad_slot_defecto,
  @duracion_cita_min
);

SET @id_agenda_juan = LAST_INSERT_ID();

-- ===========================
-- 14. SLOTS DE LA AGENDA
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
(@id_agenda_juan, '10:40:00', '11:00:00', @capacidad_slot_defecto, 0, 'DISPONIBLE');

SET @id_slot_0900 = (
  SELECT id_slot
  FROM agenda_slot
  WHERE id_agenda = @id_agenda_juan
    AND hora_inicio_slot = '09:00:00'
  LIMIT 1
);

-- ===========================
-- 15. CITA PARA CARLOS (PACIENTE 3)
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
  'Consulta general por chequeo rutinario',
  NOW(),
  NOW(),
  3,                    -- creada por Carlos
  3,
  3,                    -- id_paciente = 3
  @id_agenda_juan,
  @std_cita_reservada,
  @id_slot_0900
);

SET @id_cita_carlos = LAST_INSERT_ID();

UPDATE agenda_slot
SET ocupados = ocupados + 1,
    std_slot = 'OCUPADO'
WHERE id_slot = @id_slot_0900;

-- ===========================
-- 16. CONFIRMACION + PAGO
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
-- 17. FACTURA
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
  '87654321',          -- DNI de Carlos
  'Carlos Pérez',
  @monto_consulta,
  NOW(),
  NULL,
  NULL
);

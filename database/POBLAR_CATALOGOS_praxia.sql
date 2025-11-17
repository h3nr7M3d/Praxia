USE praxia;

-- ======================================
-- 1. TIPOS DE DOCUMENTO
-- ======================================
INSERT INTO documento (nmb_documento) VALUES
('DNI'),
('CARNET DE EXTRANJERÍA'),
('PASAPORTE'),
('RUC'),
('OTRO');

-- ======================================
-- 2. ESTADO / STD_USUARIO
-- ======================================
INSERT INTO std_usuario (std_usuario, dsc_std_usuario) VALUES
('ACTIVO',                 'Usuario activo y con acceso al sistema'),
('INACTIVO',               'Usuario desactivado temporalmente'),
('BLOQUEADO',              'Usuario bloqueado por seguridad o política'),
('PENDIENTE_VERIFICACION', 'Usuario registrado pendiente de verificar contacto');

-- ======================================
-- 3. PAÍSES (cod_pais = código ISO-like)
-- ======================================
INSERT INTO pais (nmb_pais, cod_pais) VALUES
('Perú',           '+51'),
('Chile',          '+56'),
('México',         '+52'),
('Colombia',       '+57'),
('Argentina',      '+54'),
('Brasil',         '+55'),
('Estados Unidos', '+1'),
('España',         '+34');

-- Asumimos que Perú quedó con id_pais = 1
-- (primero que se insertó). Si no, ajustas el ID.

-- ======================================
-- 4. DEPARTAMENTOS (TODOS LOS DE PERÚ)
-- ======================================
INSERT INTO departamento (nmb_departamento, id_pais) VALUES
('AMAZONAS',      1),
('ANCASH',        1),
('APURIMAC',      1),
('AREQUIPA',      1),
('AYACUCHO',      1),
('CAJAMARCA',     1),
('CALLAO',        1),
('CUSCO',         1),
('HUANCAVELICA',  1),
('HUANUCO',       1),
('ICA',           1),
('JUNIN',         1),
('LA LIBERTAD',   1),
('LAMBAYEQUE',    1),
('LIMA',          1),
('LORETO',        1),
('MADRE DE DIOS', 1),
('MOQUEGUA',      1),
('PASCO',         1),
('PIURA',         1),
('PUNO',          1),
('SAN MARTIN',    1),
('TACNA',         1),
('TUMBES',        1),
('UCAYALI',       1);

-- ======================================
-- 5. PROVINCIAS (UNA PRINCIPAL POR DEPARTAMENTO)
--    nmb_provincia = nmb_departamento
-- ======================================
INSERT INTO provincia (id_departamento, nmb_provincia)
SELECT d.id_departamento, d.nmb_departamento
FROM departamento d
WHERE d.id_pais = 1;

-- Ahora tienes p.ej. provincia LIMA, provincia CALLAO, etc.

-- ======================================
-- 6. DISTRITOS “CAPITAL” POR PROVINCIA
--    nmb_distrito = nmb_provincia
-- ======================================
INSERT INTO distrito (id_provincia, nmb_distrito)
SELECT p.id_provincia, p.nmb_provincia
FROM provincia p
JOIN departamento d ON p.id_departamento = d.id_departamento
WHERE d.id_pais = 1;

-- ======================================
-- 7. DISTRITOS ADICIONALES PARA LIMA (PROVINCIA LIMA)
-- ======================================
INSERT INTO distrito (id_provincia, nmb_distrito)
SELECT p.id_provincia, t.nombre
FROM (
  SELECT 'ANCÓN'                   AS nombre UNION ALL
  SELECT 'ATE'                     UNION ALL
  SELECT 'BARRANCO'                UNION ALL
  SELECT 'BREÑA'                   UNION ALL
  SELECT 'CARABAYLLO'              UNION ALL
  SELECT 'CHACLACAYO'              UNION ALL
  SELECT 'CHORRILLOS'              UNION ALL
  SELECT 'CIENEGUILLA'             UNION ALL
  SELECT 'COMAS'                   UNION ALL
  SELECT 'EL AGUSTINO'             UNION ALL
  SELECT 'INDEPENDENCIA'           UNION ALL
  SELECT 'JESÚS MARÍA'             UNION ALL
  SELECT 'LA MOLINA'               UNION ALL
  SELECT 'LA VICTORIA'             UNION ALL
  SELECT 'LINCE'                   UNION ALL
  SELECT 'LOS OLIVOS'              UNION ALL
  SELECT 'LURIGANCHO'              UNION ALL
  SELECT 'LURÍN'                   UNION ALL
  SELECT 'MAGDALENA DEL MAR'       UNION ALL
  SELECT 'MIRAFLORES'              UNION ALL
  SELECT 'PACHACÁMAC'              UNION ALL
  SELECT 'PUCUSANA'                UNION ALL
  SELECT 'PUEBLO LIBRE'            UNION ALL
  SELECT 'PUENTE PIEDRA'           UNION ALL
  SELECT 'PUNTA HERMOSA'           UNION ALL
  SELECT 'PUNTA NEGRA'             UNION ALL
  SELECT 'RÍMAC'                   UNION ALL
  SELECT 'SAN BARTOLO'             UNION ALL
  SELECT 'SAN BORJA'               UNION ALL
  SELECT 'SAN ISIDRO'              UNION ALL
  SELECT 'SAN JUAN DE LURIGANCHO'  UNION ALL
  SELECT 'SAN JUAN DE MIRAFLORES'  UNION ALL
  SELECT 'SAN LUIS'                UNION ALL
  SELECT 'SAN MARTÍN DE PORRES'    UNION ALL
  SELECT 'SAN MIGUEL'              UNION ALL
  SELECT 'SANTA ANITA'             UNION ALL
  SELECT 'SANTA MARÍA DEL MAR'     UNION ALL
  SELECT 'SANTA ROSA'              UNION ALL
  SELECT 'SANTIAGO DE SURCO'       UNION ALL
  SELECT 'SURQUILLO'               UNION ALL
  SELECT 'VILLA EL SALVADOR'       UNION ALL
  SELECT 'VILLA MARÍA DEL TRIUNFO'
) AS t
JOIN provincia p
  ON p.nmb_provincia = 'LIMA'
JOIN departamento d
  ON d.id_departamento = p.id_departamento
 AND d.nmb_departamento = 'LIMA'
 AND d.id_pais = 1;

-- ======================================
-- 8. DISTRITOS ADICIONALES PARA CALLAO (PROVINCIA CALLAO)
-- ======================================
INSERT INTO distrito (id_provincia, nmb_distrito)
SELECT p.id_provincia, t.nombre
FROM (
  SELECT 'BELLAVISTA'                   AS nombre UNION ALL
  SELECT 'CARMEN DE LA LEGUA REYNOSO'   UNION ALL
  SELECT 'LA PERLA'                     UNION ALL
  SELECT 'LA PUNTA'                     UNION ALL
  SELECT 'VENTANILLA'                   UNION ALL
  SELECT 'MI PERÚ'
) AS t
JOIN provincia p
  ON p.nmb_provincia = 'CALLAO'
JOIN departamento d
  ON d.id_departamento = p.id_departamento
 AND d.nmb_departamento = 'CALLAO'
 AND d.id_pais = 1;

-- ======================================
-- 9. ROLES DEL SISTEMA (3 ROLES)
-- ======================================
INSERT INTO rol (nmb_rol) VALUES
('ADMIN'),
('MEDICO'),
('PACIENTE');

-- ======================================
-- 10. PARENTESCO
-- ======================================
INSERT INTO parentesco (nmb_parentesco) VALUES
('PADRE'),
('MADRE'),
('APODERADO'),
('TUTOR'),
('CÓNYUGE'),
('HERMANO'),
('OTRO');

-- ======================================
-- 11. CANALES DE NOTIFICACIÓN
-- ======================================
INSERT INTO canal_notificacion (nmb_canal) VALUES
('EMAIL'),
('SMS'),
('WHATSAPP'),
('LLAMADA_TELEFONICA');

-- ======================================
-- 12. MONEDAS
-- ======================================
INSERT INTO moneda (cod_moneda, nmb_moneda, conversion_a_soles) VALUES
('PEN', 'Sol peruano',          1.00),
('USD', 'Dólar estadounidense', 3.80),
('EUR', 'Euro',                 4.10);

-- ======================================
-- 13. TARIFAS (EJEMPLOS BASE)
-- ======================================
INSERT INTO tarifa (nmb_tarifa, cantidad, cod_moneda) VALUES
('CONSULTA_GENERAL_PRESENCIAL',       80.00, 'PEN'),
('CONSULTA_ESPECIALIDAD_PRESENCIAL', 120.00, 'PEN'),
('CONSULTA_GENERAL_VIRTUAL',          70.00, 'PEN'),
('CONSULTA_ESPECIALIDAD_VIRTUAL',    110.00, 'PEN');

-- ======================================
-- 14. ESPECIALIDADES MÉDICAS
-- (código = nmb_especialidad; luego en frontend muestras "bonito")
-- ======================================
INSERT INTO especialidad (nmb_especialidad, dsc_especialidad) VALUES
('MEDICINA_GENERAL', 'Atención médica general y triaje clínico.'),
('PEDIATRIA',        'Atención de niñas, niños y adolescentes.'),
('GINECOLOGIA',      'Salud reproductiva y ginecológica.'),
('CARDIOLOGIA',      'Enfermedades del corazón y sistema circulatorio.'),
('DERMATOLOGIA',     'Piel, cabello y uñas.'),
('NEUROLOGIA',       'Sistema nervioso central y periférico.');

-- ======================================
-- 15. TIPO SEGURO
-- (estructura actual: nmb_tipo_seguro PK)
-- ======================================
INSERT INTO tipo_seguro (nmb_tipo_seguro, dsc_tipo_seguro) VALUES
('PARTICULAR',     'Paciente sin cobertura, paga tarifa particular.'),
('SEGURO_PRIVADO', 'Seguro privado / EPS contratada.'),
('SIS',            'Seguro Integral de Salud del Estado.'),
('SOAT',           'Seguro obligatorio para accidentes de tránsito.'),
('EPS_EMPRESARIAL','Seguro contratado por la empresa del paciente.'),
('OTRO',           'Otros tipos de seguro no especificados.');

-- ======================================
-- 16. ESTADOS DE AGENDA (std_agenda)
-- ======================================
INSERT INTO std_agenda (nmb_std_agenda, dsc_agenda) VALUES
('ACTIVA',       'Agenda disponible para asignar citas.'),
('INHABILITADA', 'Agenda cerrada o fuera de uso.'),
('CANCELADA',    'Agenda cancelada (por centro o médico).'),
('COMPLETADA',   'Agenda ya ejecutada (histórica).');

-- ======================================
-- 17. TIPOS DE AGENDA (PATRÓN)
-- RECURRENTE / PUNTUAL (lo que usa tu front)
-- ======================================
INSERT INTO tipo_agenda (nmb_tipo_agenda, dsc_tipo_agenda) VALUES
('RECURRENTE', 'Agenda que se repite en patrón semanal.'),
('PUNTUAL',    'Agenda creada para una fecha específica.');

-- ======================================
-- 18. ESTADOS DE CITA (std_cita)
-- alineado con tu diseño de UI: RESERVADA, CONFIRMADA, CANCELADA, ATENDIDA, NO_ASISTIO
-- ======================================
INSERT INTO std_cita (nmb_std_cita, dsc_std_cita) VALUES
('RESERVADA',  'Cita registrada pero aún no confirmada.'),
('CONFIRMADA', 'Cita confirmada por la clínica/paciente.'),
('CANCELADA',  'Cita cancelada por el paciente o la clínica.'),
('ATENDIDA',   'Cita realizada y atención completada.'),
('NO_ASISTIO', 'El paciente no se presentó a la consulta.');

-- ======================================
-- 19. ESTADOS DE PAGO (std_pago)
-- ======================================
INSERT INTO std_pago (std_pago, dsc_std_pago) VALUES
('PENDIENTE',  'Pago pendiente de procesar.'),
('PAGADO',     'Pago completado exitosamente.'),
('RECHAZADO',  'Pago rechazado por la entidad financiera.'),
('REEMBOLSADO','Pago reembolsado al paciente.'),
('CANCELADO',  'Pago cancelado por el usuario o la clínica.');

-- ======================================
-- 20. MÉTODOS DE PAGO
-- ======================================
INSERT INTO metodo_pago (nmb_metodo_pago) VALUES
('EFECTIVO'),
('TARJETA_CREDITO'),
('TARJETA_DEBITO'),
('TRANSFERENCIA'),
('YAPE'),
('PLIN');

-- ======================================
-- 21. PARÁMETROS DE NEGOCIO
-- (ajustables desde el panel de admin en el futuro)
-- ======================================
INSERT INTO parametro_negocio (cod_parametro, valor_int, valor_texto, descripcion) VALUES
('DURACION_CITA_MIN',            20,  NULL, 'Duración estándar de cada cita en minutos.'),
('MINUTOS_MAX_RESERVA_SIN_PAGO', 20,  NULL, 'Tiempo máximo para mantener una reserva sin confirmar.'),
('CAPACIDAD_SLOT_DEFECTO',       1,   NULL, 'Número de pacientes por slot por defecto.'),
('MARGEN_MIN_ENTRE_CITAS',       5,   NULL, 'Minutos entre cita y cita para cambio de paciente.'),
('DIAS_MAX_AGENDA_FUTURA',       30,  NULL, 'Máximo de días futuros para poder agendar.'),
('MONEDA_BASE',                  NULL,'PEN','Código de moneda base del sistema.');

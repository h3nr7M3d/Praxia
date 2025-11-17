CREATE DATABASE praxia;
USE praxia;

-- ================== CATALOGOS BASE ==================

CREATE TABLE documento (
  id_documento      INT          NOT NULL AUTO_INCREMENT,
  nmb_documento     VARCHAR(50)  NOT NULL,
  PRIMARY KEY (id_documento)
);

CREATE TABLE std_usuario (
  std_usuario       VARCHAR(30)  NOT NULL,
  dsc_std_usuario   VARCHAR(100) NOT NULL,
  PRIMARY KEY (std_usuario)
);

CREATE TABLE pais (
  id_pais   INT          NOT NULL AUTO_INCREMENT,
  nmb_pais  VARCHAR(100) NOT NULL,
  cod_pais  VARCHAR(10)  NOT NULL,
  PRIMARY KEY (id_pais),
  UNIQUE (cod_pais)
);

-- ================== USUARIO / IDENTIDAD ==================
CREATE TABLE usuario (
  id_usuario              INT           NOT NULL AUTO_INCREMENT,
  nombre                  VARCHAR(100)  NOT NULL,
  apellido                VARCHAR(100)  NOT NULL,
  sexo                    ENUM('M','F','X') NOT NULL,
  nr_documento            VARCHAR(20)   NOT NULL,
  fch_nacimiento          DATE          NOT NULL,
  correo                  VARCHAR(150)  NOT NULL,
  telefono                VARCHAR(20)   NOT NULL,
  contrasena_hash         VARCHAR(255)  NOT NULL,
  fch_registro_usuario    DATETIME      NOT NULL,
  fch_actualizacion_usuario DATETIME    NOT NULL,
  id_usuario_creador      INT           NULL,
  id_usuario_actualizador INT           NULL,
  id_documento            INT           NOT NULL,
  std_usuario             VARCHAR(30)   NOT NULL,
  id_pais                 INT           NOT NULL,
  PRIMARY KEY (id_usuario),
  UNIQUE (nr_documento),
  UNIQUE (correo),
  FOREIGN KEY (id_documento)            REFERENCES documento(id_documento),
  FOREIGN KEY (std_usuario)             REFERENCES std_usuario(std_usuario),
  FOREIGN KEY (id_pais)                 REFERENCES pais(id_pais),
  FOREIGN KEY (id_usuario_creador)      REFERENCES usuario(id_usuario),
  FOREIGN KEY (id_usuario_actualizador) REFERENCES usuario(id_usuario)
);


CREATE TABLE verificacion_contacto (
  id_verificacion INT          NOT NULL AUTO_INCREMENT,
  canal           VARCHAR(50)  NOT NULL,
  destino         VARCHAR(150) NOT NULL,
  codigo          VARCHAR(20)  NOT NULL,
  fch_emitido     DATETIME     NOT NULL,
  fch_expira      DATETIME     NOT NULL,
  usado           TINYINT(1)   NOT NULL,
  id_usuario      INT          NOT NULL,
  PRIMARY KEY (id_verificacion),
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

CREATE TABLE consentimiento_tratamiento (
  id_consentimiento INT           NOT NULL AUTO_INCREMENT,
  finalidad          VARCHAR(255) NOT NULL,
  otorgado           ENUM('SI','NO','REVOCADO') NOT NULL,
  fch_evento         DATETIME     NOT NULL,
  ip_remota          VARCHAR(45)  NOT NULL,
  id_usuario         INT          NOT NULL,
  PRIMARY KEY (id_consentimiento),
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

-- ================== AUDITORIA ==================

CREATE TABLE bitacora_evento (
  id_evento      INT           NOT NULL AUTO_INCREMENT,
  entidad        VARCHAR(50)   NOT NULL,
  id_entidad     INT           NOT NULL,
  tipo_evento    VARCHAR(50)   NOT NULL,
  resumen        VARCHAR(255)  NOT NULL,
  valor_anterior TEXT		   NOT NULL,
  valor_nuevo    TEXT		   NOT NULL,
  fch_evento     DATETIME      NOT NULL,
  id_usuario     INT           NOT NULL,
  PRIMARY KEY (id_evento),
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

-- ================== ROLES Y ACCESOS ==================

CREATE TABLE rol (
  id_rol   INT          NOT NULL AUTO_INCREMENT,
  nmb_rol  VARCHAR(50)  NOT NULL,
  PRIMARY KEY (id_rol),
  UNIQUE (nmb_rol)
);

CREATE TABLE usuario_rol (
  id_usuario INT NOT NULL,
  id_rol     INT NOT NULL,
  PRIMARY KEY (id_usuario, id_rol),
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
  FOREIGN KEY (id_rol)     REFERENCES rol(id_rol)
);

-- ================== PARENTESCO Y UBICACION ==================

CREATE TABLE parentesco (
  id_parentesco   INT          NOT NULL AUTO_INCREMENT,
  nmb_parentesco  VARCHAR(50)  NOT NULL,
  PRIMARY KEY (id_parentesco)
);

CREATE TABLE departamento (
  id_departamento   INT           NOT NULL AUTO_INCREMENT,
  nmb_departamento  VARCHAR(100)  NOT NULL,
  id_pais           INT           NOT NULL,
  PRIMARY KEY (id_departamento),
  UNIQUE (id_pais, nmb_departamento),
  FOREIGN KEY (id_pais) REFERENCES pais(id_pais)
);

CREATE TABLE provincia (
  id_provincia     INT           NOT NULL AUTO_INCREMENT,
  id_departamento  INT           NOT NULL,
  nmb_provincia    VARCHAR(100)  NOT NULL,
  PRIMARY KEY (id_provincia),
  UNIQUE (id_departamento, nmb_provincia),
  FOREIGN KEY (id_departamento) REFERENCES departamento(id_departamento)
);

CREATE TABLE distrito (
  id_distrito    INT           NOT NULL AUTO_INCREMENT,
  id_provincia   INT           NOT NULL,
  nmb_distrito   VARCHAR(100)  NOT NULL,
  PRIMARY KEY (id_distrito),
  UNIQUE (id_provincia, nmb_distrito),
  FOREIGN KEY (id_provincia) REFERENCES provincia(id_provincia)
);


-- Agregar cerca de los catálogos base:
CREATE TABLE parametro_negocio (
  cod_parametro   VARCHAR(50)  NOT NULL,
  valor_int       INT          NULL,
  valor_texto     VARCHAR(100) NULL,
  descripcion     VARCHAR(255) NOT NULL,
  PRIMARY KEY (cod_parametro)
);

-- ================== PACIENTE Y RELACIONES ==================

CREATE TABLE tipo_seguro (
  nmb_tipo_seguro VARCHAR(100) NOT NULL,
  dsc_tipo_seguro VARCHAR(255) NOT NULL,
  PRIMARY KEY (nmb_tipo_seguro)
);

CREATE TABLE paciente (
  id_paciente                  INT           NOT NULL,
  fch_registro_paciente        DATETIME      NOT NULL,
  fch_actualizacion_paciente   DATETIME      NOT NULL,
  id_usuario_creador           INT           NOT NULL,
  id_usuario_actualizador      INT           NOT NULL,
  domicilio                    VARCHAR(255)  NOT NULL,
  ref_domicilio                VARCHAR(255)  NOT NULL,
  id_distrito                  INT           NOT NULL,
  nmb_tipo_seguro              VARCHAR(100)  NOT NULL,
  PRIMARY KEY (id_paciente),
  FOREIGN KEY (id_paciente)             REFERENCES usuario(id_usuario),
  FOREIGN KEY (id_distrito)             REFERENCES distrito(id_distrito),
  FOREIGN KEY (nmb_tipo_seguro)         REFERENCES tipo_seguro(nmb_tipo_seguro),
  FOREIGN KEY (id_usuario_creador)      REFERENCES usuario(id_usuario),
  FOREIGN KEY (id_usuario_actualizador) REFERENCES usuario(id_usuario)
);


CREATE TABLE paciente_representante (
  id_autorizacion          INT        NOT NULL AUTO_INCREMENT,
  std_paciente_representante TINYINT(1) NOT NULL,
  pms_agendar              TINYINT(1) NOT NULL,
  pms_pago                 TINYINT(1) NOT NULL,
  fch_vigente_desde        DATETIME   NOT NULL,
  fch_vigente_hasta        DATETIME   NOT NULL,
  id_usuario               INT        NOT NULL,
  id_paciente              INT        NOT NULL,
  id_parentesco            INT        NOT NULL,
  PRIMARY KEY (id_autorizacion),
  FOREIGN KEY (id_usuario)    REFERENCES usuario(id_usuario),
  FOREIGN KEY (id_paciente)   REFERENCES paciente(id_paciente),
  FOREIGN KEY (id_parentesco) REFERENCES parentesco(id_parentesco)
);

CREATE TABLE canal_notificacion (
  id_canal  INT          NOT NULL AUTO_INCREMENT,
  nmb_canal VARCHAR(50)  NOT NULL,
  PRIMARY KEY (id_canal)
);

CREATE TABLE usuario_preferencia_notif (
  id_usuario INT          NOT NULL,
  id_canal   INT          NOT NULL,
  destino    VARCHAR(255) NOT NULL,
  habilitado TINYINT(1)   NOT NULL,
  verificado TINYINT(1)   NOT NULL,
  PRIMARY KEY (id_usuario, id_canal),
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
  FOREIGN KEY (id_canal)   REFERENCES canal_notificacion(id_canal)
);

-- ================== MEDICOS / CENTROS / ESPECIALIDADES ==================

CREATE TABLE medico (
  id_medico  INT          NOT NULL AUTO_INCREMENT,
  cmp        VARCHAR(20)  NOT NULL,
  dsc_perfil VARCHAR(255) NOT NULL,
  std_medico ENUM('HABILITADO','SUSPENDIDO','BAJA') NOT NULL,
  id_usuario INT NOT NULL UNIQUE,
  PRIMARY KEY (id_medico),
  UNIQUE (cmp),
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

CREATE TABLE centro_medico (
  id_centro_medico   INT           NOT NULL AUTO_INCREMENT,
  nmb_centro_medico  VARCHAR(150)  NOT NULL,
  direccion          VARCHAR(255)  NOT NULL,
  telefono           VARCHAR(20)   NOT NULL,
  std_centro         ENUM('ACTIVO','INACTIVO') NOT NULL,
  id_distrito        INT           NOT NULL,
  PRIMARY KEY (id_centro_medico),
  FOREIGN KEY (id_distrito) REFERENCES distrito(id_distrito)
);


CREATE TABLE especialidad (
  id_especialidad   INT          NOT NULL AUTO_INCREMENT,
  nmb_especialidad  VARCHAR(100) NOT NULL,
  dsc_especialidad  VARCHAR(255) NOT NULL,
  PRIMARY KEY (id_especialidad),
  UNIQUE (nmb_especialidad)
);

CREATE TABLE moneda (
  cod_moneda        VARCHAR(3)   NOT NULL,
  nmb_moneda        VARCHAR(50)  NOT NULL,
  conversion_a_soles DECIMAL(12,4) NOT NULL,
  PRIMARY KEY (cod_moneda)
);

CREATE TABLE tarifa (
  id_tarifa   INT           NOT NULL AUTO_INCREMENT,
  nmb_tarifa  VARCHAR(100)  NOT NULL,
  cantidad    DECIMAL(12,2) NOT NULL,
  cod_moneda  VARCHAR(3)    NOT NULL,
  PRIMARY KEY (id_tarifa),
  FOREIGN KEY (cod_moneda) REFERENCES moneda(cod_moneda)
);

CREATE TABLE medico_centro_especialidad (
  id_medico_centro_especialidad INT        NOT NULL AUTO_INCREMENT,
  esp_principal                 TINYINT(1) NOT NULL,
  vigente_desde                 DATE       NOT NULL,
  vigente_hasta                 DATE       NOT NULL,
  id_especialidad               INT        NOT NULL,
  id_centro_medico              INT        NOT NULL,
  id_medico                     INT        NOT NULL,
  id_tarifa                     INT        NOT NULL,
  PRIMARY KEY (id_medico_centro_especialidad),
  FOREIGN KEY (id_especialidad)  REFERENCES especialidad(id_especialidad),
  FOREIGN KEY (id_centro_medico) REFERENCES centro_medico(id_centro_medico),
  FOREIGN KEY (id_medico)        REFERENCES medico(id_medico),
  FOREIGN KEY (id_tarifa)        REFERENCES tarifa(id_tarifa)
);

-- Tablas "suple" solo para consulta: les doy PK compuesta, sin FK si insistes
CREATE TABLE suple_medico_especialidad (
  id_medico      INT NOT NULL,
  id_especialidad INT NOT NULL,
  PRIMARY KEY (id_medico, id_especialidad),
  FOREIGN KEY (id_medico)      REFERENCES medico(id_medico),
  FOREIGN KEY (id_especialidad) REFERENCES especialidad(id_especialidad)
);

CREATE TABLE suple_medico_centro (
  id_medico        INT NOT NULL,
  id_centro_medico INT NOT NULL,
  PRIMARY KEY (id_medico, id_centro_medico),
  FOREIGN KEY (id_medico)        REFERENCES medico(id_medico),
  FOREIGN KEY (id_centro_medico) REFERENCES centro_medico(id_centro_medico)
);


-- ================== AGENDA Y CITAS ==================

CREATE TABLE std_agenda (
  nmb_std_agenda VARCHAR(50)  NOT NULL,
  dsc_agenda     VARCHAR(255) NOT NULL,
  PRIMARY KEY (nmb_std_agenda)
);

CREATE TABLE tipo_agenda (
  nmb_tipo_agenda VARCHAR(50)  NOT NULL,
  dsc_tipo_agenda VARCHAR(255) NOT NULL,
  PRIMARY KEY (nmb_tipo_agenda)
);

CREATE TABLE agenda (
  id_agenda                 INT           NOT NULL AUTO_INCREMENT,
  fch_agenda                DATE          NOT NULL,
  hora_inicio               TIME          NOT NULL,
  hora_fin                  TIME          NOT NULL,
  observaciones             VARCHAR(255)  NOT NULL,
  fch_registro_agenda       DATETIME      NOT NULL,
  fch_actualizacion_agenda  DATETIME      NOT NULL,
  id_usuario_creador        INT           NOT NULL,
  id_usuario_actualizador   INT           NOT NULL,
  nmb_std_agenda            VARCHAR(50)   NOT NULL,
  id_medico_centro_especialidad INT      NOT NULL,
  nmb_tipo_agenda           VARCHAR(50)   NOT NULL,
  intervalo_min				INT NOT NULL DEFAULT 20,
  capacidad_slot			INT NOT NULL DEFAULT 1,  
  duracion_real_cita_min	INT NOT NULL DEFAULT 20,
  PRIMARY KEY (id_agenda),
  FOREIGN KEY (nmb_std_agenda)              REFERENCES std_agenda(nmb_std_agenda),
  FOREIGN KEY (id_medico_centro_especialidad) REFERENCES medico_centro_especialidad(id_medico_centro_especialidad),
  FOREIGN KEY (nmb_tipo_agenda)            REFERENCES tipo_agenda(nmb_tipo_agenda),
  FOREIGN KEY (id_usuario_creador)      REFERENCES usuario(id_usuario),
  FOREIGN KEY (id_usuario_actualizador) REFERENCES usuario(id_usuario)
);

CREATE TABLE agenda_slot (
  id_slot          INT NOT NULL AUTO_INCREMENT,
  id_agenda        INT NOT NULL,
  hora_inicio_slot TIME NOT NULL,
  hora_fin_slot    TIME NOT NULL,
  capacidad        INT NOT NULL DEFAULT 1,
  ocupados         INT NOT NULL DEFAULT 0,
  std_slot         ENUM('DISPONIBLE','OCUPADO','BLOQUEADO') NOT NULL DEFAULT 'DISPONIBLE',
  PRIMARY KEY (id_slot),
  UNIQUE KEY uk_agenda_hora (id_agenda, hora_inicio_slot),
  FOREIGN KEY (id_agenda) REFERENCES agenda(id_agenda)
);

CREATE TABLE std_cita (
  nmb_std_cita VARCHAR(50)  NOT NULL,
  dsc_std_cita VARCHAR(255) NOT NULL,
  PRIMARY KEY (nmb_std_cita)
);


CREATE TABLE citas (
  id_cita                  INT           NOT NULL AUTO_INCREMENT,
  hora_inicio_cita         TIME          NOT NULL,
  hora_fin_cita            TIME          NOT NULL,
  motivo                   VARCHAR(255)  NOT NULL,
  fch_registro_cita        DATETIME      NOT NULL,
  fch_actualizacion_cita  DATETIME      NOT NULL,
  id_usuario_creador       INT           NOT NULL,
  id_usuario_actualizador  INT           NOT NULL,
  id_paciente              INT           NOT NULL,
  id_agenda                INT           NOT NULL,
  nmb_std_cita             VARCHAR(50)   NOT NULL,
  id_slot				    INT NULL,
  PRIMARY KEY (id_cita),
  FOREIGN KEY (id_paciente)  REFERENCES paciente(id_paciente),
  FOREIGN KEY (id_agenda)    REFERENCES agenda(id_agenda),
  FOREIGN KEY (nmb_std_cita) REFERENCES std_cita(nmb_std_cita),
  FOREIGN KEY (id_usuario_creador)      REFERENCES usuario(id_usuario),
  FOREIGN KEY (id_usuario_actualizador) REFERENCES usuario(id_usuario),
  FOREIGN KEY (id_slot) REFERENCES agenda_slot(id_slot)
);

CREATE TABLE std_pago (
  std_pago      VARCHAR(30)  NOT NULL,
  dsc_std_pago  VARCHAR(100) NOT NULL,
  PRIMARY KEY (std_pago)
);

CREATE TABLE metodo_pago (
  id_metodo_pago   INT          NOT NULL AUTO_INCREMENT,
  nmb_metodo_pago  VARCHAR(50)  NOT NULL,
  PRIMARY KEY (id_metodo_pago)
);

CREATE TABLE pago (
  id_pago                 INT           NOT NULL AUTO_INCREMENT,
  id_cita                 INT           NOT NULL,
  monto_total             DECIMAL(12,2) NOT NULL,
  std_pago                VARCHAR(30)   NOT NULL,
  id_metodo_pago          INT           NOT NULL,
  referencia_externa      VARCHAR(100)  NULL,
  fch_registro_pago       DATETIME      NOT NULL,
  fch_actualizacion_pago  DATETIME      NOT NULL,
  id_usuario_registra     INT           NOT NULL,
  PRIMARY KEY (id_pago),
  FOREIGN KEY (id_cita)            REFERENCES citas(id_cita),
  FOREIGN KEY (std_pago)           REFERENCES std_pago(std_pago),
  FOREIGN KEY (id_metodo_pago)     REFERENCES metodo_pago(id_metodo_pago),
  FOREIGN KEY (id_usuario_registra) REFERENCES usuario(id_usuario)
);

CREATE TABLE factura (
  id_factura            INT           NOT NULL AUTO_INCREMENT,
  id_pago               INT           NOT NULL,
  tipo_comprobante      VARCHAR(10)   NOT NULL,   -- BOLETA, FACTURA
  serie                 VARCHAR(10)   NOT NULL,
  numero                VARCHAR(20)   NOT NULL,
  ruc_emisor            VARCHAR(11)   NOT NULL,
  ruc_dni_receptor      VARCHAR(15)   NOT NULL,
  razon_social_receptor VARCHAR(150)  NOT NULL,
  monto_total           DECIMAL(12,2) NOT NULL,
  fch_emision           DATETIME      NOT NULL,
  enlace_pdf            VARCHAR(255)  NULL,
  enlace_xml            VARCHAR(255)  NULL,
  PRIMARY KEY (id_factura),
  UNIQUE (tipo_comprobante, serie, numero),
  FOREIGN KEY (id_pago) REFERENCES pago(id_pago)
);


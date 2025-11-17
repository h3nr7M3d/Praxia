package com.praxia.api.controller;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.web.bind.annotation.*;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class RegistroController {

    private final JdbcTemplate jdbc;
    private static final String STD_ACTIVO = "ACTIVO";
    private static final String STD_INACTIVO = "INACTIVO";

    public RegistroController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @PostMapping("/registro")
    public ResponseEntity<?> registrar(@RequestBody Map<String, Object> body) {
        try {
            Map<?, ?> usuario = (Map<?, ?>) body.get("usuario");
            Map<?, ?> paciente = (Map<?, ?>) body.get("paciente");
            Map<?, ?> consentimiento = (Map<?, ?>) body.get("consentimiento");

            if (usuario == null || paciente == null) {
                return ResponseEntity.badRequest().body("Faltan datos de usuario o paciente");
            }

            int userId = insertarUsuario(usuario, STD_ACTIVO);
            insertarPaciente(userId, paciente);
            asignarRolPaciente(userId);
            registrarConsentimiento(userId, consentimiento);

            return ResponseEntity.ok(Map.of("success", true, "userId", userId));
        } catch (DataIntegrityViolationException dive) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Datos duplicados (correo/celular/documento)");
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Error en registro: " + ex.getMessage());
        }
    }

    @PostMapping("/registro/pre")
    public ResponseEntity<?> preRegistro(@RequestBody Map<String, Object> body) {
        try {
            Map<?, ?> usuario = (Map<?, ?>) body.get("usuario");
            if (usuario == null) return ResponseEntity.badRequest().body("Falta usuario");
            int userId = insertarUsuario(usuario, STD_INACTIVO);
            return ResponseEntity.ok(Map.of("success", true, "userId", userId));
        } catch (DataIntegrityViolationException dive) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Datos duplicados (correo/celular/documento)");
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Error en pre-registro: " + ex.getMessage());
        }
    }

    @PostMapping("/registro/completar")
    public ResponseEntity<?> completar(@RequestBody Map<String, Object> body) {
        try {
            Integer userId = body.get("userId") == null ? null : Integer.parseInt(String.valueOf(body.get("userId")));
            Map<?, ?> paciente = (Map<?, ?>) body.get("paciente");
            Map<?, ?> consentimiento = (Map<?, ?>) body.get("consentimiento");
            if (userId == null || paciente == null) return ResponseEntity.badRequest().body("Faltan userId o paciente");

            insertarPaciente(userId, paciente);
            asignarRolPaciente(userId);
            registrarConsentimiento(userId, consentimiento);
            jdbc.update("UPDATE usuario SET std_usuario=?, fch_actualizacion_usuario=NOW() WHERE id_usuario=?", STD_ACTIVO, userId);

            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Error al completar registro: " + ex.getMessage());
        }
    }

    private int insertarUsuario(Map<?, ?> datos, String estado) {
        String sql = """
                INSERT INTO usuario (nombre,apellido,sexo,nr_documento,fch_nacimiento,correo,telefono,
                contrasena_hash,fch_registro_usuario,fch_actualizacion_usuario,id_usuario_creador,id_usuario_actualizador,
                id_documento,std_usuario,id_pais)
                VALUES (?,?,?,?,?,?,?,?,NOW(),NOW(),NULL,NULL,?,?,?)
                """;
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, str(datos.get("nombre")));
            ps.setString(2, str(datos.get("apellido")));
            ps.setString(3, str(datos.get("sexo")));
            ps.setString(4, str(datos.get("nr_documento")));
            ps.setString(5, str(datos.get("fch_nacimiento")));
            setNullable(ps, 6, datos.get("correo"));
            setNullable(ps, 7, datos.get("telefono"));
            ps.setString(8, hashPassword(str(datos.get("contrasenia"))));
            ps.setInt(9, datos.get("id_documento") == null ? 1 : num(datos.get("id_documento")));
            ps.setString(10, estado);
            ps.setInt(11, datos.get("id_pais") == null ? 1 : num(datos.get("id_pais")));
            return ps;
        }, kh);

        Number id = kh.getKey();
        if (id == null) throw new IllegalStateException("No se pudo crear usuario");
        return id.intValue();
    }

    private void insertarPaciente(int userId, Map<?, ?> datos) {
        Integer distritoId = datos.get("id_distrito") == null ? null : num(datos.get("id_distrito"));
        if (distritoId == null || distritoId == 0) throw new IllegalArgumentException("Falta id_distrito");
        String tipoSeguro = str(datos.get("nmb_tipo_seguro"));
        if (tipoSeguro == null || tipoSeguro.isBlank()) throw new IllegalArgumentException("Falta tipo de seguro");
        String domicilio = str(datos.get("domicilio"));
        if (domicilio == null || domicilio.isBlank()) throw new IllegalArgumentException("Falta domicilio");
        String referencia = str(datos.get("ref_domicilio"));
        if (referencia == null || referencia.isBlank()) {
            referencia = "SIN REFERENCIA";
        }

        String sql = """
                INSERT INTO paciente (id_paciente,fch_registro_paciente,fch_actualizacion_paciente,
                id_usuario_creador,id_usuario_actualizador,domicilio,ref_domicilio,id_distrito,nmb_tipo_seguro)
                VALUES (?,NOW(),NOW(),?,?,?, ?,?,?)
                """;
        jdbc.update(sql,
                userId,
                userId,
                userId,
                domicilio.trim(),
                referencia.trim(),
                distritoId,
                tipoSeguro
        );
    }

    private void asignarRolPaciente(int userId) {
        Integer rolPaciente = jdbc.query(
                "SELECT id_rol FROM rol WHERE nmb_rol='PACIENTE' OR nmb_rol='paciente' LIMIT 1",
                rs -> rs.next() ? rs.getInt(1) : null
        );
        if (rolPaciente != null) {
            jdbc.update("INSERT IGNORE INTO usuario_rol (id_usuario,id_rol) VALUES (?,?)", userId, rolPaciente);
        }
    }

    private void registrarConsentimiento(int userId, Map<?, ?> data) {
        if (data == null) return;
        String finalidad = str(data.get("finalidad"));
        Boolean otorgado = bool(data.get("otorgado"));
        if (finalidad == null || otorgado == null) return;
        String estado = otorgado ? "SI" : "NO";
        String ip = data.containsKey("ip_remota") ? str(data.get("ip_remota")) : null;
        if (ip == null || ip.isBlank()) {
            ip = "127.0.0.1";
        }
        jdbc.update(
                "INSERT INTO consentimiento_tratamiento (id_usuario, finalidad, otorgado, fch_evento, ip_remota) VALUES (?,?,?,NOW(),?)",
                userId,
                finalidad,
                estado,
                ip
        );
    }

    private static String hashPassword(String plain) {
        if (plain == null) return null;
        return plain.startsWith("hash$") ? plain : ("hash$" + plain);
    }

    private static String str(Object o) { return o == null ? null : String.valueOf(o); }
    private static int num(Object o) { return o == null ? 0 : Integer.parseInt(String.valueOf(o)); }
    private static Boolean bool(Object o) { return o == null ? null : (o instanceof Boolean b ? b : Boolean.parseBoolean(String.valueOf(o))); }
    private static void setNullable(PreparedStatement ps, int idx, Object val) throws java.sql.SQLException {
        if (val == null || String.valueOf(val).isBlank()) ps.setNull(idx, java.sql.Types.VARCHAR);
        else ps.setString(idx, String.valueOf(val));
    }
}

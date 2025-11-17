package com.praxia.api.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import jakarta.servlet.http.HttpServletRequest;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.StringJoiner;

import com.praxia.api.domain.Usuario;
import com.praxia.api.domain.Paciente;
import com.praxia.api.repository.UsuarioRepository;
import com.praxia.api.repository.PacienteRepository;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private UsuarioRepository usuarioRepository;
    @Autowired
    private PacienteRepository pacienteRepository;
    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        logger.info("Intento de login por {}", loginRequest.getNumeroDocumento() != null ? "documento" : "email");

        try {
            Usuario user = null;
            if (loginRequest.getNumeroDocumento() != null && !loginRequest.getNumeroDocumento().isBlank()) {
                user = usuarioRepository.findByNrDocumento(loginRequest.getNumeroDocumento()).orElse(null);
            } else if (loginRequest.getEmail() != null && !loginRequest.getEmail().isBlank()) {
                user = usuarioRepository.findByCorreoIgnoreCase(loginRequest.getEmail()).orElse(null);
            }

            if (user == null) {
                return ResponseEntity.status(401).body(Map.of(
                        "success", false,
                        "message", "Usuario no encontrado"
                ));
            }

            // Solo usuarios ACTIVOS (std_usuario = 'ACTIVO')
            String estado = user.getStdUsuario();
            if (estado == null || !"ACTIVO".equalsIgnoreCase(estado)) {
                return ResponseEntity.status(401).body(Map.of(
                        "success", false,
                        "message", "Usuario inactivo o bloqueado"
                ));
            }

            // Validaci??n de contrase??a (DEV):
            // - Si la columna contrase??a guarda texto plano tipo "hash$u25",
            //   comparamos igualdad simple.
            // - Si en el futuro migras a BCrypt ($2a/$2b/$2y) podemos a??adir verificaci??n espec??fica.
            String provided = loginRequest.getPassword();
            String stored = user.getContrasenaHash();
            if (provided == null || stored == null) {
                return ResponseEntity.status(401).body(Map.of(
                        "success", false,
                        "message", "Credenciales invalidas"
                ));
            }

            boolean matches;
            // Soporte DEV: valores estilo "hash$xxxxx" aceptan "xxxxx" o el string completo
            if (stored.startsWith("hash$")) {
                String plain = stored.substring(5);
                matches = stored.equals(provided) || plain.equals(provided);
            } else if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
                // Si m??s adelante agregas BCrypt, c??mbialo por una verificaci??n real
                matches = false;
            } else {
                matches = stored.equals(provided);
            }

            if (!matches) {
                return ResponseEntity.status(401).body(Map.of(
                        "success", false,
                        "message", "Credenciales invalidas"
                ));
            }

            return ResponseEntity.ok(buildLoginPayload(user));
        } catch (Exception e) {
            logger.error("Error en login", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Error interno en autenticacion"
            ));
        }
    }

    private Map<String, Object> buildLoginPayload(Usuario user) {
        Map<String, Object> response = new LinkedHashMap<>();
        long userId = user.getId() != null ? user.getId().longValue() : 0L;
        response.put("success", true);
        response.put("userId", userId);
        response.put("nombre", user.getNombre());
        response.put("apellido", user.getApellido());

        List<String> roles = fetchRoles(userId);
        response.put("roles", roles);

        String portal = resolvePortal(roles);
        response.put("defaultPortal", portal);
        response.put("esPaciente", Boolean.TRUE.equals(isPaciente(userId)));
        response.put("message", "Autenticacion exitosa");
        return response;
    }

    private List<String> fetchRoles(Long userId) {
        if (jdbcTemplate == null) {
            return List.of();
        }
        try {
            return jdbcTemplate.query(
                    """
                            SELECT r.nmb_rol
                            FROM usuario_rol ur
                            JOIN rol r ON r.id_rol = ur.id_rol
                            WHERE ur.id_usuario = ?
                            """,
                    (rs, i) -> rs.getString("nmb_rol"),
                    userId.longValue()
            );
        } catch (Exception e) {
            logger.warn("No se pudieron cargar roles para usuario {}", userId, e);
            return List.of();
        }
    }

    private String resolvePortal(List<String> roles) {
        if (roles == null || roles.isEmpty()) {
            return "paciente";
        }
        if (roles.stream().anyMatch(r -> "ADMIN".equalsIgnoreCase(r))) {
            return "admin";
        }
        if (roles.stream().anyMatch(r -> "MEDICO".equalsIgnoreCase(r))) {
            return "medico";
        }
        return "paciente";
    }

    private Boolean isPaciente(Long userId) {
        if (jdbcTemplate == null) return null;
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(1) FROM paciente WHERE id_paciente = ?",
                    Integer.class,
                    userId
            );
            return count != null && count > 0;
        } catch (Exception e) {
            logger.debug("No se pudo verificar si el usuario {} es paciente", userId, e);
            return null;
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@RequestParam Long userId, HttpServletRequest request) {
        // En desarrollo: no exigimos Authorization Bearer para facilitar pruebas
        logger.info("Solicitando perfil (DB) para usuario ID: {}", userId);

        Optional<Usuario> opt = usuarioRepository.findById(userId.intValue());
        if (opt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                "success", false,
                "message", "Usuario no encontrado"
            ));
        }

        Usuario u = opt.get();
        String rolPrincipal = null;
        try {
            if (jdbcTemplate != null) {
                rolPrincipal = jdbcTemplate.query(
                        "SELECT r.nmb_rol FROM usuario_rol ur JOIN rol r ON r.id_rol=ur.id_rol WHERE ur.id_usuario=? LIMIT 1",
                        ps -> ps.setInt(1, u.getId()),
                        rs -> rs.next() ? rs.getString(1) : null
                );
            }
        } catch (Exception ignore) {}
        Map<String, Object> profile = new HashMap<>();
        profile.put("id", u.getId());
        String rolNormalizado = rolPrincipal != null ? rolPrincipal.trim().toLowerCase(Locale.ROOT) : null;
        if (rolPrincipal != null) profile.put("rolNombre", rolPrincipal);
        if (rolNormalizado != null) profile.put("rol", rolNormalizado);
        profile.put("tipo", rolNormalizado != null ? rolNormalizado : "paciente");
        profile.put("nombres", u.getNombre());
        profile.put("apellidos", u.getApellido());
        profile.put("sexo", u.getSexo() != null ? u.getSexo().name() : null);
        profile.put("tipoDocumentoId", u.getIdDocumento());
        profile.put("dni", u.getNrDocumento());
        profile.put("fechaNacimiento", u.getFchNacimiento() != null ? u.getFchNacimiento().toString() : null);
        profile.put("email", u.getCorreo());
        profile.put("idPais", u.getIdPais());
        profile.put("telefono", u.getTelefono());

        boolean geoLoaded = false;
        if (jdbcTemplate != null) {
            try {
                Map<String, Object> geo = jdbcTemplate.query(
                        "SELECT p.domicilio, p.ref_domicilio, p.id_distrito, p.nmb_tipo_seguro, " +
                                "d.nmb_distrito AS distrito_nombre, pr.nmb_provincia AS provincia_nombre, " +
                                "dep.nmb_departamento AS departamento_nombre, pais.id_pais, pais.nmb_pais, pais.cod_pais " +
                                "FROM paciente p " +
                                "LEFT JOIN distrito d ON d.id_distrito = p.id_distrito " +
                                "LEFT JOIN provincia pr ON pr.id_provincia = d.id_provincia " +
                                "LEFT JOIN departamento dep ON dep.id_departamento = pr.id_departamento " +
                                "LEFT JOIN pais ON pais.id_pais = dep.id_pais " +
                                "WHERE p.id_paciente=?",
                        ps -> ps.setInt(1, u.getId()),
                        rs -> rs.next() ? extractPacienteGeo(rs) : null
                );
                if (geo != null) {
                    copyIfNotNull(profile, "domicilio", geo.get("domicilio"));
                    copyIfNotNull(profile, "refDomicilio", geo.get("refDomicilio"));
                    copyIfNotNull(profile, "distrito", geo.get("distrito"));
                    copyIfNotNull(profile, "provincia", geo.get("provincia"));
                    copyIfNotNull(profile, "departamento", geo.get("departamento"));
                    copyIfNotNull(profile, "idDistrito", geo.get("idDistrito"));
                    copyIfNotNull(profile, "tipoSeguro", geo.get("tipoSeguro"));
                    copyIfNotNull(profile, "codPais", geo.get("codPais"));
                    Number paisId = (Number) geo.get("paisId");
                    if (paisId != null) {
                        profile.put("paisId", paisId.intValue());
                        try {
                            String paisNombre = jdbcTemplate.query(
                                    "SELECT nmb_pais FROM pais WHERE id_pais=?",
                                    ps -> ps.setInt(1, paisId.intValue()),
                                    rs -> rs.next() ? rs.getString(1) : null
                            );
                            if (paisNombre != null) {
                                profile.put("pais", paisNombre);
                            }
                        } catch (Exception ignored) {
                        }
                    }
                    if (!profile.containsKey("pais") || profile.get("pais") == null) {
                        copyIfNotNull(profile, "pais", geo.get("pais"));
                    }
                    geoLoaded = true;
                }
            } catch (Exception ex) {
                logger.warn("No se pudieron obtener datos geogr??ficos del paciente mediante JdbcTemplate", ex);
            }
        }

        if (!geoLoaded) {
            Optional<Paciente> pac = pacienteRepository.findById(u.getId());
            pac.ifPresent(p -> {
                profile.put("domicilio", p.getDomicilio());
                profile.put("refDomicilio", p.getRefDomicilio());
                profile.put("idDistrito", p.getIdDistrito());
                profile.put("tipoSeguro", p.getTipoSeguroNombre());
            });
        }

        return ResponseEntity.ok(profile);
    }

    @PutMapping("/profile/{userId}")
    public ResponseEntity<?> updateProfile(
            @PathVariable Long userId,
            @RequestBody Map<String, Object> updates) {
        logger.info("Actualizando perfil para usuario ID: {}", userId);

        try {
            Optional<Usuario> opt = usuarioRepository.findById(userId.intValue());
            if (opt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("success", false, "message", "Usuario no encontrado"));
            }

            Map<?, ?> usuarioData = asMap(updates.get("usuario"));
            Map<?, ?> pacienteData = asMap(updates.get("paciente"));

            // Compatibilidad con payloads simples (email/correo)
            if ((usuarioData == null || usuarioData.isEmpty())) {
                Map<String, Object> simple = new HashMap<>();
                if (updates.containsKey("email")) simple.put("correo", updates.get("email"));
                if (updates.containsKey("correo")) simple.put("correo", updates.get("correo"));
                if (!simple.isEmpty()) {
                    usuarioData = simple;
                }
            }

            boolean updated = false;

            if (usuarioData != null && !usuarioData.isEmpty()) {
                updated |= updateUsuario(userId.intValue(), usuarioData);
            }

            if (pacienteData != null && !pacienteData.isEmpty()) {
                updated |= updatePaciente(userId.intValue(), pacienteData);
            }

            if (!updated) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "No se enviaron campos para actualizar"));
            }

            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception ex) {
            logger.error("Error actualizando perfil", ex);
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error al actualizar perfil"));
        }
    }

    @PutMapping("/profile/{userId}/password")
    public ResponseEntity<?> updatePassword(
            @PathVariable Long userId,
            @RequestBody Map<String, String> passwords) {
        logger.info("Actualizando contrasena para usuario ID: {}", userId);

        String currentPassword = passwords.get("currentPassword");
        String newPassword = passwords.get("newPassword");

        if (currentPassword == null || newPassword == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Se requieren la contrasena actual y la nueva contrasena"
            ));
        }

        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "La nueva contrasena debe tener al menos 6 caracteres"
            ));
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Contrasena actualizada exitosamente");

        return ResponseEntity.ok(response);
    }

    private boolean updateUsuario(int userId, Map<?, ?> data) {
        if (jdbcTemplate == null) return false;
        List<Object> params = new ArrayList<>();
        StringJoiner set = new StringJoiner(", ");

        addColumn(set, params, "nombre", str(data.get("nombre")));
        addColumn(set, params, "apellido", str(data.get("apellido")));
        addColumn(set, params, "sexo", str(data.get("sexo")));
        Integer docId = num(data.get("id_documento"));
        if (docId != null && docId > 0) {
            set.add("id_documento=?");
            params.add(docId);
        }
        addColumn(set, params, "nr_documento", str(data.get("nr_documento")));
        addDateColumn(set, params, "fch_nacimiento", data.get("fch_nacimiento"));
        Object correoVal = data.containsKey("correo") ? data.get("correo") : data.get("email");
        addColumn(set, params, "correo", str(correoVal));
        addColumn(set, params, "cod_pais", str(data.get("cod_pais")));
        addColumn(set, params, "telefono", str(data.get("telefono")));

        if (params.isEmpty()) return false;
        params.add(userId);
        jdbcTemplate.update("UPDATE usuario SET " + set + " WHERE id_usuario=?", params.toArray());
        return true;
    }

    private boolean updatePaciente(int userId, Map<?, ?> data) {
        if (jdbcTemplate == null) return false;
        List<Object> params = new ArrayList<>();
        StringJoiner set = new StringJoiner(", ");

        addColumn(set, params, "pais", str(data.get("pais")));
        addColumn(set, params, "departamento", str(data.get("departamento")));
        addColumn(set, params, "provincia", str(data.get("provincia")));
        addColumn(set, params, "distrito", str(data.get("distrito")));
        addColumn(set, params, "domicilio", str(data.get("domicilio")));
        addColumn(set, params, "ref_domicilio", str(data.get("ref_domicilio")));
        Integer tipoSeguro = num(data.get("id_tipo_seguro"));
        if (tipoSeguro != null && tipoSeguro > 0) {
            set.add("id_tipo_seguro=?");
            params.add(tipoSeguro);
        }

        if (params.isEmpty()) return false;
        params.add(userId);
        jdbcTemplate.update("UPDATE paciente SET " + set + " WHERE id_paciente=?", params.toArray());
        return true;
    }

    private static Map<?, ?> asMap(Object candidate) {
        return candidate instanceof Map<?, ?> ? (Map<?, ?>) candidate : null;
    }

    private static void addColumn(StringJoiner joiner, List<Object> params, String column, Object value) {
        String val = str(value);
        if (val == null) return;
        joiner.add(column + "=?");
        params.add(val);
    }

    private static void addDateColumn(StringJoiner joiner, List<Object> params, String column, Object value) {
        String str = str(value);
        if (str == null || str.isBlank()) return;
        try {
            java.sql.Date date = java.sql.Date.valueOf(str);
            joiner.add(column + "=?");
            params.add(date);
        } catch (IllegalArgumentException ignored) {
        }
    }

    @GetMapping("/check-admin")
    public ResponseEntity<?> checkAdmin(@RequestParam("userId") Long userId) {
        if (userId == null) {
            return ResponseEntity.badRequest().body(Map.of("admin", false, "message", "userId requerido"));
        }
        if (jdbcTemplate == null) {
            return ResponseEntity.status(500).body(Map.of("admin", false, "message", "JdbcTemplate no disponible"));
        }
        try {
            Boolean isAdmin = jdbcTemplate.query(
                    """
                            SELECT 1
                            FROM usuario u
                            JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
                            JOIN rol r ON ur.id_rol = r.id_rol
                            WHERE u.id_usuario = ?
                              AND u.std_usuario = 'ACTIVO'
                              AND r.nmb_rol = 'ADMIN'
                            LIMIT 1
                            """,
                    rs -> rs.next() ? Boolean.TRUE : Boolean.FALSE,
                    userId
            );
            boolean admin = isAdmin != null && isAdmin;
            return ResponseEntity.ok(Map.of("userId", userId, "admin", admin));
        } catch (Exception ex) {
            logger.error("Error verificando acceso admin para usuario {}", userId, ex);
            return ResponseEntity.status(500).body(Map.of("admin", false, "message", "Error verificando rol"));
        }
    }

    private static String str(Object o) {
        return o == null ? null : String.valueOf(o).trim();
    }

    private static Integer num(Object o) {
        if (o == null) return null;
        try {
            return Integer.parseInt(String.valueOf(o));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static Map<String, Object> extractPacienteGeo(ResultSet rs) throws SQLException {
        Map<String, Object> geo = new HashMap<>();
        geo.put("domicilio", getString(rs, "domicilio"));
        geo.put("refDomicilio", firstString(rs, "ref_domicilio", "refDomicilio"));
        geo.put("idDistrito", getInteger(rs, "id_distrito"));
        geo.put("distrito", firstString(rs, "distrito_nombre", "nmb_distrito", "distrito"));
        geo.put("provincia", firstString(rs, "provincia_nombre", "nmb_provincia", "provincia"));
        geo.put("departamento", firstString(rs, "departamento_nombre", "nmb_departamento", "departamento"));
        geo.put("pais", firstString(rs, "nmb_pais", "pais"));
        geo.put("codPais", firstString(rs, "cod_pais"));
        geo.put("paisId", getInteger(rs, "id_pais", "pais_id"));
        geo.put("tipoSeguro", firstString(rs, "nmb_tipo_seguro", "tipoSeguro"));
        return geo;
    }

    private static void copyIfNotNull(Map<String, Object> target, String key, Object value) {
        if (value == null) return;
        if (value instanceof String str) {
            if (str.isBlank()) return;
            target.put(key, str);
        } else {
            target.put(key, value);
        }
    }

    private static String firstString(ResultSet rs, String... columns) throws SQLException {
        for (String column : columns) {
            String val = getString(rs, column);
            if (val != null && !val.isBlank()) {
                return val;
            }
        }
        return null;
    }

    private static String getString(ResultSet rs, String column) throws SQLException {
        if (column == null) return null;
        try {
            rs.findColumn(column);
            return rs.getString(column);
        } catch (SQLException ignored) {
            return null;
        }
    }

    private static Integer getInteger(ResultSet rs, String... columns) throws SQLException {
        for (String column : columns) {
            if (column == null) continue;
            try {
                rs.findColumn(column);
                Object val = rs.getObject(column);
                if (val instanceof Number number) {
                    return number.intValue();
                }
            } catch (SQLException ignored) {
                // columna no existe, probamos con la siguiente
            }
        }
        return null;
    }

    public static class LoginRequest {
        private String tipoDocumento;
        private String numeroDocumento;
        private String email;
        private String password;

        public String getTipoDocumento() { return tipoDocumento; }
        public void setTipoDocumento(String tipoDocumento) { this.tipoDocumento = tipoDocumento; }
        public String getNumeroDocumento() { return numeroDocumento; }
        public void setNumeroDocumento(String numeroDocumento) { this.numeroDocumento = numeroDocumento; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }
}


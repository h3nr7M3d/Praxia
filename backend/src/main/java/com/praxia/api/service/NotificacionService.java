package com.praxia.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;

@Service
public class NotificacionService {
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper mapper = new ObjectMapper();

    public NotificacionService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void enqueueReserva(long idCita) {
        String sql = "INSERT IGNORE INTO notificacion\n" +
                "(id_usuario, id_canal, id_plantilla, id_cita, id_agenda, correlacion, datos, programada_para)\n" +
                "SELECT\n" +
                "  c.creado_por,\n" +
                "  1,\n" +
                "  (SELECT id_plantilla FROM plantilla_notificacion WHERE cod='CITA_RESERVADA'),\n" +
                "  c.id_cita, c.id_agenda,\n" +
                "  CONCAT('RESERVA_', c.id_cita),\n" +
                "  JSON_OBJECT(\n" +
                "    'nombre', CONCAT(u.nombre,' ',u.apellido),\n" +
                "    'medico', CONCAT(um.nombre,' ',um.apellido),\n" +
                "    'especialidad', e.nmb_especialidad,\n" +
                "    'fecha_hora', DATE_FORMAT(c.slot_inicio,'%d/%m/%Y %H:%i'),\n" +
                "    'centro', COALESCE(cm.nmb_centro_medico,'Centro Virtual'),\n" +
                "    'modalidad', c.modalidad,\n" +
                "    'id_cita', c.id_cita\n" +
                "  ),\n" +
                "  NOW()\n" +
                "FROM cita c\n" +
                "JOIN usuario u  ON u.id_usuario = c.creado_por\n" +
                "JOIN usuario um ON um.id_usuario = c.id_medico\n" +
                "LEFT JOIN especialidad e   ON e.id_especialidad = c.id_especialidad\n" +
                "LEFT JOIN centro_medico cm ON cm.id_centro_medico = c.id_medico_centro\n" +
                "LEFT JOIN notificacion n0  ON n0.id_cita=c.id_cita AND n0.correlacion=CONCAT('RESERVA_',c.id_cita)\n" +
                "WHERE c.id_cita = ? AND n0.id_notif IS NULL";
        jdbcTemplate.update(sql, idCita);
    }

    public void enqueueCambioEstado(long idCita) {
        String sql = "INSERT IGNORE INTO notificacion\n" +
                "(id_usuario,id_canal,id_plantilla,id_cita,id_agenda,correlacion,datos,programada_para)\n" +
                "SELECT\n" +
                "  c.creado_por, 1,\n" +
                "  (SELECT id_plantilla FROM plantilla_notificacion WHERE cod='CITA_ESTADO'),\n" +
                "  c.id_cita, c.id_agenda,\n" +
                "  CONCAT('ESTADO_',c.id_cita,'_',c.estado_cita),\n" +
                "  JSON_OBJECT(\n" +
                "    'nombre', CONCAT(u.nombre,' ',u.apellido),\n" +
                "    'estado', c.estado_cita,\n" +
                "    'id_cita', c.id_cita\n" +
                "  ),\n" +
                "  NOW()\n" +
                "FROM cita c\n" +
                "JOIN usuario u ON u.id_usuario = c.creado_por\n" +
                "LEFT JOIN notificacion n0 \n" +
                "  ON n0.id_cita=c.id_cita \n" +
                " AND n0.correlacion=CONCAT('ESTADO_',c.id_cita,'_',c.estado_cita)\n" +
                "WHERE c.id_cita=? AND n0.id_notif IS NULL";
        jdbcTemplate.update(sql, idCita);
    }

    public void enqueueVerificacion(long idVerificacion) {
        String sql = "INSERT IGNORE INTO notificacion\n" +
                "(id_usuario,id_canal,id_plantilla,correlacion,datos,programada_para)\n" +
                "SELECT\n" +
                "  v.id_usuario,\n" +
                "  CASE WHEN v.canal='email' THEN 1 ELSE 2 END,\n" +
                "  (SELECT id_plantilla FROM plantilla_notificacion WHERE cod='VERIF_CONTACTO'),\n" +
                "  CONCAT('VERIF_',v.id_verificacion),\n" +
                "  JSON_OBJECT(\n" +
                "    'codigo', v.codigo,\n" +
                "    'expira', DATE_FORMAT(v.fch_expira,'%d/%m/%Y %H:%i')\n" +
                "  ),\n" +
                "  NOW()\n" +
                "FROM verificacion_contacto v\n" +
                "LEFT JOIN notificacion n0 ON n0.correlacion=CONCAT('VERIF_',v.id_verificacion)\n" +
                "WHERE v.id_verificacion = ? AND n0.id_notif IS NULL";
        jdbcTemplate.update(sql, idVerificacion);
    }

    // Corre cada 5 minutos y encola recordatorios 24h y 1h para citas futuras
    @Scheduled(fixedDelay = 5 * 60 * 1000L, initialDelay = 60 * 1000L)
    public void enqueueRemindersJob() {
        enqueueReminder("REMINDER_24H", "REM24_", "24 HOUR");
        enqueueReminder("REMINDER_1H", "REM1H_", "1 HOUR");
    }

    void enqueueReminder(String plantillaCod, String prefix, String intervalExpr) {
        String sql = "INSERT IGNORE INTO notificacion\n" +
                "(id_usuario,id_canal,id_plantilla,id_cita,id_agenda,correlacion,datos,programada_para)\n" +
                "SELECT\n" +
                "  c.creado_por, 1,\n" +
                "  (SELECT id_plantilla FROM plantilla_notificacion WHERE cod=?),\n" +
                "  c.id_cita, c.id_agenda,\n" +
                "  CONCAT(?,c.id_cita),\n" +
                "  JSON_OBJECT(\n" +
                "    'nombre', CONCAT(u.nombre,' ',u.apellido),\n" +
                "    'medico', CONCAT(um.nombre,' ',um.apellido),\n" +
                "    'especialidad', e.nmb_especialidad,\n" +
                "    'fecha_hora', DATE_FORMAT(c.slot_inicio,'%d/%m/%Y %H:%i'),\n" +
                "    'id_cita', c.id_cita\n" +
                "  ),\n" +
                "  DATE_SUB(c.slot_inicio, INTERVAL " + intervalExpr + ")\n" +
                "FROM cita c\n" +
                "JOIN usuario u  ON u.id_usuario = c.creado_por\n" +
                "JOIN usuario um ON um.id_usuario = c.id_medico\n" +
                "LEFT JOIN especialidad e ON e.id_especialidad = c.id_especialidad\n" +
                "LEFT JOIN notificacion n0 ON n0.id_cita=c.id_cita AND n0.correlacion=CONCAT(?,c.id_cita)\n" +
                "WHERE c.estado_cita IN ('reservada','confirmada')\n" +
                "  AND c.slot_inicio > NOW()\n" +
                "  AND n0.id_notif IS NULL";
        jdbcTemplate.update(sql, plantillaCod, prefix, prefix);
    }

    public List<Map<String,Object>> fetchEligiblePending(int limit) {
        String sql = "SELECT n.*, pn.cod AS plantilla_cod, pn.asunto, pn.cuerpo\n" +
                "FROM notificacion n\n" +
                "JOIN usuario_preferencia_notif p ON p.id_usuario=n.id_usuario AND p.id_canal=n.id_canal\n" +
                "JOIN plantilla_notificacion pn ON pn.id_plantilla=n.id_plantilla\n" +
                "WHERE n.estado='pendiente' AND n.programada_para <= NOW()\n" +
                "  AND p.habilitado=1 AND p.verificado=1\n" +
                "ORDER BY n.programada_para\n" +
                "LIMIT ?";
        return jdbcTemplate.query(sql, (rs, rowNum) -> mapNotif(rs), limit);
    }

    public void markSent(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) return;
        String in = String.join(",", Collections.nCopies(ids.size(), "?"));
        String sql = "UPDATE notificacion SET estado='enviado', enviado_en=NOW(), intentos=intentos+1 WHERE id_notif IN ("+in+")";
        jdbcTemplate.update(con -> {
            var ps = con.prepareStatement(sql);
            int i=1; for (Long id: ids) ps.setLong(i++, id);
            return ps;
        });
    }

    public void markFail(long id, String error) {
        String sql = "UPDATE notificacion SET estado=IF(intentos>=3,'fallo','pendiente'), intentos=intentos+1, error_msg=LEFT(CONCAT('ERR: ', ?),300) WHERE id_notif=?";
        jdbcTemplate.update(sql, error, id);
    }

    public List<Map<String,Object>> listByUser(long userId, int limit) {
        String sql = "SELECT n.*, pn.cod AS plantilla_cod, pn.asunto, pn.cuerpo\n" +
                "FROM notificacion n\n" +
                "JOIN plantilla_notificacion pn ON pn.id_plantilla=n.id_plantilla\n" +
                "WHERE n.id_usuario=?\n" +
                "ORDER BY n.created_at DESC\n" +
                "LIMIT ?";
        return jdbcTemplate.query(sql, (rs, rowNum) -> mapNotif(rs), userId, limit);
    }

    private Map<String, Object> mapNotif(ResultSet rs) throws SQLException {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id_notif", rs.getLong("id_notif"));
        m.put("id_usuario", rs.getInt("id_usuario"));
        m.put("id_canal", rs.getInt("id_canal"));
        m.put("id_plantilla", rs.getInt("id_plantilla"));
        m.put("id_cita", rs.getObject("id_cita"));
        m.put("id_agenda", rs.getObject("id_agenda"));
        m.put("correlacion", rs.getString("correlacion"));
        m.put("programada_para", String.valueOf(rs.getTimestamp("programada_para").toInstant()));
        m.put("estado", rs.getString("estado"));
        m.put("intentos", rs.getInt("intentos"));
        m.put("enviado_en", rs.getTimestamp("enviado_en") != null ? String.valueOf(rs.getTimestamp("enviado_en").toInstant()) : null);
        m.put("error_msg", rs.getString("error_msg"));
        m.put("plantilla_cod", rs.getString("plantilla_cod"));
        String asunto = rs.getString("asunto");
        String cuerpo = rs.getString("cuerpo");
        String datosJson = rs.getString("datos");
        m.put("datos", datosJson);
        Map<String,String> rendered = render(asunto, cuerpo, datosJson);
        m.putAll(rendered);
        return m;
    }

    private Map<String,String> render(String asunto, String cuerpo, String datosJson) {
        Map<String,String> out = new HashMap<>();
        try {
            JsonNode root = mapper.readTree(datosJson == null ? "{}" : datosJson);
            String subj = replacePlaceholders(Objects.toString(asunto, ""), root);
            String body = replacePlaceholders(Objects.toString(cuerpo, ""), root);
            out.put("asunto_render", subj);
            out.put("cuerpo_render", body);
        } catch (Exception e) {
            out.put("asunto_render", Objects.toString(asunto, ""));
            out.put("cuerpo_render", Objects.toString(cuerpo, ""));
        }
        return out;
    }

    private String replacePlaceholders(String text, JsonNode data) {
        if (text == null) return "";
        String res = text;
        // Busca patrones {{clave}}
        int guard = 0;
        while (true && guard++ < 100) {
            int i = res.indexOf("{{");
            if (i < 0) break;
            int j = res.indexOf("}}", i+2);
            if (j < 0) break;
            String key = res.substring(i+2, j).trim();
            String val = Optional.ofNullable(data.get(key)).map(JsonNode::asText).orElse("");
            res = res.substring(0, i) + val + res.substring(j+2);
        }
        return res;
    }
}

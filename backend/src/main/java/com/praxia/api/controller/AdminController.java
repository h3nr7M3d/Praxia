package com.praxia.api.controller;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Time;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
public class AdminController {

    private final JdbcTemplate jdbcTemplate;

    public AdminController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // ---- DASHBOARD ----

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard(@RequestParam(name = "fecha", required = false)
                                       @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        LocalDate targetDate = fecha != null ? fecha : LocalDate.now();
        LocalDate previousDate = targetDate.minusDays(1);

        Map<String, Object> response = new HashMap<>();
        response.put("fecha", targetDate.toString());
        response.put("resumen", buildResumen(targetDate, previousDate));
        response.put("ocupacion", buildOcupacion(targetDate));
        response.put("alertas", buildAlertas());
        response.put("agendaDestacada", buildAgendaDestacada(targetDate));
        response.put("citasHoy", listarCitas(targetDate, targetDate, null, null, null, null, null));
        response.put("bitacora", listarBitacora());
        return ResponseEntity.ok(response);
    }

    private Map<String, Object> buildResumen(LocalDate fecha, LocalDate fechaAnterior) {
        Map<String, Object> resumen = new HashMap<>();
        resumen.put("citasHoy", queryForInt(
                "SELECT COUNT(*) FROM cita c JOIN agenda a ON a.id_agenda=c.id_agenda WHERE DATE(c.slot_inicio)=?",
                Date.valueOf(fecha)));
        resumen.put("citasAyer", queryForInt(
                "SELECT COUNT(*) FROM cita c JOIN agenda a ON a.id_agenda=c.id_agenda WHERE DATE(c.slot_inicio)=?",
                Date.valueOf(fechaAnterior)));
        resumen.put("noAsistioHoy", queryForInt(
                "SELECT COUNT(*) FROM cita c JOIN agenda a ON a.id_agenda=c.id_agenda WHERE DATE(c.slot_inicio)=? AND c.estado_cita='NO_ASISTIO'",
                Date.valueOf(fecha)));
        resumen.put("noAsistioAyer", queryForInt(
                "SELECT COUNT(*) FROM cita c JOIN agenda a ON a.id_agenda=c.id_agenda WHERE DATE(c.slot_inicio)=? AND c.estado_cita='NO_ASISTIO'",
                Date.valueOf(fechaAnterior)));
        return resumen;
    }

    private Map<String, Object> buildOcupacion(LocalDate fecha) {
        return jdbcTemplate.query(
                """
                        SELECT
                            COUNT(s.id_slot) AS total_slots,
                            SUM(CASE WHEN s.std_slot = 'OCUPADO' THEN 1 ELSE 0 END) AS ocupados,
                            COUNT(DISTINCT m.id_medico) AS medicos
                        FROM agenda a
                        JOIN agenda_slot s ON s.id_agenda = a.id_agenda
                        JOIN medico_centro_especialidad mce ON mce.id_medico_centro_especialidad = a.id_medico_centro_especialidad
                        JOIN medico m ON m.id_medico = mce.id_medico
                        WHERE a.fch_agenda = ?
                          AND a.nmb_std_agenda = 'ACTIVA'
                        """,
                ps -> ps.setDate(1, Date.valueOf(fecha)),
                rs -> {
                    Map<String, Object> map = new HashMap<>();
                    if (rs.next()) {
                        map.put("slotsTotales", rs.getInt("total_slots"));
                        map.put("slotsOcupados", rs.getInt("ocupados"));
                        map.put("medicosActivos", rs.getInt("medicos"));
                    } else {
                        map.put("slotsTotales", 0);
                        map.put("slotsOcupados", 0);
                        map.put("medicosActivos", 0);
                    }
                    return map;
                }
        );
    }

    private Map<String, Object> buildAlertas() {
        Map<String, Object> alertas = new HashMap<>();
        int consentPendientes = queryForInt(
                """
                        SELECT COUNT(*)
                        FROM paciente p
                        LEFT JOIN consentimiento_tratamiento c ON c.id_usuario = p.id_paciente
                        WHERE c.id_consentimiento IS NULL OR c.otorgado <> 'SI'
                        """
        );
        alertas.put("consentimientosPendientes", consentPendientes);
        List<String> notificaciones = jdbcTemplate.query(
                "SELECT CONCAT(tipo_evento, ': ', resumen) AS texto FROM bitacora_evento ORDER BY fch_evento DESC LIMIT 3",
                (rs, i) -> rs.getString("texto")
        );
        alertas.put("notificaciones", notificaciones);
        return alertas;
    }

    private Map<String, Object> buildAgendaDestacada(LocalDate fecha) {
        return jdbcTemplate.query(
                """
                        SELECT
                            a.id_agenda,
                            a.hora_inicio,
                            a.hora_fin,
                            u.nombre AS nombre_medico,
                            u.apellido AS apellido_medico,
                            cm.nmb_centro_medico,
                            COUNT(s.id_slot) AS slots_totales,
                            SUM(CASE WHEN s.std_slot = 'OCUPADO' THEN 1 ELSE 0 END) AS slots_reservados
                        FROM agenda a
                        JOIN medico_centro_especialidad mce ON mce.id_medico_centro_especialidad = a.id_medico_centro_especialidad
                        JOIN medico m ON m.id_medico = mce.id_medico
                        JOIN usuario u ON u.id_usuario = m.id_usuario
                        JOIN centro_medico cm ON cm.id_centro_medico = mce.id_centro_medico
                        LEFT JOIN agenda_slot s ON s.id_agenda = a.id_agenda
                        WHERE a.fch_agenda = ?
                          AND a.nmb_std_agenda = 'ACTIVA'
                        GROUP BY a.id_agenda
                        ORDER BY a.hora_inicio
                        LIMIT 1
                        """,
                ps -> ps.setDate(1, Date.valueOf(fecha)),
                rs -> {
                    if (!rs.next()) return null;
                    Map<String, Object> map = new HashMap<>();
                    map.put("idAgenda", rs.getInt("id_agenda"));
                    map.put("medico", rs.getString("nombre_medico") + " " + rs.getString("apellido_medico"));
                    map.put("centro", rs.getString("nmb_centro_medico"));
                    map.put("horaInicio", formatTime(rs.getTime("hora_inicio")));
                    map.put("horaFin", formatTime(rs.getTime("hora_fin")));
                    map.put("slotsTotales", rs.getInt("slots_totales"));
                    map.put("slotsReservados", rs.getInt("slots_reservados"));
                    return map;
                }
        );
    }

    private List<Map<String, Object>> listarBitacora() {
        return jdbcTemplate.query(
                "SELECT tipo_evento, resumen, fch_evento FROM bitacora_evento ORDER BY fch_evento DESC LIMIT 5",
                (rs, i) -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("tipo", rs.getString("tipo_evento"));
                    map.put("resumen", rs.getString("resumen"));
                    map.put("fecha", rs.getTimestamp("fch_evento").toString());
                    return map;
                }
        );
    }

    // ---- CITAS ----

    @GetMapping("/citas")
    public ResponseEntity<?> buscarCitas(
            @RequestParam(name = "desde", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(name = "hasta", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(name = "paciente", required = false) String paciente,
            @RequestParam(name = "centroId", required = false) Integer centroId,
            @RequestParam(name = "medicoId", required = false) Integer medicoId,
            @RequestParam(name = "estado", required = false) String estado,
            @RequestParam(name = "modalidad", required = false) String modalidad
    ) {
        List<Map<String, Object>> data = listarCitas(desde, hasta, paciente, centroId, medicoId, estado, modalidad);
        return ResponseEntity.ok(data);
    }

    private List<Map<String, Object>> listarCitas(LocalDate desde, LocalDate hasta, String paciente,
                                                  Integer centroId, Integer medicoId, String estado, String modalidad) {
        StringBuilder sql = new StringBuilder(
                """
                        SELECT
                            c.id_cita,
                            a.fch_agenda AS fecha,
                            c.hora_inicio_cita,
                            c.hora_fin_cita,
                            CONCAT(up.nombre,' ',up.apellido) AS paciente,
                            CONCAT(um.nombre,' ',um.apellido) AS medico,
                            e.nmb_especialidad,
                            cm.nmb_centro_medico,
                            c.nmb_std_cita,
                            c.modalidad
                        FROM citas c
                        JOIN agenda a ON a.id_agenda = c.id_agenda
                        JOIN paciente p ON p.id_paciente = c.id_paciente
                        JOIN usuario up ON up.id_usuario = p.id_paciente
                        JOIN medico_centro_especialidad mce ON mce.id_medico_centro_especialidad = a.id_medico_centro_especialidad
                        JOIN medico m ON m.id_medico = mce.id_medico
                        JOIN usuario um ON um.id_usuario = m.id_usuario
                        JOIN especialidad e ON e.id_especialidad = mce.id_especialidad
                        JOIN centro_medico cm ON cm.id_centro_medico = mce.id_centro_medico
                        WHERE 1=1
                        """
        );
        List<Object> params = new ArrayList<>();
        if (desde != null) {
            sql.append(" AND a.fch_agenda >= ?");
            params.add(Date.valueOf(desde));
        }
        if (hasta != null) {
            sql.append(" AND a.fch_agenda <= ?");
            params.add(Date.valueOf(hasta));
        }
        if (paciente != null && !paciente.isBlank()) {
            sql.append(" AND (up.nombre LIKE ? OR up.apellido LIKE ? OR up.nr_documento LIKE ?)");
            String like = "%" + paciente.trim() + "%";
            params.add(like);
            params.add(like);
            params.add(like);
        }
        if (centroId != null) {
            sql.append(" AND cm.id_centro_medico = ?");
            params.add(centroId);
        }
        if (medicoId != null) {
            sql.append(" AND m.id_medico = ?");
            params.add(medicoId);
        }
        if (estado != null && !estado.isBlank()) {
            sql.append(" AND c.nmb_std_cita = ?");
            params.add(estado);
        }
        if (modalidad != null && !modalidad.isBlank()) {
            sql.append(" AND c.modalidad = ?");
            params.add(modalidad);
        }
        sql.append(" ORDER BY a.fch_agenda, c.hora_inicio_cita");
        return jdbcTemplate.query(sql.toString(), (rs, i) -> mapCitaRow(rs), params.toArray());
    }

    private Map<String, Object> mapCitaRow(ResultSet rs) throws SQLException {
        Map<String, Object> row = new HashMap<>();
        row.put("id", rs.getLong("id_cita"));
        Date fecha = rs.getDate("fecha");
        row.put("fecha", fecha != null ? fecha.toString() : null);
        Time horaInicio = rs.getTime("hora_inicio_cita");
        Time horaFin = rs.getTime("hora_fin_cita");
        row.put("hora", formatRange(horaInicio, horaFin));
        row.put("paciente", rs.getString("paciente"));
        row.put("medico", rs.getString("medico"));
        row.put("especialidad", rs.getString("nmb_especialidad"));
        row.put("centro", rs.getString("nmb_centro_medico"));
        row.put("estado", rs.getString("nmb_std_cita"));
        row.put("modalidad", rs.getString("modalidad"));
        return row;
    }

    private String formatRange(Time inicio, Time fin) {
        return formatTime(inicio) + " - " + formatTime(fin);
    }

    private String formatTime(Time time) {
        if (time == null) return "";
        String t = time.toString();
        return t.length() >= 5 ? t.substring(0,5) : t;
    }

    // ---- AGENDA ----

    @GetMapping("/agendas")
    public ResponseEntity<?> listarAgendas(
            @RequestParam(name = "medicoId", required = false) Integer medicoId,
            @RequestParam(name = "centroId", required = false) Integer centroId,
            @RequestParam(name = "desde", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(name = "hasta", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta
    ) {
        StringBuilder sql = new StringBuilder(
                """
                        SELECT
                            a.id_agenda,
                            a.fch_agenda,
                            a.hora_inicio,
                            a.hora_fin,
                            a.nmb_tipo_agenda,
                            a.nmb_std_agenda,
                            COUNT(s.id_slot) AS slots_totales,
                            SUM(CASE WHEN s.std_slot = 'OCUPADO' THEN 1 ELSE 0 END) AS slots_ocupados
                        FROM agenda a
                        JOIN medico_centro_especialidad mce ON mce.id_medico_centro_especialidad = a.id_medico_centro_especialidad
                        JOIN medico m ON m.id_medico = mce.id_medico
                        JOIN centro_medico cm ON cm.id_centro_medico = mce.id_centro_medico
                        LEFT JOIN agenda_slot s ON s.id_agenda = a.id_agenda
                        WHERE 1=1
                        """
        );
        List<Object> params = new ArrayList<>();
        if (medicoId != null) {
            sql.append(" AND m.id_medico = ?");
            params.add(medicoId);
        }
        if (centroId != null) {
            sql.append(" AND cm.id_centro_medico = ?");
            params.add(centroId);
        }
        if (desde != null) {
            sql.append(" AND a.fch_agenda >= ?");
            params.add(Date.valueOf(desde));
        }
        if (hasta != null) {
            sql.append(" AND a.fch_agenda <= ?");
            params.add(Date.valueOf(hasta));
        }
        sql.append(" GROUP BY a.id_agenda ORDER BY a.fch_agenda, a.hora_inicio");
        List<Map<String, Object>> items = jdbcTemplate.query(sql.toString(), (rs, i) -> {
            Map<String, Object> row = new HashMap<>();
            row.put("idAgenda", rs.getInt("id_agenda"));
            Date fecha = rs.getDate("fch_agenda");
            row.put("fecha", fecha != null ? fecha.toString() : null);
            row.put("horaInicio", formatTime(rs.getTime("hora_inicio")));
            row.put("horaFin", formatTime(rs.getTime("hora_fin")));
            row.put("tipo", rs.getString("nmb_tipo_agenda"));
            row.put("estado", rs.getString("nmb_std_agenda"));
            row.put("slotsTotales", rs.getInt("slots_totales"));
            row.put("slotsOcupados", rs.getInt("slots_ocupados"));
            return row;
        }, params.toArray());
        return ResponseEntity.ok(items);
    }

    // ---- USUARIOS / MEDICOS / CENTROS ----

    @GetMapping("/usuarios")
    public ResponseEntity<?> listarUsuarios() {
        List<Map<String, Object>> data = jdbcTemplate.query(
                """
                        SELECT
                            u.id_usuario,
                            CONCAT(u.nombre,' ',u.apellido) AS nombre,
                            CONCAT(d.nmb_documento, ' ', u.nr_documento) AS documento,
                            u.std_usuario,
                            GROUP_CONCAT(r.nmb_rol ORDER BY r.nmb_rol) AS roles
                        FROM usuario u
                        JOIN documento d ON d.id_documento = u.id_documento
                        LEFT JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
                        LEFT JOIN rol r ON r.id_rol = ur.id_rol
                        GROUP BY u.id_usuario
                        """,
                (rs, i) -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("id", rs.getInt("id_usuario"));
                    row.put("nombre", rs.getString("nombre"));
                    row.put("documento", rs.getString("documento"));
                    row.put("estado", rs.getString("std_usuario"));
                    String roles = rs.getString("roles");
                    row.put("roles", roles != null ? roles.split(",") : new String[0]);
                    return row;
                }
        );
        return ResponseEntity.ok(data);
    }

    @GetMapping("/medicos")
    public ResponseEntity<?> listarMedicos() {
        List<Map<String, Object>> data = jdbcTemplate.query(
                """
                        SELECT m.id_medico,
                               CONCAT(u.nombre,' ',u.apellido) AS nombre,
                               m.cmp,
                               m.dsc_perfil,
                               m.std_medico
                        FROM medico m
                        JOIN usuario u ON u.id_usuario = m.id_usuario
                        """,
                (rs, i) -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("id", rs.getInt("id_medico"));
                    row.put("nombre", rs.getString("nombre"));
                    row.put("cmp", rs.getString("cmp"));
                    row.put("perfil", rs.getString("dsc_perfil"));
                    row.put("estado", rs.getString("std_medico"));
                    return row;
                }
        );
        return ResponseEntity.ok(data);
    }

    @GetMapping("/centros")
    public ResponseEntity<?> listarCentros() {
        List<Map<String, Object>> data = jdbcTemplate.query(
                """
                        SELECT
                            cm.id_centro_medico,
                            cm.nmb_centro_medico,
                            d.nmb_distrito,
                            p.nmb_provincia,
                            dep.nmb_departamento,
                            cm.std_centro
                        FROM centro_medico cm
                        JOIN distrito d ON d.id_distrito = cm.id_distrito
                        JOIN provincia p ON p.id_provincia = d.id_provincia
                        JOIN departamento dep ON dep.id_departamento = p.id_departamento
                        """,
                (rs, i) -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("id", rs.getInt("id_centro_medico"));
                    row.put("nombre", rs.getString("nmb_centro_medico"));
                    row.put("distrito", rs.getString("nmb_distrito"));
                    row.put("provincia", rs.getString("nmb_provincia"));
                    row.put("departamento", rs.getString("nmb_departamento"));
                    row.put("estado", rs.getString("std_centro"));
                    return row;
                }
        );
        return ResponseEntity.ok(data);
    }

    @GetMapping("/catalogos/resumen")
    public ResponseEntity<?> catalogosResumen() {
        Map<String, Object> result = new HashMap<>();
        result.put("documentos", jdbcTemplate.query("SELECT nmb_documento FROM documento ORDER BY id_documento", (rs, i) -> rs.getString(1)));
        result.put("estadoUsuario", jdbcTemplate.query("SELECT std_usuario FROM std_usuario ORDER BY std_usuario", (rs, i) -> rs.getString(1)));
        result.put("parentesco", jdbcTemplate.query("SELECT nmb_parentesco FROM parentesco ORDER BY nmb_parentesco", (rs, i) -> rs.getString(1)));
        result.put("monedas", jdbcTemplate.query("SELECT CONCAT(cod_moneda,' - ',nmb_moneda) FROM moneda ORDER BY cod_moneda", (rs, i) -> rs.getString(1)));
        result.put("especialidades", jdbcTemplate.query("SELECT nmb_especialidad FROM especialidad ORDER BY nmb_especialidad", (rs, i) -> rs.getString(1)));
        result.put("estadosCita", jdbcTemplate.query("SELECT nmb_std_cita FROM std_cita ORDER BY nmb_std_cita", (rs, i) -> rs.getString(1)));
        result.put("parametros", jdbcTemplate.query(
                "SELECT cod_parametro, valor_int, valor_texto, descripcion FROM parametro_negocio ORDER BY cod_parametro",
                (rs, i) -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("codigo", rs.getString("cod_parametro"));
                    map.put("valor", rs.getObject("valor_int") != null ? rs.getObject("valor_int") : rs.getString("valor_texto"));
                    map.put("descripcion", rs.getString("descripcion"));
                    return map;
                }
        ));
        return ResponseEntity.ok(result);
    }

    private int queryForInt(String sql, Object... args) {
        Integer value = null;
        try {
            value = jdbcTemplate.queryForObject(sql, Integer.class, args);
        } catch (Exception ignore) {}
        return value != null ? value : 0;
    }
}

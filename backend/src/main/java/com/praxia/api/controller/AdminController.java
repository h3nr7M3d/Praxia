package com.praxia.api.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.nio.charset.StandardCharsets;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Time;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/admin")
public class AdminController {

    private static final Logger logger = LoggerFactory.getLogger(AdminController.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$%*";

    private final JdbcTemplate jdbcTemplate;

    public AdminController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public record CrearCitaRequest(Integer pacienteId, Integer slotId, Integer usuarioId, String motivo, String estado) {}

    public record ActualizarCitaRequest(Integer pacienteId, Integer slotId, Integer usuarioId, String motivo, String estado) {}

    public record CrearAgendaRequest(
            Integer vinculoId,
            String fecha,
            String horaInicio,
            String horaFin,
            String tipoAgenda,
            String estadoAgenda,
            Integer intervaloMin,
            Integer capacidadSlot,
            Integer duracionRealMin,
            String observaciones,
            Integer usuarioId,
            Boolean generarSlots
    ) {}

    public record ActualizarAgendaRequest(
            Integer vinculoId,
            String fecha,
            String horaInicio,
            String horaFin,
            String tipoAgenda,
            String estadoAgenda,
            Integer intervaloMin,
            Integer capacidadSlot,
            Integer duracionRealMin,
            String observaciones,
            Integer usuarioId
    ) {}

    public record GenerarSlotsRequest(Integer usuarioId, String nuevoEstado) {}

    public record CambiarEstadoAgendaRequest(String nuevoEstado, Integer usuarioId) {}

    public record UsuarioListResponse(List<Map<String, Object>> items, long total, int page, int pageSize) {}

    public record CrearUsuarioRequest(
            String nombre,
            String apellido,
            String sexo,
            Integer idDocumento,
            String numeroDocumento,
            String fechaNacimiento,
            String correo,
            String telefono,
            Integer idPais,
            String estado,
            List<String> roles,
            String password,
            Integer adminId
    ) {}

    public record ActualizarUsuarioRequest(
            String nombre,
            String apellido,
            String sexo,
            Integer idDocumento,
            String numeroDocumento,
            String fechaNacimiento,
            String correo,
            String telefono,
            Integer idPais,
            String estado,
            Integer adminId
    ) {}

    public record ActualizarRolesUsuarioRequest(List<String> roles, Integer adminId) {}

    public record CambiarEstadoUsuarioRequest(String nuevoEstado, Integer adminId) {}

    public record ResetPasswordRequest(String nuevaClave, Integer adminId) {}

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
        response.put("citasHoy", listarCitas(targetDate, targetDate, null, null, null, null, null, null));
        response.put("bitacora", listarBitacora());
        return ResponseEntity.ok(response);
    }

    private Map<String, Object> buildResumen(LocalDate fecha, LocalDate fechaAnterior) {
        Map<String, Object> resumen = new HashMap<>();
        resumen.put("citasHoy", queryForInt(
                "SELECT COUNT(*) FROM citas c JOIN agenda a ON a.id_agenda=c.id_agenda WHERE a.fch_agenda=?",
                Date.valueOf(fecha)));
        resumen.put("citasAyer", queryForInt(
                "SELECT COUNT(*) FROM citas c JOIN agenda a ON a.id_agenda=c.id_agenda WHERE a.fch_agenda=?",
                Date.valueOf(fechaAnterior)));
        resumen.put("noAsistioHoy", queryForInt(
                "SELECT COUNT(*) FROM citas c JOIN agenda a ON a.id_agenda=c.id_agenda WHERE a.fch_agenda=? AND c.nmb_std_cita='NO_ASISTIO'",
                Date.valueOf(fecha)));
        resumen.put("noAsistioAyer", queryForInt(
                "SELECT COUNT(*) FROM citas c JOIN agenda a ON a.id_agenda=c.id_agenda WHERE a.fch_agenda=? AND c.nmb_std_cita='NO_ASISTIO'",
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
            @RequestParam(name = "modalidad", required = false) String modalidad,
            @RequestParam(name = "estadoPago", required = false) String estadoPago
    ) {
        List<Map<String, Object>> data = listarCitas(desde, hasta, paciente, centroId, medicoId, estado, modalidad, estadoPago);
        return ResponseEntity.ok(data);
    }

    private List<Map<String, Object>> listarCitas(LocalDate desde, LocalDate hasta, String paciente,
                                                  Integer centroId, Integer medicoId, String estado,
                                                  String modalidad, String estadoPago) {
        StringBuilder sql = new StringBuilder(
                """
                        SELECT
                            c.id_cita,
                            a.id_agenda,
                            c.id_slot,
                            c.id_paciente,
                            m.id_medico,
                            cm.id_centro_medico,
                            a.fch_agenda AS fecha,
                            c.hora_inicio_cita,
                            c.hora_fin_cita,
                            c.motivo,
                            a.nmb_tipo_agenda,
                            CONCAT(up.nombre,' ',up.apellido) AS paciente,
                            CONCAT(um.nombre,' ',um.apellido) AS medico,
                            e.nmb_especialidad,
                            cm.nmb_centro_medico,
                            c.nmb_std_cita,
                            COALESCE(pg.std_pago, 'PENDIENTE') AS std_pago
                        FROM citas c
                        JOIN agenda a ON a.id_agenda = c.id_agenda
                        JOIN paciente p ON p.id_paciente = c.id_paciente
                        JOIN usuario up ON up.id_usuario = p.id_paciente
                        JOIN medico_centro_especialidad mce ON mce.id_medico_centro_especialidad = a.id_medico_centro_especialidad
                        JOIN medico m ON m.id_medico = mce.id_medico
                        JOIN usuario um ON um.id_usuario = m.id_usuario
                        JOIN especialidad e ON e.id_especialidad = mce.id_especialidad
                        JOIN centro_medico cm ON cm.id_centro_medico = mce.id_centro_medico
                        LEFT JOIN pago pg ON pg.id_cita = c.id_cita
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
            sql.append(" AND a.nmb_tipo_agenda = ?");
            params.add(modalidad);
        }
        if (estadoPago != null && !estadoPago.isBlank()) {
            sql.append(" AND COALESCE(pg.std_pago, 'PENDIENTE') = ?");
            params.add(estadoPago);
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
        row.put("horaInicio", formatTime(horaInicio));
        row.put("horaFin", formatTime(horaFin));
        row.put("paciente", rs.getString("paciente"));
        row.put("medico", rs.getString("medico"));
        row.put("especialidad", rs.getString("nmb_especialidad"));
        row.put("centro", rs.getString("nmb_centro_medico"));
        row.put("estado", rs.getString("nmb_std_cita"));
        row.put("motivo", rs.getString("motivo"));
        row.put("modalidad", rs.getString("nmb_tipo_agenda"));
        String estadoPago = rs.getString("std_pago");
        row.put("estadoPago", estadoPago != null ? estadoPago : "PENDIENTE");
        row.put("pacienteId", rs.getObject("id_paciente") != null ? rs.getInt("id_paciente") : null);
        row.put("medicoId", rs.getObject("id_medico") != null ? rs.getInt("id_medico") : null);
        row.put("centroId", rs.getObject("id_centro_medico") != null ? rs.getInt("id_centro_medico") : null);
        row.put("agendaId", rs.getObject("id_agenda") != null ? rs.getInt("id_agenda") : null);
        row.put("slotId", rs.getObject("id_slot") != null ? rs.getInt("id_slot") : null);
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

    private SlotInfo fetchSlotInfo(Integer slotId, boolean forUpdate) {
        if (slotId == null) return null;
        String sql = """
                SELECT s.id_slot,
                       s.id_agenda,
                       s.hora_inicio_slot,
                       s.hora_fin_slot,
                       s.capacidad,
                       s.ocupados,
                       t.cantidad AS tarifa
                FROM agenda_slot s
                JOIN agenda a ON s.id_agenda = a.id_agenda
                JOIN medico_centro_especialidad mce ON a.id_medico_centro_especialidad = mce.id_medico_centro_especialidad
                JOIN tarifa t ON t.id_tarifa = mce.id_tarifa
                WHERE s.id_slot = ?
                """ + (forUpdate ? " FOR UPDATE" : "");
        return jdbcTemplate.query(sql, ps -> ps.setInt(1, slotId), rs -> {
            if (!rs.next()) return null;
            BigDecimal tarifa = rs.getBigDecimal("tarifa");
            return new SlotInfo(
                    rs.getInt("id_slot"),
                    rs.getInt("id_agenda"),
                    rs.getTime("hora_inicio_slot"),
                    rs.getTime("hora_fin_slot"),
                    rs.getInt("capacidad"),
                    rs.getInt("ocupados"),
                    tarifa
            );
        });
    }

    private CitaSnapshot fetchCitaSnapshot(Long citaId) {
        if (citaId == null) return null;
        String sql = """
                SELECT c.id_cita,
                       c.id_paciente,
                       c.id_agenda,
                       c.id_slot,
                       c.hora_inicio_cita,
                       c.hora_fin_cita,
                       c.nmb_std_cita,
                       c.motivo
                FROM citas c
                WHERE c.id_cita = ?
                FOR UPDATE
                """;
        return jdbcTemplate.query(sql, ps -> ps.setLong(1, citaId), rs -> {
            if (!rs.next()) return null;
            Integer slotId = rs.getObject("id_slot") != null ? rs.getInt("id_slot") : null;
            return new CitaSnapshot(
                    rs.getLong("id_cita"),
                    rs.getInt("id_paciente"),
                    rs.getInt("id_agenda"),
                    slotId,
                    rs.getTime("hora_inicio_cita"),
                    rs.getTime("hora_fin_cita"),
                    rs.getString("nmb_std_cita"),
                    rs.getString("motivo")
            );
        });
    }

    private boolean estadoCitaValido(String estado) {
        if (estado == null || estado.isBlank()) return false;
        try {
            Integer rows = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM std_cita WHERE nmb_std_cita = ?",
                    Integer.class,
                    estado
            );
            return rows != null && rows > 0;
        } catch (Exception ex) {
            return false;
        }
    }

    private boolean estadoPagoDisponible(String estado) {
        if (estado == null || estado.isBlank()) return false;
        try {
            Integer rows = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM std_pago WHERE std_pago = ?",
                    Integer.class,
                    estado
            );
            return rows != null && rows > 0;
        } catch (Exception ex) {
            return false;
        }
    }

    private void registrarBitacoraCita(Long idCita, String tipoEvento, String valorAnterior,
                                       String valorNuevo, Integer usuarioId, String resumen) {
        if (idCita == null || usuarioId == null) return;
        try {
            jdbcTemplate.update(
                    "INSERT INTO bitacora_evento (entidad, id_entidad, tipo_evento, resumen, valor_anterior, valor_nuevo, fch_evento, id_usuario) " +
                            "VALUES ('CITA', ?, ?, ?, ?, ?, NOW(), ?)",
                    idCita, tipoEvento, resumen != null ? resumen : tipoEvento, valorAnterior, valorNuevo, usuarioId
            );
        } catch (Exception ex) {
            logger.warn("No se pudo registrar bit\u00E1cora para la cita {}", idCita, ex);
        }
    }

    private void ocuparSlot(Integer slotId) {
        if (slotId == null) return;
        jdbcTemplate.update(
                "UPDATE agenda_slot SET ocupados = ocupados + 1, " +
                        "std_slot = CASE WHEN (ocupados + 1) >= capacidad THEN 'OCUPADO' ELSE 'DISPONIBLE' END " +
                        "WHERE id_slot = ?",
                slotId
        );
    }

    private void liberarSlot(Integer slotId) {
        if (slotId == null) return;
        jdbcTemplate.update(
                "UPDATE agenda_slot SET ocupados = GREATEST(ocupados - 1, 0), " +
                        "std_slot = CASE WHEN GREATEST(ocupados - 1, 0) = 0 THEN 'DISPONIBLE' ELSE 'OCUPADO' END " +
                        "WHERE id_slot = ?",
                slotId
        );
    }

    private void crearPagoPendiente(long citaId, BigDecimal monto, Integer usuarioId) {
        if (usuarioId == null) return;
        try {
            jdbcTemplate.update(
                    "INSERT INTO pago (id_cita, monto_total, std_pago, id_metodo_pago, referencia_externa, fch_registro_pago, fch_actualizacion_pago, id_usuario_registra) " +
                            "VALUES (?,?,?,?,?,NOW(),NOW(),?)",
                    citaId,
                    monto != null ? monto : BigDecimal.ZERO,
                    "PENDIENTE",
                    1,
                    null,
                    usuarioId
            );
        } catch (Exception ex) {
            logger.warn("No se pudo registrar el pago pendiente para la cita {}", citaId, ex);
        }
    }

    private record SlotInfo(int slotId, int agendaId, Time horaInicio, Time horaFin,
                            int capacidad, int ocupados, BigDecimal tarifa) {}

    private record CitaSnapshot(long id, int pacienteId, int agendaId, Integer slotId,
                                Time horaInicio, Time horaFin, String estado, String motivo) {}

    private record AgendaSnapshot(int idAgenda, int vinculoId, LocalDate fecha, Time horaInicio, Time horaFin,
                                  int intervaloMin, int capacidadSlot, int duracionRealMin, String estado, String tipo,
                                  String observaciones) {}

    private AgendaSnapshot fetchAgendaSnapshot(Integer agendaId, boolean forUpdate) {
        if (agendaId == null) return null;
        String sql = """
                SELECT id_agenda,
                       id_medico_centro_especialidad,
                       fch_agenda,
                       hora_inicio,
                       hora_fin,
                       intervalo_min,
                       capacidad_slot,
                       duracion_real_cita_min,
                       nmb_std_agenda,
                       nmb_tipo_agenda,
                       observaciones
                FROM agenda
                WHERE id_agenda = ?
                """ + (forUpdate ? " FOR UPDATE" : "");
        return jdbcTemplate.query(sql, ps -> ps.setInt(1, agendaId), rs -> {
            if (!rs.next()) return null;
            Date fechaSql = rs.getDate("fch_agenda");
            LocalDate fecha = fechaSql != null ? fechaSql.toLocalDate() : null;
            return new AgendaSnapshot(
                    rs.getInt("id_agenda"),
                    rs.getInt("id_medico_centro_especialidad"),
                    fecha,
                    rs.getTime("hora_inicio"),
                    rs.getTime("hora_fin"),
                    rs.getInt("intervalo_min"),
                    rs.getInt("capacidad_slot"),
                    rs.getInt("duracion_real_cita_min"),
                    rs.getString("nmb_std_agenda"),
                    rs.getString("nmb_tipo_agenda"),
                    rs.getString("observaciones")
            );
        });
    }

    private int generarSlotsParaAgenda(AgendaSnapshot snapshot) {
        if (snapshot == null || snapshot.horaInicio() == null || snapshot.horaFin() == null) return 0;
        LocalTime inicio = snapshot.horaInicio().toLocalTime();
        LocalTime fin = snapshot.horaFin().toLocalTime();
        int intervalo = snapshot.intervaloMin() > 0 ? snapshot.intervaloMin() : 20;
        LocalTime cursor = inicio;
        int generados = 0;
        while (cursor.isBefore(fin)) {
            LocalTime siguiente = cursor.plusMinutes(intervalo);
            if (siguiente.isAfter(fin)) {
                siguiente = fin;
            }
            if (!siguiente.isAfter(cursor)) {
                break;
            }
            Time inicioSql = Time.valueOf(cursor);
            Time finSql = Time.valueOf(siguiente);
            jdbcTemplate.update(
                    "INSERT INTO agenda_slot (id_agenda, hora_inicio_slot, hora_fin_slot, capacidad, ocupados, std_slot) VALUES (?,?,?,?,0,'DISPONIBLE')",
                    snapshot.idAgenda(),
                    inicioSql,
                    finSql,
                    snapshot.capacidadSlot()
            );
            generados++;
            cursor = siguiente;
        }
        return generados;
    }

    private boolean existeVinculoMedicoCentro(Integer vinculoId) {
        if (vinculoId == null) return false;
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM medico_centro_especialidad WHERE id_medico_centro_especialidad = ?",
                    Integer.class,
                    vinculoId
            );
            return count != null && count > 0;
        } catch (Exception ex) {
            return false;
        }
    }

    private boolean estadoAgendaValido(String estado) {
        if (estado == null || estado.isBlank()) return false;
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM std_agenda WHERE nmb_std_agenda = ?",
                    Integer.class,
                    estado
            );
            return count != null && count > 0;
        } catch (Exception ex) {
            return false;
        }
    }

    private boolean tipoAgendaValido(String tipo) {
        if (tipo == null || tipo.isBlank()) return false;
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM tipo_agenda WHERE nmb_tipo_agenda = ?",
                    Integer.class,
                    tipo
            );
            return count != null && count > 0;
        } catch (Exception ex) {
            return false;
        }
    }

    private int getParametroEntero(String codigo, int defaultValue) {
        try {
            Integer valor = jdbcTemplate.queryForObject(
                    "SELECT valor_int FROM parametro_negocio WHERE cod_parametro = ?",
                    Integer.class,
                    codigo
            );
            return valor != null ? valor : defaultValue;
        } catch (Exception ex) {
            return defaultValue;
        }
    }

    private LocalDate parseIsoDate(String valor, String campo) {
        if (valor == null || valor.isBlank()) {
            throw new IllegalArgumentException("Falta " + campo);
        }
        try {
            return LocalDate.parse(valor.trim());
        } catch (Exception ex) {
            throw new IllegalArgumentException("Fecha inválida para " + campo);
        }
    }

    private Time parseSqlTime(String valor, String campo) {
        if (valor == null || valor.isBlank()) {
            throw new IllegalArgumentException("Falta " + campo);
        }
        try {
            LocalTime lt = LocalTime.parse(valor.trim());
            return Time.valueOf(lt);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Hora inválida para " + campo);
        }
    }

    private void registrarBitacoraAgenda(Integer agendaId, String tipoEvento, String valorAnterior,
                                         String valorNuevo, Integer usuarioId, String resumen) {
        if (agendaId == null || usuarioId == null) return;
        try {
            jdbcTemplate.update(
                    "INSERT INTO bitacora_evento (entidad, id_entidad, tipo_evento, resumen, valor_anterior, valor_nuevo, fch_evento, id_usuario) " +
                            "VALUES ('AGENDA', ?, ?, ?, ?, ?, NOW(), ?)",
                    agendaId, tipoEvento, resumen != null ? resumen : tipoEvento, valorAnterior, valorNuevo, usuarioId
            );
        } catch (Exception ex) {
            logger.warn("No se pudo registrar bit\u00E1cora para la agenda {}", agendaId, ex);
        }
    }

    private void TimeStampToString(Map<String, Object> map, String key, Timestamp value) {
        if (map == null || key == null) return;
        map.put(key, value != null ? value.toString() : null);
    }

    private boolean documentoExiste(String numero, Integer idDocumento, Integer excludeId) {
        if (numero == null || idDocumento == null) return false;
        String sql = "SELECT COUNT(*) FROM usuario WHERE nr_documento = ? AND id_documento = ?";
        Integer count;
        if (excludeId != null) {
            sql += " AND id_usuario <> ?";
            count = jdbcTemplate.queryForObject(sql, Integer.class, numero, idDocumento, excludeId);
        } else {
            count = jdbcTemplate.queryForObject(sql, Integer.class, numero, idDocumento);
        }
        return count != null && count > 0;
    }

    private boolean correoExiste(String correo, Integer excludeId) {
        if (correo == null || correo.isBlank()) return false;
        String sql = "SELECT COUNT(*) FROM usuario WHERE correo = ?";
        Integer count;
        if (excludeId != null) {
            sql += " AND id_usuario <> ?";
            count = jdbcTemplate.queryForObject(sql, Integer.class, correo, excludeId);
        } else {
            count = jdbcTemplate.queryForObject(sql, Integer.class, correo);
        }
        return count != null && count > 0;
    }

    private void asignarRolesUsuario(Integer idUsuario, List<String> roles, Integer adminId) {
        if (idUsuario == null) return;
        jdbcTemplate.update("DELETE FROM usuario_rol WHERE id_usuario = ?", idUsuario);
        if (roles == null || roles.isEmpty()) {
            return;
        }
        for (String nombreRol : roles) {
            Integer rolId = resolveRolId(nombreRol);
            if (rolId != null) {
                jdbcTemplate.update("INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (?, ?)", idUsuario, rolId);
            }
        }
        registrarBitacoraUsuario(idUsuario, "ROLES_ASSIGN", "Asignación de roles", null, roles.toString(), adminId);
    }

    private Integer resolveRolId(String nombreRol) {
        if (nombreRol == null) return null;
        try {
            return jdbcTemplate.query(
                    "SELECT id_rol FROM rol WHERE UPPER(nmb_rol) = ? LIMIT 1",
                    ps -> ps.setString(1, nombreRol.trim().toUpperCase()),
                    rs -> rs.next() ? rs.getInt(1) : null
            );
        } catch (Exception ex) {
            return null;
        }
    }

    private boolean estadoUsuarioValido(String estado) {
        if (estado == null || estado.isBlank()) return false;
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM std_usuario WHERE std_usuario = ?",
                    Integer.class,
                    estado.trim()
            );
            return count != null && count > 0;
        } catch (Exception ex) {
            return false;
        }
    }

    private String hashPassword(String plain) {
        String candidate = (plain == null || plain.isBlank()) ? randomPassword() : plain;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(candidate.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hashed) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception ex) {
            return candidate;
        }
    }

    private String randomPassword() {
        int len = 10;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < len; i++) {
            int idx = RANDOM.nextInt(PASSWORD_ALPHABET.length());
            sb.append(PASSWORD_ALPHABET.charAt(idx));
        }
        return sb.toString();
    }

    private void registrarBitacoraUsuario(Integer idUsuario, String tipoEvento, String resumen,
                                          String valorAnterior, String valorNuevo, Integer adminId) {
        if (idUsuario == null || adminId == null) return;
        try {
            jdbcTemplate.update(
                    "INSERT INTO bitacora_evento (entidad, id_entidad, tipo_evento, resumen, valor_anterior, valor_nuevo, fch_evento, id_usuario) " +
                            "VALUES ('USUARIO', ?, ?, ?, ?, ?, NOW(), ?)",
                    idUsuario, tipoEvento, resumen != null ? resumen : tipoEvento, valorAnterior, valorNuevo, adminId
            );
        } catch (Exception ex) {
            logger.warn("No se pudo registrar bitácora para el usuario {}", idUsuario, ex);
        }
    }

    private String join(String nombre, String apellido) {
        StringBuilder sb = new StringBuilder();
        if (nombre != null && !nombre.isBlank()) sb.append(nombre.trim());
        if (apellido != null && !apellido.isBlank()) {
            if (sb.length() > 0) sb.append(" ");
            sb.append(apellido.trim());
        }
        return sb.toString();
    }

    @GetMapping("/citas/opciones")
    public ResponseEntity<?> catalogosCita() {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> pacientes = jdbcTemplate.query(
                """
                        SELECT p.id_paciente,
                               CONCAT(u.nombre,' ',u.apellido) AS nombre,
                               u.nr_documento
                        FROM paciente p
                        JOIN usuario u ON u.id_usuario = p.id_paciente
                        ORDER BY u.nombre, u.apellido
                        """,
                (rs, i) -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("id", rs.getInt("id_paciente"));
                    row.put("nombre", rs.getString("nombre"));
                    row.put("documento", rs.getString("nr_documento"));
                    return row;
                }
        );
        List<String> estados = jdbcTemplate.query(
                "SELECT nmb_std_cita FROM std_cita ORDER BY nmb_std_cita",
                (rs, i) -> rs.getString(1)
        );
        List<Map<String, Object>> slots = jdbcTemplate.query(
                """
                        SELECT s.id_slot,
                               a.id_agenda,
                               a.fch_agenda,
                               s.hora_inicio_slot,
                               s.hora_fin_slot,
                               s.capacidad,
                               s.ocupados,
                               a.nmb_tipo_agenda,
                               CONCAT(um.nombre,' ',um.apellido) AS medico,
                               cm.nmb_centro_medico,
                               e.nmb_especialidad
                        FROM agenda_slot s
                        JOIN agenda a ON s.id_agenda = a.id_agenda
                        JOIN medico_centro_especialidad mce ON mce.id_medico_centro_especialidad = a.id_medico_centro_especialidad
                        JOIN medico m ON m.id_medico = mce.id_medico
                        JOIN usuario um ON um.id_usuario = m.id_usuario
                        JOIN centro_medico cm ON cm.id_centro_medico = mce.id_centro_medico
                        JOIN especialidad e ON e.id_especialidad = mce.id_especialidad
                        WHERE s.std_slot <> 'BLOQUEADO'
                          AND a.fch_agenda >= (CURRENT_DATE - INTERVAL 1 DAY)
                        ORDER BY a.fch_agenda, s.hora_inicio_slot
                        LIMIT 150
                        """,
                (rs, i) -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("id", rs.getInt("id_slot"));
                    row.put("agendaId", rs.getInt("id_agenda"));
                    Date fecha = rs.getDate("fch_agenda");
                    row.put("fecha", fecha != null ? fecha.toString() : null);
                    row.put("horaInicio", formatTime(rs.getTime("hora_inicio_slot")));
                    row.put("horaFin", formatTime(rs.getTime("hora_fin_slot")));
                    int capacidad = rs.getInt("capacidad");
                    int ocupados = rs.getInt("ocupados");
                    row.put("disponibles", Math.max(capacidad - ocupados, 0));
                    row.put("tipo", rs.getString("nmb_tipo_agenda"));
                    row.put("medico", rs.getString("medico"));
                    row.put("centro", rs.getString("nmb_centro_medico"));
                    row.put("especialidad", rs.getString("nmb_especialidad"));
                    return row;
                }
        );
        result.put("pacientes", pacientes);
        result.put("estados", estados);
        result.put("slots", slots);
        return ResponseEntity.ok(result);
    }

    @Transactional
    @PostMapping("/citas")
    public ResponseEntity<?> crearCita(@RequestBody CrearCitaRequest req) {
        if (req == null || req.pacienteId() == null || req.slotId() == null || req.usuarioId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Datos incompletos para crear la cita"));
        }
        String estado = req.estado() == null || req.estado().isBlank() ? "RESERVADA" : req.estado().trim().toUpperCase();
        if (!estadoCitaValido(estado)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Estado de cita no v\u00E1lido"));
        }
        try {
            SlotInfo slot = fetchSlotInfo(req.slotId(), true);
            if (slot == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Slot no encontrado"));
            }
            if (slot.ocupados() >= slot.capacidad()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "El slot ya no tiene cupos"));
            }
            Timestamp now = Timestamp.valueOf(LocalDateTime.now());
            String motivo = (req.motivo() == null || req.motivo().isBlank()) ? "Programada desde panel administrador" : req.motivo().trim();

            KeyHolder kh = new GeneratedKeyHolder();
            jdbcTemplate.update(conn -> {
                PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO citas (hora_inicio_cita, hora_fin_cita, motivo, fch_registro_cita, fch_actualizacion_cita, id_usuario_creador, id_usuario_actualizador, id_paciente, id_agenda, nmb_std_cita, id_slot) " +
                                "VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                        Statement.RETURN_GENERATED_KEYS
                );
                ps.setTime(1, slot.horaInicio());
                ps.setTime(2, slot.horaFin());
                ps.setString(3, motivo);
                ps.setTimestamp(4, now);
                ps.setTimestamp(5, now);
                ps.setInt(6, req.usuarioId());
                ps.setInt(7, req.usuarioId());
                ps.setInt(8, req.pacienteId());
                ps.setInt(9, slot.agendaId());
                ps.setString(10, estado);
                ps.setInt(11, slot.slotId());
                return ps;
            }, kh);
            Number key = kh.getKey();
            if (key == null) {
                throw new IllegalStateException("No se pudo generar el identificador de la cita");
            }
            long citaId = key.longValue();
            ocuparSlot(slot.slotId());
            crearPagoPendiente(citaId, slot.tarifa(), req.usuarioId());
            registrarBitacoraCita(citaId, "CREACION_ADMIN", null, estado, req.usuarioId(), motivo);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", citaId, "estado", estado));
        } catch (Exception ex) {
            logger.error("Error creando cita desde admin", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "No se pudo crear la cita"));
        }
    }

    @Transactional
    @PutMapping("/citas/{id}")
    public ResponseEntity<?> actualizarCita(@PathVariable("id") Long citaId,
                                            @RequestBody ActualizarCitaRequest req) {
        if (citaId == null || req == null || req.usuarioId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Datos incompletos para actualizar la cita"));
        }
        try {
            CitaSnapshot snapshot = fetchCitaSnapshot(citaId);
            if (snapshot == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Cita no encontrada"));
            }
            String estado = snapshot.estado();
            if (req.estado() != null && !req.estado().isBlank()) {
                String normalized = req.estado().trim().toUpperCase();
                if (!estadoCitaValido(normalized)) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Estado de cita no v\u00E1lido"));
                }
                estado = normalized;
            }
            int pacienteId = req.pacienteId() != null ? req.pacienteId() : snapshot.pacienteId();
            String motivo = (req.motivo() != null && !req.motivo().isBlank()) ? req.motivo().trim() : snapshot.motivo();

            Integer slotAnterior = snapshot.slotId();
            Integer slotNuevo = slotAnterior;
            int agendaId = snapshot.agendaId();
            Time horaInicio = snapshot.horaInicio();
            Time horaFin = snapshot.horaFin();
            boolean cambioSlot = req.slotId() != null && !req.slotId().equals(slotAnterior);
            SlotInfo slotInfo = null;
            if (cambioSlot) {
                slotInfo = fetchSlotInfo(req.slotId(), true);
                if (slotInfo == null) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Slot destino no encontrado"));
                }
                if (slotInfo.ocupados() >= slotInfo.capacidad()) {
                    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "El nuevo slot no tiene cupos"));
                }
                slotNuevo = slotInfo.slotId();
                agendaId = slotInfo.agendaId();
                horaInicio = slotInfo.horaInicio();
                horaFin = slotInfo.horaFin();
            }

            jdbcTemplate.update(
                    "UPDATE citas SET hora_inicio_cita=?, hora_fin_cita=?, motivo=?, id_paciente=?, id_agenda=?, nmb_std_cita=?, id_slot=?, fch_actualizacion_cita=NOW(), id_usuario_actualizador=? WHERE id_cita=?",
                    horaInicio, horaFin, motivo, pacienteId, agendaId, estado, slotNuevo, req.usuarioId(), citaId
            );

            if (cambioSlot && slotInfo != null) {
                ocuparSlot(slotInfo.slotId());
                if (slotAnterior != null) {
                    liberarSlot(slotAnterior);
                }
                registrarBitacoraCita(
                        citaId,
                        "REPROGRAMACION_ADMIN",
                        slotAnterior != null ? slotAnterior.toString() : null,
                        String.valueOf(slotInfo.slotId()),
                        req.usuarioId(),
                        "Movimiento manual de horario"
                );
            }
            if (!snapshot.estado().equals(estado)) {
                registrarBitacoraCita(citaId, "CAMBIO_ESTADO_ADMIN", snapshot.estado(), estado, req.usuarioId(), "Actualizado desde admin");
            } else if (!Objects.equals(motivo, snapshot.motivo())) {
                registrarBitacoraCita(citaId, "ACTUALIZACION_ADMIN", snapshot.motivo(), motivo, req.usuarioId(), "Actualizaci\u00F3n de motivo");
            }
            Map<String, Object> payload = new HashMap<>();
            payload.put("id", citaId);
            payload.put("estado", estado);
            payload.put("slotId", slotNuevo);
            return ResponseEntity.ok(payload);
        } catch (Exception ex) {
            logger.error("Error actualizando cita {}", citaId, ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "No se pudo actualizar la cita"));
        }
    }

    @Transactional
    @DeleteMapping("/citas/{id}")
    public ResponseEntity<?> eliminarCita(@PathVariable("id") Long citaId,
                                          @RequestParam("usuarioId") Integer usuarioId) {
        if (citaId == null || usuarioId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Datos incompletos para eliminar la cita"));
        }
        try {
            CitaSnapshot snapshot = fetchCitaSnapshot(citaId);
            if (snapshot == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Cita no encontrada"));
            }
            jdbcTemplate.update(
                    "UPDATE citas SET nmb_std_cita='CANCELADA', fch_actualizacion_cita=NOW(), id_usuario_actualizador=? WHERE id_cita=?",
                    usuarioId, citaId
            );
            if (snapshot.slotId() != null) {
                liberarSlot(snapshot.slotId());
            }
            if (estadoPagoDisponible("REEMBOLSADO")) {
                jdbcTemplate.update(
                        "UPDATE pago SET std_pago='REEMBOLSADO', fch_actualizacion_pago=NOW(), id_usuario_registra=? WHERE id_cita=?",
                        usuarioId, citaId
                );
            }
            registrarBitacoraCita(citaId, "CANCELACION_ADMIN", snapshot.estado(), "CANCELADA", usuarioId, "Eliminada desde admin");
            return ResponseEntity.ok(Map.of("id", citaId, "estado", "CANCELADA"));
        } catch (Exception ex) {
            logger.error("Error cancelando cita {}", citaId, ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "No se pudo cancelar la cita"));
        }
    }

    // ---- AGENDA ----

    @GetMapping("/agendas")
    public ResponseEntity<?> listarAgendas(
            @RequestParam(name = "medicoId", required = false) Integer medicoId,
            @RequestParam(name = "centroId", required = false) Integer centroId,
            @RequestParam(name = "estado", required = false) String estado,
            @RequestParam(name = "tipo", required = false) String tipo,
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
                            a.intervalo_min,
                            a.capacidad_slot,
                            m.id_medico,
                            CONCAT(u.nombre,' ',u.apellido) AS medico,
                            cm.id_centro_medico,
                            cm.nmb_centro_medico,
                            COUNT(s.id_slot) AS slots_totales,
                            SUM(CASE WHEN s.std_slot = 'OCUPADO' OR s.ocupados > 0 THEN 1 ELSE 0 END) AS slots_ocupados
                        FROM agenda a
                        JOIN medico_centro_especialidad mce ON mce.id_medico_centro_especialidad = a.id_medico_centro_especialidad
                        JOIN medico m ON m.id_medico = mce.id_medico
                        JOIN usuario u ON u.id_usuario = m.id_usuario
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
        if (estado != null && !estado.isBlank()) {
            sql.append(" AND a.nmb_std_agenda = ?");
            params.add(estado);
        }
        if (tipo != null && !tipo.isBlank()) {
            sql.append(" AND a.nmb_tipo_agenda = ?");
            params.add(tipo);
        }
        if (desde != null) {
            sql.append(" AND a.fch_agenda >= ?");
            params.add(Date.valueOf(desde));
        }
        if (hasta != null) {
            sql.append(" AND a.fch_agenda <= ?");
            params.add(Date.valueOf(hasta));
        }
        sql.append(" GROUP BY a.id_agenda, m.id_medico, u.nombre, u.apellido, cm.id_centro_medico, cm.nmb_centro_medico ORDER BY a.fch_agenda, a.hora_inicio");
        List<Map<String, Object>> items = jdbcTemplate.query(sql.toString(), (rs, i) -> {
            Map<String, Object> row = new HashMap<>();
            row.put("idAgenda", rs.getInt("id_agenda"));
            Date fecha = rs.getDate("fch_agenda");
            row.put("fecha", fecha != null ? fecha.toString() : null);
            row.put("horaInicio", formatTime(rs.getTime("hora_inicio")));
            row.put("horaFin", formatTime(rs.getTime("hora_fin")));
            row.put("tipo", rs.getString("nmb_tipo_agenda"));
            row.put("estado", rs.getString("nmb_std_agenda"));
            row.put("intervalo", rs.getInt("intervalo_min"));
            row.put("capacidadSlot", rs.getInt("capacidad_slot"));
            row.put("medico", rs.getString("medico"));
            row.put("medicoId", rs.getInt("id_medico"));
            row.put("centro", rs.getString("nmb_centro_medico"));
            row.put("centroId", rs.getInt("id_centro_medico"));
            row.put("slotsTotales", rs.getInt("slots_totales"));
            row.put("slotsOcupados", rs.getInt("slots_ocupados"));
            return row;
        }, params.toArray());
        return ResponseEntity.ok(items);
    }

    @GetMapping("/agendas/opciones")
    public ResponseEntity<?> catalogosAgenda() {
        Map<String, Object> data = new HashMap<>();
        List<Map<String, Object>> medicos = jdbcTemplate.query(
                """
                        SELECT m.id_medico,
                               CONCAT(u.nombre,' ',u.apellido) AS nombre
                        FROM medico m
                        JOIN usuario u ON u.id_usuario = m.id_usuario
                        ORDER BY u.nombre, u.apellido
                        """,
                (rs, i) -> Map.of(
                        "id", rs.getInt("id_medico"),
                        "nombre", rs.getString("nombre")
                )
        );
        List<Map<String, Object>> centros = jdbcTemplate.query(
                "SELECT id_centro_medico, nmb_centro_medico FROM centro_medico ORDER BY nmb_centro_medico",
                (rs, i) -> Map.of("id", rs.getInt("id_centro_medico"), "nombre", rs.getString("nmb_centro_medico"))
        );
        List<String> estados = jdbcTemplate.query(
                "SELECT nmb_std_agenda FROM std_agenda ORDER BY nmb_std_agenda",
                (rs, i) -> rs.getString(1)
        );
        List<String> tipos = jdbcTemplate.query(
                "SELECT nmb_tipo_agenda FROM tipo_agenda ORDER BY nmb_tipo_agenda",
                (rs, i) -> rs.getString(1)
        );
        List<Map<String, Object>> vinculos = jdbcTemplate.query(
                """
                        SELECT mce.id_medico_centro_especialidad,
                               m.id_medico,
                               CONCAT(u.nombre,' ',u.apellido) AS medico,
                               cm.id_centro_medico,
                               cm.nmb_centro_medico,
                               e.nmb_especialidad
                        FROM medico_centro_especialidad mce
                        JOIN medico m ON m.id_medico = mce.id_medico
                        JOIN usuario u ON u.id_usuario = m.id_usuario
                        JOIN centro_medico cm ON cm.id_centro_medico = mce.id_centro_medico
                        JOIN especialidad e ON e.id_especialidad = mce.id_especialidad
                        ORDER BY medico, cm.nmb_centro_medico
                        """,
                (rs, i) -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("id", rs.getInt("id_medico_centro_especialidad"));
                    row.put("medicoId", rs.getInt("id_medico"));
                    row.put("medico", rs.getString("medico"));
                    row.put("centroId", rs.getInt("id_centro_medico"));
                    row.put("centro", rs.getString("nmb_centro_medico"));
                    row.put("especialidad", rs.getString("nmb_especialidad"));
                    return row;
                }
        );
        Map<String, Object> defaults = new HashMap<>();
        defaults.put("intervaloMin", getParametroEntero("DURACION_CITA_MIN", 20));
        defaults.put("capacidadSlot", getParametroEntero("CAPACIDAD_SLOT_DEFECTO", 1));
        defaults.put("duracionRealMin", getParametroEntero("DURACION_CITA_MIN", 20));
        data.put("medicos", medicos);
        data.put("centros", centros);
        data.put("estados", estados);
        data.put("tipos", tipos);
        data.put("vinculos", vinculos);
        data.put("defaults", defaults);
        return ResponseEntity.ok(data);
    }

    @GetMapping("/agendas/{id}")
    public ResponseEntity<?> detalleAgenda(@PathVariable("id") Integer agendaId) {
        if (agendaId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Falta idAgenda"));
        }
        Map<String, Object> agenda = jdbcTemplate.query(
                """
                        SELECT a.id_agenda,
                               a.fch_agenda,
                               a.hora_inicio,
                               a.hora_fin,
                               a.nmb_tipo_agenda,
                               a.nmb_std_agenda,
                               a.observaciones,
                               a.intervalo_min,
                               a.capacidad_slot,
                               a.duracion_real_cita_min,
                               mce.id_medico_centro_especialidad,
                               CONCAT(u.nombre,' ',u.apellido) AS medico,
                               cm.nmb_centro_medico,
                               e.nmb_especialidad
                        FROM agenda a
                        JOIN medico_centro_especialidad mce ON mce.id_medico_centro_especialidad = a.id_medico_centro_especialidad
                        JOIN medico m ON m.id_medico = mce.id_medico
                        JOIN usuario u ON u.id_usuario = m.id_usuario
                        JOIN centro_medico cm ON cm.id_centro_medico = mce.id_centro_medico
                        JOIN especialidad e ON e.id_especialidad = mce.id_especialidad
                        WHERE a.id_agenda = ?
                        """,
                ps -> ps.setInt(1, agendaId),
                rs -> {
                    if (!rs.next()) return null;
                    Map<String, Object> row = new HashMap<>();
                    row.put("idAgenda", rs.getInt("id_agenda"));
                    Date fecha = rs.getDate("fch_agenda");
                    row.put("fecha", fecha != null ? fecha.toString() : null);
                    row.put("horaInicio", formatTime(rs.getTime("hora_inicio")));
                    row.put("horaFin", formatTime(rs.getTime("hora_fin")));
                    row.put("tipo", rs.getString("nmb_tipo_agenda"));
                    row.put("estado", rs.getString("nmb_std_agenda"));
                    row.put("observaciones", rs.getString("observaciones"));
                    row.put("intervalo", rs.getInt("intervalo_min"));
                    row.put("capacidadSlot", rs.getInt("capacidad_slot"));
                    row.put("duracionReal", rs.getInt("duracion_real_cita_min"));
                    row.put("vinculoId", rs.getInt("id_medico_centro_especialidad"));
                    row.put("medico", rs.getString("medico"));
                    row.put("centro", rs.getString("nmb_centro_medico"));
                    row.put("especialidad", rs.getString("nmb_especialidad"));
                    return row;
                }
        );
        if (agenda == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Agenda no encontrada"));
        }
        List<Map<String, Object>> slots = jdbcTemplate.query(
                """
                        SELECT s.id_slot,
                               s.hora_inicio_slot,
                               s.hora_fin_slot,
                               s.capacidad,
                               s.ocupados,
                               s.std_slot,
                               (SELECT COUNT(*) FROM citas c WHERE c.id_slot = s.id_slot) AS citas
                        FROM agenda_slot s
                        WHERE s.id_agenda = ?
                        ORDER BY s.hora_inicio_slot
                        """,
                ps -> ps.setInt(1, agendaId),
                (rs, i) -> {
                    Map<String, Object> slot = new HashMap<>();
                    slot.put("idSlot", rs.getInt("id_slot"));
                    slot.put("horaInicio", formatTime(rs.getTime("hora_inicio_slot")));
                    slot.put("horaFin", formatTime(rs.getTime("hora_fin_slot")));
                    slot.put("capacidad", rs.getInt("capacidad"));
                    slot.put("ocupados", rs.getInt("ocupados"));
                    slot.put("estado", rs.getString("std_slot"));
                    slot.put("citas", rs.getInt("citas"));
                    return slot;
                }
        );
        return ResponseEntity.ok(Map.of("agenda", agenda, "slots", slots));
    }

    @Transactional
    @PostMapping("/agendas")
    public ResponseEntity<?> crearAgenda(@RequestBody CrearAgendaRequest req) {
        if (req == null || req.vinculoId() == null || req.usuarioId() == null || req.fecha() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Datos incompletos para crear agenda"));
        }
        if (!existeVinculoMedicoCentro(req.vinculoId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "El vínculo médico/centro no existe"));
        }
        String estadoAgenda = req.estadoAgenda() == null ? "PLANIFICADA" : req.estadoAgenda().trim().toUpperCase();
        if (!estadoAgendaValido(estadoAgenda)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Estado de agenda inválido"));
        }
        String tipoAgenda = req.tipoAgenda() == null ? "PUNTUAL" : req.tipoAgenda().trim().toUpperCase();
        if (!tipoAgendaValido(tipoAgenda)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tipo de agenda inválido"));
        }
        try {
            LocalDate fecha = parseIsoDate(req.fecha(), "fecha");
            Time horaInicio = parseSqlTime(req.horaInicio(), "horaInicio");
            Time horaFin = parseSqlTime(req.horaFin(), "horaFin");
            int intervalo = req.intervaloMin() != null && req.intervaloMin() > 0 ? req.intervaloMin() : getParametroEntero("DURACION_CITA_MIN", 20);
            int capacidad = req.capacidadSlot() != null && req.capacidadSlot() > 0 ? req.capacidadSlot() : getParametroEntero("CAPACIDAD_SLOT_DEFECTO", 1);
            int duracion = req.duracionRealMin() != null && req.duracionRealMin() > 0 ? req.duracionRealMin() : intervalo;
            Timestamp now = Timestamp.valueOf(LocalDateTime.now());
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(conn -> {
                PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO agenda (fch_agenda, hora_inicio, hora_fin, observaciones, fch_registro_agenda, fch_actualizacion_agenda, id_usuario_creador, id_usuario_actualizador, nmb_std_agenda, id_medico_centro_especialidad, nmb_tipo_agenda, intervalo_min, capacidad_slot, duracion_real_cita_min) " +
                                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        Statement.RETURN_GENERATED_KEYS
                );
                ps.setDate(1, Date.valueOf(fecha));
                ps.setTime(2, horaInicio);
                ps.setTime(3, horaFin);
                ps.setString(4, req.observaciones() != null ? req.observaciones().trim() : "");
                ps.setTimestamp(5, now);
                ps.setTimestamp(6, now);
                ps.setInt(7, req.usuarioId());
                ps.setInt(8, req.usuarioId());
                ps.setString(9, estadoAgenda);
                ps.setInt(10, req.vinculoId());
                ps.setString(11, tipoAgenda);
                ps.setInt(12, intervalo);
                ps.setInt(13, capacidad);
                ps.setInt(14, duracion);
                return ps;
            }, keyHolder);
            Number key = keyHolder.getKey();
            if (key == null) {
                throw new IllegalStateException("No se pudo generar el identificador de la agenda");
            }
            int agendaId = key.intValue();
            registrarBitacoraAgenda(agendaId, "CREACION_AGENDA", null, estadoAgenda, req.usuarioId(), "Agenda creada desde panel admin");
            if (Boolean.TRUE.equals(req.generarSlots())) {
                AgendaSnapshot snapshot = fetchAgendaSnapshot(agendaId, true);
                if (snapshot != null) {
                    int generados = generarSlotsParaAgenda(snapshot);
                    registrarBitacoraAgenda(agendaId, "GENERACION_SLOTS", null, String.valueOf(generados), req.usuarioId(), "Generación automática al crear");
                }
            }
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("idAgenda", agendaId));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (Exception ex) {
            logger.error("Error creando agenda", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "No se pudo crear la agenda"));
        }
    }

    @Transactional
    @PutMapping("/agendas/{id}")
    public ResponseEntity<?> actualizarAgenda(@PathVariable("id") Integer agendaId,
                                              @RequestBody ActualizarAgendaRequest req) {
        if (agendaId == null || req == null || req.usuarioId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Datos incompletos para actualizar agenda"));
        }
        try {
            AgendaSnapshot snapshot = fetchAgendaSnapshot(agendaId, true);
            if (snapshot == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Agenda no encontrada"));
            }
            Integer vinculoId = req.vinculoId() != null ? req.vinculoId() : snapshot.vinculoId();
            if (!existeVinculoMedicoCentro(vinculoId)) {
                return ResponseEntity.badRequest().body(Map.of("message", "El vínculo médico/centro no existe"));
            }
            LocalDate fecha = req.fecha() != null ? parseIsoDate(req.fecha(), "fecha") : snapshot.fecha();
            Time horaInicio = req.horaInicio() != null ? parseSqlTime(req.horaInicio(), "horaInicio") : snapshot.horaInicio();
            Time horaFin = req.horaFin() != null ? parseSqlTime(req.horaFin(), "horaFin") : snapshot.horaFin();
            String tipoAgenda = req.tipoAgenda() != null ? req.tipoAgenda().trim().toUpperCase() : snapshot.tipo();
            if (!tipoAgendaValido(tipoAgenda)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Tipo de agenda inválido"));
            }
            String estadoAgenda = req.estadoAgenda() != null ? req.estadoAgenda().trim().toUpperCase() : snapshot.estado();
            if (!estadoAgendaValido(estadoAgenda)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Estado de agenda inválido"));
            }
            int intervalo = req.intervaloMin() != null && req.intervaloMin() > 0 ? req.intervaloMin() : snapshot.intervaloMin();
            int capacidad = req.capacidadSlot() != null && req.capacidadSlot() > 0 ? req.capacidadSlot() : snapshot.capacidadSlot();
            int duracion = req.duracionRealMin() != null && req.duracionRealMin() > 0 ? req.duracionRealMin() : snapshot.duracionRealMin();
            Timestamp now = Timestamp.valueOf(LocalDateTime.now());
            String observaciones = req.observaciones() != null ? req.observaciones().trim() : (snapshot.observaciones() != null ? snapshot.observaciones() : "");
            jdbcTemplate.update(
                    "UPDATE agenda SET fch_agenda=?, hora_inicio=?, hora_fin=?, observaciones=?, fch_actualizacion_agenda=?, id_usuario_actualizador=?, nmb_tipo_agenda=?, nmb_std_agenda=?, intervalo_min=?, capacidad_slot=?, duracion_real_cita_min=?, id_medico_centro_especialidad=? WHERE id_agenda=?",
                    Date.valueOf(fecha),
                    horaInicio,
                    horaFin,
                    observaciones,
                    now,
                    req.usuarioId(),
                    tipoAgenda,
                    estadoAgenda,
                    intervalo,
                    capacidad,
                    duracion,
                    vinculoId,
                    agendaId
            );
            registrarBitacoraAgenda(agendaId, "ACTUALIZACION_AGENDA", snapshot.estado(), estadoAgenda, req.usuarioId(), "Actualización desde panel admin");
            return ResponseEntity.ok(Map.of("idAgenda", agendaId));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (Exception ex) {
            logger.error("Error actualizando agenda {}", agendaId, ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "No se pudo actualizar la agenda"));
        }
    }

    @Transactional
    @PostMapping("/agendas/{id}/generar-slots")
    public ResponseEntity<?> generarSlotsAgenda(@PathVariable("id") Integer agendaId,
                                                @RequestBody GenerarSlotsRequest req) {
        if (agendaId == null || req == null || req.usuarioId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Datos incompletos para generar slots"));
        }
        try {
            AgendaSnapshot snapshot = fetchAgendaSnapshot(agendaId, true);
            if (snapshot == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Agenda no encontrada"));
            }
            Integer slotsExistentes = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM agenda_slot WHERE id_agenda = ?",
                    Integer.class,
                    agendaId
            );
            if (slotsExistentes != null && slotsExistentes > 0) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "La agenda ya tiene slots generados"));
            }
            int generados = generarSlotsParaAgenda(snapshot);
            if (req.nuevoEstado() != null && !req.nuevoEstado().isBlank()) {
                String nuevoEstado = req.nuevoEstado().trim().toUpperCase();
                if (!estadoAgendaValido(nuevoEstado)) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Estado de agenda inválido"));
                }
                jdbcTemplate.update(
                        "UPDATE agenda SET nmb_std_agenda=?, fch_actualizacion_agenda=NOW(), id_usuario_actualizador=? WHERE id_agenda=?",
                        nuevoEstado, req.usuarioId(), agendaId
                );
            } else {
                jdbcTemplate.update(
                        "UPDATE agenda SET fch_actualizacion_agenda=NOW(), id_usuario_actualizador=? WHERE id_agenda=?",
                        req.usuarioId(), agendaId
                );
            }
            registrarBitacoraAgenda(agendaId, "GENERACION_SLOTS", null, String.valueOf(generados), req.usuarioId(), "Generación manual de slots");
            return ResponseEntity.ok(Map.of("slotsGenerados", generados));
        } catch (Exception ex) {
            logger.error("Error generando slots para agenda {}", agendaId, ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "No se pudieron generar los slots"));
        }
    }

    @Transactional
    @PutMapping("/agendas/{id}/estado")
    public ResponseEntity<?> cambiarEstadoAgenda(@PathVariable("id") Integer agendaId,
                                                 @RequestBody CambiarEstadoAgendaRequest req) {
        if (agendaId == null || req == null || req.usuarioId() == null || req.nuevoEstado() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Datos incompletos para cambiar estado"));
        }
        String nuevoEstado = req.nuevoEstado().trim().toUpperCase();
        if (!estadoAgendaValido(nuevoEstado)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Estado de agenda inválido"));
        }
        try {
            AgendaSnapshot snapshot = fetchAgendaSnapshot(agendaId, true);
            if (snapshot == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Agenda no encontrada"));
            }
            jdbcTemplate.update(
                    "UPDATE agenda SET nmb_std_agenda=?, fch_actualizacion_agenda=NOW(), id_usuario_actualizador=? WHERE id_agenda=?",
                    nuevoEstado, req.usuarioId(), agendaId
            );
            if ("INHABILITADA".equalsIgnoreCase(nuevoEstado)) {
                jdbcTemplate.update(
                        """
                                UPDATE agenda_slot s
                                LEFT JOIN citas c ON c.id_slot = s.id_slot
                                SET s.std_slot = 'BLOQUEADO'
                                WHERE s.id_agenda = ? AND c.id_cita IS NULL
                                """,
                        agendaId
                );
            }
            registrarBitacoraAgenda(agendaId, "CAMBIO_ESTADO_AGENDA", snapshot.estado(), nuevoEstado, req.usuarioId(), "Cambio de estado manual");
            return ResponseEntity.ok(Map.of("idAgenda", agendaId, "estado", nuevoEstado));
        } catch (Exception ex) {
            logger.error("Error cambiando estado de agenda {}", agendaId, ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "No se pudo cambiar el estado"));
        }
    }

    // ---- USUARIOS / MEDICOS / CENTROS ----

    @GetMapping("/usuarios")
    public ResponseEntity<?> listarUsuarios(
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "estado", required = false) String estado,
            @RequestParam(name = "rol", required = false) String rol,
            @RequestParam(name = "tipo", required = false) String tipo,
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "size", defaultValue = "20") int size
    ) {
        int pageSize = Math.max(1, Math.min(size, 100));
        int pageNumber = Math.max(1, page);
        int offset = (pageNumber - 1) * pageSize;
        StringBuilder base = new StringBuilder(
                """
                        FROM usuario u
                        LEFT JOIN documento d ON d.id_documento = u.id_documento
                        LEFT JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
                        LEFT JOIN rol r ON r.id_rol = ur.id_rol
                        WHERE 1=1
                        """
        );
        List<Object> params = new ArrayList<>();
        if (q != null && !q.isBlank()) {
            base.append(" AND (u.nombre LIKE ? OR u.apellido LIKE ? OR u.nr_documento LIKE ? OR u.correo LIKE ?)");
            String like = "%" + q.trim() + "%";
            params.add(like);
            params.add(like);
            params.add(like);
            params.add(like);
        }
        if (estado != null && !estado.isBlank()) {
            base.append(" AND u.std_usuario = ?");
            params.add(estado.trim());
        }
        if (rol != null && !rol.isBlank()) {
            base.append("""
                    AND EXISTS (
                        SELECT 1 FROM usuario_rol ur2
                        JOIN rol r2 ON r2.id_rol = ur2.id_rol
                        WHERE ur2.id_usuario = u.id_usuario AND r2.nmb_rol = ?
                    )
                    """);
            params.add(rol.trim());
        }
        if (tipo != null && !tipo.isBlank()) {
            String filter = tipo.trim().toUpperCase();
            if ("PACIENTE".equals(filter)) {
                base.append(" AND EXISTS (SELECT 1 FROM paciente p WHERE p.id_paciente = u.id_usuario)");
            } else if ("MEDICO".equals(filter)) {
                base.append(" AND EXISTS (SELECT 1 FROM medico m WHERE m.id_usuario = u.id_usuario)");
            }
        }
        String countSql = "SELECT COUNT(DISTINCT u.id_usuario) " + base;
        long total = jdbcTemplate.queryForObject(countSql, Long.class, params.toArray());

        String dataSql = """
                SELECT
                    u.id_usuario,
                    u.nombre,
                    u.apellido,
                    u.correo,
                    u.telefono,
                    d.nmb_documento,
                    u.nr_documento,
                    u.std_usuario,
                    GROUP_CONCAT(DISTINCT r.nmb_rol ORDER BY r.nmb_rol SEPARATOR ', ') AS roles,
                    CASE WHEN EXISTS (SELECT 1 FROM paciente p WHERE p.id_paciente = u.id_usuario) THEN 1 ELSE 0 END AS es_paciente,
                    CASE WHEN EXISTS (SELECT 1 FROM medico m WHERE m.id_usuario = u.id_usuario) THEN 1 ELSE 0 END AS es_medico,
                    CASE WHEN EXISTS (SELECT 1 FROM verificacion_contacto vc WHERE vc.id_usuario = u.id_usuario AND vc.canal = 'EMAIL' AND vc.usado = 1) THEN 1 ELSE 0 END AS correo_verificado,
                    CASE WHEN EXISTS (SELECT 1 FROM verificacion_contacto vc WHERE vc.id_usuario = u.id_usuario AND vc.canal IN ('SMS','TELEFONO') AND vc.usado = 1) THEN 1 ELSE 0 END AS telefono_verificado,
                    u.fch_registro_usuario
                """ + base +
                " GROUP BY u.id_usuario ORDER BY u.apellido, u.nombre LIMIT ? OFFSET ?";
        List<Object> dataParams = new ArrayList<>(params);
        dataParams.add(pageSize);
        dataParams.add(offset);
        List<Map<String, Object>> items = jdbcTemplate.query(dataSql, ps -> {
            for (int i = 0; i < dataParams.size(); i++) {
                ps.setObject(i + 1, dataParams.get(i));
            }
        }, (rs, i) -> {
            Map<String, Object> row = new HashMap<>();
            row.put("id", rs.getInt("id_usuario"));
            String nombre = rs.getString("nombre");
            String apellido = rs.getString("apellido");
            row.put("nombre", join(nombre, apellido));
            String docNombre = rs.getString("nmb_documento");
            String nro = rs.getString("nr_documento");
            row.put("documento", docNombre != null ? docNombre + " " + (nro != null ? nro : "") : (nro != null ? nro : ""));
            row.put("correo", rs.getString("correo"));
            row.put("telefono", rs.getString("telefono"));
            row.put("estado", rs.getString("std_usuario"));
            String rolesStr = rs.getString("roles");
            row.put("roles", rolesStr != null && !rolesStr.isBlank() ? rolesStr.split(", ") : new String[0]);
            List<String> tipoList = new ArrayList<>();
            if (rs.getInt("es_paciente") == 1) tipoList.add("PACIENTE");
            if (rs.getInt("es_medico") == 1) tipoList.add("MÉDICO");
            row.put("tipo", tipoList);
            row.put("correoVerificado", rs.getInt("correo_verificado") == 1);
            row.put("telefonoVerificado", rs.getInt("telefono_verificado") == 1);
            TimeStampToString(row, "fch_registro_usuario", rs.getTimestamp("fch_registro_usuario"));
            return row;
        });
        return ResponseEntity.ok(new UsuarioListResponse(items, total, pageNumber, pageSize));
    }

    @GetMapping("/usuarios/opciones")
    public ResponseEntity<?> opcionesUsuario() {
        Map<String, Object> data = new HashMap<>();
        data.put("documentos", jdbcTemplate.query(
                "SELECT id_documento AS id, nmb_documento AS nombre FROM documento ORDER BY nmb_documento",
                (rs, i) -> Map.of("id", rs.getInt("id"), "nombre", rs.getString("nombre"))
        ));
        data.put("paises", jdbcTemplate.query(
                "SELECT id_pais AS id, nmb_pais AS nombre FROM pais ORDER BY nmb_pais",
                (rs, i) -> Map.of("id", rs.getInt("id"), "nombre", rs.getString("nombre"))
        ));
        data.put("roles", jdbcTemplate.query(
                "SELECT id_rol AS id, nmb_rol AS nombre FROM rol ORDER BY nmb_rol",
                (rs, i) -> Map.of("id", rs.getInt("id"), "nombre", rs.getString("nombre"))
        ));
        data.put("estados", jdbcTemplate.query(
                "SELECT std_usuario FROM std_usuario ORDER BY std_usuario",
                (rs, i) -> rs.getString(1)
        ));
        return ResponseEntity.ok(data);
    }

    @GetMapping("/usuarios/{id}")
    public ResponseEntity<?> detalleUsuario(@PathVariable("id") Integer idUsuario) {
        if (idUsuario == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Falta idUsuario"));
        }
        Map<String, Object> usuario = jdbcTemplate.query(
                """
                        SELECT u.id_usuario,
                               u.nombre,
                               u.apellido,
                               u.sexo,
                               u.nr_documento,
                               u.fch_nacimiento,
                               u.correo,
                               u.telefono,
                               u.fch_registro_usuario,
                               u.fch_actualizacion_usuario,
                               u.id_usuario_creador,
                               u.id_usuario_actualizador,
                               u.id_documento,
                               d.nmb_documento,
                               u.id_pais,
                               p.nmb_pais,
                               u.std_usuario
                        FROM usuario u
                        JOIN documento d ON d.id_documento = u.id_documento
                        JOIN pais p ON p.id_pais = u.id_pais
                        WHERE u.id_usuario = ?
                        """,
                ps -> ps.setInt(1, idUsuario),
                rs -> {
                    if (!rs.next()) return null;
                    Map<String, Object> row = new HashMap<>();
                    row.put("id", rs.getInt("id_usuario"));
                    row.put("nombre", rs.getString("nombre"));
                    row.put("apellido", rs.getString("apellido"));
                    row.put("sexo", rs.getString("sexo"));
                    row.put("numeroDocumento", rs.getString("nr_documento"));
                    Date fchNac = rs.getDate("fch_nacimiento");
                    row.put("fechaNacimiento", fchNac != null ? fchNac.toString() : null);
                    row.put("correo", rs.getString("correo"));
                    row.put("telefono", rs.getString("telefono"));
                    Timestamp registro = rs.getTimestamp("fch_registro_usuario");
                    row.put("fchRegistro", registro != null ? registro.toString() : null);
                    Timestamp actualizacion = rs.getTimestamp("fch_actualizacion_usuario");
                    row.put("fchActualizacion", actualizacion != null ? actualizacion.toString() : null);
                    row.put("idUsuarioCreador", rs.getObject("id_usuario_creador"));
                    row.put("idUsuarioActualizador", rs.getObject("id_usuario_actualizador"));
                    row.put("idDocumento", rs.getInt("id_documento"));
                    row.put("tipoDocumento", rs.getString("nmb_documento"));
                    row.put("idPais", rs.getInt("id_pais"));
                    row.put("pais", rs.getString("nmb_pais"));
                    row.put("estado", rs.getString("std_usuario"));
                    return row;
                }
        );
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Usuario no encontrado"));
        }
        List<String> roles = jdbcTemplate.query(
                "SELECT r.nmb_rol FROM usuario_rol ur JOIN rol r ON r.id_rol = ur.id_rol WHERE ur.id_usuario = ? ORDER BY r.nmb_rol",
                ps -> ps.setInt(1, idUsuario),
                (rs, i) -> rs.getString(1)
        );
        Map<String, Object> vinculos = Map.of(
                "esPaciente", jdbcTemplate.queryForObject("SELECT COUNT(*) FROM paciente WHERE id_paciente = ?", Integer.class, idUsuario) > 0,
                "esMedico", jdbcTemplate.queryForObject("SELECT COUNT(*) FROM medico WHERE id_usuario = ?", Integer.class, idUsuario) > 0
        );
        List<Map<String, Object>> verificaciones = jdbcTemplate.query(
                """
                        SELECT canal, destino, fch_emitido, fch_expira, usado
                        FROM verificacion_contacto
                        WHERE id_usuario = ?
                        ORDER BY fch_emitido DESC
                        LIMIT 5
                        """,
                ps -> ps.setInt(1, idUsuario),
                (rs, i) -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("canal", rs.getString("canal"));
                    row.put("destino", rs.getString("destino"));
                    Timestamp emitido = rs.getTimestamp("fch_emitido");
                    row.put("fchEmitido", emitido != null ? emitido.toString() : null);
                    Timestamp expira = rs.getTimestamp("fch_expira");
                    row.put("fchExpira", expira != null ? expira.toString() : null);
                    row.put("usado", rs.getInt("usado") == 1);
                    return row;
                }
        );
        Map<String, Object> consentimiento = jdbcTemplate.query(
                """
                        SELECT finalidad, otorgado, fch_evento
                        FROM consentimiento_tratamiento
                        WHERE id_usuario = ?
                        ORDER BY fch_evento DESC
                        LIMIT 1
                        """,
                ps -> ps.setInt(1, idUsuario),
                rs -> {
                    if (!rs.next()) return null;
                    Map<String, Object> row = new HashMap<>();
                    row.put("finalidad", rs.getString("finalidad"));
                    row.put("otorgado", rs.getString("otorgado"));
                    Timestamp fch = rs.getTimestamp("fch_evento");
                    row.put("fchEvento", fch != null ? fch.toString() : null);
                    return row;
                }
        );
        Map<String, Object> result = new HashMap<>();
        result.put("usuario", usuario);
        result.put("roles", roles);
        result.put("vinculos", vinculos);
        result.put("verificaciones", verificaciones);
        result.put("consentimiento", consentimiento);
        return ResponseEntity.ok(result);
    }

    @Transactional
    @PostMapping("/usuarios")
    public ResponseEntity<?> crearUsuario(@RequestBody CrearUsuarioRequest req) {
        if (req == null || req.adminId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Falta información del administrador"));
        }
        if (req.nombre() == null || req.apellido() == null || req.idDocumento() == null || req.numeroDocumento() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Datos obligatorios incompletos"));
        }
        if (documentoExiste(req.numeroDocumento(), req.idDocumento(), null)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "El documento ya está registrado"));
        }
        if (correoExiste(req.correo(), null)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "El correo ya está registrado"));
        }
        try {
            LocalDate fchNac = req.fechaNacimiento() != null && !req.fechaNacimiento().isBlank() ? LocalDate.parse(req.fechaNacimiento()) : null;
            Timestamp now = Timestamp.valueOf(LocalDateTime.now());
            KeyHolder keyHolder = new GeneratedKeyHolder();
            String hashed = hashPassword(req.password());
            jdbcTemplate.update(conn -> {
                PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO usuario (nombre, apellido, sexo, nr_documento, fch_nacimiento, correo, telefono, contrasena_hash, fch_registro_usuario, fch_actualizacion_usuario, id_usuario_creador, id_usuario_actualizador, id_documento, std_usuario, id_pais) " +
                                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        Statement.RETURN_GENERATED_KEYS
                );
                ps.setString(1, req.nombre().trim());
                ps.setString(2, req.apellido().trim());
                ps.setString(3, req.sexo());
                ps.setString(4, req.numeroDocumento().trim());
                if (fchNac != null) {
                    ps.setDate(5, Date.valueOf(fchNac));
                } else {
                    ps.setNull(5, java.sql.Types.DATE);
                }
                ps.setString(6, req.correo());
                ps.setString(7, req.telefono());
                ps.setString(8, hashed);
                ps.setTimestamp(9, now);
                ps.setTimestamp(10, now);
                ps.setInt(11, req.adminId());
                ps.setInt(12, req.adminId());
                ps.setInt(13, req.idDocumento());
                ps.setString(14, req.estado() != null ? req.estado() : "ACTIVO");
                ps.setInt(15, req.idPais());
                return ps;
            }, keyHolder);
            Number key = keyHolder.getKey();
            if (key == null) throw new IllegalStateException("No se pudo generar el identificador del usuario");
            int userId = key.intValue();
            asignarRolesUsuario(userId, req.roles(), req.adminId());
            registrarBitacoraUsuario(userId, "CREATE", "Creación de usuario desde admin", null, null, req.adminId());
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("idUsuario", userId));
        } catch (Exception ex) {
            logger.error("Error creando usuario", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "No se pudo crear el usuario"));
        }
    }

    @Transactional
    @PutMapping("/usuarios/{id}")
    public ResponseEntity<?> actualizarUsuario(@PathVariable("id") Integer idUsuario,
                                               @RequestBody ActualizarUsuarioRequest req) {
        if (idUsuario == null || req == null || req.adminId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Datos incompletos"));
        }
        if (documentoExiste(req.numeroDocumento(), req.idDocumento(), idUsuario)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "El documento ya está asociado a otro usuario"));
        }
        if (correoExiste(req.correo(), idUsuario)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "El correo ya está asociado a otro usuario"));
        }
        try {
            LocalDate fchNac = req.fechaNacimiento() != null && !req.fechaNacimiento().isBlank() ? LocalDate.parse(req.fechaNacimiento()) : null;
            jdbcTemplate.update(
                    "UPDATE usuario SET nombre=?, apellido=?, sexo=?, nr_documento=?, fch_nacimiento=?, correo=?, telefono=?, id_documento=?, id_pais=?, std_usuario=?, fch_actualizacion_usuario=NOW(), id_usuario_actualizador=? WHERE id_usuario=?",
                    req.nombre(),
                    req.apellido(),
                    req.sexo(),
                    req.numeroDocumento(),
                    fchNac != null ? Date.valueOf(fchNac) : null,
                    req.correo(),
                    req.telefono(),
                    req.idDocumento(),
                    req.idPais(),
                    req.estado(),
                    req.adminId(),
                    idUsuario
            );
            registrarBitacoraUsuario(idUsuario, "UPDATE", "Actualización de perfil desde admin", null, null, req.adminId());
            return ResponseEntity.ok(Map.of("idUsuario", idUsuario));
        } catch (Exception ex) {
            logger.error("Error actualizando usuario {}", idUsuario, ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "No se pudo actualizar el usuario"));
        }
    }

    @Transactional
    @PutMapping("/usuarios/{id}/roles")
    public ResponseEntity<?> actualizarRolesUsuario(@PathVariable("id") Integer idUsuario,
                                                    @RequestBody ActualizarRolesUsuarioRequest req) {
        if (idUsuario == null || req == null || req.adminId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Datos incompletos"));
        }
        asignarRolesUsuario(idUsuario, req.roles(), req.adminId());
        registrarBitacoraUsuario(idUsuario, "ROLES_UPDATE", "Actualización de roles", null, null, req.adminId());
        return ResponseEntity.ok(Map.of("idUsuario", idUsuario));
    }

    @Transactional
    @PatchMapping("/usuarios/{id}/estado")
    public ResponseEntity<?> cambiarEstadoUsuario(@PathVariable("id") Integer idUsuario,
                                                  @RequestBody CambiarEstadoUsuarioRequest req) {
        if (idUsuario == null || req == null || req.adminId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Datos incompletos"));
        }
        if (!estadoUsuarioValido(req.nuevoEstado())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Estado de usuario inválido"));
        }
        jdbcTemplate.update(
                "UPDATE usuario SET std_usuario=?, fch_actualizacion_usuario=NOW(), id_usuario_actualizador=? WHERE id_usuario=?",
                req.nuevoEstado(), req.adminId(), idUsuario
        );
        registrarBitacoraUsuario(idUsuario, "CAMBIO_ESTADO", "Cambio de estado desde admin", null, req.nuevoEstado(), req.adminId());
        return ResponseEntity.ok(Map.of("idUsuario", idUsuario, "estado", req.nuevoEstado()));
    }

    @Transactional
    @PostMapping("/usuarios/{id}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable("id") Integer idUsuario,
                                           @RequestBody ResetPasswordRequest req) {
        if (idUsuario == null || req == null || req.adminId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Datos incompletos"));
        }
        String nuevaClave = req.nuevaClave() != null && !req.nuevaClave().isBlank() ? req.nuevaClave() : randomPassword();
        String hashed = hashPassword(nuevaClave);
        jdbcTemplate.update(
                "UPDATE usuario SET contrasena_hash=?, fch_actualizacion_usuario=NOW(), id_usuario_actualizador=? WHERE id_usuario=?",
                hashed, req.adminId(), idUsuario
        );
        registrarBitacoraUsuario(idUsuario, "RESET_PASSWORD", "Reset de contraseña desde admin", null, null, req.adminId());
        return ResponseEntity.ok(Map.of("tempPassword", nuevaClave));
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



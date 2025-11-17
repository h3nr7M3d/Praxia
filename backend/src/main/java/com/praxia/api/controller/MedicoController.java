package com.praxia.api.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PatchMapping;

import java.sql.Date;
import java.sql.Time;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/medico")
public class MedicoController {

    private final JdbcTemplate jdbcTemplate;

    public MedicoController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public record CrearAgendaMedicoRequest(
            Integer usuarioId,
            Integer mceId,
            String fecha,
            String horaInicio,
            String horaFin,
            String tipoAgenda,
            String estadoAgenda,
            Integer intervaloMin,
            Integer capacidadSlot,
            Integer duracionRealMin,
            Boolean generarSlots,
            String observaciones
    ) {}

    public record ActualizarAgendaMedicoRequest(
            Integer usuarioId,
            String horaInicio,
            String horaFin,
            Integer intervaloMin,
            Integer capacidadSlot,
            Integer duracionRealMin,
            String estadoAgenda,
            String observaciones
    ) {}

    public record CambiarEstadoAgendaMedicoRequest(Integer usuarioId, String nuevoEstado) {}

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard(@RequestParam("usuarioId") Integer usuarioId) {
        if (usuarioId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Falta usuarioId"));
        }
        Map<String, Object> medico = fetchMedico(usuarioId);
        if (medico == null || medico.get("idMedico") == null) {
            return ResponseEntity.status(404).body(Map.of("message", "No se encontrÃ³ mÃ©dico para el usuario"));
        }
        Integer idMedico = (Integer) medico.get("idMedico");
        Map<String, Object> response = new HashMap<>();
        response.put("medico", medico);
        response.put("proximasCitas", listarProximas(idMedico));
        response.put("resumenHoy", resumenHoy(idMedico));
        response.put("salaEspera", salaEspera(idMedico));
        response.put("agendasHoy", agendasHoy(idMedico));
        response.put("reporteSemanal", resumenSemanal(idMedico));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/contexto")
    public ResponseEntity<?> contexto(@RequestParam("usuarioId") Integer usuarioId) {
        if (usuarioId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Falta usuarioId"));
        }
        Map<String, Object> medico = fetchMedico(usuarioId);
        if (medico == null || medico.get("idMedico") == null) {
            return ResponseEntity.status(404).body(Map.of("message", "No se encontrÃ³ mÃ©dico para el usuario"));
        }
        Integer idMedico = (Integer) medico.get("idMedico");
        List<Map<String, Object>> mces = listarMceMedico(idMedico);
        List<Map<String, Object>> centros = mces.stream()
                .collect(Collectors.toMap(
                        m -> (Integer) m.get("centroId"),
                        m -> Map.of("id", m.get("centroId"), "nombre", m.get("centro")),
                        (a, b) -> a))
                .values().stream().collect(Collectors.toList());
        List<Map<String, Object>> especialidades = mces.stream()
                .collect(Collectors.toMap(
                        m -> (Integer) m.get("especialidadId"),
                        m -> Map.of("id", m.get("especialidadId"), "nombre", m.get("especialidad")),
                        (a, b) -> a))
                .values().stream().collect(Collectors.toList());
        Map<String, Object> body = new HashMap<>();
        body.put("medico", medico);
        body.put("mces", mces);
        body.put("centros", centros);
        body.put("especialidades", especialidades);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/agendas/semana")
    public ResponseEntity<?> agendasSemana(
            @RequestParam("usuarioId") Integer usuarioId,
            @RequestParam("mceId") Integer mceId,
            @RequestParam("desde") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam("hasta") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta
    ) {
        if (usuarioId == null || mceId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Faltan datos"));
        }
        Map<String, Object> medico = fetchMedico(usuarioId);
        if (medico == null || medico.get("idMedico") == null) {
            return ResponseEntity.status(404).body(Map.of("message", "No se encontrÃ³ mÃ©dico para el usuario"));
        }
        Integer idMedico = (Integer) medico.get("idMedico");
        if (!perteneceMceAlMedico(mceId, idMedico)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "No pertenece al mÃ©dico"));
        }
        LocalDate start = desde != null ? desde : LocalDate.now().with(DayOfWeek.MONDAY);
        LocalDate end = hasta != null ? hasta : start.plusDays(6);
        String sql = """
                SELECT a.id_agenda,
                       a.fch_agenda,
                       a.hora_inicio,
                       a.hora_fin,
                       a.nmb_tipo_agenda,
                       a.nmb_std_agenda,
                       COUNT(s.id_slot) AS slots_totales,
                       SUM(CASE WHEN s.std_slot='OCUPADO' OR s.ocupados > 0 THEN 1 ELSE 0 END) AS slots_ocupados
                FROM agenda a
                LEFT JOIN agenda_slot s ON s.id_agenda = a.id_agenda
                WHERE a.id_medico_centro_especialidad = ?
                  AND a.fch_agenda BETWEEN ? AND ?
                GROUP BY a.id_agenda
                ORDER BY a.fch_agenda, a.hora_inicio
                """;
        List<Map<String, Object>> agendas = jdbcTemplate.query(sql,
                ps -> {
                    ps.setInt(1, mceId);
                    ps.setDate(2, Date.valueOf(start));
                    ps.setDate(3, Date.valueOf(end));
                },
                (rs, i) -> {
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
                });
        Map<String, List<Map<String, Object>>> agrupado = agendas.stream()
                .collect(Collectors.groupingBy(a -> (String) a.get("fecha")));
        List<Map<String, Object>> dias = new ArrayList<>();
        LocalDate cursor = start;
        while (!cursor.isAfter(end)) {
            String key = cursor.toString();
            List<Map<String, Object>> dayAgendas = agrupado.getOrDefault(key, new ArrayList<>());
            dias.add(Map.of("fecha", key, "agendas", dayAgendas));
            cursor = cursor.plusDays(1);
        }
        return ResponseEntity.ok(Map.of(
                "dias", dias,
                "total", agendas.size()
        ));
    }

    @GetMapping("/agendas")
    public ResponseEntity<?> listarAgendasMedico(
            @RequestParam("usuarioId") Integer usuarioId,
            @RequestParam("mceId") Integer mceId
    ) {
        if (usuarioId == null || mceId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Faltan datos"));
        }
        Map<String, Object> medico = fetchMedico(usuarioId);
        if (medico == null || medico.get("idMedico") == null) {
            return ResponseEntity.status(404).body(Map.of("message", "No se encontrÃ³ mÃ©dico para el usuario"));
        }
        Integer idMedico = (Integer) medico.get("idMedico");
        if (!perteneceMceAlMedico(mceId, idMedico)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "No pertenece al mÃ©dico"));
        }
        String sql = """
                SELECT a.id_agenda,
                       a.fch_agenda,
                       a.hora_inicio,
                       a.hora_fin,
                       a.nmb_tipo_agenda,
                       a.nmb_std_agenda,
                       a.nmb_tipo_agenda AS modalidad,
                       cm.nmb_centro_medico,
                       esp.nmb_especialidad,
                       COUNT(s.id_slot) AS slots_totales,
                       SUM(CASE WHEN s.std_slot='OCUPADO' OR s.ocupados > 0 THEN 1 ELSE 0 END) AS slots_ocupados
                FROM agenda a
                JOIN medico_centro_especialidad mce ON mce.id_medico_centro_especialidad = a.id_medico_centro_especialidad
                JOIN centro_medico cm ON cm.id_centro_medico = mce.id_centro_medico
                JOIN especialidad esp ON esp.id_especialidad = mce.id_especialidad
                LEFT JOIN agenda_slot s ON s.id_agenda = a.id_agenda
                WHERE a.id_medico_centro_especialidad = ?
                GROUP BY a.id_agenda
                ORDER BY a.fch_agenda, a.hora_inicio
                """;
        List<Map<String, Object>> items = jdbcTemplate.query(sql,
                ps -> ps.setInt(1, mceId),
                (rs, i) -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("idAgenda", rs.getInt("id_agenda"));
                    Date fecha = rs.getDate("fch_agenda");
                    row.put("fecha", fecha != null ? fecha.toString() : null);
                    row.put("horaInicio", formatTime(rs.getTime("hora_inicio")));
                    row.put("horaFin", formatTime(rs.getTime("hora_fin")));
                    row.put("tipo", rs.getString("nmb_tipo_agenda"));
                    row.put("estado", rs.getString("nmb_std_agenda"));
                    row.put("modalidad", rs.getString("modalidad"));
                    row.put("centro", rs.getString("nmb_centro_medico"));
                    row.put("especialidad", rs.getString("nmb_especialidad"));
                    row.put("slotsTotales", rs.getInt("slots_totales"));
                    row.put("slotsOcupados", rs.getInt("slots_ocupados"));
                    return row;
                });
        return ResponseEntity.ok(items);
    }

    @GetMapping("/agendas/{id}/detalle")
    public ResponseEntity<?> detalleAgendaMedico(
            @PathVariable("id") Integer agendaId,
            @RequestParam("usuarioId") Integer usuarioId
    ) {
        if (agendaId == null || usuarioId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Datos incompletos"));
        }
        Map<String, Object> medico = fetchMedico(usuarioId);
        if (medico == null || medico.get("idMedico") == null) {
            return ResponseEntity.status(404).body(Map.of("message", "No se encontrÃ³ mÃ©dico para el usuario"));
        }
        Integer idMedico = (Integer) medico.get("idMedico");
        Map<String, Object> agendaInfo = fetchAgendaInfo(agendaId);
        if (agendaInfo == null || !idMedico.equals(agendaInfo.get("idMedico"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Agenda no pertenece al mÃ©dico"));
        }
        List<Map<String, Object>> slots = jdbcTemplate.query(
                """
                        SELECT s.id_slot,
                               s.hora_inicio_slot,
                               s.hora_fin_slot,
                               s.capacidad,
                               s.ocupados,
                               s.std_slot,
                               c.id_cita,
                               CONCAT(u.nombre,' ',u.apellido) AS paciente,
                               c.nmb_std_cita
                        FROM agenda_slot s
                        LEFT JOIN citas c ON c.id_slot = s.id_slot
                        LEFT JOIN paciente p ON p.id_paciente = c.id_paciente
                        LEFT JOIN usuario u ON u.id_usuario = p.id_paciente
                        WHERE s.id_agenda = ?
                        ORDER BY s.hora_inicio_slot
                        """,
                ps -> ps.setInt(1, agendaId),
                (rs, i) -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("idSlot", rs.getInt("id_slot"));
                    row.put("horaInicio", formatTime(rs.getTime("hora_inicio_slot")));
                    row.put("horaFin", formatTime(rs.getTime("hora_fin_slot")));
                    row.put("capacidad", rs.getInt("capacidad"));
                    row.put("ocupados", rs.getInt("ocupados"));
                    row.put("estado", rs.getString("std_slot"));
                    row.put("idCita", rs.getObject("id_cita"));
                    row.put("paciente", rs.getString("paciente"));
                    row.put("estadoCita", rs.getString("nmb_std_cita"));
                    return row;
                }
        );
        return ResponseEntity.ok(Map.of("agenda", agendaInfo, "slots", slots));
    }

    @Transactional
    @PostMapping("/agendas")
    public ResponseEntity<?> crearAgendaMedico(@RequestBody CrearAgendaMedicoRequest req) {
        if (req == null || req.usuarioId() == null || req.mceId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Faltan datos para crear agenda"));
        }
        Map<String, Object> medico = fetchMedico(req.usuarioId());
        if (medico == null || medico.get("idMedico") == null) {
            return ResponseEntity.status(404).body(Map.of("message", "No se encontrÃ³ mÃ©dico"));
        }
        Integer idMedico = (Integer) medico.get("idMedico");
        if (!perteneceMceAlMedico(req.mceId(), idMedico)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "No pertenece al mÃ©dico"));
        }
        try {
            LocalDate fecha = LocalDate.parse(req.fecha());
            Time horaInicio = parseTime(req.horaInicio());
            Time horaFin = parseTime(req.horaFin());
            int intervalo = req.intervaloMin() != null ? req.intervaloMin() : 20;
            int capacidad = req.capacidadSlot() != null ? req.capacidadSlot() : 1;
            int duracion = req.duracionRealMin() != null ? req.duracionRealMin() : intervalo;
            String estado = req.estadoAgenda() != null ? req.estadoAgenda() : "ACTIVA";
                        Timestamp now = Timestamp.valueOf(LocalDateTime.now());

            KeyHolder keyHolder = new GeneratedKeyHolder();

            jdbcTemplate.update(conn -> {

                PreparedStatement ps = conn.prepareStatement(

                        "INSERT INTO agenda (fch_agenda, hora_inicio, hora_fin, observaciones, fch_registro_agenda, fch_actualizacion_agenda, id_usuario_creador, id_usuario_actualizador, nmb_std_agenda, id_medico_centro_especialidad, nmb_tipo_agenda, intervalo_min, capacidad_slot, duracion_real_cita_min) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",

                        Statement.RETURN_GENERATED_KEYS

                );

                ps.setDate(1, Date.valueOf(fecha));

                ps.setTime(2, horaInicio);

                ps.setTime(3, horaFin);

                ps.setString(4, req.observaciones() != null ? req.observaciones() : "");

                ps.setTimestamp(5, now);

                ps.setTimestamp(6, now);

                ps.setInt(7, req.usuarioId());

                ps.setInt(8, req.usuarioId());

                ps.setString(9, estado);

                ps.setInt(10, req.mceId());

                ps.setString(11, req.tipoAgenda() != null ? req.tipoAgenda() : "PUNTUAL");

                ps.setInt(12, intervalo);

                ps.setInt(13, capacidad);

                ps.setInt(14, duracion);

                return ps;

            }, keyHolder);

            Number key = keyHolder.getKey();

            if (key == null) throw new IllegalStateException("No se generó agenda");

            int agendaId = key.intValue();

            if (Boolean.TRUE.equals(req.generarSlots())) {

                generarSlots(agendaId, horaInicio, horaFin, intervalo, capacidad);

            }

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("idAgenda", agendaId));

        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", ex.getMessage()));
        }
    }

    @Transactional
    @PutMapping("/agendas/{id}")
    public ResponseEntity<?> actualizarAgendaMedico(@PathVariable("id") Integer agendaId,
                                                    @RequestBody ActualizarAgendaMedicoRequest req) {
        if (agendaId == null || req == null || req.usuarioId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Datos incompletos"));
        }
        Map<String, Object> medico = fetchMedico(req.usuarioId());
        if (medico == null || medico.get("idMedico") == null) {
            return ResponseEntity.status(404).body(Map.of("message", "No se encontrÃ³ mÃ©dico"));
        }
        Map<String, Object> agenda = fetchAgendaInfo(agendaId);
        if (agenda == null || !medico.get("idMedico").equals(agenda.get("idMedico"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Agenda no pertenece al mÃ©dico"));
        }
        try {
            Time horaInicio = req.horaInicio() != null ? parseTime(req.horaInicio()) : Time.valueOf(((String) agenda.get("horaInicio")) + ":00");
            Time horaFin = req.horaFin() != null ? parseTime(req.horaFin()) : Time.valueOf(((String) agenda.get("horaFin")) + ":00");
            int intervalo = req.intervaloMin() != null ? req.intervaloMin() : (Integer) agenda.getOrDefault("intervalo", 20);
            int capacidad = req.capacidadSlot() != null ? req.capacidadSlot() : (Integer) agenda.getOrDefault("capacidadSlot", 1);
            int duracion = req.duracionRealMin() != null ? req.duracionRealMin() : (Integer) agenda.getOrDefault("duracionReal", 20);
            String estado = req.estadoAgenda() != null ? req.estadoAgenda() : (String) agenda.get("estado");
            jdbcTemplate.update(
                    "UPDATE agenda SET hora_inicio=?, hora_fin=?, intervalo_min=?, capacidad_slot=?, duracion_real_cita_min=?, nmb_std_agenda=?, observaciones=?, fch_actualizacion_agenda=NOW(), id_usuario_actualizador=? WHERE id_agenda=?",
                    horaInicio, horaFin, intervalo, capacidad, duracion, estado, req.observaciones(), req.usuarioId(), agendaId
            );
            return ResponseEntity.ok(Map.of("idAgenda", agendaId));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", ex.getMessage()));
        }
    }

    @Transactional
    @PatchMapping("/agendas/{id}/estado")
    public ResponseEntity<?> cambiarEstadoAgendaMedico(@PathVariable("id") Integer agendaId,
                                                       @RequestBody CambiarEstadoAgendaMedicoRequest req) {
        if (agendaId == null || req == null || req.usuarioId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Datos incompletos"));
        }
        Map<String, Object> medico = fetchMedico(req.usuarioId());
        if (medico == null || medico.get("idMedico") == null) {
            return ResponseEntity.status(404).body(Map.of("message", "No se encontrÃ³ mÃ©dico"));
        }
        Map<String, Object> agenda = fetchAgendaInfo(agendaId);
        if (agenda == null || !medico.get("idMedico").equals(agenda.get("idMedico"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Agenda no pertenece al mÃ©dico"));
        }
        jdbcTemplate.update(
                "UPDATE agenda SET nmb_std_agenda=?, fch_actualizacion_agenda=NOW(), id_usuario_actualizador=? WHERE id_agenda=?",
                req.nuevoEstado(), req.usuarioId(), agendaId
        );
        return ResponseEntity.ok(Map.of("idAgenda", agendaId, "estado", req.nuevoEstado()));
    }

    private Map<String, Object> fetchMedico(Integer usuarioId) {
        String sql = """
                SELECT m.id_medico,
                       u.nombre,
                       u.apellido,
                       m.cmp,
                       m.std_medico
                FROM medico m
                JOIN usuario u ON u.id_usuario = m.id_usuario
                WHERE u.id_usuario = ?
                """;
        return jdbcTemplate.query(sql, ps -> ps.setInt(1, usuarioId), rs -> {
            if (!rs.next()) return null;
            Map<String, Object> info = new HashMap<>();
            int idMedico = rs.getInt("id_medico");
            info.put("idMedico", idMedico);
            String nombre = rs.getString("nombre");
            String apellido = rs.getString("apellido");
            info.put("nombre", nombre);
            info.put("apellido", apellido);
            info.put("nombreCompleto", join(nombre, apellido));
            info.put("cmp", rs.getString("cmp"));
            info.put("estado", rs.getString("std_medico"));
            List<Map<String, Object>> especialidades = jdbcTemplate.query(
                    """
                            SELECT mce.id_medico_centro_especialidad,
                                   esp.nmb_especialidad,
                                   cm.nmb_centro_medico,
                                   mce.esp_principal
                            FROM medico_centro_especialidad mce
                            JOIN especialidad esp ON esp.id_especialidad = mce.id_especialidad
                            JOIN centro_medico cm ON cm.id_centro_medico = mce.id_centro_medico
                            WHERE mce.id_medico = ?
                              AND CURRENT_DATE BETWEEN mce.vigente_desde AND mce.vigente_hasta
                            ORDER BY mce.esp_principal DESC, esp.nmb_especialidad
                            """,
                    (ps) -> ps.setInt(1, idMedico),
                    (rs2, i) -> {
                        Map<String, Object> item = new HashMap<>();
                        item.put("vinculoId", rs2.getInt("id_medico_centro_especialidad"));
                        item.put("especialidad", rs2.getString("nmb_especialidad"));
                        item.put("centro", rs2.getString("nmb_centro_medico"));
                        item.put("principal", rs2.getInt("esp_principal") == 1);
                        return item;
                    }
            );
            info.put("vinculos", especialidades);
            Optional<Map<String, Object>> principal = especialidades.stream().filter(v -> Boolean.TRUE.equals(v.get("principal"))).findFirst();
            principal.ifPresent(map -> {
                info.put("especialidadPrincipal", map.get("especialidad"));
                info.put("centroPrincipal", map.get("centro"));
            });
            return info;
        });
    }

    private List<Map<String, Object>> listarProximas(Integer idMedico) {
        String sql = """
                SELECT c.id_cita,
                       a.fch_agenda,
                       c.hora_inicio_cita,
                       c.hora_fin_cita,
                       CONCAT(pu.nombre,' ',pu.apellido) AS paciente,
                       cm.nmb_centro_medico,
                       esp.nmb_especialidad,
                       c.nmb_std_cita
                FROM medico med
                JOIN medico_centro_especialidad mce ON mce.id_medico = med.id_medico
                JOIN agenda a ON a.id_medico_centro_especialidad = mce.id_medico_centro_especialidad
                JOIN citas c ON c.id_agenda = a.id_agenda
                JOIN paciente pac ON pac.id_paciente = c.id_paciente
                JOIN usuario pu ON pu.id_usuario = pac.id_paciente
                JOIN centro_medico cm ON cm.id_centro_medico = mce.id_centro_medico
                JOIN especialidad esp ON esp.id_especialidad = mce.id_especialidad
                WHERE med.id_medico = ?
                  AND (a.fch_agenda > CURRENT_DATE
                       OR (a.fch_agenda = CURRENT_DATE AND c.hora_fin_cita >= CURRENT_TIME))
                  AND c.nmb_std_cita IN ('RESERVADA','CONFIRMADA')
                ORDER BY a.fch_agenda, c.hora_inicio_cita
                LIMIT 5
                """;
        return jdbcTemplate.query(sql, ps -> ps.setInt(1, idMedico), (rs, i) -> {
            Map<String, Object> row = new HashMap<>();
            row.put("id", rs.getInt("id_cita"));
            Date fecha = rs.getDate("fch_agenda");
            row.put("fecha", fecha != null ? fecha.toString() : null);
            row.put("horaInicio", formatTime(rs.getTime("hora_inicio_cita")));
            row.put("horaFin", formatTime(rs.getTime("hora_fin_cita")));
            row.put("paciente", rs.getString("paciente"));
            row.put("centro", rs.getString("nmb_centro_medico"));
            row.put("especialidad", rs.getString("nmb_especialidad"));
            row.put("estado", rs.getString("nmb_std_cita"));
            return row;
        });
    }

    private Map<String, Object> resumenHoy(Integer idMedico) {
        Map<String, Object> resumen = new HashMap<>();
        LinkedHashMap<String, Integer> porEstado = new LinkedHashMap<>();
        String sql = """
                SELECT c.nmb_std_cita, COUNT(*) AS cantidad
                FROM medico med
                JOIN medico_centro_especialidad mce ON mce.id_medico = med.id_medico
                JOIN agenda a ON a.id_medico_centro_especialidad = mce.id_medico_centro_especialidad
                JOIN citas c ON c.id_agenda = a.id_agenda
                WHERE med.id_medico = ?
                  AND a.fch_agenda = CURRENT_DATE
                GROUP BY c.nmb_std_cita
                """;
        List<Map<String, Object>> rows = jdbcTemplate.query(sql, ps -> ps.setInt(1, idMedico), (rs, i) -> {
            Map<String, Object> item = new HashMap<>();
            item.put("estado", rs.getString("nmb_std_cita"));
            item.put("cantidad", rs.getInt("cantidad"));
            return item;
        });
        List<Integer> total = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            String estado = (String) row.get("estado");
            Integer cantidad = (Integer) row.get("cantidad");
            if (estado != null && cantidad != null) {
                porEstado.put(estado, cantidad);
                total.add(cantidad);
            }
        }
        resumen.put("porEstado", porEstado);
        resumen.put("total", total.stream().mapToInt(Integer::intValue).sum());
        return resumen;
    }

    private Map<String, Object> salaEspera(Integer idMedico) {
        List<Map<String, Object>> pacientes = jdbcTemplate.query(
                """
                        SELECT c.id_cita,
                               CONCAT(pu.nombre,' ',pu.apellido) AS paciente,
                               c.hora_inicio_cita
                        FROM medico med
                        JOIN medico_centro_especialidad mce ON mce.id_medico = med.id_medico
                        JOIN agenda a ON a.id_medico_centro_especialidad = mce.id_medico_centro_especialidad
                        JOIN citas c ON c.id_agenda = a.id_agenda
                        JOIN paciente pac ON pac.id_paciente = c.id_paciente
                        JOIN usuario pu ON pu.id_usuario = pac.id_paciente
                        WHERE med.id_medico = ?
                          AND a.fch_agenda = CURRENT_DATE
                          AND c.nmb_std_cita = 'EN_ESPERA'
                        """,
                ps -> ps.setInt(1, idMedico),
                (rs, i) -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("id", rs.getInt("id_cita"));
                    row.put("paciente", rs.getString("paciente"));
                    row.put("horaInicio", formatTime(rs.getTime("hora_inicio_cita")));
                    return row;
                }
        );
        Map<String, Object> sala = new HashMap<>();
        sala.put("total", pacientes.size());
        sala.put("pacientes", pacientes);
        return sala;
    }

    private List<Map<String, Object>> agendasHoy(Integer idMedico) {
        String sql = """
                SELECT a.id_agenda,
                       a.hora_inicio,
                       a.hora_fin,
                       a.nmb_std_agenda,
                       a.nmb_tipo_agenda,
                       cm.nmb_centro_medico
                FROM agenda a
                JOIN medico_centro_especialidad mce ON a.id_medico_centro_especialidad = mce.id_medico_centro_especialidad
                JOIN centro_medico cm ON cm.id_centro_medico = mce.id_centro_medico
                WHERE mce.id_medico = ?
                  AND a.fch_agenda = CURRENT_DATE
                ORDER BY a.hora_inicio
                """;
        return jdbcTemplate.query(sql, ps -> ps.setInt(1, idMedico), (rs, i) -> {
            Map<String, Object> row = new HashMap<>();
            row.put("idAgenda", rs.getInt("id_agenda"));
            row.put("horaInicio", formatTime(rs.getTime("hora_inicio")));
            row.put("horaFin", formatTime(rs.getTime("hora_fin")));
            row.put("estado", rs.getString("nmb_std_agenda"));
            row.put("tipo", rs.getString("nmb_tipo_agenda"));
            row.put("centro", rs.getString("nmb_centro_medico"));
            return row;
        });
    }

    private List<Map<String, Object>> resumenSemanal(Integer idMedico) {
        String sql = """
                SELECT a.fch_agenda,
                       COUNT(*) AS total_citas
                FROM medico med
                JOIN medico_centro_especialidad mce ON mce.id_medico = med.id_medico
                JOIN agenda a ON a.id_medico_centro_especialidad = mce.id_medico_centro_especialidad
                JOIN citas c ON c.id_agenda = a.id_agenda
                WHERE med.id_medico = ?
                  AND a.fch_agenda BETWEEN (CURRENT_DATE - INTERVAL 3 DAY) AND (CURRENT_DATE + INTERVAL 3 DAY)
                GROUP BY a.fch_agenda
                ORDER BY a.fch_agenda
                """;
        return jdbcTemplate.query(sql, ps -> ps.setInt(1, idMedico), (rs, i) -> {
            Map<String, Object> row = new HashMap<>();
            Date fecha = rs.getDate("fch_agenda");
            row.put("fecha", fecha != null ? fecha.toString() : null);
            row.put("total", rs.getInt("total_citas"));
            return row;
        });
    }

    private List<Map<String, Object>> listarMceMedico(Integer idMedico) {
        String sql = """
                SELECT mce.id_medico_centro_especialidad,
                       cm.id_centro_medico,
                       cm.nmb_centro_medico,
                       esp.id_especialidad,
                       esp.nmb_especialidad,
                       t.nmb_tarifa,
                       mce.vigente_desde,
                       mce.vigente_hasta
                FROM medico_centro_especialidad mce
                JOIN centro_medico cm ON cm.id_centro_medico = mce.id_centro_medico
                JOIN especialidad esp ON esp.id_especialidad = mce.id_especialidad
                JOIN tarifa t ON t.id_tarifa = mce.id_tarifa
                WHERE mce.id_medico = ?
                ORDER BY cm.nmb_centro_medico, esp.nmb_especialidad
                """;
        return jdbcTemplate.query(sql, ps -> ps.setInt(1, idMedico), (rs, i) -> {
            Map<String, Object> row = new HashMap<>();
            row.put("idMce", rs.getInt("id_medico_centro_especialidad"));
            row.put("centroId", rs.getInt("id_centro_medico"));
            row.put("centro", rs.getString("nmb_centro_medico"));
            row.put("especialidadId", rs.getInt("id_especialidad"));
            row.put("especialidad", rs.getString("nmb_especialidad"));
            row.put("tarifa", rs.getString("nmb_tarifa"));
            Date desde = rs.getDate("vigente_desde");
            Date hasta = rs.getDate("vigente_hasta");
            row.put("vigenteDesde", desde != null ? desde.toString() : null);
            row.put("vigenteHasta", hasta != null ? hasta.toString() : null);
            return row;
        });
    }

    private boolean perteneceMceAlMedico(Integer mceId, Integer idMedico) {
        if (mceId == null || idMedico == null) return false;
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM medico_centro_especialidad WHERE id_medico_centro_especialidad = ? AND id_medico = ?",
                Integer.class,
                mceId, idMedico
        );
        return count != null && count > 0;
    }

    private Map<String, Object> fetchAgendaInfo(Integer agendaId) {
        String sql = """
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
                       mce.id_medico,
                       cm.nmb_centro_medico,
                       esp.nmb_especialidad
                FROM agenda a
                JOIN medico_centro_especialidad mce ON mce.id_medico_centro_especialidad = a.id_medico_centro_especialidad
                JOIN centro_medico cm ON cm.id_centro_medico = mce.id_centro_medico
                JOIN especialidad esp ON esp.id_especialidad = mce.id_especialidad
                WHERE a.id_agenda = ?
                """;
        return jdbcTemplate.query(sql, ps -> ps.setInt(1, agendaId), rs -> {
            if (!rs.next()) return null;
            Map<String, Object> row = new HashMap<>();
            row.put("idAgenda", rs.getInt("id_agenda"));
            row.put("idMedico", rs.getInt("id_medico"));
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
            row.put("centro", rs.getString("nmb_centro_medico"));
            row.put("especialidad", rs.getString("nmb_especialidad"));
            return row;
        });
    }

    private String formatTime(Time time) {
        if (time == null) return null;
        String value = time.toString();
        return value.length() >= 5 ? value.substring(0, 5) : value;
    }

    private Time parseTime(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Hora inválida");
        }
        String normalized = value.length() == 5 ? value + ":00" : value;
        return Time.valueOf(normalized);
    }

    private void generarSlots(Integer agendaId, Time inicio, Time fin, int intervalo, int capacidad) {
        if (agendaId == null || inicio == null || fin == null) return;
        LocalTime cursor = inicio.toLocalTime();
        LocalTime limite = fin.toLocalTime();
        while (cursor.isBefore(limite)) {
            LocalTime siguiente = cursor.plusMinutes(intervalo);
            if (!siguiente.isAfter(limite)) {
                jdbcTemplate.update(
                        "INSERT INTO agenda_slot (id_agenda, hora_inicio_slot, hora_fin_slot, capacidad, ocupados, std_slot) VALUES (?,?,?,?,0,'DISPONIBLE')",
                        agendaId,
                        Time.valueOf(cursor),
                        Time.valueOf(siguiente),
                        capacidad
                );
            }
            cursor = siguiente;
        }
    }

    private String join(String nombre, String apellido) {
        StringBuilder sb = new StringBuilder();
        if (nombre != null && !nombre.isBlank()) {
            sb.append(nombre.trim());
        }
        if (apellido != null && !apellido.isBlank()) {
            if (sb.length() > 0) sb.append(" ");
            sb.append(apellido.trim());
        }
        return sb.toString();
    }
}

package com.praxia.api.controller;

import com.praxia.api.service.ParametroService;
import com.praxia.api.service.NotificacionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Time;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/citas")
public class CitaController {

    private static final Logger logger = LoggerFactory.getLogger(CitaController.class);

    private final JdbcTemplate jdbcTemplate;
    private final ParametroService parametroService;
    private final NotificacionService notificacionService;

    public CitaController(JdbcTemplate jdbcTemplate,
                          ParametroService parametroService,
                          NotificacionService notificacionService) {
        this.jdbcTemplate = jdbcTemplate;
        this.parametroService = parametroService;
        this.notificacionService = notificacionService;
    }

    public record ReservarSlotRequest(Integer pacienteId, Integer usuarioId, String motivo) {}

    public record PagarRequest(
            Long idCita,
            BigDecimal monto,
            String moneda,
            String metodoPago,
            Integer metodoPagoId,
            String referencia,
            Long usuarioId,
            Boolean aceptaTerminos
    ) {}

    public record ConfirmarRequest(Long idCita, Long usuarioId, String comentario) {}

    @Transactional
    @PostMapping("/slots/{slotId}/reservar")
    public ResponseEntity<?> reservarPorSlot(@PathVariable("slotId") Integer slotId,
                                             @RequestBody ReservarSlotRequest req) {
        if (slotId == null || slotId <= 0 || req.pacienteId() == null || req.usuarioId() == null) {
            return ResponseEntity.badRequest().body("Faltan datos obligatorios");
        }
        final int ttlMinutos = parametroService.getReservaMinutos();
        try {
            String slotSql = """
                    SELECT s.id_slot,
                           s.id_agenda,
                           s.hora_inicio_slot,
                           s.hora_fin_slot,
                           s.capacidad,
                           s.ocupados,
                           a.fch_agenda,
                           mce.id_medico_centro_especialidad,
                           mce.id_medico,
                           mce.id_centro_medico,
                           mce.id_especialidad,
                           t.cantidad AS tarifa,
                           t.cod_moneda,
                           esp.nmb_especialidad,
                           cm.nmb_centro_medico,
                           cm.direccion AS centro_direccion,
                           cm.telefono AS centro_telefono,
                           d.nmb_distrito,
                           p.nmb_provincia,
                           dep.nmb_departamento,
                           CONCAT(u.nombre,' ',u.apellido) AS medico
                    FROM agenda_slot s
                    JOIN agenda a ON s.id_agenda = a.id_agenda
                    JOIN medico_centro_especialidad mce ON a.id_medico_centro_especialidad = mce.id_medico_centro_especialidad
                    JOIN medico m ON mce.id_medico = m.id_medico
                    JOIN usuario u ON m.id_usuario = u.id_usuario
                    JOIN especialidad esp ON mce.id_especialidad = esp.id_especialidad
                    JOIN centro_medico cm ON mce.id_centro_medico = cm.id_centro_medico
                    JOIN distrito d ON cm.id_distrito = d.id_distrito
                    JOIN provincia p ON d.id_provincia = p.id_provincia
                    JOIN departamento dep ON p.id_departamento = dep.id_departamento
                    JOIN tarifa t ON mce.id_tarifa = t.id_tarifa
                    WHERE s.id_slot = ?
                    FOR UPDATE
                    """;
            Map<String, Object> slot = jdbcTemplate.query(slotSql, ps -> ps.setInt(1, slotId), rs -> {
                if (!rs.next()) return null;
                Map<String, Object> row = new HashMap<>();
                row.put("id_slot", rs.getInt("id_slot"));
                row.put("id_agenda", rs.getInt("id_agenda"));
                row.put("hora_inicio", rs.getTime("hora_inicio_slot"));
                row.put("hora_fin", rs.getTime("hora_fin_slot"));
                row.put("capacidad", rs.getInt("capacidad"));
                row.put("ocupados", rs.getInt("ocupados"));
                row.put("fecha", rs.getDate("fch_agenda"));
                row.put("id_especialidad", rs.getInt("id_especialidad"));
                row.put("id_medico", rs.getInt("id_medico"));
                row.put("id_centro", rs.getInt("id_centro_medico"));
                row.put("tarifa", rs.getBigDecimal("tarifa"));
                row.put("moneda", rs.getString("cod_moneda"));
                row.put("especialidad", rs.getString("nmb_especialidad"));
                row.put("centro", rs.getString("nmb_centro_medico"));
                row.put("centro_direccion", rs.getString("centro_direccion"));
                row.put("centro_telefono", rs.getString("centro_telefono"));
                row.put("distrito", rs.getString("nmb_distrito"));
                row.put("provincia", rs.getString("nmb_provincia"));
                row.put("departamento", rs.getString("nmb_departamento"));
                row.put("medico", rs.getString("medico"));
                row.put("mce_id", rs.getInt("id_medico_centro_especialidad"));
                return row;
            });
            if (slot == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Slot no encontrado");
            }
            int capacidad = (Integer) slot.get("capacidad");
            int ocupados = (Integer) slot.get("ocupados");
            if (ocupados >= capacidad) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("El slot ya no tiene cupos disponibles");
            }

            Time horaInicio = (Time) slot.get("hora_inicio");
            Time horaFin = (Time) slot.get("hora_fin");
            Integer idAgenda = (Integer) slot.get("id_agenda");
            String motivo = req.motivo() == null || req.motivo().isBlank() ? "RESERVA WEB" : req.motivo().trim();

            LocalDateTime ahora = LocalDateTime.now();
            String insertSql = """
                    INSERT INTO citas (hora_inicio_cita, hora_fin_cita, motivo,
                                        fch_registro_cita, fch_actualizacion_cita,
                                        id_usuario_creador, id_usuario_actualizador,
                                        id_paciente, id_agenda, nmb_std_cita, id_slot)
                    VALUES (?,?,?,?,?, ?,?, ?, ?, 'RESERVADA', ?)
                    """;
            KeyHolder citaKh = new GeneratedKeyHolder();
            jdbcTemplate.update(conn -> {
                PreparedStatement ps = conn.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS);
                ps.setTime(1, horaInicio);
                ps.setTime(2, horaFin);
                ps.setString(3, motivo);
                ps.setTimestamp(4, Timestamp.valueOf(ahora));
                ps.setTimestamp(5, Timestamp.valueOf(ahora));
                ps.setInt(6, req.usuarioId());
                ps.setInt(7, req.usuarioId());
                ps.setInt(8, req.pacienteId());
                ps.setInt(9, idAgenda);
                ps.setInt(10, slotId);
                return ps;
            }, citaKh);
            Number citaNum = citaKh.getKey();
            if (citaNum == null) {
                throw new IllegalStateException("No se pudo generar la cita");
            }
            long citaId = citaNum.longValue();

            jdbcTemplate.update(
                    "UPDATE agenda_slot SET ocupados = ocupados + 1, " +
                            "std_slot = CASE WHEN (ocupados + 1) >= capacidad THEN 'OCUPADO' ELSE 'DISPONIBLE' END " +
                            "WHERE id_slot = ?",
                    slotId
            );

            jdbcTemplate.update(conn -> {
                PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO pago (id_cita, monto_total, std_pago, id_metodo_pago, referencia_externa, fch_registro_pago, fch_actualizacion_pago, id_usuario_registra) " +
                                "VALUES (?,?, 'PENDIENTE', 1, NULL, NOW(), NOW(), ?)"
                );
                ps.setLong(1, citaId);
                ps.setBigDecimal(2, (BigDecimal) slot.get("tarifa"));
                ps.setInt(3, req.usuarioId());
                return ps;
            });

            Map<String, Object> resumen = fetchCitaResumen(citaId);
            Map<String, Object> resp = new HashMap<>();
            resp.put("id_cita", citaId);
            resp.put("ttl_minutos", ttlMinutos);
            resp.put("expira", LocalDateTime.now().plusMinutes(ttlMinutos).toString());
            resp.put("monto", slot.get("tarifa"));
            resp.put("moneda", slot.get("moneda"));
            resp.put("resumen", resumen);
            return ResponseEntity.ok(resp);
        } catch (Exception ex) {
            logger.error("Error reservando slot {}", slotId, ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error al reservar: " + ex.getMessage());
        }
    }

    @PostMapping("/pagar")
    public ResponseEntity<?> pagar(@RequestBody PagarRequest req) {
        if (req.idCita() == null || req.usuarioId() == null) {
            return ResponseEntity.badRequest().body("Falta idCita/usuarioId");
        }
        final int reservaMin = parametroService.getReservaMinutos();
        try {
            Map<String, Object> resumen = fetchCitaResumen(req.idCita());
            if (resumen == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Cita no encontrada");
            }
            BigDecimal monto = req.monto() != null ? req.monto() : (BigDecimal) resumen.getOrDefault("monto", BigDecimal.ZERO);
            String moneda = req.moneda() != null ? req.moneda() : (String) resumen.getOrDefault("moneda", "PEN");
            String metodo = req.metodoPago() != null ? req.metodoPago() : "TARJETA";
            boolean esEfectivo = metodo.equalsIgnoreCase("EFECTIVO");
            String stdPago = esEfectivo ? "PENDIENTE" : "PAGADO";
            Integer metodoId = resolveMetodoPagoId(req.metodoPagoId(), metodo);

            int rows = jdbcTemplate.update(
                    "UPDATE citas SET nmb_std_cita='CONFIRMADA', fch_actualizacion_cita=NOW(), id_usuario_actualizador=? " +
                            "WHERE id_cita=? AND nmb_std_cita='RESERVADA' AND DATE_ADD(fch_registro_cita, INTERVAL ? MINUTE) >= NOW()",
                    req.usuarioId(), req.idCita(), reservaMin
            );
            if (rows == 0) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("La reserva expiró o ya fue confirmada");
            }

            int updatedPago = jdbcTemplate.update(
                    "UPDATE pago SET monto_total=?, std_pago=?, id_metodo_pago=?, referencia_externa=?, fch_actualizacion_pago=NOW(), id_usuario_registra=? WHERE id_cita=?",
                    monto, stdPago, metodoId, req.referencia(), req.usuarioId(), req.idCita()
            );
            if (updatedPago == 0) {
                jdbcTemplate.update(conn -> {
                    PreparedStatement ps = conn.prepareStatement(
                            "INSERT INTO pago (id_cita, monto_total, std_pago, id_metodo_pago, referencia_externa, fch_registro_pago, fch_actualizacion_pago, id_usuario_registra) " +
                                    "VALUES (?,?,?,?,?,NOW(),NOW(),?)"
                    );
                    ps.setLong(1, req.idCita());
                    ps.setBigDecimal(2, monto);
                    ps.setString(3, stdPago);
                    ps.setInt(4, metodoId);
                    ps.setString(5, req.referencia());
                    ps.setLong(6, req.usuarioId());
                    return ps;
                });
            }

            registrarBitacoraCambioEstado(
                    req.idCita(),
                    "CONFIRMACION",
                    "RESERVADA",
                    "CONFIRMADA",
                    req.usuarioId(),
                    "Pago " + stdPago.toLowerCase() + " mediante " + metodo.toUpperCase()
            );
            try { notificacionService.enqueueCambioEstado(req.idCita()); } catch (Exception ignore) {}

            resumen.put("monto", monto);
            resumen.put("moneda", moneda);
            resumen.put("estado", "CONFIRMADA");
            return ResponseEntity.ok(Map.of(
                    "id_cita", req.idCita(),
                    "estado", "CONFIRMADA",
                    "std_pago", stdPago,
                    "resumen", resumen
            ));
        } catch (Exception ex) {
            logger.error("Error al pagar cita {}", req.idCita(), ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Error al pagar: " + ex.getMessage());
        }
    }

    @PostMapping("/confirmar")
    public ResponseEntity<?> confirmarManual(@RequestBody ConfirmarRequest req) {
        if (req.idCita() == null || req.usuarioId() == null) {
            return ResponseEntity.badRequest().body("Falta idCita/usuarioId");
        }
        try {
            int rows = jdbcTemplate.update(
                    "UPDATE citas SET nmb_std_cita='CONFIRMADA', fch_actualizacion_cita=NOW(), id_usuario_actualizador=? WHERE id_cita=?",
                    req.usuarioId(), req.idCita()
            );
            if (rows == 0) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("No se pudo confirmar");
            }
            registrarBitacoraCambioEstado(req.idCita(), "CONFIRMACION_MANUAL", "RESERVADA", "CONFIRMADA", req.usuarioId(), req.comentario());
            try { notificacionService.enqueueCambioEstado(req.idCita()); } catch (Exception ignore) {}
            return ResponseEntity.ok(Map.of("id_cita", req.idCita()));
        } catch (Exception ex) {
            logger.error("Error al confirmar cita {}", req.idCita(), ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Error al confirmar: " + ex.getMessage());
        }
    }

    @GetMapping("/{id}/resumen")
    public ResponseEntity<?> obtenerResumen(@PathVariable("id") Long citaId) {
        Map<String, Object> resumen = fetchCitaResumen(citaId);
        if (resumen == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Cita no encontrada");
        }
        return ResponseEntity.ok(resumen);
    }

    private Map<String, Object> fetchCitaResumen(Long citaId) {
        if (citaId == null) return null;
        String sql = """
                SELECT c.id_cita,
                       c.hora_inicio_cita,
                       c.hora_fin_cita,
                       c.motivo,
                       c.nmb_std_cita,
                       c.fch_registro_cita,
                       c.id_paciente,
                       a.fch_agenda AS fecha_cita,
                       esp.nmb_especialidad,
                       cm.nmb_centro_medico,
                       cm.direccion AS centro_direccion,
                       cm.telefono AS centro_telefono,
                       d.nmb_distrito,
                       p.nmb_provincia,
                       dep.nmb_departamento,
                       CONCAT(u.nombre,' ',u.apellido) AS medico,
                       t.cantidad AS tarifa,
                       t.cod_moneda
                FROM citas c
                JOIN agenda a ON c.id_agenda = a.id_agenda
                JOIN medico_centro_especialidad mce ON a.id_medico_centro_especialidad = mce.id_medico_centro_especialidad
                JOIN centro_medico cm ON mce.id_centro_medico = cm.id_centro_medico
                JOIN distrito d ON cm.id_distrito = d.id_distrito
                JOIN provincia p ON d.id_provincia = p.id_provincia
                JOIN departamento dep ON p.id_departamento = dep.id_departamento
                JOIN especialidad esp ON mce.id_especialidad = esp.id_especialidad
                JOIN medico m ON mce.id_medico = m.id_medico
                JOIN usuario u ON m.id_usuario = u.id_usuario
                JOIN tarifa t ON mce.id_tarifa = t.id_tarifa
                WHERE c.id_cita = ?
                """;
        return jdbcTemplate.query(sql, ps -> ps.setLong(1, citaId), rs -> {
            if (!rs.next()) return null;
            Map<String, Object> data = new HashMap<>();
            data.put("id_cita", rs.getLong("id_cita"));
            data.put("estado", rs.getString("nmb_std_cita"));
            data.put("motivo", rs.getString("motivo"));
            data.put("especialidad", rs.getString("nmb_especialidad"));
            data.put("centro", rs.getString("nmb_centro_medico"));
            data.put("centro_direccion", rs.getString("centro_direccion"));
            data.put("telefono", rs.getString("centro_telefono"));
            data.put("distrito", rs.getString("nmb_distrito"));
            data.put("provincia", rs.getString("nmb_provincia"));
            data.put("departamento", rs.getString("nmb_departamento"));
            data.put("medico", rs.getString("medico"));
            Time inicio = rs.getTime("hora_inicio_cita");
            Time fin = rs.getTime("hora_fin_cita");
            LocalDate fecha = null;
            Date fechaSql = rs.getDate("fecha_cita");
            if (fechaSql != null) fecha = fechaSql.toLocalDate();
            data.put("fecha", fecha != null ? fecha.toString() : null);
            data.put("hora_inicio", inicio != null ? inicio.toString() : null);
            data.put("hora_fin", fin != null ? fin.toString() : null);
            data.put("monto", rs.getBigDecimal("tarifa"));
            data.put("moneda", rs.getString("cod_moneda"));
            return data;
        });
    }

    private Integer resolveMetodoPagoId(Integer providedId, String metodoNombre) {
        if (providedId != null && providedId > 0) {
            return providedId;
        }
        if (metodoNombre == null) {
            return 1;
        }
        try {
            return jdbcTemplate.query(
                    "SELECT id_metodo_pago FROM metodo_pago WHERE UPPER(nmb_metodo_pago)=? LIMIT 1",
                    ps -> ps.setString(1, metodoNombre.trim().toUpperCase()),
                    rs -> rs.next() ? rs.getInt(1) : 1
            );
        } catch (Exception ex) {
            return 1;
        }
    }

    private void registrarBitacoraCambioEstado(Long idCita, String tipoEvento, String valorAnterior,
                                               String valorNuevo, Long usuarioId, String resumen) {
        if (idCita == null || usuarioId == null) return;
        try {
            jdbcTemplate.update(
                    "INSERT INTO bitacora_evento (entidad, id_entidad, tipo_evento, resumen, valor_anterior, valor_nuevo, fch_evento, id_usuario) " +
                            "VALUES ('CITA', ?, ?, ?, ?, ?, NOW(), ?)",
                    idCita, tipoEvento, resumen != null ? resumen : tipoEvento, valorAnterior, valorNuevo, usuarioId
            );
        } catch (Exception ignore) {
            logger.warn("No se pudo registrar bitácora para la cita {}", idCita);
        }
    }
}


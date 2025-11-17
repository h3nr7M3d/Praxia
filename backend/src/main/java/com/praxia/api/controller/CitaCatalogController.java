package com.praxia.api.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.sql.Date;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.JdbcTemplate;

@RestController
@RequestMapping("/citas")
public class CitaCatalogController {

    private static final Logger logger = LoggerFactory.getLogger(CitaCatalogController.class);

    // Evitamos dependencias a JPA aquí para evitar problemas de carga; usamos JdbcTemplate
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/especialidades")
    public ResponseEntity<?> listarEspecialidades(
            @RequestParam(name = "q", required = false) String q
    ) {
        try {
            String sql = """
                    SELECT e.id_especialidad,
                           e.nmb_especialidad,
                           e.dsc_especialidad,
                           COUNT(DISTINCT CASE
                               WHEN mce.id_medico IS NOT NULL
                                    AND m.std_medico = 'HABILITADO'
                                    AND u.std_usuario = 'ACTIVO'
                                    AND CURRENT_DATE >= IFNULL(mce.vigente_desde, CURRENT_DATE)
                                    AND (mce.vigente_hasta IS NULL OR CURRENT_DATE <= mce.vigente_hasta)
                               THEN mce.id_medico
                               ELSE NULL
                           END) AS medicos_disponibles
                    FROM especialidad e
                    LEFT JOIN medico_centro_especialidad mce ON e.id_especialidad = mce.id_especialidad
                    LEFT JOIN medico m ON mce.id_medico = m.id_medico
                    LEFT JOIN usuario u ON u.id_usuario = m.id_usuario
                    GROUP BY e.id_especialidad, e.nmb_especialidad, e.dsc_especialidad
                    ORDER BY e.nmb_especialidad
                    """;
            List<Map<String, Object>> out = jdbcTemplate.query(sql, (rs, i) -> {
                Map<String, Object> row = new HashMap<>();
                row.put("id", rs.getInt("id_especialidad"));
                row.put("nombre", rs.getString("nmb_especialidad"));
                row.put("descripcion", rs.getString("dsc_especialidad"));
                row.put("medicos_disponibles", rs.getInt("medicos_disponibles"));
                return row;
            });
            if (q != null && !q.isBlank()) {
                final String ql = q.toLowerCase();
                out = out.stream()
                        .filter(m -> {
                            Object n = m.get("nombre");
                            return n != null && n.toString().toLowerCase().contains(ql);
                        })
                        .collect(Collectors.toList());
            }
            return ResponseEntity.ok(out);
        } catch (Exception ex) {
            logger.error("Error listando especialidades", ex);
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error al listar especialidades"));
        }
    }

    // [LEGACY] Reserva de cita. Mantener para referencia, pero mover a otra ruta
    // para no colisionar con CitaController#reservar (nuevo flujo).
    @Deprecated
    @PostMapping("/reservar-legacy")
    public ResponseEntity<?> reservarLegacy(@RequestBody Map<String,Object> payload) {
        logger.warn("Se intento usar /citas/reservar-legacy con payload {}", payload);
        return ResponseEntity.status(HttpStatus.GONE)
                .body(Map.of(
                        "success", false,
                        "message", "El flujo legacy ya no esta disponible. Usa /citas/slots/{slotId}/reservar."
                ));
    }

    @GetMapping("/especialidades/{id}/medicos/count")
    public ResponseEntity<?> contarMedicosPorEspecialidad(@PathVariable Integer id) {
        try {
            String sql = "SELECT COUNT(DISTINCT m.id_medico) " +
                    "FROM medico m " +
                    "JOIN suple_medico_especialidad sme ON sme.id_medico = m.id_medico " +
                    "WHERE sme.id_especialidad=? AND m.std_medico = 'HABILITADO'";
            Integer c = jdbcTemplate.queryForObject(sql, Integer.class, id);
            int count = c != null ? c : 0;
            return ResponseEntity.ok(Map.of("count", count));
        } catch (Exception ex) {
            logger.error("Error contando medicos para especialidad {}", id, ex);
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error en conteo de medicos"));
        }
    }

    @GetMapping("/centros")
    public ResponseEntity<?> listarCentrosPorEspecialidad(@RequestParam("especialidadId") Integer especialidadId) {
        try {
            String sql = """
                    SELECT
                        cm.id_centro_medico,
                        cm.nmb_centro_medico,
                        cm.direccion,
                        cm.telefono,
                        d.nmb_distrito,
                        p.nmb_provincia,
                        dep.nmb_departamento,
                        COUNT(DISTINCT CASE
                            WHEN mce.id_medico IS NOT NULL
                                 AND m.std_medico = 'HABILITADO'
                                 AND u.std_usuario = 'ACTIVO'
                                 AND CURRENT_DATE >= IFNULL(mce.vigente_desde, CURRENT_DATE)
                                 AND (mce.vigente_hasta IS NULL OR CURRENT_DATE <= mce.vigente_hasta)
                            THEN mce.id_medico
                            ELSE NULL
                        END) AS medicos_en_centro
                    FROM centro_medico cm
                    JOIN distrito d ON cm.id_distrito = d.id_distrito
                    JOIN provincia p ON d.id_provincia = p.id_provincia
                    JOIN departamento dep ON p.id_departamento = dep.id_departamento
                    LEFT JOIN medico_centro_especialidad mce
                        ON cm.id_centro_medico = mce.id_centro_medico
                       AND mce.id_especialidad = ?
                    LEFT JOIN medico m ON mce.id_medico = m.id_medico
                    LEFT JOIN usuario u ON u.id_usuario = m.id_usuario
                    WHERE (cm.std_centro = 'ACTIVO' OR cm.std_centro = '1' OR cm.std_centro = 1)
                    GROUP BY cm.id_centro_medico, cm.nmb_centro_medico, cm.direccion, cm.telefono,
                             d.nmb_distrito, p.nmb_provincia, dep.nmb_departamento
                    ORDER BY cm.nmb_centro_medico
                    """;
            List<Map<String, Object>> out = jdbcTemplate.query(sql, ps -> ps.setInt(1, especialidadId), (rs, i) -> {
                Map<String, Object> row = new HashMap<>();
                row.put("id", rs.getInt("id_centro_medico"));
                row.put("nombre", rs.getString("nmb_centro_medico"));
                row.put("direccion", rs.getString("direccion"));
                row.put("telefono", rs.getString("telefono"));
                row.put("distrito", rs.getString("nmb_distrito"));
                row.put("provincia", rs.getString("nmb_provincia"));
                row.put("departamento", rs.getString("nmb_departamento"));
                row.put("medicos_en_centro", rs.getInt("medicos_en_centro"));
                return row;
            });
            return ResponseEntity.ok(out);
        } catch (Exception ex) {
            logger.error("Error listando centros por especialidad {}", especialidadId, ex);
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error al listar centros"));
        }
    }

    @GetMapping("/medicos")
    public ResponseEntity<?> listarMedicosPorEspecialidadYCentro(
            @RequestParam("especialidadId") Integer especialidadId,
            @RequestParam("centroId") Integer centroId,
            @RequestParam(name = "q", required = false) String q
    ) {
        try {
            String sql = """
                    SELECT
                        m.id_medico,
                        CONCAT(u.nombre,' ',u.apellido) AS nombre,
                        m.cmp,
                        m.dsc_perfil,
                        mce.id_medico_centro_especialidad,
                        t.cantidad AS tarifa,
                        t.cod_moneda,
                        mon.nmb_moneda,
                        (
                            SELECT COUNT(*)
                            FROM agenda a
                            WHERE a.id_medico_centro_especialidad = mce.id_medico_centro_especialidad
                              AND a.fch_agenda >= CURRENT_DATE
                              AND a.nmb_std_agenda = 'ACTIVA'
                        ) AS agendas_disponibles
                    FROM medico m
                    JOIN usuario u ON u.id_usuario = m.id_usuario
                    JOIN medico_centro_especialidad mce ON m.id_medico = mce.id_medico
                    JOIN tarifa t ON mce.id_tarifa = t.id_tarifa
                    JOIN moneda mon ON t.cod_moneda = mon.cod_moneda
                    WHERE mce.id_especialidad = ?
                      AND mce.id_centro_medico = ?
                      AND m.std_medico = 'HABILITADO'
                      AND u.std_usuario = 'ACTIVO'
                      AND CURRENT_DATE BETWEEN mce.vigente_desde AND IFNULL(mce.vigente_hasta, DATE_ADD(CURRENT_DATE, INTERVAL 100 YEAR))
                    ORDER BY u.apellido, u.nombre
                    """;
            List<Map<String, Object>> out = jdbcTemplate.query(sql, ps -> {
                ps.setInt(1, especialidadId);
                ps.setInt(2, centroId);
            }, (rs, i) -> {
                Map<String, Object> row = new HashMap<>();
                row.put("id_medico", rs.getInt("id_medico"));
                row.put("nombre", rs.getString("nombre"));
                row.put("cmp", rs.getString("cmp"));
                row.put("perfil", rs.getString("dsc_perfil"));
                row.put("id_medico_centro_especialidad", rs.getInt("id_medico_centro_especialidad"));
                row.put("tarifa", rs.getBigDecimal("tarifa"));
                row.put("cod_moneda", rs.getString("cod_moneda"));
                row.put("moneda", rs.getString("nmb_moneda"));
                row.put("agendas_disponibles", rs.getInt("agendas_disponibles"));
                return row;
            });
            if (q != null && !q.isBlank()) {
                final String ql = q.toLowerCase();
                out = out.stream()
                        .filter(m -> m.get("nombre") != null && m.get("nombre").toString().toLowerCase().contains(ql))
                        .collect(Collectors.toList());
            }
            return ResponseEntity.ok(out);
        } catch (Exception ex) {
            logger.error("Error listando medicos por especialidad {} y centro {}", especialidadId, centroId, ex);
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error al listar medicos"));
        }
    }

    @GetMapping("/mce/{id}/agendas")
    public ResponseEntity<?> listarAgendasDisponibles(@PathVariable("id") Integer mceId) {
        try {
            String sql = """
                    SELECT a.id_agenda,
                           a.fch_agenda,
                           a.hora_inicio,
                           a.hora_fin,
                           COUNT(CASE WHEN s.std_slot = 'DISPONIBLE' AND s.ocupados < s.capacidad THEN 1 END) AS slots_disponibles
                    FROM agenda a
                    LEFT JOIN agenda_slot s ON s.id_agenda = a.id_agenda
                    WHERE a.id_medico_centro_especialidad = ?
                      AND a.fch_agenda BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY)
                      AND a.nmb_std_agenda = 'ACTIVA'
                    GROUP BY a.id_agenda, a.fch_agenda, a.hora_inicio, a.hora_fin
                    HAVING slots_disponibles > 0
                    ORDER BY a.fch_agenda
                    """;
            List<Map<String, Object>> out = jdbcTemplate.query(sql, ps -> ps.setInt(1, mceId), (rs, i) -> {
                Map<String, Object> row = new HashMap<>();
                row.put("id_agenda", rs.getInt("id_agenda"));
                row.put("fecha", rs.getDate("fch_agenda").toLocalDate().toString());
                row.put("hora_inicio", rs.getTime("hora_inicio").toString());
                row.put("hora_fin", rs.getTime("hora_fin").toString());
                row.put("slots_disponibles", rs.getInt("slots_disponibles"));
                return row;
            });
            return ResponseEntity.ok(out);
        } catch (Exception ex) {
            logger.error("Error listando agendas para mce {}", mceId, ex);
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error al listar agendas"));
        }
    }

    @GetMapping("/agendas/{agendaId}/slots")
    public ResponseEntity<?> listarSlotsPorAgenda(
            @PathVariable("agendaId") Integer agendaId,
            @RequestParam(name = "fecha", required = false) String fecha
    ) {
        try {
            final LocalDate filtroFecha = (fecha != null && !fecha.isBlank())
                    ? LocalDate.parse(fecha, DateTimeFormatter.ISO_DATE)
                    : null;
            StringBuilder sql = new StringBuilder("""
                    SELECT s.id_slot,
                           s.hora_inicio_slot,
                           s.hora_fin_slot,
                           s.capacidad,
                           s.ocupados,
                           (s.capacidad - s.ocupados) AS disponibles,
                           s.std_slot,
                           a.fch_agenda
                    FROM agenda_slot s
                    JOIN agenda a ON a.id_agenda = s.id_agenda
                    WHERE s.id_agenda = ?
                    """);
            if (filtroFecha != null) {
                sql.append(" AND a.fch_agenda = ? ");
            }
            sql.append(" ORDER BY s.hora_inicio_slot ");

            List<Map<String, Object>> out = jdbcTemplate.query(sql.toString(), ps -> {
                ps.setInt(1, agendaId);
                if (filtroFecha != null) {
                    ps.setDate(2, Date.valueOf(filtroFecha));
                }
            }, (rs, i) -> {
                Map<String, Object> row = new HashMap<>();
                row.put("id_slot", rs.getInt("id_slot"));
                row.put("hora_inicio", rs.getTime("hora_inicio_slot").toString());
                row.put("hora_fin", rs.getTime("hora_fin_slot").toString());
                row.put("capacidad", rs.getInt("capacidad"));
                row.put("ocupados", rs.getInt("ocupados"));
                row.put("disponibles", rs.getInt("disponibles"));
                row.put("std_slot", rs.getString("std_slot"));
                row.put("fecha", rs.getDate("fch_agenda").toLocalDate().toString());
                return row;
            });
            return ResponseEntity.ok(out);
        } catch (Exception ex) {
            logger.error("Error listando slots para agenda {}", agendaId, ex);
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error al listar slots"));
        }
    }

    @GetMapping("/slots/{slotId}/resumen")
    public ResponseEntity<?> resumenSlot(@PathVariable("slotId") Integer slotId) {
        try {
            String sql = """
                    SELECT 
                        e.nmb_especialidad,
                        cm.nmb_centro_medico,
                        cm.direccion,
                        CONCAT(u.nombre,' ',u.apellido) AS medico_nombre,
                        ag.fch_agenda,
                        s.hora_inicio_slot,
                        s.hora_fin_slot,
                        t.cantidad AS costo,
                        t.cod_moneda
                    FROM agenda_slot s
                    JOIN agenda ag ON s.id_agenda = ag.id_agenda
                    JOIN medico_centro_especialidad mce ON ag.id_medico_centro_especialidad = mce.id_medico_centro_especialidad
                    JOIN especialidad e ON mce.id_especialidad = e.id_especialidad
                    JOIN centro_medico cm ON mce.id_centro_medico = cm.id_centro_medico
                    JOIN medico m ON mce.id_medico = m.id_medico
                    JOIN usuario u ON m.id_usuario = u.id_usuario
                    JOIN tarifa t ON mce.id_tarifa = t.id_tarifa
                    WHERE s.id_slot = ?
                    """;
            Map<String, Object> resumen = jdbcTemplate.query(sql, ps -> ps.setInt(1, slotId), rs -> {
                if (!rs.next()) return null;
                Map<String, Object> row = new HashMap<>();
                row.put("especialidad", rs.getString("nmb_especialidad"));
                row.put("centro", rs.getString("nmb_centro_medico"));
                row.put("direccion", rs.getString("direccion"));
                row.put("medico", rs.getString("medico_nombre"));
                row.put("fecha", rs.getDate("fch_agenda").toLocalDate().toString());
                row.put("hora_inicio", rs.getTime("hora_inicio_slot").toString());
                row.put("hora_fin", rs.getTime("hora_fin_slot").toString());
                row.put("costo", rs.getBigDecimal("costo"));
                row.put("moneda", rs.getString("cod_moneda"));
                return row;
            });
            if (resumen == null) {
                return ResponseEntity.status(404).body(Map.of("success", false, "message", "Slot no encontrado"));
            }
            return ResponseEntity.ok(resumen);
        } catch (Exception ex) {
            logger.error("Error obteniendo resumen para slot {}", slotId, ex);
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error al obtener resumen"));
        }
    }
}


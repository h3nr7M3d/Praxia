package com.praxia.api.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/catalogos")
public class CatalogoController {

    private final JdbcTemplate jdbc;

    public CatalogoController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/documentos")
    public List<DocumentoDTO> listarDocumentos() {
        return jdbc.query(
                "SELECT id_documento, nmb_documento FROM documento ORDER BY id_documento",
                (rs, rowNum) -> new DocumentoDTO(
                        rs.getInt("id_documento"),
                        rs.getString("nmb_documento"),
                        buildDocumentCode(rs.getString("nmb_documento"))
                )
        );
    }

    @GetMapping("/paises")
    public List<PaisDTO> listarPaises() {
        return jdbc.query(
                "SELECT id_pais, nmb_pais, cod_pais FROM pais ORDER BY nmb_pais",
                (rs, rowNum) -> new PaisDTO(rs.getInt("id_pais"), rs.getString("nmb_pais"), rs.getString("cod_pais"))
        );
    }

    @GetMapping("/departamentos")
    public List<DepartamentoDTO> listarDepartamentos(@RequestParam(name = "paisId", required = false) Integer paisId) {
        String base = "SELECT id_departamento, nmb_departamento, id_pais FROM departamento";
        if (paisId == null) {
            return jdbc.query(
                    base + " ORDER BY nmb_departamento",
                    (rs, rowNum) -> new DepartamentoDTO(rs.getInt("id_departamento"), rs.getString("nmb_departamento"), rs.getInt("id_pais"))
            );
        }
        return jdbc.query(
                base + " WHERE id_pais = ? ORDER BY nmb_departamento",
                ps -> ps.setInt(1, paisId),
                (rs, rowNum) -> new DepartamentoDTO(rs.getInt("id_departamento"), rs.getString("nmb_departamento"), rs.getInt("id_pais"))
        );
    }

    @GetMapping("/provincias")
    public List<ProvinciaDTO> listarProvincias(@RequestParam(name = "departamentoId", required = false) Integer departamentoId,
                                               @RequestParam(name = "departamento", required = false) String departamentoNombre) {
        String base = """
            SELECT p.id_provincia, p.nmb_provincia, d.id_departamento, d.nmb_departamento
            FROM provincia p
            JOIN departamento d ON d.id_departamento = p.id_departamento
            """;
        if (departamentoId != null) {
            return jdbc.query(
                    base + " WHERE p.id_departamento = ? ORDER BY p.nmb_provincia",
                    ps -> ps.setInt(1, departamentoId),
                    (rs, rowNum) -> new ProvinciaDTO(rs.getInt("id_provincia"), rs.getString("nmb_provincia"), rs.getInt("id_departamento"), rs.getString("nmb_departamento"))
            );
        }
        if (StringUtils.hasText(departamentoNombre)) {
            return jdbc.query(
                    base + " WHERE d.nmb_departamento = ? ORDER BY p.nmb_provincia",
                    ps -> ps.setString(1, departamentoNombre),
                    (rs, rowNum) -> new ProvinciaDTO(rs.getInt("id_provincia"), rs.getString("nmb_provincia"), rs.getInt("id_departamento"), rs.getString("nmb_departamento"))
            );
        }
        return jdbc.query(
                base + " ORDER BY p.nmb_provincia",
                (rs, rowNum) -> new ProvinciaDTO(rs.getInt("id_provincia"), rs.getString("nmb_provincia"), rs.getInt("id_departamento"), rs.getString("nmb_departamento"))
        );
    }

    @GetMapping("/distritos")
    public List<DistritoDTO> listarDistritos(@RequestParam(name = "provinciaId", required = false) Integer provinciaId,
                                             @RequestParam(name = "provincia", required = false) String provinciaNombre) {
        String base = """
            SELECT di.id_distrito, di.nmb_distrito, p.id_provincia, p.nmb_provincia
            FROM distrito di
            JOIN provincia p ON p.id_provincia = di.id_provincia
            """;
        if (provinciaId != null) {
            return jdbc.query(
                    base + " WHERE di.id_provincia = ? ORDER BY di.nmb_distrito",
                    ps -> ps.setInt(1, provinciaId),
                    (rs, rowNum) -> new DistritoDTO(rs.getInt("id_distrito"), rs.getString("nmb_distrito"), rs.getInt("id_provincia"), rs.getString("nmb_provincia"))
            );
        }
        if (StringUtils.hasText(provinciaNombre)) {
            return jdbc.query(
                    base + " WHERE p.nmb_provincia = ? ORDER BY di.nmb_distrito",
                    ps -> ps.setString(1, provinciaNombre),
                    (rs, rowNum) -> new DistritoDTO(rs.getInt("id_distrito"), rs.getString("nmb_distrito"), rs.getInt("id_provincia"), rs.getString("nmb_provincia"))
            );
        }
        return jdbc.query(
                base + " ORDER BY di.nmb_distrito",
                (rs, rowNum) -> new DistritoDTO(rs.getInt("id_distrito"), rs.getString("nmb_distrito"), rs.getInt("id_provincia"), rs.getString("nmb_provincia"))
        );
    }

    @GetMapping("/tipos-seguro")
    public List<TipoSeguroDTO> listarTiposSeguro() {
        return jdbc.query(
                "SELECT nmb_tipo_seguro, dsc_tipo_seguro FROM tipo_seguro ORDER BY nmb_tipo_seguro",
                (rs, rowNum) -> new TipoSeguroDTO(
                        rs.getString("nmb_tipo_seguro"),
                        rs.getString("nmb_tipo_seguro"),
                        rs.getString("dsc_tipo_seguro")
                )
        );
    }

    private static String buildDocumentCode(String nombre) {
        if (!StringUtils.hasText(nombre)) {
            return "DOC";
        }
        String trimmed = nombre.trim();
        String base = trimmed.contains(" ") ? trimmed.substring(0, trimmed.indexOf(' ')) : trimmed;
        if (!StringUtils.hasText(base)) {
            base = trimmed;
        }
        base = base.trim().toUpperCase();
        return base.length() <= 8 ? base : base.substring(0, 8);
    }

    public record DocumentoDTO(Integer id, String nombre, String codigo) {}
    public record PaisDTO(Integer id, String nombre, String codigo) {}
    public record DepartamentoDTO(Integer id, String nombre, Integer idPais) {}
    public record ProvinciaDTO(Integer id, String nombre, Integer idDepartamento, String departamento) {}
    public record DistritoDTO(Integer id, String nombre, Integer idProvincia, String provincia) {}
    public record TipoSeguroDTO(String codigo, String nombre, String descripcion) {}
}

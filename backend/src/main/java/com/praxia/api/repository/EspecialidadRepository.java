package com.praxia.api.repository;

import com.praxia.api.domain.Especialidad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EspecialidadRepository extends JpaRepository<Especialidad, Integer> {

    @Query(value = "SELECT DISTINCT e.* FROM especialidad e " +
            "JOIN suple_medico_especialidad sme ON sme.id_especialidad = e.id_especialidad " +
            "JOIN medico m ON m.id_medico = sme.id_medico " +
            "WHERE m.std_medico = 'HABILITADO'", nativeQuery = true)
    List<Especialidad> findDisponibles();

    @Query(value = "SELECT DISTINCT e.* FROM especialidad e " +
            "JOIN suple_medico_especialidad sme ON sme.id_especialidad = e.id_especialidad " +
            "JOIN medico m ON m.id_medico = sme.id_medico " +
            "WHERE m.std_medico = 'HABILITADO' AND LOWER(e.nmb_especialidad) LIKE CONCAT('%', LOWER(:q), '%')",
            nativeQuery = true)
    List<Especialidad> findDisponiblesByNombre(@Param("q") String q);

    @Query(value = "SELECT COUNT(DISTINCT m.id_medico) FROM suple_medico_especialidad sme " +
            "JOIN medico m ON m.id_medico = sme.id_medico " +
            "WHERE sme.id_especialidad = :id AND m.std_medico = 'HABILITADO'",
            nativeQuery = true)
    int countMedicosHabilitadosPorEspecialidad(@Param("id") Integer id);
}

package com.praxia.api.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "paciente")
public class Paciente {

    @Id
    @Column(name = "id_paciente")
    private Integer idPaciente; // FK a usuario.id_usuario

    @Column(name = "domicilio", nullable = false, length = 255)
    private String domicilio;

    @Column(name = "ref_domicilio", nullable = false, length = 255)
    private String refDomicilio;

    @Column(name = "id_distrito", nullable = false)
    private Integer idDistrito;

    @Column(name = "nmb_tipo_seguro", nullable = false, length = 100)
    private String tipoSeguroNombre;

    @Column(name = "fch_registro_paciente", nullable = false)
    private LocalDateTime fchRegistroPaciente;

    @Column(name = "fch_actualizacion_paciente", nullable = false)
    private LocalDateTime fchActualizacionPaciente;

    @Column(name = "id_usuario_creador", nullable = false)
    private Integer idUsuarioCreador;

    @Column(name = "id_usuario_actualizador", nullable = false)
    private Integer idUsuarioActualizador;
}

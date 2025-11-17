package com.praxia.api.domain;

import com.praxia.api.domain.enums.EstadoCentroMedico;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "centro_medico")
public class CentroMedico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_centro_medico")
    private Integer id;

    @Column(name = "nmb_centro_medico", nullable = false, length = 150)
    private String nombre;

    @Column(name = "direccion", nullable = false, length = 255)
    private String direccion;

    @Column(name = "telefono", nullable = false, length = 20)
    private String telefono;

    @Enumerated(EnumType.STRING)
    @Column(name = "std_centro", nullable = false, columnDefinition = "enum('ACTIVO','INACTIVO')")
    private EstadoCentroMedico estado;

    @Column(name = "id_distrito", nullable = false)
    private Integer idDistrito;
}

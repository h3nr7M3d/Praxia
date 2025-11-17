package com.praxia.api.domain;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "provincia")
public class Provincia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_provincia")
    private Integer id;

    @Column(name = "id_departamento", nullable = false)
    private Integer idDepartamento;

    @Column(name = "nmb_provincia", nullable = false, length = 100)
    private String nombre;
}

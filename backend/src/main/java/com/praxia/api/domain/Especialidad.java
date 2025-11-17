package com.praxia.api.domain;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "especialidad")
public class Especialidad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_especialidad")
    private Integer id;

    @Column(name = "nmb_especialidad", nullable = false, length = 100)
    private String nombre;

    @Column(name = "dsc_especialidad", length = 255)
    private String descripcion;
}

package com.praxia.api.domain;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "departamento")
public class Departamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_departamento")
    private Integer id;

    @Column(name = "nmb_departamento", nullable = false, length = 100)
    private String nombre;

    @Column(name = "id_pais", nullable = false)
    private Integer idPais;
}

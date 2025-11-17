package com.praxia.api.domain;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "pais")
public class Pais {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_pais")
    private Integer id;

    @Column(name = "nmb_pais", nullable = false, length = 100)
    private String nombre;

    @Column(name = "cod_pais", nullable = false, length = 10)
    private String codigo;
}

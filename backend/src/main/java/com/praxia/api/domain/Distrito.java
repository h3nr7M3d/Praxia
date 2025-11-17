package com.praxia.api.domain;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "distrito")
public class Distrito {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_distrito")
    private Integer id;

    @Column(name = "id_provincia", nullable = false)
    private Integer idProvincia;

    @Column(name = "nmb_distrito", nullable = false, length = 100)
    private String nombre;
}

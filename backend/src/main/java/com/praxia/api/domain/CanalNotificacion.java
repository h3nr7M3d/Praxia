package com.praxia.api.domain;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "canal_notificacion")
public class CanalNotificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_canal")
    private Integer id;

    @Column(name = "nmb_canal", nullable = false, length = 50)
    private String nombre;
}

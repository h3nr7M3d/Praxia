package com.praxia.api.domain;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "std_usuario")
public class EstadoUsuario {

    @Id
    @Column(name = "std_usuario", length = 30)
    private String codigo;

    @Column(name = "dsc_std_usuario", nullable = false, length = 100)
    private String descripcion;
}

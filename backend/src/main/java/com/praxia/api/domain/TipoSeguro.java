package com.praxia.api.domain;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "tipo_seguro")
public class TipoSeguro {

    @Id
    @Column(name = "nmb_tipo_seguro", length = 100)
    private String nombre;

    @Column(name = "dsc_tipo_seguro", nullable = false, length = 255)
    private String descripcion;
}

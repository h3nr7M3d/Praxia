package com.praxia.api.domain;

import com.praxia.api.domain.enums.EstadoMedico;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "medico")
public class Medico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_medico")
    private Integer id;

    @Column(name = "cmp", nullable = false, length = 20)
    private String cmp;

    @Column(name = "dsc_perfil", nullable = false, length = 255)
    private String descripcionPerfil;

    @Enumerated(EnumType.STRING)
    @Column(name = "std_medico", nullable = false, columnDefinition = "enum('HABILITADO','SUSPENDIDO','BAJA')")
    private EstadoMedico estado;

    @Column(name = "id_usuario", nullable = false, unique = true)
    private Integer idUsuario;
}

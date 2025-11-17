package com.praxia.api.domain;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "usuario_preferencia_notif")
public class UsuarioPreferenciaNotif {

    @EmbeddedId
    private UsuarioPreferenciaId id;

    @Column(name = "destino", nullable = false, length = 255)
    private String destino;

    @Column(name = "habilitado", nullable = false)
    private Boolean habilitado;

    @Column(name = "verificado", nullable = false)
    private Boolean verificado;

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UsuarioPreferenciaId implements java.io.Serializable {
        @Column(name = "id_usuario")
        private Integer idUsuario;

        @Column(name = "id_canal")
        private Integer idCanal;
    }
}

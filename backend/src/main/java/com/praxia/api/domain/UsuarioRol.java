package com.praxia.api.domain;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "usuario_rol")
public class UsuarioRol {

    @EmbeddedId
    private UsuarioRolId id;

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UsuarioRolId implements java.io.Serializable {
        @Column(name = "id_usuario")
        private Integer idUsuario;

        @Column(name = "id_rol")
        private Integer idRol;
    }
}

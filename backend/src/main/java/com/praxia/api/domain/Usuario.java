package com.praxia.api.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.praxia.api.domain.enums.Sexo;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Integer id;

    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    @Column(name = "apellido", nullable = false, length = 100)
    private String apellido;

    @Enumerated(EnumType.STRING)
    @Column(name = "sexo", nullable = false, columnDefinition = "enum('M','F','X')")
    private Sexo sexo;

    @Column(name = "id_documento", nullable = false)
    private Integer idDocumento;

    @Column(name = "nr_documento", nullable = false, length = 20)
    private String nrDocumento;

    @Column(name = "fch_nacimiento", nullable = false)
    private LocalDate fchNacimiento;

    @Column(name = "correo", nullable = false, length = 150)
    private String correo;

    @Column(name = "telefono", nullable = false, length = 20)
    private String telefono;

    @Column(name = "contrasena_hash", nullable = false, length = 255)
    private String contrasenaHash;

    @Column(name = "std_usuario", nullable = false, length = 30)
    private String stdUsuario;

    @Column(name = "id_pais", nullable = false)
    private Integer idPais;

    @Column(name = "fch_registro_usuario", nullable = false)
    private LocalDateTime fchRegistroUsuario;

    @Column(name = "fch_actualizacion_usuario", nullable = false)
    private LocalDateTime fchActualizacionUsuario;

    @Column(name = "id_usuario_creador")
    private Integer idUsuarioCreador;

    @Column(name = "id_usuario_actualizador")
    private Integer idUsuarioActualizador;
}

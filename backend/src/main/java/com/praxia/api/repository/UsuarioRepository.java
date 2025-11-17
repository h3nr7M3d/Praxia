package com.praxia.api.repository;

import com.praxia.api.domain.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {
    java.util.Optional<Usuario> findByNrDocumento(String nrDocumento);
    java.util.Optional<Usuario> findByCorreoIgnoreCase(String correo);
}

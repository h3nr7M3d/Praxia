package com.praxia.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class ReniecService {
    @Value("${app.reniec.enabled:false}")
    private boolean enabled;

    @Value("${app.reniec.endpoint:https://api.reniec.example}")
    private String endpoint;

    @Value("${app.reniec.token:}")
    private String token;

    public boolean isEnabled() { return enabled && token != null && !token.isBlank(); }

    public Map<String,Object> validateDni(String dni, String birthDate) {
        // Placeholder: aquí integrarías el cliente HTTP al servicio RENIEC/PIDE
        // Por ahora devolvemos no implementado si no está habilitado.
        return Map.of(
                "enabled", isEnabled(),
                "valid", false,
                "message", isEnabled() ? "Integración no implementada" : "RENIEC no configurado"
        );
    }
}


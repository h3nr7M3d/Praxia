package com.praxia.api.controller;

import com.praxia.api.service.ReniecService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/identity")
public class IdentityController {
    private final ReniecService reniecService;

    public IdentityController(ReniecService reniecService) {
        this.reniecService = reniecService;
    }

    @GetMapping("/reniec/validate")
    public ResponseEntity<?> validateReniec(@RequestParam String dni, @RequestParam(name="fch_nacimiento", required=false) String birthDate) {
        if (!dni.matches("\\d{8}")) return ResponseEntity.badRequest().body(Map.of("success", false, "message", "DNI inválido"));
        var result = reniecService.validateDni(dni, birthDate);
        boolean enabled = (boolean) result.get("enabled");
        if (!enabled) return ResponseEntity.status(501).body(Map.of("success", false, "message", result.get("message")));
        return ResponseEntity.ok(result);
    }
}


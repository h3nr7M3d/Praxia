package com.praxia.api.controller;

import com.praxia.api.service.ParametroService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/config")
public class ConfigController {
    private final ParametroService parametroService;

    public ConfigController(ParametroService parametroService) {
        this.parametroService = parametroService;
    }

    @GetMapping("/reserva-minutos")
    public Map<String, Object> getReservaMinutos() {
        int v = parametroService.getReservaMinutos();
        return Map.of("reserva_minutos", v);
    }
}


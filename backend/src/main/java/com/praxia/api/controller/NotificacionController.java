package com.praxia.api.controller;

import com.praxia.api.service.NotificacionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/notificaciones")
public class NotificacionController {
    private final NotificacionService service;

    public NotificacionController(NotificacionService service) {
        this.service = service;
    }

    @GetMapping("/pending")
    public List<Map<String,Object>> pending(@RequestParam(defaultValue = "200") int limit) {
        return service.fetchEligiblePending(Math.max(1, Math.min(limit, 500)));
    }

    public record MarkSentRequest(List<Long> ids) {}

    @PostMapping("/mark-sent")
    public ResponseEntity<?> markSent(@RequestBody MarkSentRequest body) {
        service.markSent(body.ids());
        return ResponseEntity.ok().build();
    }

    public record MarkFailRequest(Long id, String error) {}

    @PostMapping("/mark-fail")
    public ResponseEntity<?> markFail(@RequestBody MarkFailRequest body) {
        if (body.id() == null) return ResponseEntity.badRequest().build();
        service.markFail(body.id(), body.error() == null ? "" : body.error());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/mias")
    public List<Map<String,Object>> mias(@RequestParam("userId") long userId, @RequestParam(defaultValue = "20") int limit) {
        return service.listByUser(userId, Math.max(1, Math.min(limit, 100)));
    }
}


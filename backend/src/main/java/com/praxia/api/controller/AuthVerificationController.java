package com.praxia.api.controller;

import com.praxia.api.service.EmailService;
import com.praxia.api.service.NotificacionService;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/auth/verify")
public class AuthVerificationController {
    private final JdbcTemplate jdbc;
    private final EmailService emailService;
    private final NotificacionService noti;

    public AuthVerificationController(JdbcTemplate jdbc, EmailService emailService, NotificacionService noti) {
        this.jdbc = jdbc;
        this.emailService = emailService;
        this.noti = noti;
    }

    public record SendEmailReq(Long userId) {}

    @PostMapping("/email/send")
    public ResponseEntity<?> sendEmail(@RequestBody SendEmailReq body) {
        if (body == null || body.userId() == null) return ResponseEntity.badRequest().body("Falta userId");
        Long userId = body.userId();
        String email = jdbc.queryForObject("SELECT correo FROM usuario WHERE id_usuario=?", String.class, userId);
        if (email == null || email.isBlank()) return ResponseEntity.badRequest().body("Usuario sin correo");

        String code = generateCode();
        LocalDateTime exp = LocalDateTime.now().plusMinutes(10);

        // Upsert preferencia de notificación email
        jdbc.update("INSERT INTO usuario_preferencia_notif (id_usuario,id_canal,habilitado,verificado,destino) VALUES (?,1,1,0,?) ON DUPLICATE KEY UPDATE destino=VALUES(destino), habilitado=VALUES(habilitado)", userId, email);

        String sql = "INSERT INTO verificacion_contacto (id_usuario, canal, destino, codigo, fch_expira) VALUES (?,?,?,?,?)";
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, userId);
            ps.setString(2, "email");
            ps.setString(3, email);
            ps.setString(4, code);
            ps.setObject(5, exp);
            return ps;
        }, kh);

        Number verId = kh.getKey();
        if (verId != null) {
            try { noti.enqueueVerificacion(verId.longValue()); } catch (Exception ignore) {}
        }

        // Enviar correo directo (si SMTP está habilitado)
        emailService.sendPlain(email, "Código de verificación Praxia", "Tu código es " + code + ". Expira en 10 minutos.");

        return ResponseEntity.ok(Map.of("success", true));
    }

    public record ConfirmEmailReq(Long userId, String code) {}

    @PostMapping("/email/confirm")
    public ResponseEntity<?> confirmEmail(@RequestBody ConfirmEmailReq body) {
        if (body == null || body.userId() == null || body.code() == null) return ResponseEntity.badRequest().body("Faltan campos");
        Long userId = body.userId();
        String code = body.code();

        // Busca el último código válido
        String sql = "SELECT id_verificacion FROM verificacion_contacto WHERE id_usuario=? AND canal='email' AND usado=0 AND fch_expira>NOW() ORDER BY fch_emitido DESC LIMIT 1";
        Long idVer = jdbc.query(sql, ps -> ps.setLong(1, userId), rs -> rs.next() ? rs.getLong(1) : null);
        if (idVer == null) return ResponseEntity.status(409).body("No hay código vigente");

        String codigoDb = jdbc.queryForObject("SELECT codigo FROM verificacion_contacto WHERE id_verificacion=?", String.class, idVer);
        if (!code.equals(codigoDb)) return ResponseEntity.status(409).body("Código inválido");

        jdbc.update("UPDATE verificacion_contacto SET usado=1 WHERE id_verificacion=?", idVer);
        jdbc.update("INSERT INTO usuario_preferencia_notif (id_usuario,id_canal,habilitado,verificado) VALUES (?,1,1,1) ON DUPLICATE KEY UPDATE verificado=1, habilitado=1", userId);

        return ResponseEntity.ok(Map.of("success", true));
    }

    // --- Alternativas por correo (para flujos donde aún no hay userId creado en cliente) ---
    public record SendByEmailReq(String email) {}

    @PostMapping("/email/send-by-email")
    public ResponseEntity<?> sendByEmail(@RequestBody SendByEmailReq body) {
        if (body == null || body.email() == null || body.email().isBlank()) return ResponseEntity.badRequest().body("Falta email");
        String email = body.email().trim().toLowerCase();
        Long userId = jdbc.query("SELECT id_usuario FROM usuario WHERE LOWER(correo)=? LIMIT 1", ps -> ps.setString(1, email), rs -> rs.next() ? rs.getLong(1) : null);
        if (userId == null) return ResponseEntity.status(404).body("No existe usuario para ese correo");
        return sendEmail(new SendEmailReq(userId));
    }

    public record ConfirmByEmailReq(String email, String code) {}

    @PostMapping("/email/confirm-by-email")
    public ResponseEntity<?> confirmByEmail(@RequestBody ConfirmByEmailReq body) {
        if (body == null || body.email() == null || body.code() == null) return ResponseEntity.badRequest().body("Faltan campos");
        String email = body.email().trim().toLowerCase();
        Long userId = jdbc.query("SELECT id_usuario FROM usuario WHERE LOWER(correo)=? LIMIT 1", ps -> ps.setString(1, email), rs -> rs.next() ? rs.getLong(1) : null);
        if (userId == null) return ResponseEntity.status(404).body("No existe usuario para ese correo");
        return confirmEmail(new ConfirmEmailReq(userId, body.code()));
    }

    private static String generateCode() {
        SecureRandom r = new SecureRandom();
        int v = 100000 + r.nextInt(900000);
        return String.valueOf(v);
    }
}

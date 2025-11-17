package com.praxia.api.service;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ParametroService {

    private final JdbcTemplate jdbcTemplate;

    @Value("${app.reserva-minutos-default:20}")
    private int reservaMinutosDefault;

    public ParametroService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Value("${app.slot-minutes-default:20}")
    private int slotMinutesDefault;

    public int getReservaMinutos() {
        try {
            Integer v = jdbcTemplate.queryForObject(
                "SELECT valor_int FROM parametro_negocio WHERE cod_parametro = 'MINUTOS_MAX_RESERVA_SIN_PAGO'",
                Integer.class
            );
            return Optional.ofNullable(v).filter(x -> x > 0).orElse(reservaMinutosDefault);
        } catch (EmptyResultDataAccessException ex) {
            return reservaMinutosDefault;
        } catch (Exception ex) {
            return reservaMinutosDefault;
        }
    }

    public int getSlotMinutes() {
        try {
            Integer v = jdbcTemplate.queryForObject(
                "SELECT valor_int FROM parametro_negocio WHERE cod_parametro = 'DURACION_CITA_MIN'",
                Integer.class
            );
            return Optional.ofNullable(v).filter(x -> x > 0).orElse(slotMinutesDefault);
        } catch (EmptyResultDataAccessException ex) {
            return slotMinutesDefault;
        } catch (Exception ex) {
            return slotMinutesDefault;
        }
    }
}

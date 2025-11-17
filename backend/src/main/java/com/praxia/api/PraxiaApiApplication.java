package com.praxia.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PraxiaApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(PraxiaApiApplication.class, args);
    }
}

package com.emailrelay;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EmailRelayApplication {

    public static void main(String[] args) {
        SpringApplication.run(EmailRelayApplication.class, args);
    }
}

package com.project.limiter;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.sql.Time;
import java.util.TimeZone;

@SpringBootApplication
public class RLaaSApplication {

    public static void main(String[] args) {

        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));
        SpringApplication.run(RLaaSApplication.class, args);

    }

}

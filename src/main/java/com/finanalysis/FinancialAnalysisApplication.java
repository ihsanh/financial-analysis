package com.finanalysis;

import com.finanalysis.config.GeminiProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(GeminiProperties.class)
public class FinancialAnalysisApplication {
    public static void main(String[] args) {
        SpringApplication.run(FinancialAnalysisApplication.class, args);
    }
}

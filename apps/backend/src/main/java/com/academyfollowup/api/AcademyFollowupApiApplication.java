package com.academyfollowup.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class AcademyFollowupApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(AcademyFollowupApiApplication.class, args);
	}

}

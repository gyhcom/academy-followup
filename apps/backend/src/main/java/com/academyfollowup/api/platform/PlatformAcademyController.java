package com.academyfollowup.api.platform;

import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/platform/academies")
public class PlatformAcademyController {

    private final PlatformAdminAuthService platformAdminAuthService;
    private final PlatformAcademyService platformAcademyService;

    public PlatformAcademyController(
            PlatformAdminAuthService platformAdminAuthService,
            PlatformAcademyService platformAcademyService
    ) {
        this.platformAdminAuthService = platformAdminAuthService;
        this.platformAcademyService = platformAcademyService;
    }

    @GetMapping
    public PlatformAcademyResponse findAcademies(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader
    ) {
        platformAdminAuthService.resolve(authorizationHeader);
        return platformAcademyService.findAcademies();
    }

    @PostMapping
    public PlatformAcademyResponse updateAcademy(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @RequestBody PlatformAcademyRequest request
    ) {
        platformAdminAuthService.resolve(authorizationHeader);
        return platformAcademyService.handle(request);
    }
}

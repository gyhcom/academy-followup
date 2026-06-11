package com.academyfollowup.api.health;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class SupabaseHealthController {

    private final SupabaseHealthService supabaseHealthService;

    public SupabaseHealthController(SupabaseHealthService supabaseHealthService) {
        this.supabaseHealthService = supabaseHealthService;
    }

    @GetMapping("/supabase")
    public Map<String, Object> supabase() {
        return supabaseHealthService.check();
    }
}

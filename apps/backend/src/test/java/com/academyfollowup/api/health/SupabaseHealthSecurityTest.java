package com.academyfollowup.api.health;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SupabaseHealthSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SupabaseHealthService supabaseHealthService;

    @Test
    void returnsSupabaseHealthWithoutBearerToken() throws Exception {
        when(supabaseHealthService.check()).thenReturn(Map.of(
                "ok", true,
                "status", "connected"
        ));

        mockMvc.perform(get("/api/health/supabase"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.status").value("connected"));
    }
}

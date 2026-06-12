package com.academyfollowup.api.message;

import com.academyfollowup.api.global.config.SolapiProperties;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class SolapiClient {

    private static final String SEND_URL = "https://api.solapi.com/messages/v4/send";

    private final SolapiProperties solapiProperties;
    private final RestClient restClient;

    public SolapiClient(SolapiProperties solapiProperties, RestClient.Builder restClientBuilder) {
        this.solapiProperties = solapiProperties;
        this.restClient = restClientBuilder.build();
    }

    public String sendSms(String to, String text) {
        assertConfigured();

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri(SEND_URL)
                    .header(HttpHeaders.AUTHORIZATION, authorizationHeader())
                    .header(HttpHeaders.CONTENT_TYPE, "application/json")
                    .body(Map.of(
                            "message", Map.of(
                                    "to", to,
                                    "from", solapiProperties.senderPhone(),
                                    "text", text
                            )
                    ))
                    .retrieve()
                    .body(Map.class);

            return providerMessageId(response);
        } catch (RestClientResponseException exception) {
            String responseBody = exception.getResponseBodyAsString(StandardCharsets.UTF_8);
            throw new IllegalStateException(
                    StringUtils.hasText(responseBody) ? responseBody : "문자 발송에 실패했습니다."
            );
        } catch (Exception exception) {
            if (exception instanceof IllegalStateException) {
                throw exception;
            }

            throw new IllegalStateException("문자 발송에 실패했습니다.");
        }
    }

    private void assertConfigured() {
        if (!StringUtils.hasText(solapiProperties.apiKey())
                || !StringUtils.hasText(solapiProperties.apiSecret())
                || !StringUtils.hasText(solapiProperties.senderPhone())) {
            throw new IllegalStateException("SOLAPI 환경변수가 설정되지 않았습니다.");
        }
    }

    private String authorizationHeader() {
        String date = OffsetDateTime.now(ZoneOffset.UTC).toString();
        String salt = UUID.randomUUID().toString();
        String signature = hmacSha256(date + salt, solapiProperties.apiSecret());

        return "HMAC-SHA256 apiKey=" + solapiProperties.apiKey()
                + ", date=" + date
                + ", salt=" + salt
                + ", signature=" + signature;
    }

    private String hmacSha256(String value, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("SOLAPI 인증 서명을 만들지 못했습니다.");
        }
    }

    private String providerMessageId(Map<String, Object> response) {
        if (response == null) {
            return null;
        }

        Object candidate = response.get("messageId");
        if (candidate == null) {
            candidate = response.get("message_id");
        }
        if (candidate == null) {
            candidate = response.get("groupId");
        }
        if (candidate == null) {
            candidate = response.get("group_id");
        }
        if (candidate == null) {
            candidate = response.get("requestId");
        }

        return candidate instanceof String value ? value : null;
    }
}

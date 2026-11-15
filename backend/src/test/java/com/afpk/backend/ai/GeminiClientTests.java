package com.afpk.backend.ai;

import com.afpk.backend.common.ApiException;
import java.net.SocketTimeoutException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class GeminiClientTests {
    private MockRestServiceServer server;
    private RestClient restClient;
    private GeminiClient client;

    @BeforeEach
    void setUp() {
        var builder = RestClient.builder().baseUrl("https://generativelanguage.googleapis.com");
        server = MockRestServiceServer.bindTo(builder).build();
        restClient = builder.build();
        client = new GeminiClient(restClient, properties("test-only-key"));
    }

    private GeminiProperties properties(String key) {
        return new GeminiProperties(key, "gemini-3.8-flash", Duration.ofSeconds(5), Duration.ofSeconds(45), 4096);
    }

    @Test
    void sendsTheKeyOnlyInTheHeaderAndCombinesVisibleTextParts() {
        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent"))
                .andExpect(header("x-goog-api-key", "test-only-key"))
                .andExpect(jsonPath("$.systemInstruction.parts[0].text").isString())
                .andExpect(jsonPath("$.contents[0].role").value("user"))
                .andRespond(withSuccess("""
                        {"candidates":[{"finishReason":"STOP","content":{"parts":[
                        {"text":"내부 생각", "thought":true},{"text":"첫 문장. "},{"text":"두 번째 문장."}]}}]}
                        """, MediaType.APPLICATION_JSON));
        assertThat(client.explain("{\"changedSurplus\":1066935}")).isEqualTo("첫 문장. 두 번째 문장.");
        server.verify();
    }

    @Test
    void startsWithoutAKeyButReturnsAnActionableErrorOnRequest() {
        var noKey = new GeminiClient(restClient, properties(""));
        assertThatThrownBy(() -> noKey.explain("{}"))
                .isInstanceOfSatisfying(ApiException.class, error -> {
                    assertThat(error.status()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                    assertThat(error.code()).isEqualTo("AI_KEY_MISSING");
                });
        server.verify();
    }

    @Test
    void translatesQuotaErrorsWithoutReturningProviderBody() {
        server.expect(anything()).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS)
                .body("provider secret details").contentType(MediaType.TEXT_PLAIN));
        assertThatThrownBy(() -> client.explain("{}"))
                .isInstanceOfSatisfying(ApiException.class, error -> {
                    assertThat(error.status()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
                    assertThat(error.getMessage()).doesNotContain("provider secret details");
                });
    }

    @Test
    void translatesAuthenticationErrorsWithoutReturningProviderBody() {
        server.expect(anything()).andRespond(withStatus(HttpStatus.FORBIDDEN).body("test-only-key"));
        assertThatThrownBy(() -> client.explain("{}"))
                .isInstanceOfSatisfying(ApiException.class, error -> {
                    assertThat(error.code()).isEqualTo("AI_AUTH_ERROR");
                    assertThat(error.getMessage()).doesNotContain("test-only-key");
                });
    }

    @Test
    void distinguishesFreeTierEligibilityFromAnInvalidKey() {
        server.expect(anything()).andRespond(withStatus(HttpStatus.FORBIDDEN)
                .body("{\"error\":{\"message\":\"The Gemini API free tier is not available for this project.\"}}")
                .contentType(MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client.explain("{}"))
                .isInstanceOfSatisfying(ApiException.class, error -> {
                    assertThat(error.code()).isEqualTo("AI_FREE_TIER_UNAVAILABLE");
                    assertThat(error.getMessage()).contains("무료 API").doesNotContain("test-only-key");
                });
    }

    @Test
    void rejectsTruncatedOrBlockedAnswers() {
        server.expect(anything()).andRespond(withSuccess("""
                {"candidates":[{"finishReason":"MAX_TOKENS","content":{"parts":[{"text":"잘린 답변"}]}}]}
                """, MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client.explain("{}"))
                .isInstanceOfSatisfying(ApiException.class, error -> assertThat(error.code()).isEqualTo("AI_EMPTY_RESPONSE"));
    }

    @Test
    void rejectsAnEmptyAnswer() {
        server.expect(anything()).andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client.explain("{}"))
                .isInstanceOfSatisfying(ApiException.class, error -> assertThat(error.status()).isEqualTo(HttpStatus.BAD_GATEWAY));
    }

    @Test
    void translatesReadTimeouts() {
        server.expect(anything()).andRespond(withException(new SocketTimeoutException("read timeout")));
        assertThatThrownBy(() -> client.explain("{}"))
                .isInstanceOfSatisfying(ApiException.class, error -> assertThat(error.status()).isEqualTo(HttpStatus.GATEWAY_TIMEOUT));
    }

    @Test
    void sendsConversationAsUserModelUserWithVerifiedPlanContext() {
        server.expect(anything()).andExpect(header("x-goog-api-key", "test-only-key"))
                .andExpect(jsonPath("$.contents[0].role").value("user"))
                .andExpect(jsonPath("$.contents[0].parts[0].text").value(org.hamcrest.Matchers.containsString("VERIFIED_PLAN")))
                .andExpect(jsonPath("$.contents[1].role").value("model"))
                .andExpect(jsonPath("$.contents[1].parts[0].text").value("배분을 확인하세요."))
                .andExpect(jsonPath("$.contents[2].role").value("user"))
                .andExpect(jsonPath("$.contents[2].parts[0].text").value("왜 중요해?"))
                .andExpect(jsonPath("$.generationConfig.responseMimeType").doesNotExist())
                .andRespond(withSuccess("""
                  {"candidates":[{"finishReason":"STOP","content":{"parts":[{"text":"중복 배정 여부를 확인해야 합니다."}]}}]}
                  """,MediaType.APPLICATION_JSON));
        assertThat(client.chat("VERIFIED_PLAN",List.of(Map.of("role","user","text","무엇을 확인해?"),
          Map.of("role","assistant","text","배분을 확인하세요."),Map.of("role","user","text","왜 중요해?"))))
          .isEqualTo("중복 배정 여부를 확인해야 합니다.");
        server.verify();
    }
}

package com.afpk.backend.scenario;

import com.afpk.backend.ai.GeminiClient;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ScenarioAnalysisControllerTests {
    @Autowired MockMvc mvc;
    @MockitoBean GeminiClient gemini;

    // Same shape as React, including untrusted derived values and assumptions.
    private static final String PAYLOAD = """
            {"conditions":{"incomeDecreaseRate":10,"expenseIncreaseRate":0},
             "cashflow":{"originalIncome":3019950,"originalExpenses":1486190,"monthlyLoanPayment":164830,
               "changedSurplus":999999999,"changedIncome":999999999},
             "goal":{"targetAmount":20000000,"remainingMonths":12,"originalResult":{"shortfall":0}},
             "adjustment":null,"stressTest":null,"assumptions":["FAKE_CLIENT_INSTRUCTION"]}
            """;

    @Test
    void servesTheFrontendContractUsingServerCalculatedValues() throws Exception {
        when(gemini.explain(anyString())).thenReturn("소득 감소로 월 잉여자금이 줄었습니다.");
        mvc.perform(post("/api/analyze-scenario").contentType(MediaType.APPLICATION_JSON).content(PAYLOAD))
                .andExpect(status().isOk()).andExpect(jsonPath("$.explanation").value("소득 감소로 월 잉여자금이 줄었습니다."));
        var input = ArgumentCaptor.forClass(String.class);
        verify(gemini).explain(input.capture());
        assertThat(input.getValue()).contains("\"changedSurplus\":1066935", "\"shortfall\":3572840")
                .doesNotContain("999999999", "FAKE_CLIENT_INSTRUCTION");
    }

    @Test
    void rejectsInvalidInputsBeforeCallingTheProvider() throws Exception {
        mvc.perform(post("/api/analyze-scenario").contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD.replace("\"remainingMonths\":12", "\"remainingMonths\":0")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        verifyNoInteractions(gemini);
    }

    @Test
    void acceptsTheFullStressPayloadAndRecalculatesItsResults() throws Exception {
        when(gemini.explain(anyString())).thenReturn("충격이 끝난 뒤에는 원래 소득으로 돌아옵니다.");
        String stress = """
                {"shockMonths":6,"originalPlan":{"targetAmount":999,"remainingMonths":999},
                 "revisedPlan":{"targetAmount":10000000,"remainingMonths":3,"plannedMonthlySavings":2000000},
                 "scenarios":[{"name":"소득 감소","incomeDecreaseRate":10,"expenseIncreaseRate":0,
                   "stressedMonthlySurplus":999999999,"originalResult":{"shortfall":0}}]}
                """;
        mvc.perform(post("/api/analyze-scenario").contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD.replace("\"stressTest\":null", "\"stressTest\":" + stress)))
                .andExpect(status().isOk());
        var input = ArgumentCaptor.forClass(String.class);
        verify(gemini).explain(input.capture());
        assertThat(input.getValue()).contains("\"totalNetCashflow\":14615190", "\"shortfall\":5384810",
                "\"exceedsMonthlyCapacity\":true").doesNotContain("999999999");
    }

    @Test
    void includesAdditionalCapitalInTheProviderInput() throws Exception {
        when(gemini.explain(anyString())).thenReturn("부모 지원 취소 시 추가 자금이 필요합니다.");
        String stress = """
                {"shockMonths":6,"scenarios":[{"name":"부모 지원 취소","incomeDecreaseRate":0,
                 "expenseIncreaseRate":0,"extraCost":50000000,"originalResult":{"shortfall":0}}]}
                """;
        mvc.perform(post("/api/analyze-scenario").contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD.replace("\"stressTest\":null", "\"stressTest\":" + stress)))
                .andExpect(status().isOk());
        var input = ArgumentCaptor.forClass(String.class);
        verify(gemini).explain(input.capture());
        assertThat(input.getValue()).contains("\"extraCost\":50000000", "\"shortfall\":53572840");
    }

    @Test
    void rejectsNegativeAdditionalCapitalBeforeCallingTheProvider() throws Exception {
        String stress = """
                {"shockMonths":6,"scenarios":[{"name":"기본","incomeDecreaseRate":0,
                 "expenseIncreaseRate":0,"extraCost":-1}]}
                """;
        mvc.perform(post("/api/analyze-scenario").contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD.replace("\"stressTest\":null", "\"stressTest\":" + stress)))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(gemini);
    }

    @Test
    void rejectsFractionalWonInsteadOfSilentlyTruncating() throws Exception {
        mvc.perform(post("/api/analyze-scenario").contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD.replace("\"originalIncome\":3019950", "\"originalIncome\":3019950.5")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_JSON"));
        verifyNoInteractions(gemini);
    }

    @Test
    void rejectsMissingNestedFieldsAndMalformedJson() throws Exception {
        mvc.perform(post("/api/analyze-scenario").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/analyze-scenario").contentType(MediaType.APPLICATION_JSON).content("not-json"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(gemini);
    }
}

package com.afpk.backend.scenario;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "gemini.api-key=")
@AutoConfigureMockMvc
class ScenarioAnalysisMissingKeyTests {
    @Autowired MockMvc mvc;

    @Test
    void theRealClientReturnsMissingKeyWithoutCallingGoogle() throws Exception {
        mvc.perform(post("/api/analyze-scenario").contentType(MediaType.APPLICATION_JSON).content("""
                {"conditions":{"incomeDecreaseRate":10,"expenseIncreaseRate":0},
                 "cashflow":{"originalIncome":3019950,"originalExpenses":1486190,"monthlyLoanPayment":164830},
                 "goal":{"targetAmount":20000000,"remainingMonths":12}}
                """))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("AI_KEY_MISSING"))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }
}

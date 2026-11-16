package com.afpk.backend.review;

import com.afpk.backend.ai.GeminiClient;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.json.JsonMapper;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc
class PlanStressReviewTests {
  @Autowired MockMvc mvc;
  @Autowired JsonMapper json;
  @MockitoBean GeminiClient gemini;

  private String plan() throws Exception {
    try(var stream=getClass().getResourceAsStream("/review/five-year-plan.json")) {
      return new String(stream.readAllBytes(),StandardCharsets.UTF_8);
    }
  }
  private String answer() {
    return json.writeValueAsString(java.util.Map.of("sections",List.of("cashflow","allocation","goal","stress","monteCarlo","adjustment")
        .stream().map(id -> java.util.Map.of("id",id,"problem","계획의 전제를 확인해 주세요.","action","확인 자료를 준비해 주세요.")).toList()));
  }

  @Test void independentlyReproducesAllSixReportCases() throws Exception {
    var request=json.readValue(plan(),PlanReviewRequest.class);
    var result=PlanStressCalculator.calculate(request,130000);
    long[][] expected={{1663760,13760,0,0},{1533760,-116240,2789760,0},{1361765,-288235,7256460,0},
        {1528141,-121859,2924616,0},{1663760,13760,0,5443200},{1226146,-423854,12138744,5443200}};
    assertThat(result.scenarios()).hasSize(6);
    assertThat(result.scenarios().get(2).income()).isEqualTo(2717955);
    assertThat(result.scenarios().get(2).livingExpensesAfterReductionAndShock()).isEqualTo(1356190);
    assertThat(result.scenarios().get(2).expenseReductionApplied()).isEqualTo(130000);
    for(int i=0;i<6;i++) {
      var row=result.scenarios().get(i);
      assertThat(new long[]{row.available(),row.periods().getFirst().gap(),row.uncoveredTotal(),row.isaLoss()}).containsExactly(expected[i]);
    }
  }

  @Test void reviewsFiveYearStressWithoutRequiringAnExtraGoal() throws Exception {
    when(gemini.review(anyString())).thenReturn(answer());
    mvc.perform(post("/api/review-plan").contentType(MediaType.APPLICATION_JSON).content(plan()))
        .andExpect(status().isOk()).andExpect(jsonPath("$.sections.length()").value(6))
        .andExpect(jsonPath("$.sections[2].status").value("missing"))
        .andExpect(jsonPath("$.sections[3].status").value("attention"))
        .andExpect(jsonPath("$.sections[3].evidence[2]").value(org.hamcrest.Matchers.containsString("7,256,460원")))
        .andExpect(jsonPath("$.sections[3].evidence[4]").value(org.hamcrest.Matchers.containsString("5,443,200원")));
    var data=ArgumentCaptor.forClass(String.class); verify(gemini).review(data.capture());
    assertThat(data.getValue()).contains("\"planStress\":{","\"uncoveredTotal\":12138744","\"scenario\":null","상세 목표");
  }

  @Test void chatAlsoReceivesRecalculatedFiveYearStressBeforeAnyReview() throws Exception {
    when(gemini.chat(anyString(),anyList())).thenReturn("소득 감소 시 유동성 배분을 줄이고도 부족액이 남습니다.");
    String body="{\"plan\":"+plan()+",\"messages\":[{\"role\":\"user\",\"text\":\"소득이 줄어도 계획을 유지할 수 있어?\"}]}";
    mvc.perform(post("/api/review-plan/chat").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
    var data=ArgumentCaptor.forClass(String.class); verify(gemini).chat(data.capture(),anyList());
    assertThat(data.getValue()).contains("\"uncoveredTotal\":7256460","\"isaLoss\":5443200","\"reviewScope\"",
        "\"livingExpensesAfterReductionAndShock\":1356190","\"expenseReductionApplied\":130000");
  }

  @Test void acceptsCappedExpenseSavingsInReviewAndChatWhenLivingExpensesAreLow() throws Exception {
    when(gemini.review(anyString())).thenReturn(answer());
    when(gemini.chat(anyString(),anyList())).thenReturn("학자금 상환과 비상자금 적립을 유지하며 배분을 점검합니다.");
    for (long expenses : new long[]{0,100000}) {
      clearInvocations(gemini);
      String request=plan().replace("\"monthlyLivingExpenses\":1486190","\"monthlyLivingExpenses\":"+expenses)
          .replace("\"allocationExpenseReduction\":130000","\"allocationExpenseReduction\":"+expenses);
      mvc.perform(post("/api/review-plan").contentType(MediaType.APPLICATION_JSON).content(request))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.sections[1].evidence[0]").value(org.hamcrest.Matchers.containsString("배분 가능 3,019,950원")));
      var reviewData=ArgumentCaptor.forClass(String.class);
      verify(gemini).review(reviewData.capture());
      assertThat(reviewData.getValue()).contains("\"allocationExpenseReduction\":"+expenses,
          "\"livingExpensesAfterReductionAndShock\":0","\"expenseReductionApplied\":"+expenses,
          "\"available\":3019950");

      String body="{\"plan\":"+request+",\"messages\":[{\"role\":\"user\",\"text\":\"현재 생활지출 기준으로 검토해줘\"}]}";
      mvc.perform(post("/api/review-plan/chat").contentType(MediaType.APPLICATION_JSON).content(body))
          .andExpect(status().isOk());
      var chatData=ArgumentCaptor.forClass(String.class);
      verify(gemini).chat(chatData.capture(),anyList());
      assertThat(chatData.getValue()).contains("\"allocationExpenseReduction\":"+expenses,
          "\"livingExpensesAfterReductionAndShock\":0","\"expenseReductionApplied\":"+expenses,
          "\"available\":3019950");
    }
  }

  @Test void editedIsaAndLiquidityChangeTheServerEvidence() throws Exception {
    when(gemini.review(anyString())).thenReturn(answer());
    String edited=plan().replace("[0,690000,490000,490000]","[0,0,0,0]").replace("[0,0,260000,760000]","[0,0,0,0]");
    mvc.perform(post("/api/review-plan").contentType(MediaType.APPLICATION_JSON).content(edited)).andExpect(status().isOk());
    var data=ArgumentCaptor.forClass(String.class); verify(gemini).review(data.capture());
    assertThat(data.getValue()).contains("\"isaContribution\":0").doesNotContain("\"isaLoss\":5443200");
  }

  @Test void retainsTheExtraGoalStressSeparatelyFromTheFiveYearPlan() throws Exception {
    when(gemini.review(anyString())).thenReturn(answer());
    String scenario="""
      {"conditions":{"incomeDecreaseRate":10,"expenseIncreaseRate":0},
       "cashflow":{"originalIncome":3019950,"originalExpenses":1486190,"monthlyLoanPayment":164830},
       "goal":{"targetAmount":20000000,"remainingMonths":12},
       "stressTest":{"shockMonths":6,"scenarios":[{"name":"소득 감소","incomeDecreaseRate":10,"expenseIncreaseRate":0,"extraCost":0}]}}
      """;
    mvc.perform(post("/api/review-plan").contentType(MediaType.APPLICATION_JSON).content(plan().replace("\"scenario\":null","\"scenario\":"+scenario)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sections[3].evidence[0]").value(org.hamcrest.Matchers.containsString("[5년 설계안]")))
        .andExpect(jsonPath("$.sections[3].evidence[7]").value(org.hamcrest.Matchers.containsString("[추가 목표의 일시 충격]")));
  }

  @Test void rejectsInvalidPeriodsRatiosAndDuplicateIdsBeforeCallingAi() throws Exception {
    for(String input:List.of(
        plan().replace("[12,12,12,24]","[12,12,12,12]"),
        plan().replace("\"isaStockRatio\":0.6","\"isaStockRatio\":1.5"),
        plan().replace("\"isaDropRate\":0.35","\"isaDropRate\":null"),
        plan().replace("\"id\":\"liquidity\"","\"id\":\"isa\""))) {
      mvc.perform(post("/api/review-plan").contentType(MediaType.APPLICATION_JSON).content(input)).andExpect(status().isBadRequest());
    }
    verifyNoInteractions(gemini);
  }
}

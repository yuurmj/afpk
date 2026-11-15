package com.afpk.backend.review;
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
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc
class PlanReviewTests {
  @Autowired MockMvc mvc;
  @MockitoBean GeminiClient gemini;
  private static final String AI="""
{"sections": [{"id": "cashflow", "problem": "계산 가정과 누락된 자료를 확인해 주세요.", "action": "고객정보와 계획의 기준이 일치하는지 확인해 주세요."}, {"id": "allocation", "problem": "계산 가정과 누락된 자료를 확인해 주세요.", "action": "고객정보와 계획의 기준이 일치하는지 확인해 주세요."}, {"id": "goal", "problem": "계산 가정과 누락된 자료를 확인해 주세요.", "action": "고객정보와 계획의 기준이 일치하는지 확인해 주세요."}, {"id": "stress", "problem": "계산 가정과 누락된 자료를 확인해 주세요.", "action": "고객정보와 계획의 기준이 일치하는지 확인해 주세요."}, {"id": "monteCarlo", "problem": "계산 가정과 누락된 자료를 확인해 주세요.", "action": "고객정보와 계획의 기준이 일치하는지 확인해 주세요."}, {"id": "adjustment", "problem": "계산 가정과 누락된 자료를 확인해 주세요.", "action": "고객정보와 계획의 기준이 일치하는지 확인해 주세요."}]}
    """;
  private static final String BASE="""
    {"customer":{"age":32,"occupation":"직장인","monthlyNetIncome":3019950,"monthlyLivingExpenses":1486190,
      "monthlyLoanPayment":164830,"totalAssets":0,"totalDebt":8000000},
    "allocationPeriods":["1년차"],"allocationItems":[{"id":"saving","name":"저축·상환","monthly":[1650000]}],
    "scenario":null,"monteCarlo":null,"adjustmentExceedsCapacity":false}
    """;
  @Test void reviewsBudgetAndMissingInputsWithoutRequiringAGoal() throws Exception {
    when(gemini.review(anyString())).thenReturn(AI);
    mvc.perform(post("/api/review-plan").contentType(MediaType.APPLICATION_JSON).content(BASE))
      .andExpect(status().isOk()).andExpect(jsonPath("$.sections.length()").value(6))
      .andExpect(jsonPath("$.sections[1].status").value("attention"))
      .andExpect(jsonPath("$.sections[2].status").value("missing"));
    var data=ArgumentCaptor.forClass(String.class); verify(gemini).review(data.capture());
    assertThat(data.getValue()).contains("\"monthlyBudgetExcess\":116240", "\"monthlySurplus\":1368930",
      "\"netWorth\":-8000000", "\"scenario\":null", "\"monteCarlo\":null");
  }
  @Test void includesAllSuppliedAnalysisWithServerRecalculation() throws Exception {
    when(gemini.review(anyString())).thenReturn(AI);
    String scenario="""
      {"conditions":{"incomeDecreaseRate":10,"expenseIncreaseRate":0},
       "cashflow":{"originalIncome":3019950,"originalExpenses":1486190,"monthlyLoanPayment":164830},
       "goal":{"targetAmount":20000000,"remainingMonths":12},
       "adjustment":{"targetAmount":10000000,"remainingMonths":12,"monthlySavings":1000000},
       "stressTest":{"shockMonths":6,"scenarios":[{"name":"지원 취소","incomeDecreaseRate":0,
       "expenseIncreaseRate":0,"extraCost":50000000,"originalResult":{"shortfall":0}}]}}
      """;
    String mc="""
      {"runs":1000,"incomeVolatility":0.05,"expenseVolatility":0.05,"successRate":0.1,"p10":10000000,"median":16000000,"p90":21000000}
      """;
    mvc.perform(post("/api/review-plan").contentType(MediaType.APPLICATION_JSON)
      .content(BASE.replace("\"scenario\":null","\"scenario\":"+scenario).replace("\"monteCarlo\":null","\"monteCarlo\":"+mc)))
      .andExpect(status().isOk());
    var data=ArgumentCaptor.forClass(String.class); verify(gemini).review(data.capture());
    assertThat(data.getValue()).contains("\"shortfall\":53572840", "\"runs\":1000", "\"monthlySavings\":1000000", "서버에서 재현 검증한 수치가 아니다");
  }
  @Test void rejectsInvalidAllocationAndUnboundSimulation() throws Exception {
    mvc.perform(post("/api/review-plan").contentType(MediaType.APPLICATION_JSON)
      .content(BASE.replace("[1650000]","[-1]"))).andExpect(status().isBadRequest());
    mvc.perform(post("/api/review-plan").contentType(MediaType.APPLICATION_JSON)
      .content(BASE.replace("[1650000]","[1650000,1]"))).andExpect(status().isBadRequest());
    mvc.perform(post("/api/review-plan").contentType(MediaType.APPLICATION_JSON)
      .content(BASE.replace("\"monteCarlo\":null","\"monteCarlo\":{\"runs\":1000,\"p10\":1,\"median\":2,\"p90\":3}")))
      .andExpect(status().isBadRequest());
    verifyNoInteractions(gemini);
  }

  @Test void foodSavingsRemoveBudgetWarningAndShowRemainingCapacity() throws Exception {
    when(gemini.review(anyString())).thenReturn(AI);
    mvc.perform(post("/api/review-plan").contentType(MediaType.APPLICATION_JSON)
      .content(BASE.replace("1486190","1356190")))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.sections[1].status").value("checked"))
      .andExpect(jsonPath("$.sections[1].findings[0]").value("모든 기간의 월 배분 합계가 현재 가용 재원 이내입니다."))
      .andExpect(jsonPath("$.sections[1].evidence[0]").value(org.hamcrest.Matchers.containsString("여유 13,760원")));
    var data=ArgumentCaptor.forClass(String.class); verify(gemini).review(data.capture());
    assertThat(data.getValue()).contains("\"monthlyBudgetExcess\":0").doesNotContain("\"monthlyBudgetExcess\":116240");
  }
  @Test void respectsUpdatedAssetsAndDoesNotAssumeLiquidityOrDefaultCustomer() throws Exception {
    when(gemini.review(anyString())).thenReturn(AI);
    mvc.perform(post("/api/review-plan").contentType(MediaType.APPLICATION_JSON)
      .content(BASE.replace("\"totalAssets\":0","\"totalAssets\":20000000").replace("\"age\":32","\"age\":40")))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.sections[0].status").value("checked"))
      .andExpect(jsonPath("$.sections[0].evidence[4]").value(org.hamcrest.Matchers.containsString("순자산 12,000,000원")))
      .andExpect(jsonPath("$.sections[0].findings[2]").value(org.hamcrest.Matchers.containsString("판단하지 않았습니다")));
  }
  @Test void rejectsIncompleteOrDuplicateAiSections() throws Exception {
    when(gemini.review(anyString())).thenReturn("일반 문장", "{\"sections\":[]}", AI.replace("allocation","cashflow"));
    for(int attempt=0;attempt<3;attempt++) {
      mvc.perform(post("/api/review-plan").contentType(MediaType.APPLICATION_JSON).content(BASE))
        .andExpect(status().isBadGateway()).andExpect(jsonPath("$.code").value("AI_REVIEW_FORMAT"));
    }
  }
  @Test void distinguishesPeriodChangesFromTargetChangesAndFlagsUnlinkedAllocation() throws Exception {
    when(gemini.review(anyString())).thenReturn(AI);
    String scenario="""
      {"conditions":{"incomeDecreaseRate":10,"expenseIncreaseRate":0},
       "cashflow":{"originalIncome":3019950,"originalExpenses":1486190,"monthlyLoanPayment":164830},
       "goal":{"targetAmount":20000000,"remainingMonths":12},
       "adjustment":{"targetAmount":20000000,"remainingMonths":24,"monthlySavings":1000000}}
      """;
    mvc.perform(post("/api/review-plan").contentType(MediaType.APPLICATION_JSON)
      .content(BASE.replace("\"scenario\":null","\"scenario\":"+scenario)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.sections[5].findings[1]").value("기존 계획과 비교: 목표금액은 동일, 목표기간은 변경입니다."))
      .andExpect(jsonPath("$.sections[5].findings[2]").value(org.hamcrest.Matchers.containsString("중복 배정")));
  }
  @Test void rejectsMissingOrInvalidCustomerDataBeforeAiCall() throws Exception {
    mvc.perform(post("/api/review-plan").contentType(MediaType.APPLICATION_JSON)
      .content(BASE.replace("\"totalAssets\":0","\"totalAssets\":null"))).andExpect(status().isBadRequest());
    mvc.perform(post("/api/review-plan").contentType(MediaType.APPLICATION_JSON)
      .content(BASE.replace("\"occupation\":\"직장인\"","\"occupation\":\" \""))).andExpect(status().isBadRequest());
    verifyNoInteractions(gemini);
  }
}

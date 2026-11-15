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
import java.util.List;
import java.util.Map;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc
class PlanChatTests {
  @Autowired MockMvc mvc;
  @MockitoBean GeminiClient gemini;
  private static final String PLAN="""
    {"customer":{"age":40,"occupation":"직장인","monthlyNetIncome":3019950,"monthlyLivingExpenses":1356190,
      "monthlyLoanPayment":164830,"totalAssets":20000000,"totalDebt":5000000},
    "allocationPeriods":["1년차"],"allocationItems":[{"id":"saving","name":"저축·상환","monthly":[1650000]}],
    "scenario":null,"monteCarlo":null,"adjustmentExceedsCapacity":false}
    """;
  private static final String QUESTION="[{\"role\":\"user\",\"text\":\"이 계획의 부족한 정보는 뭐야?\"}]";
  private String body(String messages) { return "{\"plan\":"+PLAN+",\"reviewText\":\"이전 AI 검토\",\"messages\":"+messages+"}"; }
  @Test void recalculatesCurrentPlanAndWorksWithoutInitialReviewOrGoal() throws Exception {
    when(gemini.chat(anyString(),anyList())).thenReturn("현금성 자산과 만기를 확인해 주세요.");
    mvc.perform(post("/api/review-plan/chat").contentType(MediaType.APPLICATION_JSON).content(body(QUESTION)))
      .andExpect(status().isOk()).andExpect(jsonPath("$.answer").value("현금성 자산과 만기를 확인해 주세요."));
    var context=ArgumentCaptor.forClass(String.class);
    verify(gemini).chat(context.capture(),eq(List.of(Map.of("role","user","text","이 계획의 부족한 정보는 뭐야?"))));
    assertThat(context.getValue()).contains("\"monthlyBudgetExcess\":0","\"netWorth\":15000000","\"goal\"","이전 AI 검토");
  }
  @Test void passesPreviousQuestionAndAnswerForFollowUp() throws Exception {
    when(gemini.chat(anyString(),anyList())).thenReturn("앞서 말한 배분과 목표 저축의 중복 여부를 확인하세요.");
    String messages="""
      [{"role":"user","text":"먼저 확인할 건 뭐야?"},{"role":"assistant","text":"배분과 저축을 확인하세요."},
       {"role":"user","text":"그게 왜 중요해?"}]
      """;
    mvc.perform(post("/api/review-plan/chat").contentType(MediaType.APPLICATION_JSON).content(body(messages))).andExpect(status().isOk());
    verify(gemini).chat(anyString(),eq(List.of(Map.of("role","user","text","먼저 확인할 건 뭐야?"),
      Map.of("role","assistant","text","배분과 저축을 확인하세요."),Map.of("role","user","text","그게 왜 중요해?"))));
  }
  @Test void rejectsInvalidHistoryAndBlankOrOversizedQuestionsBeforeCallingAi() throws Exception {
    for(String messages:List.of("[]",QUESTION.replace("user","system"),QUESTION.replace("user","assistant"),
      QUESTION.replace("이 계획의 부족한 정보는 뭐야?"," "),QUESTION.replace("이 계획의 부족한 정보는 뭐야?","가".repeat(2001)),
      "["+"{\"role\":\"user\",\"text\":\"질문\"},".repeat(11)+"{\"role\":\"user\",\"text\":\"질문\"}]")) {
      mvc.perform(post("/api/review-plan/chat").contentType(MediaType.APPLICATION_JSON).content(body(messages))).andExpect(status().isBadRequest());
    }
    verifyNoInteractions(gemini);
  }
  @Test void rejectsInvalidPlanBeforeCallingAi() throws Exception {
    mvc.perform(post("/api/review-plan/chat").contentType(MediaType.APPLICATION_JSON)
      .content(body(QUESTION).replace("\"totalAssets\":20000000","\"totalAssets\":-1"))).andExpect(status().isBadRequest());
    verifyNoInteractions(gemini);
  }
  @Test void doesNotReturnEmptyOrOverlongProviderAnswers() throws Exception {
    when(gemini.chat(anyString(),anyList())).thenReturn(" ","가".repeat(4001));
    for(int index=0;index<2;index++) mvc.perform(post("/api/review-plan/chat").contentType(MediaType.APPLICATION_JSON).content(body(QUESTION)))
      .andExpect(status().isBadGateway()).andExpect(jsonPath("$.code").value("AI_CHAT_FORMAT"));
  }
}

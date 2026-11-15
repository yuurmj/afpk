package com.afpk.backend.review;
import com.afpk.backend.ai.GeminiClient;
import com.afpk.backend.common.ApiException;
import com.afpk.backend.scenario.ScenarioCalculator;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.json.JsonMapper;

@RestController
public class PlanReviewController {
  private final ScenarioCalculator calculator; private final GeminiClient gemini; private final JsonMapper json;
  public PlanReviewController(ScenarioCalculator calculator, GeminiClient gemini, JsonMapper json) {
    this.calculator=calculator; this.gemini=gemini; this.json=json;
  }
  public record ReviewResponse(String review, List<ReviewSections.Section> sections) {}
  public record AiComment(String id, String problem, String action) {}
  public record AiReview(List<AiComment> sections) {}
  @PostMapping("/api/review-plan")
  public ReviewResponse review(@Valid @RequestBody PlanReviewRequest request) {
    var verified=prepare(request);
    var facts=ReviewSections.build(request, verified);
    String answer=gemini.review(json.writeValueAsString(Map.of("calculations",verified,"sections",facts)));
    try {
      var ai=json.readValue(answer, AiReview.class);
      if(ai.sections()==null || ai.sections().size()!=facts.size()) throw new IllegalArgumentException();
      Map<String,AiComment> comments=new HashMap<>();
      for(var item:ai.sections()) {
        if(item==null || item.id()==null || item.problem()==null || item.action()==null || item.problem().isBlank() || item.action().isBlank()
            || item.problem().length()>1000 || item.action().length()>1000 || comments.put(item.id(),item)!=null) throw new IllegalArgumentException();
      }
      var sections=facts.stream().map(fact -> {
        var comment=comments.get(fact.id()); if(comment==null) throw new IllegalArgumentException();
        return fact.withAdvice(fact.status().equals("missing") ? new ReviewSections.Advice("자료가 없어 검토할 수 없습니다.","해당 입력 또는 시뮬레이션을 완료한 뒤 다시 검토해 주세요.")
            : new ReviewSections.Advice(comment.problem(),comment.action()));
      }).toList();
      String plain=sections.stream().map(s -> s.title()+"\n"+String.join("\n",s.findings())+"\n"+s.advice().problem()+"\n"+s.advice().action()).reduce((a,b)->a+"\n\n"+b).orElse("");
      return new ReviewResponse(plain,sections);
    } catch(RuntimeException exception) {
      throw new ApiException(HttpStatus.BAD_GATEWAY,"AI_REVIEW_FORMAT","AI가 검토 항목을 올바르게 작성하지 못했습니다. 다시 검토해 주세요.");
    }
  }
  public record ChatResponse(String answer) {}
  @PostMapping("/api/review-plan/chat")
  public ChatResponse chat(@Valid @RequestBody PlanChatRequest request) {
    var messages=request.messages();
    if(messages.size()%2==0) throw invalid("마지막 메시지는 사용자 질문이어야 합니다.");
    for(int index=0;index<messages.size();index++) {
      String expected=index%2==0?"user":"assistant";
      if(!expected.equals(messages.get(index).role())) throw invalid("질문과 답변 순서를 확인해 주세요.");
      if(expected.equals("user") && messages.get(index).text().length()>2000) throw invalid("질문은 2,000자 이내로 입력해 주세요.");
    }
    var verified=prepare(request.plan());
    var context=new LinkedHashMap<String,Object>();
    context.put("calculations",verified);
    context.put("sections",ReviewSections.build(request.plan(),verified));
    context.put("previousAiReview",request.reviewText()==null?"":request.reviewText());
    var history=messages.stream().map(message -> Map.of("role",message.role(),"text",message.text())).toList();
    String answer=gemini.chat(json.writeValueAsString(context),history);
    if(answer==null || answer.isBlank() || answer.length()>4000) {
      throw new ApiException(HttpStatus.BAD_GATEWAY,"AI_CHAT_FORMAT","AI 답변이 비어 있거나 너무 깁니다. 질문을 나누어 다시 입력해 주세요.");
    }
    return new ChatResponse(answer);
  }
  Map<String,Object> prepare(PlanReviewRequest r) {
    var c=r.customer();
    long currentAvailable=c.monthlyNetIncome()-c.monthlyLivingExpenses();
    long reduction=r.allocationExpenseReduction()==null?0:r.allocationExpenseReduction();
    if(reduction>c.monthlyLivingExpenses()) throw invalid("배분 계획의 지출 절감액은 현재 생활지출을 초과할 수 없습니다.");
    long available=currentAvailable+reduction;
    Map<String,Object> data=new LinkedHashMap<>();
    data.put("customer", c);
    data.put("monthlySurplus", currentAvailable-c.monthlyLoanPayment());
    data.put("allocationExpenseReduction",reduction);
    data.put("netWorth", c.totalAssets()-c.totalDebt());
    var rows=new ArrayList<Map<String,Object>>();
    for (var item:r.allocationItems()) if(item.monthly().size()!=r.allocationPeriods().size()) throw invalid("배분표의 기간과 월 금액 개수가 다릅니다.");
    for(int i=0;i<r.allocationPeriods().size();i++) {
      long total=0; for(var item:r.allocationItems()) total+=item.monthly().get(i);
      rows.add(Map.of("period",r.allocationPeriods().get(i),"monthlyAllocationTotal",total,
          "availableBeforeLoanRepayment",available,"monthlyBudgetExcess",Math.max(total-available,0)));
    }
    data.put("allocationItems",r.allocationItems()); data.put("allocationReview",rows);
    if(r.scenario()!=null) {
      var cash=r.scenario().cashflow();
      if(!cash.originalIncome().equals(c.monthlyNetIncome()) || !cash.originalExpenses().equals(c.monthlyLivingExpenses())
          || !cash.monthlyLoanPayment().equals(c.monthlyLoanPayment())) throw invalid("고객정보와 시나리오 기준값이 다릅니다. 다시 검토해 주세요.");
    }
    data.put("scenario",r.scenario()==null?null:calculator.calculate(r.scenario()));
    if(r.monteCarlo()!=null && (r.scenario()==null || r.monteCarlo().p10()>r.monteCarlo().median() || r.monteCarlo().median()>r.monteCarlo().p90())) throw invalid("몬테카를로 결과와 목표 또는 분위수 순서를 확인해 주세요.");
    data.put("monteCarlo",r.monteCarlo());
    data.put("adjustmentExceedsCapacity",r.adjustmentExceedsCapacity());
    data.put("reviewAssumptions",List.of(
      "고객정보와 배분 계획은 예시 또는 사용자 입력이며 사실 확인을 거친 자료가 아니다. 자산 0원도 입력값이며 미입력이나 검증된 사실로 바꾸어 해석하지 않는다. 자산 구성과 유동성 자료 없이 유동성 위험 정도를 단정하지 않는다.",
      "배분 예산은 실수령액-(생활지출-배분계획 지출절감액)이며 학자금 상환을 포함한 배분표와 비교한다. 기존 월 대출상환액을 이중 차감하지 않는다. 현금흐름·시나리오·몬테카를로는 입력한 생활지출을 기준으로 하므로 배분표의 지출 절감을 이들 결과에 임의로 중복 적용하지 않는다.",
      "배분표의 상품별 금리·세금·가입 자격·만기와 목표별 기존 적립액은 제공되지 않았다. 결혼·주택 목표의 확정 설계안도 미제공이다.",
      "현금흐름·목표·스트레스는 서버 재계산 수치다. 몬테카를로는 범위를 검증한 브라우저 계산 결과이며 서버에서 재현 검증한 수치가 아니다.",
      "몬테카를로는 기본 고객 소득·생활지출을 연 단위 정규분포로 변동시키는 모형이며 선택한 시나리오 충격·배분표·금리·물가·이미 모은 자금은 반영하지 않는다. 목표 달성 확률을 현실의 보장이나 다른 분석과 동일한 조건으로 해석하지 않는다.",
      "음수 잉여자금은 몬테카를로에서 0으로 잘리므로 적자 조달 위험이 별도로 남는다. 미실행·미입력 분석은 null이며 수치를 추측하지 않는다."));
    return data;
  }
  private ApiException invalid(String message) { return new ApiException(HttpStatus.BAD_REQUEST,"INVALID_INPUT",message); }
}

package com.afpk.backend.review;

import com.afpk.backend.scenario.ScenarioCalculator.GoalResult;
import com.afpk.backend.scenario.ScenarioCalculator.ShockResult;
import java.util.*;

/** Facts and flags come from calculations, never from the language model. */
public final class ReviewSections {
  private ReviewSections() {}
  public record Advice(String problem, String action) {}
  public record Section(String id, String title, String status, List<String> findings,
      List<String> evidence, Advice advice) {
    Section withAdvice(Advice value) { return new Section(id,title,status,findings,evidence,value); }
  }
  private static String won(long value) { return String.format(Locale.KOREA,"%,d원",value); }
  private static Section section(String id,String title,boolean attention,List<String> findings,List<String> evidence) {
    return new Section(id,title,attention?"attention":"checked",findings,evidence,null);
  }
  private static Section missing(String id,String title) {
    return new Section(id,title,"missing",List.of("검토 자료가 없습니다."),List.of("현재 입력 또는 실행 결과가 제공되지 않았습니다."),null);
  }
  @SuppressWarnings("unchecked")
  public static List<Section> build(PlanReviewRequest r, Map<String,Object> verified) {
    var result=new ArrayList<Section>(); var c=r.customer();
    long surplus=(long)verified.get("monthlySurplus"), net=(long)verified.get("netWorth");
    result.add(section("cashflow","현금흐름 · 자산과 부채",surplus<0 || net<0,
        List.of(surplus<0?"월 현금흐름이 적자입니다.":"입력한 월 소득·지출·상환액 기준으로 월 현금흐름은 적자가 아닙니다.",
            net<0?"입력한 총부채가 총자산보다 큽니다. 상환 불능 여부를 뜻하지는 않습니다.":"입력한 총자산이 총부채 이상입니다.",
            "현금성 자산과 자산별 만기가 없어 유동성의 충분성은 판단하지 않았습니다."),
        List.of("월 실수령액 "+won(c.monthlyNetIncome()),"월 생활지출 "+won(c.monthlyLivingExpenses()),
            "월 대출상환액 "+won(c.monthlyLoanPayment()),"월 잉여자금 "+won(surplus),
            "총자산 "+won(c.totalAssets())+" / 총부채 "+won(c.totalDebt())+" / 순자산 "+won(net))));
    var rows=(List<Map<String,Object>>)verified.get("allocationReview");
    boolean excess=rows.stream().anyMatch(row -> ((Number)row.get("monthlyBudgetExcess")).longValue()>0);
    var allocationEvidence=rows.stream().map(row -> {
      long total=((Number)row.get("monthlyAllocationTotal")).longValue();
      long available=((Number)row.get("availableBeforeLoanRepayment")).longValue();
      return row.get("period")+": 월 배분 "+won(total)+" / 배분 가능 "+won(available)+" / "+(total>available?"초과 "+won(total-available):"여유 "+won(available-total));
    }).toList();
    result.add(section("allocation","연차별 배분 계획",excess,
        List.of(excess?"월 배분 합계가 가용 재원을 초과하는 기간이 있습니다.":"모든 기간의 월 배분 합계가 현재 가용 재원 이내입니다.",
            "배분표에 상환액이 포함되어 있으므로 배분 예산에서는 기존 월 대출상환액을 다시 빼지 않았습니다.",
            "기준 고객정보는 매년 동일하다는 가정이며, 상품 만기·가입 자격·금리와 상환 종료 시점은 별도 확인이 필요합니다.",
            "배분 계획에는 월 "+won((long)verified.get("allocationExpenseReduction"))+"의 지출 절감을 반영했습니다. 현금흐름과 시나리오는 현재 입력한 생활지출 기준으로 구분합니다."),allocationEvidence));
    var scenario=(Map<String,Object>)verified.get("scenario");
    if(scenario==null) {
      result.add(missing("goal","추가 목표 · 소득과 지출 시나리오"));
    } else {
      var goal=(Map<String,Object>)scenario.get("goal");
      var original=(GoalResult)goal.get("originalResult"); var changed=(GoalResult)goal.get("scenarioResult");
      result.add(section("goal","목표 · 소득과 지출 시나리오",changed.shortfall()>0,
          List.of(changed.isAchievable()?"선택한 조건과 단순 저축 가정에서는 목표금액에 도달합니다.":"선택한 조건과 단순 저축 가정에서는 목표금액에 미달합니다.",
              "현재 모은 목표자금·이자·물가는 제외했으며 조건 변화는 목표기간 전체에 적용했습니다.",
              "목표 계산은 월 잉여자금 전액을 저축하는 가정입니다. 배분표의 여러 저축을 동시에 실행하는 통합 계획이나 상품별 인출 가능액을 검증한 결과는 아닙니다."),
          List.of("목표 "+won((long)goal.get("targetAmount"))+" / 기간 "+goal.get("remainingMonths")+"개월",
              "기본 예상 저축 "+won(original.projectedSavings())+" / 부족 "+won(original.shortfall()),
              "조건 변경 후 월 저축 가능 "+won(changed.monthlySavings())+" / 예상 저축 "+won(changed.projectedSavings())+" / 부족 "+won(changed.shortfall()))));
    }
    result.add(buildStress(verified,scenario));
    var mc=r.monteCarlo();
    if(mc==null) result.add(missing("monteCarlo","몬테카를로 시뮬레이션"));
    else result.add(section("monteCarlo","몬테카를로 시뮬레이션",true,
        List.of("기본 소득·지출을 변동시킨 브라우저 계산 결과입니다. 서버에서 재현 검증한 수치가 아닙니다.",
            "현재 선택한 충격 조건·배분 계획을 적용한 성공률이 아니며 실제 목표 달성을 보장하지 않습니다.",
            "음수 잉여자금은 저축 0원으로 처리하여 기간 중 적자 조달은 별도로 점검해야 합니다."),
        List.of("시행 "+mc.runs()+"회 / 모형 내 성공 비율 "+String.format(Locale.KOREA,"%.1f%%",mc.successRate()*100),
            "하위 10% "+won(mc.p10())+" / 중위수 "+won(mc.median())+" / 상위 10% 경계 "+won(mc.p90()))));
    if(r.adjustmentExceedsCapacity()) result.add(section("adjustment","수정 계획",true,
        List.of("입력한 수정 월 저축액이 선택 조건의 저축 가능액을 초과합니다. 유효한 수정 결과로 계산하지 않았습니다."),
        List.of("시나리오 화면의 월 저축 가능액과 수정 저축액을 비교해 주세요.")));
    else if(scenario==null || scenario.get("adjustment")==null) result.add(missing("adjustment","수정 계획"));
    else {
      var adjusted=(Map<String,Object>)scenario.get("adjustment"); var goal=(GoalResult)adjusted.get("result");
      var originalGoal=(Map<String,Object>)scenario.get("goal");
      String comparison="기존 계획과 비교: 목표금액은 "+(adjusted.get("targetAmount").equals(originalGoal.get("targetAmount"))?"동일":"변경")
          +", 목표기간은 "+(adjusted.get("remainingMonths").equals(originalGoal.get("remainingMonths"))?"동일":"변경")+"입니다.";
      result.add(section("adjustment","수정 계획",goal.shortfall()>0,
          List.of(goal.isAchievable()?"선택한 조건과 저축 가정에서는 수정 목표금액에 도달합니다.":"선택한 조건과 저축 가정에서는 수정 목표금액에 미달합니다.",
              comparison,
              "월 저축액이 배분표의 어느 항목에 해당하는지는 연결되지 않았습니다. 같은 자금을 중복 배정하지 않았는지 확인이 필요합니다. 스트레스 상황의 한도는 별도 항목에서 확인합니다."),
          List.of("수정 목표 "+won((long)adjusted.get("targetAmount"))+" / 기간 "+adjusted.get("remainingMonths")+"개월",
              "월 저축 "+won((long)adjusted.get("monthlySavings"))+" / 예상 저축 "+won(goal.projectedSavings())+" / 부족 "+won(goal.shortfall()))));
    }
    return List.copyOf(result);
  }

  @SuppressWarnings("unchecked")
  private static Section buildStress(Map<String,Object> verified, Map<String,Object> scenario) {
    var plan=(PlanStressCalculator.Result)verified.get("planStress");
    var temporary=scenario==null?null:(Map<String,Object>)scenario.get("stressTest");
    if(plan==null && temporary==null) return missing("stress","스트레스 테스트");
    var findings=new ArrayList<String>(); var evidence=new ArrayList<String>(); boolean risk=false;
    if(plan!=null) {
      findings.add("보고서의 5년 배분 계획을 6가지 충격 조건으로 점검했습니다. 목표금액 입력은 필요하지 않습니다.");
      findings.add("소득·지출 충격은 5년 내내 지속하는 가정이며 발생 확률이나 예측이 아닙니다. 식비 절감 "+won((long)verified.get("allocationExpenseReduction"))+"을 반영하고(미이행 조건 제외), 학자금 상환은 배분표에 포함하여 다시 차감하지 않았습니다.");
      findings.add("충격으로 생긴 부족액을 유동성 배분 축소로 일부 메우는 계산이며, 결혼·주거 적립액도 줄어듭니다. 기존 현금 잔액과 이전 기간의 여유금을 이월한 계산은 아닙니다.");
      findings.add("ISA 평가손실은 현금흐름과 별개입니다. 주택·결혼의 상세 목표 설계와 상품 적합성은 검증 범위에 포함되지 않습니다.");
      for(var row:plan.scenarios()) {
        risk |= row.periods().stream().anyMatch(period -> period.gap()<0) || row.isaLoss()>0;
        String periods=row.periods().stream().map(period -> period.name()+" 월 과부족 "+won(period.gap())).reduce((a,b)->a+" · "+b).orElse("");
        evidence.add("[5년 설계안] "+row.name()+": 충격 후 소득 "+won(row.income())+" / 절감·충격 반영 생활지출 "+won(row.livingExpensesAfterReductionAndShock())
            +" / 월 가용 재원 "+won(row.available())+"(학자금 상환은 배분표에 포함) / "+periods
            +" / 5년 누적 과부족 "+won(row.cumulativeGap())+" / 유동성 배분 활용 후 부족 "+won(row.uncoveredTotal())+" / ISA 평가손실 "+won(row.isaLoss()));
      }
      evidence.add("ISA 손실 가정: 5년 납입액 "+won(plan.isaContribution())+" · 주식 비중 "+String.format(Locale.KOREA,"%.0f%%",plan.isaStockRatio()*100)
          +" · 주식 하락률 "+String.format(Locale.KOREA,"%.0f%%",plan.isaDropRate()*100));
    }
    if(temporary!=null) {
      findings.add("추가 목표의 일시 충격은 별도 분석입니다. "+temporary.get("shockMonths")+"개월 적용 후 기존 소득·지출로 복귀하며, 5년 설계안 결과와 합산하지 않습니다.");
      findings.add("추가 목표의 추가 필요자금은 해당 목표에 한 번 더했습니다. 각 충격은 예시이며 발생 확률이나 확정된 전망이 아닙니다.");
      for(var row:(List<Map<String,Object>>)temporary.get("scenarios")) {
        var original=(ShockResult)row.get("originalResult"); var revised=(ShockResult)row.get("revisedResult");
        risk |= original.shortfall()>0 || original.hasMonthlyDeficit() || (revised!=null && (revised.exceedsMonthlyCapacity() || revised.hasMonthlyDeficit()));
        evidence.add("[추가 목표의 일시 충격] "+row.get("name")+": 추가 필요자금 "+won((long)row.get("extraCost"))+" / 기존 계획 부족 "+won(original.shortfall())
            +" / 기간 중 적자 "+(original.hasMonthlyDeficit()?"있음":"없음")
            +(revised==null?"":" / 수정 계획 부족 "+won(revised.shortfall())+" / 수정 저축액 한도 초과 "+(revised.exceedsMonthlyCapacity()?"있음":"없음")));
      }
    }
    return section("stress",plan==null?"스트레스 테스트":"5년 설계안 · 스트레스 테스트",risk,findings,evidence);
  }
}

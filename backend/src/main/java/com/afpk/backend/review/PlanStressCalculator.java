package com.afpk.backend.review;

import com.afpk.backend.common.ApiException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;

/** The report's five-year stress test, recalculated from current customer and allocation inputs. */
public final class PlanStressCalculator {
  private PlanStressCalculator() {}
  private record Condition(String id, String name, int incomeDecreaseRate,
      int expenseIncreaseRate, boolean skipReduction, boolean isaCrash) {}
  private static final List<Condition> CONDITIONS = List.of(
      new Condition("baseline","설계안 그대로",0,0,false,false),
      new Condition("reduction-fail","식비 절감 미이행",0,0,true,false),
      new Condition("income-down","소득 10% 감소",10,0,false,false),
      new Condition("expense-up","생활지출 10% 증가",0,10,false,false),
      new Condition("isa-crash","ISA 평가손실",0,0,false,true),
      new Condition("worst","복합 충격 (최악 가정)",10,10,false,true));

  public record Period(String name, int months, long allocation, long liquidity, long gap, long uncovered) {}
  public record Row(String id, String name, int incomeDecreaseRate, int expenseIncreaseRate,
      boolean skipReduction, boolean isaCrash, long income, long livingExpensesAfterReductionAndShock,
      long expenseReductionApplied, long available, List<Period> periods,
      long cumulativeGap, long uncoveredTotal, long isaLoss) {}
  public record Result(List<Integer> periodMonths, double isaStockRatio, double isaDropRate,
      long isaContribution, List<Row> scenarios, List<String> assumptions) {}

  public static Result calculate(PlanReviewRequest request, long reduction) {
    var config=request.planStress();
    if(config==null) return null;
    if(!List.of(12,12,12,24).equals(config.periodMonths()) || request.allocationPeriods().size()!=4) {
      throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_INPUT","5년 설계안은 1·2·3년차와 4~5년차의 4개 기간으로 입력해 주세요.");
    }
    var months=config.periodMonths();
    var isa=request.allocationItems().stream().filter(item -> item.id().equals("isa")).findFirst().orElse(null);
    var liquidity=request.allocationItems().stream().filter(item -> item.id().equals("liquidity")).findFirst().orElse(null);
    long contribution=0;
    if(isa!=null) for(int i=0;i<4;i++) contribution+=isa.monthly().get(i)*months.get(i);
    var rows=new ArrayList<Row>();
    for(var condition:CONDITIONS) {
      long income=Math.round(request.customer().monthlyNetIncome()*(1-condition.incomeDecreaseRate()/100.0));
      long baseExpenses=request.customer().monthlyLivingExpenses()-(condition.skipReduction()?0:reduction);
      long expenses=Math.round(baseExpenses*(1+condition.expenseIncreaseRate()/100.0));
      long available=income-expenses, cumulativeGap=0, uncoveredTotal=0;
      var periods=new ArrayList<Period>();
      for(int i=0;i<4;i++) {
        long total=0;
        for(var item:request.allocationItems()) total+=item.monthly().get(i);
        long liquidityAmount=liquidity==null?0:liquidity.monthly().get(i);
        long gap=available-total, uncovered=Math.max(-gap-liquidityAmount,0);
        cumulativeGap+=gap*months.get(i);
        uncoveredTotal+=uncovered*months.get(i);
        periods.add(new Period(request.allocationPeriods().get(i),months.get(i),total,liquidityAmount,gap,uncovered));
      }
      long loss=condition.isaCrash()?Math.round(contribution*config.isaStockRatio()*config.isaDropRate()):0;
      rows.add(new Row(condition.id(),condition.name(),condition.incomeDecreaseRate(),condition.expenseIncreaseRate(),
          condition.skipReduction(),condition.isaCrash(),income,expenses,condition.skipReduction()?0:reduction,
          available,List.copyOf(periods),cumulativeGap,uncoveredTotal,loss));
    }
    return new Result(months,config.isaStockRatio(),config.isaDropRate(),contribution,List.copyOf(rows),List.of(
        "보고서의 5년 배분 계획을 점검하며 소득·지출 충격은 60개월 전체에 적용한다. 실제 발생 확률이나 전망이 아니다.",
        "배분표에 학자금 상환이 포함되어 있어 기존 월 대출상환액을 다시 차감하지 않는다.",
        "유동성 자금 활용 후 부족은 같은 기간의 결혼·주거 유동성 신규 배분액을 줄여 메우고도 남는 부족액의 합이다. 기존 현금 잔액이나 이전 기간의 여유금을 이월하는 계산은 아니다.",
        "ISA 평가손실은 현재 배분표의 5년 납입액에 주식 비중과 하락률을 적용한 금액이다. 채권 변동·이자·세금은 제외하며 현금흐름 부족액에 합산하지 않는다."));
  }
}

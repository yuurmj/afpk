export function calculateMonthlySurplus(customer) {
    return (
        customer.monthlyNetIncome -
        customer.monthlyLivingExpenses -
        customer.monthlyLoanPayment
    );
}

export function calculateNetWorth(customer) {
    return customer.totalAssets - customer.totalDebt;
}

export function caculateCashflowScenario(customer, incomeDcreaseRate, expenseIncreaseRate) {
    const reducedIncome = Math.round(
        customer.monthlyNetIncome * (1 - incomeDcreaseRate / 100)
    );
    
    const increasedExpenses = Math.round(
        customer.monthlyLivingExpenses + (customer.monthlyLivingExpenses * expenseIncreaseRate) / 100
    );

    const scenarioCustomer = {
        ...customer,
        monthlyNetIncome: reducedIncome,
        monthlyLivingExpenses: increasedExpenses,
    };

    return {
        reducedIncome,
        increasedExpenses,
        monthlySurplus: calculateMonthlySurplus(scenarioCustomer),
    };
}

export function calculateGoalShortfall(targetAmount, remainingMonths, monthlySurplus) {
    const monthlySavings = Math.max(monthlySurplus, 0);
    const projectedSavings = monthlySavings * remainingMonths;
    const shortfall = Math.max(targetAmount - projectedSavings, 0);

    return {
        monthlySavings,
        projectedSavings,
        shortfall,
        isAchievable: shortfall === 0,
    };
}

export function calculateTemporaryShockGoal({
    targetAmount,
    remainingMonths,
    shockMonths,
    originalMonthlySurplus,
    stressedMonthlySurplus,
    plannedMonthlySavings = null,
}) {
    const normalMonths = remainingMonths - shockMonths;

    const savingsLimit = plannedMonthlySavings ?? Infinity;

    const normalMonthlyContribution = Math.min(
        originalMonthlySurplus,
        savingsLimit
    );

    const stressedMonthlyContribution = Math.min(
        stressedMonthlySurplus,
        savingsLimit
    );

    const totalNetCashflow =
        normalMonthlyContribution * normalMonths +
        stressedMonthlyContribution * shockMonths;

    const projectedSavings = Math.max(totalNetCashflow, 0);

    const shortfall = Math.max(
        targetAmount - projectedSavings,
        0
    );

    const hasMonthlyDeficit =
        (shockMonths > 0 && stressedMonthlySurplus < 0) ||
        (normalMonths > 0 && originalMonthlySurplus < 0);

    const exceedsMonthlyCapacity =
        plannedMonthlySavings !== null &&
        (
        (shockMonths > 0 &&
            plannedMonthlySavings > Math.max(stressedMonthlySurplus, 0)) ||
        (normalMonths > 0 &&
            plannedMonthlySavings > Math.max(originalMonthlySurplus, 0))
        );

    return {
        normalMonths,
        shockMonths,
        totalNetCashflow,
        projectedSavings,
        shortfall,
        hasMonthlyDeficit,
        exceedsMonthlyCapacity,
    };
}
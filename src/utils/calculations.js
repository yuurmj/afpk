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
        customer.monthlyLivingExpenses * (1 + expenseIncreaseRate / 100)
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
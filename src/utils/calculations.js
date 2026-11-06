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

export function calculateIncomeScenario(customer, decreaseRate) {
    const reducedIncome = Math.round(
        customer.monthlyNetIncome * (1 - decreaseRate / 100)
    );

    const scenarioCustomer = {
        ...customer,
        monthlyNetIncome: reducedIncome,
    };

    return {
        reducedIncome,
        monthlySurplus: calculateMonthlySurplus(scenarioCustomer),
    };
}
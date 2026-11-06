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
import { useMemo, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import PlanPage from './pages/PlanPage.jsx';
import ScenarioPage from './pages/ScenarioPage.jsx';
import ReviewPage from './pages/ReviewPage.jsx';
import {customer as initialCustomer} from './data/customer.js';
import { allocationItems as initialAllocation, expenseReduction } from './data/allocationPlan.js';
import './App.scss';

export default function App() {
    const [currentPage, setCurrentPage] = useState('plan');
    const [customer, setCustomer] = useState(initialCustomer);
    const [allocationItems, setAllocationItems] = useState(initialAllocation);
    const [reviewData, setReviewData] = useState(null);

    // 시나리오 비교와 AI 검토는 설계안 적용 후(식비 절감 반영) 고객 기준으로 계산합니다.
    // 재무계획 페이지는 원본 고객 정보를 그대로 보여주고, 절감은 배분 비교에서 직접 반영합니다.
    // useMemo로 같은 값일 때 같은 객체를 유지해, 시나리오 화면의 effect가 반복 실행되지 않게 합니다.
    const plannedCustomer = useMemo(
        () => ({
            ...customer,
            monthlyLivingExpenses: Math.max(
                customer.monthlyLivingExpenses - expenseReduction.monthly,
                0,
            ),
        }),
        [customer],
    );

    return (
        <div className="app">
            <Sidebar
                currentPage={currentPage}
                onPageChange={setCurrentPage}
            />

            <main className="app__content">
                {/* 페이지를 숨기기만 하고 유지해 입력값이 사라지지 않게 합니다. */}
                <div hidden={currentPage !== 'plan'}>
                    <PlanPage
                        customer={customer}
                        onCustomerChange={setCustomer}
                        allocationItems={allocationItems} onAllocationChange={setAllocationItems} />
                </div>
                <div hidden={currentPage !== 'scenario'}>
                    <ScenarioPage customer={plannedCustomer} onReviewDataChange={setReviewData} />
                </div>
                <div hidden={currentPage !== 'review'}>
                    <ReviewPage customer={plannedCustomer} reviewData={reviewData} allocationItems={allocationItems} />
                </div>
            </main>
        </div>
    );
}
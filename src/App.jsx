import { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import PlanPage from './pages/PlanPage.jsx';
import ScenarioPage from './pages/ScenarioPage.jsx';
import ReviewPage from './pages/ReviewPage.jsx';
import {customer as initialCustomer} from './data/customer.js';
import { allocationItems as initialAllocation } from './data/allocationPlan.js';
import './App.scss';

export default function App() {
    const [currentPage, setCurrentPage] = useState('plan');
    const [customer, setCustomer] = useState(initialCustomer);
    const [allocationItems, setAllocationItems] = useState(initialAllocation);
    const [reviewData, setReviewData] = useState(null);
    const [scenarioFocus, setScenarioFocus] = useState(null);
    function prepareReviewItem(fieldId) {
        setCurrentPage('scenario');
        setScenarioFocus({ fieldId });
    }

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
                    <ScenarioPage customer={customer} allocationItems={allocationItems} onReviewDataChange={setReviewData} focusRequest={scenarioFocus} />
                </div>
                <div hidden={currentPage !== 'review'}>
                    <ReviewPage customer={customer} reviewData={reviewData} allocationItems={allocationItems} onPrepare={prepareReviewItem} />
                </div>
            </main>
        </div>
    );
}
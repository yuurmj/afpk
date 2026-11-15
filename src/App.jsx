import { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import PlanPage from './pages/PlanPage.jsx';
import ScenarioPage from './pages/ScenarioPage.jsx';
import ReviewPage from './pages/ReviewPage.jsx';
import {customer as initialCustomer} from './data/customer.js';
import './App.scss';

export default function App() {
    const [currentPage, setCurrentPage] = useState('plan');
    const [customer, setCustomer] = useState(initialCustomer);

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
                        onCustomerChange={setCustomer} />
                </div>
                <div hidden={currentPage !== 'scenario'}>
                    <ScenarioPage customer={customer} />
                </div>
                <div hidden={currentPage !== 'review'}>
                    <ReviewPage />
                </div>
            </main>
        </div>
    );
}
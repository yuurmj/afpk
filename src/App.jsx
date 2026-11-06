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
                {currentPage === 'plan' && 
                    <PlanPage 
                        customer={customer} 
                        onCustomerChange={setCustomer}
                    />
                }
                {currentPage === 'scenario' && <ScenarioPage />}
                {currentPage === 'review' && <ReviewPage />}
            </main>
        </div>
    );
}
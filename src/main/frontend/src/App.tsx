import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import trTR from 'antd/locale/tr_TR'
import Layout from './components/Layout'
import CompaniesPage from './pages/CompaniesPage'
import StatementsPage from './pages/StatementsPage'
import RatioRulesPage from './pages/RatioRulesPage'
import AdjustmentRulesPage from './pages/AdjustmentRulesPage'
import AnalysisPage from './pages/AnalysisPage'

export default function App() {
  return (
    <ConfigProvider locale={trTR}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/companies" replace />} />
            <Route path="companies" element={<CompaniesPage />} />
            <Route path="companies/:companyId/statements" element={<StatementsPage />} />
            <Route path="ratio-rules" element={<RatioRulesPage />} />
            <Route path="adjustment-rules" element={<AdjustmentRulesPage />} />
            <Route path="analysis" element={<AnalysisPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

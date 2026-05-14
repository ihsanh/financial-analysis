import axios from 'axios'
import type {
  Company, FinancialStatement, RatioRule, AdjustmentRule,
  StatementType, AnalysisResponse
} from '../types'

const api = axios.create({ baseURL: '/api' })

api.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.detail || err.message || 'An error occurred'
    return Promise.reject(new Error(msg))
  }
)

// Companies
export const getCompanies = () => api.get<Company[]>('/companies').then(r => r.data)
export const getCompany = (id: number) => api.get<Company>(`/companies/${id}`).then(r => r.data)
export const createCompany = (data: Omit<Company, 'id'>) => api.post<Company>('/companies', data).then(r => r.data)
export const updateCompany = (id: number, data: Omit<Company, 'id'>) => api.put<Company>(`/companies/${id}`, data).then(r => r.data)
export const deleteCompany = (id: number) => api.delete(`/companies/${id}`)

// Statements
export const getStatements = (companyId: number) =>
  api.get<FinancialStatement[]>('/statements', { params: { companyId } }).then(r => r.data)
export const getStatement = (id: number) => api.get<FinancialStatement>(`/statements/${id}`).then(r => r.data)
export const getPeriods = (companyId: number) =>
  api.get<string[]>('/statements/periods', { params: { companyId } }).then(r => r.data)
export const uploadStatement = (companyId: number, period: string, type: StatementType, file: File) => {
  const form = new FormData()
  form.append('companyId', String(companyId))
  form.append('period', period)
  form.append('type', type)
  form.append('file', file)
  return api.post<FinancialStatement>('/statements/upload', form).then(r => r.data)
}
export const deleteStatement = (id: number) => api.delete(`/statements/${id}`)

// Ratio Rules
export const getRatioRules = (activeOnly?: boolean) =>
  api.get<RatioRule[]>('/ratio-rules', { params: activeOnly ? { activeOnly: true } : {} }).then(r => r.data)
export const createRatioRule = (data: RatioRule) => api.post<RatioRule>('/ratio-rules', data).then(r => r.data)
export const updateRatioRule = (id: number, data: RatioRule) => api.put<RatioRule>(`/ratio-rules/${id}`, data).then(r => r.data)
export const toggleRatioRule = (id: number) => api.patch<RatioRule>(`/ratio-rules/${id}/toggle`).then(r => r.data)
export const deleteRatioRule = (id: number) => api.delete(`/ratio-rules/${id}`)

// Adjustment Rules
export const getAdjustmentRules = (activeOnly?: boolean) =>
  api.get<AdjustmentRule[]>('/adjustment-rules', { params: activeOnly ? { activeOnly: true } : {} }).then(r => r.data)
export const createAdjustmentRule = (data: AdjustmentRule) => api.post<AdjustmentRule>('/adjustment-rules', data).then(r => r.data)
export const updateAdjustmentRule = (id: number, data: AdjustmentRule) => api.put<AdjustmentRule>(`/adjustment-rules/${id}`, data).then(r => r.data)
export const toggleAdjustmentRule = (id: number) => api.patch<AdjustmentRule>(`/adjustment-rules/${id}/toggle`).then(r => r.data)
export const deleteAdjustmentRule = (id: number) => api.delete(`/adjustment-rules/${id}`)

// Analysis
export const runAnalysis = (companyId: number, period: string, ratioRuleIds: number[], adjustmentRuleIds: number[]) =>
  api.post<AnalysisResponse>('/analysis', { companyId, period, ratioRuleIds, adjustmentRuleIds }).then(r => r.data)

export type StatementType = 'BALANCE_SHEET' | 'INCOME_STATEMENT' | 'TRIAL_BALANCE'

export interface Company {
  id: number
  name: string
  taxNumber?: string
  sector?: string
  description?: string
}

export interface FinancialLineItem {
  id?: number
  code: string
  name: string
  value?: number
  debitValue?: number
  creditValue?: number
  level?: number
  parentCode?: string
  sortOrder?: number
}

export interface FinancialStatement {
  id: number
  companyId: number
  companyName: string
  type: StatementType
  period: string
  fileName?: string
  uploadedAt?: string
  lineItems: FinancialLineItem[]
}

export interface RatioVariable {
  id?: number
  variableName: string
  statementType: StatementType
  lineItemCode: string
  aggregation?: string
}

export interface RatioRule {
  id?: number
  name: string
  description?: string
  formula: string
  category?: string
  isDefault?: boolean
  isActive?: boolean
  variables: RatioVariable[]
}

export interface AdjustmentStep {
  id?: number
  outputCode: string
  outputName: string
  formula: string
  sourceStatementType?: StatementType
  stepOrder: number
  description?: string
}

export interface AdjustmentRule {
  id?: number
  name: string
  description?: string
  isActive?: boolean
  steps: AdjustmentStep[]
}

export interface RatioResult {
  ruleId: number
  ruleName: string
  category?: string
  formula: string
  value?: number
  error?: string
}

export interface AdjustmentResult {
  ruleId: number
  ruleName: string
  adjustedItems: FinancialLineItem[]
  errors: Record<string, string>
}

export interface AnalysisResponse {
  companyId: number
  companyName: string
  period: string
  ratioResults: RatioResult[]
  adjustmentResults: AdjustmentResult[]
}

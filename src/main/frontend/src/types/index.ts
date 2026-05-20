export type StatementType = 'BALANCE_SHEET' | 'INCOME_STATEMENT' | 'CASH_FLOW' | 'TRIAL_BALANCE'

export interface FinancialItemDef {
  id: number
  code: string
  name: string
  statementType?: StatementType
  level?: number
}

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
  resolvedValues?: Record<string, number | null>
}

export interface AdjustmentResult {
  ruleId: number
  ruleName: string
  adjustedItems: FinancialLineItem[]
  errors: Record<string, string>
}

export interface InterpretRatioEntry {
  name: string
  category?: string
  periodValues: Record<string, number | null>
  errors: Record<string, string>
}

export interface InterpretAdjustmentEntry {
  ruleName: string
  items: Array<{ name: string; value: number | null }>
}

export interface InterpretSummaryItem {
  label: string
  val1: number | null
  val2: number | null
}

export interface InterpretSummaryTable {
  tableType: string
  period1: string
  period2?: string | null
  items: InterpretSummaryItem[]
}

export interface InterpretRequest {
  companyName: string
  periods: string[]
  ratioRows: InterpretRatioEntry[]
  adjustmentRows?: InterpretAdjustmentEntry[]
  summaryTables?: InterpretSummaryTable[]
}

export interface InterpretResponse {
  interpretation: string
}

export interface AnalysisResponse {
  companyId: number
  companyName: string
  period: string
  ratioResults: RatioResult[]
  adjustmentResults: AdjustmentResult[]
}

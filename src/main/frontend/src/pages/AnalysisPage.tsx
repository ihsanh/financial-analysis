import { useEffect, useMemo, useState } from 'react'
import {
  Select, Button, Checkbox, Table, Tag, Alert, Typography,
  Empty, Tooltip, Segmented, Space, message, Card, Tabs
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EyeOutlined } from '@ant-design/icons'
import {
  getCompanies, getRatioRules, getAdjustmentRules, runAnalysis,
  getStatements, getStatement, getItemDefs
} from '../api/client'
import type { Company, RatioRule, AdjustmentRule, FinancialStatement, FinancialItemDef, FinancialLineItem, StatementType } from '../types'

const { Title, Text } = Typography

// ── Summary panel config ─────────────────────────────────────────────────────
const INCOME_CONFIGS = [
  { label: 'Satışlar',                         patterns: ['net satışlar', 'satışlar', 'hasılat', 'net hasılat'] },
  { label: 'Brüt Kar',                         patterns: ['brüt kar', 'brüt kazanç'] },
  { label: 'Esas Faaliyet Karı',               patterns: ['esas faaliyet kar', 'faaliyet kar'] },
  { label: 'FAVÖK',                            patterns: ['favök', 'ebitda'] },
  { label: 'Net Parasal Poz. Kaz. (Kay.)',     patterns: ['net parasal pozisyon', 'parasal pozisyon kazanç'] },
  { label: 'Net Dönem Karı',                   patterns: ['net dönem kar', 'dönem net kar', 'net kar'] },
]
const BALANCE_CONFIGS = [
  { label: 'Dönen Varlıklar',   patterns: ['toplam dönen varlık', 'dönen varlık'] },
  { label: 'Duran Varlıklar',   patterns: ['toplam duran varlık', 'duran varlık'] },
  { label: 'Toplam Varlıklar',  patterns: ['toplam varlık', 'aktif toplam', 'varlıklar toplamı'] },
  { label: 'Finansal Borçlar',  patterns: ['toplam finansal borç', 'finansal borç'] },
  { label: 'Net Borç',          patterns: ['net borç'] },
  { label: 'Özkaynaklar',       patterns: ['toplam özkaynaklar', 'özkaynaklar', 'özkaynak toplamı'] },
]

function findByPatterns(items: FinancialLineItem[], patterns: string[]): number | null {
  const norm = (s: string) => s.toLowerCase().trim()
  for (const minLevel of [1, 0]) {
    const pool = items.filter(i => (i.level ?? 0) >= minLevel)
    for (const p of patterns) {
      const hit = pool.find(i => norm(i.name) === norm(p))
      if (hit) return hit.value ?? null
    }
    for (const p of patterns) {
      const hits = pool.filter(i => norm(i.name).startsWith(norm(p))).sort((a, b) => a.name.length - b.name.length)
      if (hits.length) return hits[0].value ?? null
    }
    for (const p of patterns) {
      const hits = pool.filter(i => norm(i.name).includes(norm(p))).sort((a, b) => a.name.length - b.name.length)
      if (hits.length) return hits[0].value ?? null
    }
  }
  return null
}

const fmtSummary = (v: number | null | undefined) =>
  v != null ? v.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) : '-'

const STATEMENT_LABELS: Record<StatementType, string> = {
  BALANCE_SHEET: 'Bilanço',
  INCOME_STATEMENT: 'Gelir Tablosu',
  TRIAL_BALANCE: 'Mizan',
}
const CATEGORY_LABELS: Record<string, string> = {
  LIQUIDITY: 'Likidite', LEVERAGE: 'Kaldıraç', PROFITABILITY: 'Karlılık', ACTIVITY: 'Faaliyet', OTHER: 'Diğer'
}
const CATEGORY_COLORS: Record<string, string> = {
  LIQUIDITY: 'blue', LEVERAGE: 'orange', PROFITABILITY: 'green', ACTIVITY: 'purple', OTHER: 'default'
}

interface MultiRow {
  key: string
  code: string
  name: string
  level: number
  periodValues: Record<string, number | null>
  adjustedPeriods: Record<string, boolean>
}

interface SummaryRow {
  key: string
  label: string
  val1: number | null
  val2: number | null
}

interface MultiRatioRow {
  key: string
  ratioId: number
  ratioName: string
  category?: string
  formula: string
  periodValues: Record<string, number | null>
  periodErrors: Record<string, string>
  periodResolved: Record<string, Record<string, number | null>>
}

export default function AnalysisPage() {
  // ── shared ──────────────────────────────────────────────────────
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null)
  const [allStatements, setAllStatements] = useState<FinancialStatement[]>([])
  const [itemDefs, setItemDefs] = useState<FinancialItemDef[]>([])

  // ── statement view ───────────────────────────────────────────────
  const [adjRules, setAdjRules] = useState<AdjustmentRule[]>([])
  const [viewType, setViewType] = useState<StatementType | null>(null)
  const [viewPeriods, setViewPeriods] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'original' | 'adjusted'>('original')
  const [viewLoading, setViewLoading] = useState(false)
  const [stmtRows, setStmtRows] = useState<MultiRow[]>([])
  const [stmtActivePeriods, setStmtActivePeriods] = useState<string[]>([])

  // ── ratio view ───────────────────────────────────────────────────
  const [ratioRules, setRatioRules] = useState<RatioRule[]>([])
  const [ratioSelectedPeriods, setRatioSelectedPeriods] = useState<string[]>([])
  const [ratioSelectedIds, setRatioSelectedIds] = useState<number[]>([])
  const [ratioRows, setRatioRows] = useState<MultiRatioRow[]>([])
  const [ratioActivePeriods, setRatioActivePeriods] = useState<string[]>([])
  const [ratioLoading, setRatioLoading] = useState(false)
  const [ratioError, setRatioError] = useState<string | null>(null)

  // ── summary view ─────────────────────────────────────────────────
  const [summaryPeriod1, setSummaryPeriod1] = useState<string | null>(null)
  const [summaryPeriod2, setSummaryPeriod2] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [incomeRows, setIncomeRows] = useState<SummaryRow[]>([])
  const [balanceRows, setBalanceRows] = useState<SummaryRow[]>([])

  const parsePeriod = (p: string) => { const [y, m] = p.split('/').map(Number); return y * 100 + m }
  const periodSort = (a: string, b: string) => parsePeriod(b) - parsePeriod(a)

  useEffect(() => {
    Promise.all([getCompanies(), getRatioRules(true), getAdjustmentRules(true), getItemDefs()])
      .then(([c, r, a, defs]) => { setCompanies(c); setRatioRules(r); setAdjRules(a); setItemDefs(defs) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedCompany) return
    const periods = [...new Set(allStatements.map(s => s.period))].sort(periodSort)
    setSummaryPeriod1(periods[0] ?? null)
    setSummaryPeriod2(periods[1] ?? null)
    setIncomeRows([]); setBalanceRows([])
  }, [allStatements])

  const codeToName = useMemo(
    () => new Map(itemDefs.map(d => [d.code, d.name])),
    [itemDefs]
  )

  const renderFormulaTokens = (formula: string) => {
    const parts = formula.split(/(\{[^}]+\})/g)
    return (
      <span style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 2 }}>
        {parts.map((part, i) => {
          const m = part.match(/^\{([^}]+)\}$/)
          if (m) {
            const code = m[1]
            const name = codeToName.get(code)
            return (
              <Tooltip key={i} title={code} placement="top">
                <span style={{
                  background: '#f0f5ff', border: '1px solid #adc6ff',
                  borderRadius: 3, padding: '1px 4px', color: '#2f54eb',
                  cursor: 'help', whiteSpace: 'nowrap',
                }}>
                  {name ?? code}
                </span>
              </Tooltip>
            )
          }
          return <span key={i} style={{ padding: '0 2px', color: '#595959' }}>{part}</span>
        })}
      </span>
    )
  }

  const onCompanyChange = async (id: number) => {
    setSelectedCompany(id)
    setAllStatements([])
    setViewType(null); setViewPeriods([]); setStmtRows([])
    setRatioSelectedPeriods([]); setRatioRows([])
    try { setAllStatements(await getStatements(id)) } catch {}
  }

  // ── statement view helpers ───────────────────────────────────────
  const stmtTypeOptions = useMemo(() =>
    [...new Set(allStatements.map(s => s.type))].map(t => ({ value: t, label: STATEMENT_LABELS[t] }))
  , [allStatements])

  const stmtPeriodOptions = useMemo(() => {
    if (!viewType) return []
    return [...new Set(allStatements.filter(s => s.type === viewType).map(s => s.period))]
      .sort(periodSort).map(p => ({ value: p, label: p }))
  }, [viewType, allStatements])

  const stmtAnnualPeriods = useMemo(
    () => stmtPeriodOptions.filter(o => o.value.endsWith('/12')).map(o => o.value),
    [stmtPeriodOptions]
  )

  const fmt = (v: number | null | undefined) =>
    v != null ? v.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-'

  const handleStmtView = async () => {
    if (!viewType || viewPeriods.length === 0) { message.warning('Tür ve en az bir dönem seçiniz'); return }
    if (!selectedCompany) return
    setViewLoading(true)
    try {
      const targets = allStatements.filter(s => s.type === viewType && viewPeriods.includes(s.period))
      const sortedPeriods = [...viewPeriods].sort(periodSort)

      const fetched = await Promise.all(targets.map(s => getStatement(s.id)))
      const itemMap = new Map<string, MultiRow>()
      const itemOrder: string[] = []

      for (const stmt of fetched) {
        for (const item of stmt.lineItems) {
          const key = item.code?.trim() ? item.code.trim() : item.name.trim()
          if (!itemMap.has(key)) {
            itemMap.set(key, { key, code: item.code ?? '', name: item.name, level: item.level ?? 0, periodValues: {}, adjustedPeriods: {} })
            itemOrder.push(key)
          }
          itemMap.get(key)!.periodValues[stmt.period] = item.value ?? null
        }
      }

      if (viewMode === 'adjusted' && adjRules.length > 0) {
        const allAdjRuleIds = adjRules.map(r => r.id!)
        const analyses = await Promise.all(
          targets.map(s => runAnalysis(selectedCompany, s.period, [], allAdjRuleIds))
        )
        for (const result of analyses) {
          for (const adjResult of result.adjustmentResults) {
            for (const item of adjResult.adjustedItems) {
              const codeKey = item.code?.trim()
              const nameKey = item.name?.trim()
              const matchKey = (codeKey && itemMap.has(codeKey)) ? codeKey
                : (nameKey && itemMap.has(nameKey)) ? nameKey : null
              if (matchKey) {
                itemMap.get(matchKey)!.periodValues[result.period] = item.value ?? null
                itemMap.get(matchKey)!.adjustedPeriods[result.period] = true
              }
            }
          }
        }
      }

      setStmtRows(itemOrder.map(k => itemMap.get(k)!))
      setStmtActivePeriods(sortedPeriods)
    } catch (e: unknown) { message.error(String(e)) }
    finally { setViewLoading(false) }
  }

  const handleSummaryLoad = async () => {
    if (!selectedCompany || !summaryPeriod1) return
    setSummaryLoading(true)
    try {
      const periods = [summaryPeriod1, summaryPeriod2].filter(Boolean) as string[]
      const bsStmts = allStatements.filter(s => s.type === 'BALANCE_SHEET' && periods.includes(s.period))
      const isStmts = allStatements.filter(s => s.type === 'INCOME_STATEMENT' && periods.includes(s.period))
      const [bsFetched, isFetched] = await Promise.all([
        Promise.all(bsStmts.map(s => getStatement(s.id))),
        Promise.all(isStmts.map(s => getStatement(s.id))),
      ])
      const bsMap = new Map(bsFetched.map(s => [s.period, s.lineItems]))
      const isMap = new Map(isFetched.map(s => [s.period, s.lineItems]))

      const buildRows = (configs: typeof INCOME_CONFIGS, stmtMap: Map<string, FinancialLineItem[]>): SummaryRow[] =>
        configs.map((cfg, i) => ({
          key: String(i), label: cfg.label,
          val1: findByPatterns(stmtMap.get(summaryPeriod1) ?? [], cfg.patterns),
          val2: summaryPeriod2 ? findByPatterns(stmtMap.get(summaryPeriod2) ?? [], cfg.patterns) : null,
        }))

      const bsBuilt = buildRows(BALANCE_CONFIGS, bsMap)
      // Calculate Net Borç if not found as a direct line item
      const netDebtRow = bsBuilt.find(r => r.label === 'Net Borç')
      if (netDebtRow) {
        const calcNetDebt = (items: FinancialLineItem[]) => {
          const debt = findByPatterns(items, ['toplam finansal borç', 'finansal borç'])
          const cash = findByPatterns(items, ['nakit ve nakit benzerleri', 'nakit', 'hazır değerler'])
          return debt != null ? (cash != null ? debt - cash : debt) : null
        }
        if (netDebtRow.val1 == null) netDebtRow.val1 = calcNetDebt(bsMap.get(summaryPeriod1) ?? [])
        if (netDebtRow.val2 == null && summaryPeriod2) netDebtRow.val2 = calcNetDebt(bsMap.get(summaryPeriod2) ?? [])
      }

      setIncomeRows(buildRows(INCOME_CONFIGS, isMap))
      setBalanceRows(bsBuilt)
    } catch (e: unknown) { message.error(String(e)) }
    finally { setSummaryLoading(false) }
  }

  const stmtColumns: ColumnsType<MultiRow> = [
    {
      title: 'Kalem', dataIndex: 'name', key: 'name', fixed: 'left', width: 320,
      render: (v: string, r: MultiRow) => (
        <span style={{ paddingLeft: r.level * 16, fontWeight: r.level === 0 ? 600 : 400, display: 'inline-block' }}>
          {v}
        </span>
      )
    },
    ...stmtActivePeriods.map(p => ({
      title: p, key: p, align: 'right' as const, width: 140,
      render: (_: unknown, r: MultiRow) => {
        const isAdj = r.adjustedPeriods[p]
        return (
          <span style={{
            fontWeight: r.level === 0 ? 600 : 400,
            color: isAdj ? '#1677ff' : undefined,
            background: isAdj ? '#e6f4ff' : undefined,
            borderRadius: isAdj ? 3 : undefined,
            padding: isAdj ? '1px 4px' : undefined,
          }}>
            {fmt(r.periodValues[p])}
          </span>
        )
      },
    })),
  ]

  // ── ratio view helpers ───────────────────────────────────────────
  const ratioPeriodOptions = useMemo(
    () => [...new Set(allStatements.map(s => s.period))].sort(periodSort),
    [allStatements]
  )
  const ratioAnnualPeriods = useMemo(
    () => ratioPeriodOptions.filter(p => p.endsWith('/12')),
    [ratioPeriodOptions]
  )
  const allRatioIds = ratioRules.map(r => r.id!).filter(Boolean)

  const fmtResolved = (resolved: Record<string, number | null> | undefined) => {
    if (!resolved || Object.keys(resolved).length === 0) return null
    return (
      <div style={{ fontSize: 12 }}>
        {Object.entries(resolved).map(([code, val]) => {
          const name = codeToName.get(code)
          return (
            <div key={code} style={{ marginBottom: 2 }}>
              <b style={{ color: '#adc6ff' }}>{code}</b>
              {name && <span style={{ color: '#e6f4ff', marginLeft: 4 }}>{name}</span>}
              <span style={{ color: '#d9d9d9' }}> = </span>
              {val != null
                ? <b>{val.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</b>
                : <span style={{ color: '#ff7875' }}>bulunamadı</span>}
            </div>
          )
        })}
      </div>
    )
  }

  const handleRatioView = async () => {
    if (!selectedCompany || ratioSelectedPeriods.length === 0 || ratioSelectedIds.length === 0) return
    setRatioLoading(true)
    setRatioError(null)
    try {
      const sortedPeriods = [...ratioSelectedPeriods].sort(periodSort)
      const analyses = await Promise.all(
        sortedPeriods.map(p => runAnalysis(selectedCompany, p, ratioSelectedIds, []))
      )
      const rowMap = new Map<number, MultiRatioRow>()
      for (const res of analyses) {
        for (const rr of res.ratioResults) {
          if (!rowMap.has(rr.ruleId)) {
            rowMap.set(rr.ruleId, {
              key: String(rr.ruleId), ratioId: rr.ruleId,
              ratioName: rr.ruleName, category: rr.category, formula: rr.formula,
              periodValues: {}, periodErrors: {}, periodResolved: {},
            })
          }
          const row = rowMap.get(rr.ruleId)!
          if (rr.resolvedValues) row.periodResolved[res.period] = rr.resolvedValues
          if (rr.error) row.periodErrors[res.period] = rr.error
          else row.periodValues[res.period] = rr.value ?? null
        }
      }
      setRatioRows([...rowMap.values()])
      setRatioActivePeriods(sortedPeriods)
    } catch (e: unknown) { setRatioError(String(e)) }
    finally { setRatioLoading(false) }
  }

  const ratioColumns: ColumnsType<MultiRatioRow> = [
    {
      title: 'Kategori', dataIndex: 'category', key: 'category', width: 110, fixed: 'left',
      render: (v: string) => v
        ? <Tag color={CATEGORY_COLORS[v] ?? 'default'} style={{ fontSize: 11 }}>{CATEGORY_LABELS[v] ?? v}</Tag>
        : '-'
    },
    {
      title: 'Rasyo', dataIndex: 'ratioName', key: 'ratioName', fixed: 'left', width: 260,
      render: (name: string, r: MultiRatioRow) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          <div style={{ marginTop: 2 }}>{renderFormulaTokens(r.formula)}</div>
        </div>
      ),
    },
    ...ratioActivePeriods.map(p => ({
      title: p, key: p, align: 'right' as const, width: 120,
      render: (_: unknown, r: MultiRatioRow) => {
        const resolved = r.periodResolved[p]
        const resolvedNode = fmtResolved(resolved)
        if (r.periodErrors[p]) return (
          <Tooltip title={<div><div style={{ marginBottom: resolvedNode ? 6 : 0 }}>{r.periodErrors[p]}</div>{resolvedNode}</div>}>
            <Tag color="red" style={{ fontSize: 11, cursor: 'help' }}>Hata</Tag>
          </Tooltip>
        )
        const v = r.periodValues[p]
        if (v == null) return '-'
        return (
          <Tooltip title={resolvedNode} placement="left">
            <b style={{ cursor: resolvedNode ? 'help' : 'default' }}>{v.toFixed(4)}</b>
          </Tooltip>
        )
      },
    })),
  ]

  // ── tab contents ─────────────────────────────────────────────────
  const stmtTab = (
    <Card size="small">
      <Space wrap style={{ marginBottom: 8 }}>
        <Select style={{ width: 180 }} placeholder="Tablo türü seçin" options={stmtTypeOptions}
          value={viewType}
          onChange={v => { setViewType(v); setViewPeriods([]); setStmtRows([]) }}
          disabled={!selectedCompany} />
        <Select mode="multiple" style={{ minWidth: 300 }} placeholder="Dönem seçin"
          options={stmtPeriodOptions} value={viewPeriods} onChange={setViewPeriods}
          disabled={!viewType} maxTagCount="responsive" />
        <Button disabled={!viewType || stmtAnnualPeriods.length === 0}
          onClick={() => setViewPeriods(stmtAnnualPeriods)}>
          Yıllık ({stmtAnnualPeriods.length})
        </Button>
      </Space>

      <Space wrap style={{ marginBottom: 12 }}>
        <Segmented
          value={viewMode}
          onChange={v => setViewMode(v as 'original' | 'adjusted')}
          options={[{ label: 'Orijinal', value: 'original' }, { label: 'Arındırılmış', value: 'adjusted' }]}
        />
        <Button type="primary" icon={<EyeOutlined />} loading={viewLoading}
          disabled={!viewType || viewPeriods.length === 0}
          onClick={handleStmtView}>
          Görüntüle
        </Button>
      </Space>

      {stmtRows.length > 0 && (
        <Table<MultiRow>
          rowKey="key" size="small" columns={stmtColumns} dataSource={stmtRows}
          pagination={false} scroll={{ x: 320 + stmtActivePeriods.length * 140, y: 600 }}
        />
      )}
    </Card>
  )

  const ratioTab = (
    <Card size="small">
      <Space wrap style={{ marginBottom: 12 }}>
        <Select mode="multiple" style={{ minWidth: 300 }} placeholder="Dönem seçin"
          options={ratioPeriodOptions.map(p => ({ value: p, label: p }))}
          value={ratioSelectedPeriods} onChange={setRatioSelectedPeriods}
          disabled={!selectedCompany} maxTagCount="responsive" />
        <Button disabled={!selectedCompany || ratioAnnualPeriods.length === 0}
          onClick={() => setRatioSelectedPeriods(ratioAnnualPeriods)}>
          Yıllık ({ratioAnnualPeriods.length})
        </Button>
      </Space>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text strong>Rasyo Kuralları</Text>
          <Button size="small" type="link"
            onClick={() => setRatioSelectedIds(ratioSelectedIds.length === allRatioIds.length ? [] : allRatioIds)}>
            {ratioSelectedIds.length === allRatioIds.length ? 'Tümünü kaldır' : 'Tümünü seç'}
          </Button>
        </div>
        <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 6, padding: 8 }}>
          {ratioRules.length === 0
            ? <Empty description="Henüz rasyo kuralı yok" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            : ratioRules.map(r => (
              <div key={r.id} style={{ display: 'inline-block', padding: '3px 8px' }}>
                <Checkbox
                  checked={ratioSelectedIds.includes(r.id!)}
                  onChange={e => setRatioSelectedIds(prev =>
                    e.target.checked ? [...prev, r.id!] : prev.filter(x => x !== r.id)
                  )}
                >
                  {r.name}
                  {r.category && <Tag style={{ marginLeft: 6 }} color={CATEGORY_COLORS[r.category]}>{CATEGORY_LABELS[r.category] ?? r.category}</Tag>}
                </Checkbox>
              </div>
            ))
          }
        </div>
      </div>

      <Button type="primary" icon={<EyeOutlined />} loading={ratioLoading}
        disabled={!selectedCompany || ratioSelectedPeriods.length === 0 || ratioSelectedIds.length === 0}
        onClick={handleRatioView} style={{ marginBottom: 16 }}>
        Görüntüle
      </Button>

      {ratioError && <Alert type="error" message={ratioError} style={{ marginBottom: 12 }} />}

      {ratioRows.length > 0 && (
        <Table<MultiRatioRow>
          rowKey="key" size="small" columns={ratioColumns} dataSource={ratioRows}
          pagination={false} scroll={{ x: 310 + ratioActivePeriods.length * 120, y: 500 }}
        />
      )}
    </Card>
  )

  const summaryPctCell = (val1: number | null, val2: number | null) => {
    if (val1 == null || val2 == null || val2 === 0) return <span style={{ color: '#8c8c8c' }}>-</span>
    const pct = ((val1 - val2) / Math.abs(val2)) * 100
    const color = pct >= 0 ? '#52c41a' : '#ff4d4f'
    return <b style={{ color }}>% {pct >= 0 ? '+' : ''}{pct.toFixed(0)}</b>
  }

  const summaryColDef = (p1: string, p2: string | null): ColumnsType<SummaryRow> => [
    {
      title: 'Kalem', dataIndex: 'label', key: 'label', width: 200,
      render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    {
      title: p1, key: 'val1', align: 'right', width: 110,
      render: (_: unknown, r: SummaryRow) => (
        <span style={{ fontFamily: 'monospace', color: r.val1 == null ? '#bfbfbf' : undefined }}>
          {fmtSummary(r.val1)}
        </span>
      ),
    },
    ...(p2 ? [
      {
        title: p2, key: 'val2', align: 'right' as const, width: 110,
        render: (_: unknown, r: SummaryRow) => (
          <span style={{ fontFamily: 'monospace', color: r.val2 == null ? '#bfbfbf' : undefined }}>
            {fmtSummary(r.val2)}
          </span>
        ),
      },
      {
        title: '%', key: 'pct', align: 'right' as const, width: 72,
        render: (_: unknown, r: SummaryRow) => summaryPctCell(r.val1, r.val2),
      },
    ] : []),
  ]

  const summaryTab = (
    <Card size="small">
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          style={{ width: 140 }} placeholder="Dönem 1"
          options={ratioPeriodOptions.map(p => ({ value: p, label: p }))}
          value={summaryPeriod1} onChange={setSummaryPeriod1}
          disabled={!selectedCompany}
        />
        <Select
          style={{ width: 160 }} placeholder="Karşılaştırma dönemi"
          options={ratioPeriodOptions.map(p => ({ value: p, label: p }))}
          value={summaryPeriod2} onChange={v => setSummaryPeriod2(v ?? null)}
          allowClear disabled={!selectedCompany}
        />
        <Button type="primary" icon={<EyeOutlined />} loading={summaryLoading}
          disabled={!selectedCompany || !summaryPeriod1}
          onClick={handleSummaryLoad}>
          Getir
        </Button>
      </Space>

      {(incomeRows.length > 0 || balanceRows.length > 0) && (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 340 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#262626' }}>
              Özet Gelir Tablosu
            </div>
            <Table<SummaryRow>
              rowKey="key" size="small"
              columns={summaryColDef(summaryPeriod1!, summaryPeriod2)}
              dataSource={incomeRows} pagination={false}
            />
          </div>
          <div style={{ flex: 1, minWidth: 340 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#262626' }}>
              Özet Bilanço
            </div>
            <Table<SummaryRow>
              rowKey="key" size="small"
              columns={summaryColDef(summaryPeriod1!, summaryPeriod2)}
              dataSource={balanceRows} pagination={false}
            />
          </div>
        </div>
      )}
    </Card>
  )

  return (
    <>
      <Title level={4} style={{ marginTop: 0 }}>Analiz</Title>

      <div style={{ marginBottom: 16 }}>
        <Select
          style={{ width: 280 }}
          placeholder="Firma seçiniz"
          options={companies.map(c => ({ value: c.id, label: c.name }))}
          value={selectedCompany}
          onChange={onCompanyChange}
        />
      </div>

      <Tabs items={[
        { key: 'summary', label: 'Özet Finansallar', children: summaryTab },
        { key: 'statements', label: 'Finansal Tablo Görünümü', children: stmtTab },
        { key: 'ratios', label: 'Rasyo Analizi', children: ratioTab },
      ]} />
    </>
  )
}

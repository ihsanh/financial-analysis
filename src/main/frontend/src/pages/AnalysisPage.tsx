import { useEffect, useState } from 'react'
import {
  Select, Button, Checkbox, Table, Tag, Alert, Spin, Typography,
  Row, Col, Card, Divider, Empty, Tabs
} from 'antd'
import { PlayCircleOutlined } from '@ant-design/icons'
import { getCompanies, getPeriods, getRatioRules, getAdjustmentRules, runAnalysis } from '../api/client'
import type { Company, RatioRule, AdjustmentRule, AnalysisResponse, RatioResult, AdjustmentResult, FinancialLineItem } from '../types'

const { Title, Text } = Typography

const CATEGORY_LABELS: Record<string, string> = {
  LIQUIDITY: 'Likidite', LEVERAGE: 'Kaldıraç', PROFITABILITY: 'Karlılık', ACTIVITY: 'Faaliyet', OTHER: 'Diğer'
}
const CATEGORY_COLORS: Record<string, string> = {
  LIQUIDITY: 'blue', LEVERAGE: 'orange', PROFITABILITY: 'green', ACTIVITY: 'purple', OTHER: 'default'
}

export default function AnalysisPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [periods, setPeriods] = useState<string[]>([])
  const [ratioRules, setRatioRules] = useState<RatioRule[]>([])
  const [adjustmentRules, setAdjustmentRules] = useState<AdjustmentRule[]>([])

  const [selectedCompany, setSelectedCompany] = useState<number | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null)
  const [selectedRatios, setSelectedRatios] = useState<number[]>([])
  const [selectedAdjustments, setSelectedAdjustments] = useState<number[]>([])

  const [result, setResult] = useState<AnalysisResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getCompanies(), getRatioRules(true), getAdjustmentRules(true)])
      .then(([c, r, a]) => { setCompanies(c); setRatioRules(r); setAdjustmentRules(a) })
      .catch(e => setError(String(e)))
  }, [])

  const onCompanyChange = async (id: number) => {
    setSelectedCompany(id)
    setSelectedPeriod(null)
    setPeriods(await getPeriods(id))
  }

  const handleRun = async () => {
    if (!selectedCompany || !selectedPeriod) return
    setLoading(true)
    setError(null)
    try {
      const res = await runAnalysis(selectedCompany, selectedPeriod, selectedRatios, selectedAdjustments)
      setResult(res)
    } catch (e: unknown) { setError(String(e)) }
    finally { setLoading(false) }
  }

  const ratioColumns = [
    {
      title: 'Kategori', dataIndex: 'category', key: 'category', width: 120,
      render: (v: string) => v ? <Tag color={CATEGORY_COLORS[v]}>{CATEGORY_LABELS[v] ?? v}</Tag> : '-'
    },
    { title: 'Rasyo Adı', dataIndex: 'ruleName', key: 'ruleName' },
    { title: 'Formül', dataIndex: 'formula', key: 'formula', render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
    {
      title: 'Sonuç', dataIndex: 'value', key: 'value', align: 'right' as const, width: 120,
      render: (v: number, rec: RatioResult) => rec.error
        ? <Tag color="red">Hata</Tag>
        : v != null ? <b>{v.toFixed(4)}</b> : '-'
    },
    {
      title: 'Uyarı', dataIndex: 'error', key: 'error',
      render: (v: string) => v ? <Text type="danger" style={{ fontSize: 12 }}>{v}</Text> : null
    },
  ]

  const adjustedItemColumns = [
    { title: 'Kod', dataIndex: 'code', key: 'code', width: 100 },
    { title: 'Kalem Adı', dataIndex: 'name', key: 'name' },
    {
      title: 'Hesaplanan Tutar', dataIndex: 'value', key: 'value', align: 'right' as const,
      render: (v: number) => v != null ? <b>{v.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</b> : '-'
    },
  ]

  const allRatioIds = ratioRules.map(r => r.id!).filter(Boolean)
  const allAdjIds = adjustmentRules.map(r => r.id!).filter(Boolean)

  return (
    <>
      <Title level={4} style={{ marginTop: 0 }}>Finansal Analiz</Title>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="bottom">
          <Col span={6}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Firma</label>
            <Select
              style={{ width: '100%' }}
              placeholder="Firma seçiniz"
              options={companies.map(c => ({ value: c.id, label: c.name }))}
              onChange={onCompanyChange}
            />
          </Col>
          <Col span={4}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Dönem</label>
            <Select
              style={{ width: '100%' }}
              placeholder="Dönem"
              options={periods.map(p => ({ value: p, label: p }))}
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              disabled={!selectedCompany}
            />
          </Col>
          <Col span={14} style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={handleRun}
              loading={loading}
              disabled={!selectedCompany || !selectedPeriod}
            >
              Analizi Çalıştır
            </Button>
          </Col>
        </Row>

        <Divider />

        <Row gutter={32}>
          <Col span={12}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text strong>Rasyo Kuralları</Text>
              <Button size="small" type="link" onClick={() =>
                setSelectedRatios(selectedRatios.length === allRatioIds.length ? [] : allRatioIds)
              }>
                {selectedRatios.length === allRatioIds.length ? 'Tümünü kaldır' : 'Tümünü seç'}
              </Button>
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 6, padding: 8 }}>
              {ratioRules.length === 0
                ? <Empty description="Aktif kural yok" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                : ratioRules.map(r => (
                  <div key={r.id} style={{ padding: '4px 0' }}>
                    <Checkbox
                      checked={selectedRatios.includes(r.id!)}
                      onChange={e => setSelectedRatios(prev =>
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
          </Col>

          <Col span={12}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text strong>Aktarma / Arındırma Kuralları</Text>
              <Button size="small" type="link" onClick={() =>
                setSelectedAdjustments(selectedAdjustments.length === allAdjIds.length ? [] : allAdjIds)
              }>
                {selectedAdjustments.length === allAdjIds.length ? 'Tümünü kaldır' : 'Tümünü seç'}
              </Button>
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 6, padding: 8 }}>
              {adjustmentRules.length === 0
                ? <Empty description="Aktif kural yok" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                : adjustmentRules.map(r => (
                  <div key={r.id} style={{ padding: '4px 0' }}>
                    <Checkbox
                      checked={selectedAdjustments.includes(r.id!)}
                      onChange={e => setSelectedAdjustments(prev =>
                        e.target.checked ? [...prev, r.id!] : prev.filter(x => x !== r.id)
                      )}
                    >
                      {r.name}
                    </Checkbox>
                  </div>
                ))
              }
            </div>
          </Col>
        </Row>
      </Card>

      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}

      {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" tip="Analiz yapılıyor..." /></div>}

      {result && !loading && (
        <>
          <Divider />
          <Title level={5}>
            {result.companyName} — {result.period} Dönemi Analiz Sonuçları
          </Title>

          <Tabs items={[
            {
              key: 'ratios',
              label: `Rasyo Sonuçları (${result.ratioResults.length})`,
              children: result.ratioResults.length === 0
                ? <Empty description="Rasyo kuralı seçilmedi veya sonuç yok" />
                : <Table
                    rowKey="ruleId"
                    columns={ratioColumns}
                    dataSource={result.ratioResults}
                    pagination={false}
                    size="middle"
                    rowClassName={(r: RatioResult) => r.error ? 'ant-table-row-level-error' : ''}
                  />
            },
            {
              key: 'adjustments',
              label: `Aktarma/Arındırma (${result.adjustmentResults.length})`,
              children: result.adjustmentResults.length === 0
                ? <Empty description="Aktarma kuralı seçilmedi veya sonuç yok" />
                : result.adjustmentResults.map((adj: AdjustmentResult) => (
                  <Card key={adj.ruleId} title={adj.ruleName} size="small" style={{ marginBottom: 16 }}>
                    {Object.keys(adj.errors).length > 0 && (
                      <Alert
                        type="warning"
                        message={`Hatalar: ${Object.entries(adj.errors).map(([k, v]) => `${k}: ${v}`).join('; ')}`}
                        style={{ marginBottom: 8 }}
                      />
                    )}
                    <Table
                      rowKey="code"
                      columns={adjustedItemColumns}
                      dataSource={adj.adjustedItems as FinancialLineItem[]}
                      pagination={false}
                      size="small"
                    />
                  </Card>
                ))
            }
          ]} />
        </>
      )}
    </>
  )
}

import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Table, Button, Upload, Form, Select, Space, Popconfirm,
  message, Typography, Tag, Card, Divider
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { UploadOutlined, DeleteOutlined, EyeOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import { getCompany, getStatements, uploadStatementMulti, deleteStatement, getStatement } from '../api/client'
import type { Company, FinancialStatement, StatementType } from '../types'

const { Title, Text } = Typography

const STATEMENT_LABELS: Record<StatementType, string> = {
  BALANCE_SHEET: 'Bilanço',
  INCOME_STATEMENT: 'Gelir Tablosu',
  TRIAL_BALANCE: 'Mizan',
}

interface MultiRow {
  key: string
  code: string
  name: string
  level: number
  periodValues: Record<string, number | null>
}

export default function StatementsPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const navigate = useNavigate()
  const [company, setCompany] = useState<Company | null>(null)
  const [statements, setStatements] = useState<FinancialStatement[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState<UploadFile[]>([])

  // Multi-period view
  const [viewType, setViewType] = useState<StatementType | null>(null)
  const [viewPeriods, setViewPeriods] = useState<string[]>([])
  const [viewLoading, setViewLoading] = useState(false)
  const [multiRows, setMultiRows] = useState<MultiRow[]>([])
  const [activePeriods, setActivePeriods] = useState<string[]>([])

  const id = Number(companyId)

  const load = async () => {
    setLoading(true)
    try {
      const [comp, stmts] = await Promise.all([getCompany(id), getStatements(id)])
      setCompany(comp)
      setStatements(stmts)
    } catch (e: unknown) { message.error(String(e)) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  // Types that actually have uploaded statements
  const typeOptions = useMemo(() =>
    [...new Set(statements.map(s => s.type))]
      .map(t => ({ value: t, label: STATEMENT_LABELS[t] }))
  , [statements])

  const parsePeriod = (p: string) => { const [y, m] = p.split('/').map(Number); return y * 100 + m }
  const periodSort = (a: string, b: string) => parsePeriod(b) - parsePeriod(a)

  // Periods available for the selected type, sorted newest → oldest
  const periodOptions = useMemo(() => {
    if (!viewType) return []
    return statements
      .filter(s => s.type === viewType)
      .map(s => s.period)
      .filter((p, i, arr) => arr.indexOf(p) === i)
      .sort(periodSort)
      .map(p => ({ value: p, label: p }))
  }, [viewType, statements])

  // Annual periods (ending /12) for the selected type
  const annualPeriods = useMemo(
    () => periodOptions.filter(o => o.value.endsWith('/12')).map(o => o.value),
    [periodOptions]
  )

  const selectAnnual = () => setViewPeriods(annualPeriods)

  const handleUpload = async () => {
    const values = await form.validateFields()
    if (fileList.length === 0) { message.warning('Dosya seçiniz'); return }
    setUploadLoading(true)
    try {
      const imported = await uploadStatementMulti(id, values.type, fileList[0].originFileObj as File)
      message.success(`${imported.length} dönem yüklendi: ${imported.map((s: FinancialStatement) => s.period).join(', ')}`)
      form.resetFields()
      setFileList([])
      load()
    } catch (e: unknown) { message.error(String(e)) }
    finally { setUploadLoading(false) }
  }

  const handleDelete = async (stmtId: number) => {
    try { await deleteStatement(stmtId); message.success('Silindi'); load() }
    catch (e: unknown) { message.error(String(e)) }
  }

  const handleMultiView = async () => {
    if (!viewType || viewPeriods.length === 0) {
      message.warning('Tür ve en az bir dönem seçiniz')
      return
    }
    setViewLoading(true)
    try {
      const targets = statements.filter(s => s.type === viewType && viewPeriods.includes(s.period))
      const fetched = await Promise.all(targets.map(s => getStatement(s.id)))

      // Sort periods newest → oldest by actual date
      const sortedPeriods = [...viewPeriods].sort(periodSort)

      // Merge items: key = code (if non-empty) else name
      const itemMap = new Map<string, MultiRow>()
      const itemOrder: string[] = []

      for (const stmt of fetched) {
        for (const item of stmt.lineItems) {
          const key = item.code?.trim() ? item.code.trim() : item.name.trim()
          if (!itemMap.has(key)) {
            itemMap.set(key, {
              key,
              code: item.code ?? '',
              name: item.name,
              level: item.level ?? 0,
              periodValues: {},
            })
            itemOrder.push(key)
          }
          itemMap.get(key)!.periodValues[stmt.period] = item.value ?? null
        }
      }

      setMultiRows(itemOrder.map(k => itemMap.get(k)!))
      setActivePeriods(sortedPeriods)
    } catch (e: unknown) { message.error(String(e)) }
    finally { setViewLoading(false) }
  }

  const fmt = (v: number | null | undefined) =>
    v != null ? v.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-'

  const uploadColumns = [
    { title: 'Tür', dataIndex: 'type', key: 'type', width: 140, render: (v: StatementType) => <Tag color="blue">{STATEMENT_LABELS[v]}</Tag> },
    { title: 'Dönem', dataIndex: 'period', key: 'period', width: 100 },
    { title: 'Dosya', dataIndex: 'fileName', key: 'fileName', ellipsis: true },
    { title: 'Yüklenme', dataIndex: 'uploadedAt', key: 'uploadedAt', width: 110, render: (v: string) => v ? new Date(v).toLocaleDateString('tr-TR') : '-' },
    {
      title: '', key: 'actions', width: 60,
      render: (_: unknown, rec: FinancialStatement) => (
        <Popconfirm title="Silinsin mi?" onConfirm={() => handleDelete(rec.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      )
    }
  ]

  const multiColumns: ColumnsType<MultiRow> = [
    {
      title: 'Kalem', dataIndex: 'name', key: 'name',
      fixed: 'left', width: 320,
      render: (v: string, r: MultiRow) => (
        <span style={{
          paddingLeft: r.level * 16,
          fontWeight: r.level === 0 ? 600 : 400,
          display: 'inline-block',
        }}>{v}</span>
      )
    },
    ...activePeriods.map(p => ({
      title: p,
      key: p,
      align: 'right' as const,
      width: 140,
      render: (_: unknown, r: MultiRow) => (
        <span style={{ fontWeight: r.level === 0 ? 600 : 400 }}>
          {fmt(r.periodValues[p])}
        </span>
      ),
    })),
  ]

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/companies')} />
        <Title level={4} style={{ margin: 0 }}>{company?.name} — Finansal Tablolar</Title>
      </div>

      <Card size="small" title="Tablo Yükle" style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 10, fontSize: 12 }}>
          Excel başlık satırında dönem sütunları <b>YYYY/M</b> formatında olmalıdır (ör: 2025/3, 2025/12).
          Mizan için <b>YYYY/M Borç</b> / <b>YYYY/M Alacak</b> formatında çift sütun kullanın.
        </Text>
        <Form form={form} layout="inline">
          <Form.Item name="type" label="Tür" rules={[{ required: true }]}>
            <Select style={{ width: 180 }} options={[
              { value: 'BALANCE_SHEET', label: 'Bilanço' },
              { value: 'INCOME_STATEMENT', label: 'Gelir Tablosu' },
              { value: 'TRIAL_BALANCE', label: 'Mizan' },
            ]} />
          </Form.Item>
          <Form.Item>
            <Upload beforeUpload={() => false} fileList={fileList}
              onChange={({ fileList: fl }) => setFileList(fl.slice(-1))} accept=".xlsx,.xls">
              <Button icon={<UploadOutlined />}>Excel Seç</Button>
            </Upload>
          </Form.Item>
          <Form.Item>
            <Button type="primary" loading={uploadLoading} onClick={handleUpload}>Yükle</Button>
          </Form.Item>
        </Form>
      </Card>

      <Card size="small" title="Yüklü Tablolar" style={{ marginBottom: 12 }}>
        <Table rowKey="id" columns={uploadColumns} dataSource={statements}
          loading={loading} pagination={false} size="small" />
      </Card>

      <Card size="small" title="Çok Dönemli Görünüm">
        <Space wrap style={{ marginBottom: 12 }}>
          <Select
            style={{ width: 180 }}
            placeholder="Tablo türü seçin"
            options={typeOptions}
            value={viewType}
            onChange={v => { setViewType(v); setViewPeriods([]); setMultiRows([]) }}
          />
          <Select
            mode="multiple"
            style={{ minWidth: 300 }}
            placeholder="Dönem seçin (birden fazla)"
            options={periodOptions}
            value={viewPeriods}
            onChange={setViewPeriods}
            disabled={!viewType}
            maxTagCount="responsive"
          />
          <Button
            disabled={!viewType || annualPeriods.length === 0}
            onClick={selectAnnual}
          >
            Yıllık ({annualPeriods.length})
          </Button>
          <Button type="primary" icon={<EyeOutlined />} loading={viewLoading} onClick={handleMultiView}>
            Görüntüle
          </Button>
        </Space>

        {multiRows.length > 0 && (
          <>
            <Divider style={{ margin: '8px 0' }} />
            <Table<MultiRow>
              rowKey="key"
              size="small"
              columns={multiColumns}
              dataSource={multiRows}
              pagination={false}
              scroll={{ x: 320 + activePeriods.length * 140, y: 600 }}
            />
          </>
        )}
      </Card>
    </>
  )
}

import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Table, Button, Upload, Form, Select, Space, Popconfirm,
  message, Typography, Tag, Card
} from 'antd'
import { UploadOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import {
  getCompany, getStatements, uploadStatementMulti, deleteStatement
} from '../api/client'
import type { Company, FinancialStatement, StatementType } from '../types'

const { Title, Text } = Typography

const STATEMENT_LABELS: Record<StatementType, string> = {
  BALANCE_SHEET: 'Bilanço',
  INCOME_STATEMENT: 'Gelir Tablosu',
  TRIAL_BALANCE: 'Mizan',
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

  const [filterType, setFilterType] = useState<StatementType | null>(null)
  const [filterPeriod, setFilterPeriod] = useState<string | null>(null)

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

  const parsePeriod = (p: string) => { const [y, m] = p.split('/').map(Number); return y * 100 + m }
  const periodSort = (a: string, b: string) => parsePeriod(b) - parsePeriod(a)

  const filteredStatements = useMemo(() =>
    statements
      .filter(s => !filterType || s.type === filterType)
      .filter(s => !filterPeriod || s.period === filterPeriod)
  , [statements, filterType, filterPeriod])

  const filterPeriodOptions = useMemo(() => {
    const base = filterType ? statements.filter(s => s.type === filterType) : statements
    return [...new Set(base.map(s => s.period))].sort(periodSort).map(p => ({ value: p, label: p }))
  }, [statements, filterType])

  const handleUpload = async () => {
    const values = await form.validateFields()
    if (fileList.length === 0) { message.warning('Dosya seçiniz'); return }
    setUploadLoading(true)
    try {
      const imported = await uploadStatementMulti(id, values.type, fileList[0].originFileObj as File)
      message.success(`${imported.length} dönem yüklendi: ${imported.map((s: FinancialStatement) => s.period).join(', ')}`)
      form.resetFields(); setFileList([]); load()
    } catch (e: unknown) { message.error(String(e)) }
    finally { setUploadLoading(false) }
  }

  const handleDelete = async (stmtId: number) => {
    try { await deleteStatement(stmtId); message.success('Silindi'); load() }
    catch (e: unknown) { message.error(String(e)) }
  }

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

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/companies')} />
        <Title level={4} style={{ margin: 0 }}>{company?.name} — Finansal Tablolar</Title>
      </div>

      <Card size="small" title="Tablo Yükle" style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 10, fontSize: 12 }}>
          Excel başlık satırında dönem sütunları <b>YYYY/M</b> formatında olmalıdır.
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

      <Card size="small" title="Yüklü Tablolar">
        <Space style={{ marginBottom: 10 }}>
          <Select allowClear style={{ width: 180 }} placeholder="Tür filtrele"
            options={[
              { value: 'BALANCE_SHEET', label: 'Bilanço' },
              { value: 'INCOME_STATEMENT', label: 'Gelir Tablosu' },
              { value: 'TRIAL_BALANCE', label: 'Mizan' },
            ]}
            value={filterType} onChange={v => { setFilterType(v ?? null); setFilterPeriod(null) }} />
          <Select allowClear style={{ width: 140 }} placeholder="Dönem filtrele"
            options={filterPeriodOptions} value={filterPeriod} onChange={v => setFilterPeriod(v ?? null)} />
        </Space>
        <Table rowKey="id" columns={uploadColumns} dataSource={filteredStatements}
          loading={loading} pagination={false} size="small" />
      </Card>
    </>
  )
}

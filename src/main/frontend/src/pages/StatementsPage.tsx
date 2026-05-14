import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Table, Button, Upload, Form, Select, Space, Popconfirm,
  message, Typography, Tag, Drawer
} from 'antd'
import { UploadOutlined, DeleteOutlined, EyeOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import { getCompany, getStatements, uploadStatement, deleteStatement, getStatement } from '../api/client'
import type { Company, FinancialStatement, FinancialLineItem, StatementType } from '../types'

const { Title } = Typography

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
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedStatement, setSelectedStatement] = useState<FinancialStatement | null>(null)
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState<UploadFile[]>([])

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

  const handleUpload = async () => {
    const values = await form.validateFields()
    if (fileList.length === 0) { message.warning('Dosya seçiniz'); return }
    setUploadLoading(true)
    try {
      await uploadStatement(id, values.period, values.type, fileList[0].originFileObj as File)
      message.success('Tablo yüklendi')
      form.resetFields()
      setFileList([])
      load()
    } catch (e: unknown) { message.error(String(e)) }
    finally { setUploadLoading(false) }
  }

  const handleView = async (stmtId: number) => {
    try {
      const stmt = await getStatement(stmtId)
      setSelectedStatement(stmt)
      setDrawerOpen(true)
    } catch (e: unknown) { message.error(String(e)) }
  }

  const handleDelete = async (stmtId: number) => {
    try { await deleteStatement(stmtId); message.success('Silindi'); load() }
    catch (e: unknown) { message.error(String(e)) }
  }

  const columns = [
    { title: 'Tür', dataIndex: 'type', key: 'type', render: (v: StatementType) => <Tag color="blue">{STATEMENT_LABELS[v]}</Tag> },
    { title: 'Dönem', dataIndex: 'period', key: 'period' },
    { title: 'Dosya', dataIndex: 'fileName', key: 'fileName', ellipsis: true },
    { title: 'Yüklenme', dataIndex: 'uploadedAt', key: 'uploadedAt', render: (v: string) => v ? new Date(v).toLocaleDateString('tr-TR') : '-' },
    {
      title: 'İşlemler', key: 'actions', width: 150,
      render: (_: unknown, rec: FinancialStatement) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(rec.id)}>Görüntüle</Button>
          <Popconfirm title="Silinsin mi?" onConfirm={() => handleDelete(rec.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  const lineItemColumns = [
    { title: 'Kod', dataIndex: 'code', key: 'code', width: 100 },
    { title: 'Kalem Adı', dataIndex: 'name', key: 'name' },
    { title: 'Tutar', dataIndex: 'value', key: 'value', align: 'right' as const, render: (v: number) => v != null ? v.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-' },
    { title: 'Borç', dataIndex: 'debitValue', key: 'debitValue', align: 'right' as const, render: (v: number) => v != null ? v.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-' },
    { title: 'Alacak', dataIndex: 'creditValue', key: 'creditValue', align: 'right' as const, render: (v: number) => v != null ? v.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-' },
  ]

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/companies')} />
        <Title level={4} style={{ margin: 0 }}>{company?.name} — Finansal Tablolar</Title>
      </div>

      <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <Title level={5} style={{ marginTop: 0 }}>Tablo Yükle</Title>
        <Form form={form} layout="inline">
          <Form.Item name="period" label="Dönem" rules={[{ required: true }]}>
            <Select style={{ width: 140 }} placeholder="2024" options={[
              { value: '2024', label: '2024' }, { value: '2023', label: '2023' },
              { value: '2022', label: '2022' }, { value: '2021', label: '2021' },
              { value: '2020', label: '2020' },
            ]} />
          </Form.Item>
          <Form.Item name="type" label="Tür" rules={[{ required: true }]}>
            <Select style={{ width: 180 }} options={[
              { value: 'BALANCE_SHEET', label: 'Bilanço' },
              { value: 'INCOME_STATEMENT', label: 'Gelir Tablosu' },
              { value: 'TRIAL_BALANCE', label: 'Mizan' },
            ]} />
          </Form.Item>
          <Form.Item>
            <Upload
              beforeUpload={() => false}
              fileList={fileList}
              onChange={({ fileList: fl }) => setFileList(fl.slice(-1))}
              accept=".xlsx,.xls"
            >
              <Button icon={<UploadOutlined />}>Excel Seç</Button>
            </Upload>
          </Form.Item>
          <Form.Item>
            <Button type="primary" loading={uploadLoading} onClick={handleUpload}>Yükle</Button>
          </Form.Item>
        </Form>
      </div>

      <Table rowKey="id" columns={columns} dataSource={statements} loading={loading} pagination={false} />

      <Drawer
        title={selectedStatement ? `${STATEMENT_LABELS[selectedStatement.type]} — ${selectedStatement.period}` : ''}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={800}
      >
        {selectedStatement && (
          <Table
            rowKey="id"
            size="small"
            columns={lineItemColumns}
            dataSource={selectedStatement.lineItems}
            pagination={{ pageSize: 50 }}
            rowClassName={(r: FinancialLineItem) => r.level === 0 ? 'ant-table-row-level-0' : ''}
          />
        )}
      </Drawer>
    </>
  )
}

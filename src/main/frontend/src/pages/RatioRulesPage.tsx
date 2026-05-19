import { useEffect, useState } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Space, Popconfirm,
  message, Typography, Tag, Switch
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import { getRatioRules, createRatioRule, updateRatioRule, toggleRatioRule, deleteRatioRule, getItemDefs } from '../api/client'
import type { RatioRule, FinancialItemDef } from '../types'

const { Title, Text } = Typography

const validateFormula = (_: unknown, value: string): Promise<void> => {
  if (!value?.trim()) return Promise.reject('Formül zorunludur')
  let depth = 0
  for (const ch of value) {
    if (ch === '(') depth++
    else if (ch === ')') { depth--; if (depth < 0) return Promise.reject('Fazla kapanan parantez ")"') }
  }
  if (depth > 0) return Promise.reject(`${depth} adet parantez kapatılmamış`)
  let brace = 0
  for (const ch of value) {
    if (ch === '{') brace++
    else if (ch === '}') { brace--; if (brace < 0) return Promise.reject('Fazla kapanan süslü parantez "}"') }
  }
  if (brace > 0) return Promise.reject('Kalem kodu süslü parantezi kapatılmamış { }')
  if (/\{\s*\}/.test(value)) return Promise.reject('Boş kalem kodu { } kullanılamaz')
  const stripped = value.replace(/\{[^}]+\}/g, '0')
  if (!/^[\d\s+\-*/().,%]+$/.test(stripped))
    return Promise.reject('Geçersiz karakter — yalnızca sayı, operatör (+−*/), parantez kullanılabilir')
  if (/[+\-*/]{2,}/.test(stripped.replace(/\s/g, '')))
    return Promise.reject('Ardışık operatör kullanılamaz (örn: ++, *-)')
  const t = stripped.trim()
  if (/^[+*/]/.test(t)) return Promise.reject('Formül bir operatörle başlayamaz')
  if (/[+\-*/]$/.test(t)) return Promise.reject('Formül bir operatörle bitemez')
  return Promise.resolve()
}

const CATEGORY_OPTIONS = [
  { value: 'LIQUIDITY', label: 'Likidite' },
  { value: 'LEVERAGE', label: 'Kaldıraç' },
  { value: 'PROFITABILITY', label: 'Karlılık' },
  { value: 'ACTIVITY', label: 'Faaliyet' },
  { value: 'OTHER', label: 'Diğer' },
]

const CATEGORY_COLORS: Record<string, string> = {
  LIQUIDITY: 'blue', LEVERAGE: 'orange', PROFITABILITY: 'green', ACTIVITY: 'purple', OTHER: 'default'
}

export default function RatioRulesPage() {
  const [rules, setRules] = useState<RatioRule[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RatioRule | null>(null)
  const [form] = Form.useForm()

  const [itemDefs, setItemDefs] = useState<FinancialItemDef[]>([])
  const [itemSearch, setItemSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerType, setPickerType] = useState<string | null>(null)
  const [cursorPos, setCursorPos] = useState(0)

  const load = async () => {
    setLoading(true)
    try { setRules(await getRatioRules()) }
    catch (e: unknown) { message.error(String(e)) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    getItemDefs().then(setItemDefs).catch(() => {})
  }, [])

  const openAdd = () => {
    setEditing(null)
    form.setFieldsValue({ isActive: true, variables: [] })
    setModalOpen(true)
  }

  const openEdit = (r: RatioRule) => {
    setEditing(r)
    form.setFieldsValue(r)
    setModalOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    try {
      const payload: RatioRule = { ...values, variables: [] }
      if (editing?.id) {
        await updateRatioRule(editing.id, payload)
        message.success('Güncellendi')
      } else {
        await createRatioRule(payload)
        message.success('Oluşturuldu')
      }
      setModalOpen(false)
      load()
    } catch (e: unknown) { message.error(String(e)) }
  }

  const handleToggle = async (id: number) => {
    try { await toggleRatioRule(id); load() }
    catch (e: unknown) { message.error(String(e)) }
  }

  const handleDelete = async (id: number) => {
    try { await deleteRatioRule(id); message.success('Silindi'); load() }
    catch (e: unknown) { message.error(String(e)) }
  }

  const insertCode = (code: string) => {
    const current: string = form.getFieldValue('formula') ?? ''
    const pos = cursorPos
    const token = `{${code}}`
    const updated = current.slice(0, pos) + token + current.slice(pos)
    form.setFieldValue('formula', updated)
    setCursorPos(pos + token.length)
    setPickerOpen(false)
    setItemSearch('')
  }

  const filteredItems = itemDefs.filter(d =>
    (!pickerType || d.statementType === pickerType) &&
    (d.code.toLowerCase().includes(itemSearch.toLowerCase()) ||
     d.name.toLowerCase().includes(itemSearch.toLowerCase()))
  )

  const columns = [
    { title: 'Ad', dataIndex: 'name', key: 'name' },
    {
      title: 'Kategori', dataIndex: 'category', key: 'category',
      render: (v: string) => v
        ? <Tag color={CATEGORY_COLORS[v] ?? 'default'}>{CATEGORY_OPTIONS.find(o => o.value === v)?.label ?? v}</Tag>
        : '-'
    },
    {
      title: 'Formül', dataIndex: 'formula', key: 'formula',
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>
    },
    {
      title: 'Varsayılan', dataIndex: 'isDefault', key: 'isDefault',
      render: (v: boolean) => v ? <Tag color="cyan">Varsayılan</Tag> : '-'
    },
    {
      title: 'Aktif', dataIndex: 'isActive', key: 'isActive',
      render: (v: boolean, rec: RatioRule) => (
        <Switch checked={v} size="small" onChange={() => rec.id && handleToggle(rec.id)} />
      )
    },
    {
      title: 'İşlemler', key: 'actions', width: 120,
      render: (_: unknown, rec: RatioRule) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(rec)} />
          <Popconfirm title="Silinsin mi?" onConfirm={() => rec.id && handleDelete(rec.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} disabled={rec.isDefault} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Rasyo Kuralları</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Yeni Kural</Button>
      </div>

      <Table rowKey="id" columns={columns} dataSource={rules} loading={loading} pagination={{ pageSize: 25 }} />

      <Modal
        title={editing ? 'Rasyo Kuralını Düzenle' : 'Yeni Rasyo Kuralı'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="Kaydet"
        cancelText="İptal"
        width={700}
        styles={{ body: { maxHeight: '78vh', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Kural Adı" rules={[{ required: true }]}>
            <Input placeholder="örn. Cari Oran" />
          </Form.Item>
          <Form.Item name="description" label="Açıklama">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="category" label="Kategori" style={{ flex: 1 }}>
              <Select options={CATEGORY_OPTIONS} placeholder="Seçiniz" allowClear />
            </Form.Item>
            <Form.Item name="isActive" label="Aktif" valuePropName="checked" style={{ flex: 1 }}>
              <Switch />
            </Form.Item>
          </Space>

          <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
            Formülde kalem kodlarını <b>&#123;FI0001&#125;</b> sözdiziminde kullanın.
            <b> Kalem Ekle</b> butonu ile sözlükten seçin.
          </Text>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Form.Item
              name="formula"
              label="Formül"
              rules={[{ validator: validateFormula }]}
              style={{ flex: 1, marginBottom: 0 }}
            >
              <Input
                placeholder="örn: {FI0001} / {FI0002}"
                onBlur={e => setCursorPos(e.target.selectionStart ?? 0)}
                onClick={e => setCursorPos((e.target as HTMLInputElement).selectionStart ?? 0)}
                onKeyUp={e => setCursorPos((e.target as HTMLInputElement).selectionStart ?? 0)}
              />
            </Form.Item>
            <Button
              icon={<SearchOutlined />}
              style={{ marginTop: 30 }}
              onClick={() => setPickerOpen(true)}
            >
              Kalem Ekle
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Formüle Kalem Ekle"
        open={pickerOpen}
        onCancel={() => { setPickerOpen(false); setItemSearch(''); setPickerType(null) }}
        footer={null}
        width={580}
      >
        <Select
          style={{ width: '100%', marginBottom: 8 }}
          placeholder="Kaynak tablo (tümü)"
          allowClear
          value={pickerType}
          onChange={v => setPickerType(v ?? null)}
          options={[
            { value: 'BALANCE_SHEET', label: 'Bilanço' },
            { value: 'INCOME_STATEMENT', label: 'Gelir Tablosu' },
            { value: 'TRIAL_BALANCE', label: 'Mizan' },
          ]}
        />
        <Input.Search
          placeholder="Kod veya kalem adı ara..."
          value={itemSearch}
          onChange={e => setItemSearch(e.target.value)}
          style={{ marginBottom: 12 }}
          allowClear
        />
        {itemDefs.length === 0 ? (
          <Text type="secondary">
            Henüz kalem tanımı yok. Excel yükledikten sonra kalemler buraya eklenir.
          </Text>
        ) : (
          <Table
            size="small"
            rowKey="id"
            dataSource={filteredItems}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            onRow={record => ({
              onClick: () => insertCode(record.code),
              style: { cursor: 'pointer' },
            })}
            columns={[
              { title: 'Kod', dataIndex: 'code', key: 'code', width: 100 },
              { title: 'Kalem Adı', dataIndex: 'name', key: 'name' },
              {
                title: '', key: 'ins', width: 60,
                render: (_: unknown, rec: FinancialItemDef) => (
                  <Button size="small" type="link" onClick={e => { e.stopPropagation(); insertCode(rec.code) }}>
                    Ekle
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Modal>
    </>
  )
}

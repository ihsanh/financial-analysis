import { useEffect, useState } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Space, Popconfirm,
  message, Typography, Tag, Switch, Divider
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { getRatioRules, createRatioRule, updateRatioRule, toggleRatioRule, deleteRatioRule } from '../api/client'
import type { RatioRule } from '../types'

const { Title, Text } = Typography

const STATEMENT_OPTIONS = [
  { value: 'BALANCE_SHEET', label: 'Bilanço' },
  { value: 'INCOME_STATEMENT', label: 'Gelir Tablosu' },
  { value: 'TRIAL_BALANCE', label: 'Mizan' },
]

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

  const load = async () => {
    setLoading(true)
    try { setRules(await getRatioRules()) }
    catch (e: unknown) { message.error(String(e)) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

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
      const payload: RatioRule = { ...values, variables: values.variables ?? [] }
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

  const columns = [
    { title: 'Ad', dataIndex: 'name', key: 'name' },
    {
      title: 'Kategori', dataIndex: 'category', key: 'category',
      render: (v: string) => v ? <Tag color={CATEGORY_COLORS[v] ?? 'default'}>{CATEGORY_OPTIONS.find(o => o.value === v)?.label ?? v}</Tag> : '-'
    },
    {
      title: 'Formül', dataIndex: 'formula', key: 'formula',
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>
    },
    { title: 'Varsayılan', dataIndex: 'isDefault', key: 'isDefault', render: (v: boolean) => v ? <Tag color="cyan">Varsayılan</Tag> : '-' },
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
              <Select options={CATEGORY_OPTIONS} placeholder="Seçiniz" />
            </Form.Item>
            <Form.Item name="isActive" label="Aktif" valuePropName="checked" style={{ flex: 1 }}>
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item
            name="formula"
            label="Formül"
            rules={[{ required: true }]}
            extra="Değişken adlarını {süslü parantez} içinde yazın. Örn: {currentAssets} / {currentLiabilities}"
          >
            <Input.TextArea rows={2} placeholder="{varAdı} / {varAdı2}" />
          </Form.Item>

          <Divider>Değişken Tanımları</Divider>
          <Form.List name="variables">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item name={[name, 'variableName']} rules={[{ required: true, message: 'Zorunlu' }]}>
                      <Input placeholder="Değişken adı (örn. currentAssets)" style={{ width: 200 }} />
                    </Form.Item>
                    <Form.Item name={[name, 'statementType']} rules={[{ required: true, message: 'Zorunlu' }]}>
                      <Select options={STATEMENT_OPTIONS} placeholder="Tablo türü" style={{ width: 160 }} />
                    </Form.Item>
                    <Form.Item name={[name, 'lineItemCode']} rules={[{ required: true, message: 'Zorunlu' }]}>
                      <Input placeholder="Kalem kodu (örn. 1)" style={{ width: 150 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block>
                  Değişken Ekle
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </>
  )
}

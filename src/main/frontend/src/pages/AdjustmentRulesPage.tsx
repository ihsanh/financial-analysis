import { useEffect, useState } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Space, Popconfirm,
  message, Typography, Switch, Divider, InputNumber
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { getAdjustmentRules, createAdjustmentRule, updateAdjustmentRule, toggleAdjustmentRule, deleteAdjustmentRule } from '../api/client'
import type { AdjustmentRule } from '../types'

const { Title, Text } = Typography

const STATEMENT_OPTIONS = [
  { value: 'BALANCE_SHEET', label: 'Bilanço' },
  { value: 'INCOME_STATEMENT', label: 'Gelir Tablosu' },
  { value: 'TRIAL_BALANCE', label: 'Mizan' },
]

export default function AdjustmentRulesPage() {
  const [rules, setRules] = useState<AdjustmentRule[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AdjustmentRule | null>(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try { setRules(await getAdjustmentRules()) }
    catch (e: unknown) { message.error(String(e)) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditing(null)
    form.setFieldsValue({ isActive: true, steps: [] })
    setModalOpen(true)
  }

  const openEdit = (r: AdjustmentRule) => { setEditing(r); form.setFieldsValue(r); setModalOpen(true) }

  const handleSave = async () => {
    const values = await form.validateFields()
    try {
      const payload: AdjustmentRule = { ...values, steps: values.steps ?? [] }
      if (editing?.id) {
        await updateAdjustmentRule(editing.id, payload)
        message.success('Güncellendi')
      } else {
        await createAdjustmentRule(payload)
        message.success('Oluşturuldu')
      }
      setModalOpen(false)
      load()
    } catch (e: unknown) { message.error(String(e)) }
  }

  const handleToggle = async (id: number) => {
    try { await toggleAdjustmentRule(id); load() }
    catch (e: unknown) { message.error(String(e)) }
  }

  const handleDelete = async (id: number) => {
    try { await deleteAdjustmentRule(id); message.success('Silindi'); load() }
    catch (e: unknown) { message.error(String(e)) }
  }

  const columns = [
    { title: 'Kural Adı', dataIndex: 'name', key: 'name' },
    { title: 'Açıklama', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Adım Sayısı', key: 'steps', render: (_: unknown, rec: AdjustmentRule) => rec.steps?.length ?? 0 },
    {
      title: 'Aktif', dataIndex: 'isActive', key: 'isActive',
      render: (v: boolean, rec: AdjustmentRule) => (
        <Switch checked={v} size="small" onChange={() => rec.id && handleToggle(rec.id)} />
      )
    },
    {
      title: 'İşlemler', key: 'actions', width: 120,
      render: (_: unknown, rec: AdjustmentRule) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(rec)} />
          <Popconfirm title="Silinsin mi?" onConfirm={() => rec.id && handleDelete(rec.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Aktarma / Arındırma Kuralları</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Yeni Kural</Button>
      </div>

      <Table rowKey="id" columns={columns} dataSource={rules} loading={loading} pagination={{ pageSize: 20 }} />

      <Modal
        title={editing ? 'Kuralı Düzenle' : 'Yeni Aktarma/Arındırma Kuralı'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="Kaydet"
        cancelText="İptal"
        width={800}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="name" label="Kural Adı" rules={[{ required: true }]} style={{ flex: 2 }}>
              <Input />
            </Form.Item>
            <Form.Item name="isActive" label="Aktif" valuePropName="checked" style={{ flex: 1 }}>
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="Açıklama">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Divider>Hesaplama Adımları</Divider>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            Her adım bir finansal kalem üretir. Formülde diğer kalemlere &#123;kod&#125; şeklinde erişilir. Örn: &#123;100&#125; + &#123;200&#125;
          </Text>
          <Form.List name="steps">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <div key={key} style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 12, marginBottom: 12, background: '#fafafa' }}>
                    <Space align="start" style={{ width: '100%', flexWrap: 'wrap' }}>
                      <Form.Item name={[name, 'stepOrder']} label="Sıra" rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: 70 }} />
                      </Form.Item>
                      <Form.Item name={[name, 'outputCode']} label="Çıktı Kodu" rules={[{ required: true }]}>
                        <Input placeholder="örn. EBITDA" style={{ width: 120 }} />
                      </Form.Item>
                      <Form.Item name={[name, 'outputName']} label="Kalem Adı" rules={[{ required: true }]}>
                        <Input placeholder="örn. FAVÖK" style={{ width: 180 }} />
                      </Form.Item>
                      <Form.Item name={[name, 'sourceStatementType']} label="Kaynak Tablo">
                        <Select options={STATEMENT_OPTIONS} placeholder="Seçiniz" style={{ width: 160 }} allowClear />
                      </Form.Item>
                      <Button danger icon={<DeleteOutlined />} onClick={() => remove(name)} style={{ marginTop: 30 }} />
                    </Space>
                    <Form.Item
                      name={[name, 'formula']}
                      label="Formül"
                      rules={[{ required: true }]}
                      extra="Kalem kodlarını {süslü parantez} içinde kullanın. Örn: {60} - {63}"
                    >
                      <Input placeholder="{kod1} + {kod2} - {kod3}" />
                    </Form.Item>
                    <Form.Item name={[name, 'description']} label="Açıklama">
                      <Input placeholder="İsteğe bağlı açıklama" />
                    </Form.Item>
                  </div>
                ))}
                <Button type="dashed" onClick={() => add({ stepOrder: fields.length + 1 })} icon={<PlusOutlined />} block>
                  Adım Ekle
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </>
  )
}

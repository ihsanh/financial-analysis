import { useEffect, useState } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Space, Popconfirm,
  message, Typography, Switch, Divider, InputNumber, Tag
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import {
  getAdjustmentRules, createAdjustmentRule, updateAdjustmentRule,
  toggleAdjustmentRule, deleteAdjustmentRule, getItemDefs, cleanOrphanItemDefs
} from '../api/client'
import type { AdjustmentRule, FinancialItemDef } from '../types'
import { FormulaInput } from '../components/FormulaInput'

const { Title, Text } = Typography

const validateFormula = (_: unknown, value: string): Promise<void> => {
  if (!value?.trim()) return Promise.reject('Formül zorunludur')

  // Balanced parentheses
  let depth = 0
  for (const ch of value) {
    if (ch === '(') depth++
    else if (ch === ')') { depth--; if (depth < 0) return Promise.reject('Fazla kapanan parantez ")"') }
  }
  if (depth > 0) return Promise.reject(`${depth} adet parantez kapatılmamış`)

  // Balanced curly braces
  let brace = 0
  for (const ch of value) {
    if (ch === '{') brace++
    else if (ch === '}') { brace--; if (brace < 0) return Promise.reject('Fazla kapanan süslü parantez "}"') }
  }
  if (brace > 0) return Promise.reject('Kalem kodu süslü parantezi kapatılmamış { }')

  // Empty curly braces
  if (/\{\s*\}/.test(value)) return Promise.reject('Boş kalem kodu { } kullanılamaz')

  // After stripping {CODE} blocks, remaining chars must be valid math
  const stripped = value.replace(/\{[^}]+\}/g, '0')
  if (!/^[\d\s+\-*/().,%]+$/.test(stripped))
    return Promise.reject('Geçersiz karakter — yalnızca sayı, operatör (+−*/), parantez kullanılabilir')

  // No consecutive operators (e.g. ++, *-, /*)
  if (/[+\-*/]{2,}/.test(stripped.replace(/\s/g, '')))
    return Promise.reject('Ardışık operatör kullanılamaz (örn: ++, *-)')

  // Must not start/end with an operator (after trimming)
  const t = stripped.trim()
  if (/^[+*/]/.test(t)) return Promise.reject('Formül bir operatörle başlayamaz')
  if (/[+\-*/]$/.test(t)) return Promise.reject('Formül bir operatörle bitemez')

  return Promise.resolve()
}

const STATEMENT_OPTIONS = [
  { value: 'BALANCE_SHEET', label: 'Bilanço' },
  { value: 'INCOME_STATEMENT', label: 'Gelir Tablosu' },
  { value: 'CASH_FLOW', label: 'Nakit Akım Tablosu' },
  { value: 'TRIAL_BALANCE', label: 'Mizan' },
]

export default function AdjustmentRulesPage() {
  const [rules, setRules] = useState<AdjustmentRule[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AdjustmentRule | null>(null)
  const [form] = Form.useForm()

  const [itemDefs, setItemDefs] = useState<FinancialItemDef[]>([])
  const [itemSearch, setItemSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTarget, setPickerTarget] = useState<number | null>(null)
  const [pickerType, setPickerType] = useState<string | null>(null)
  // Track last cursor position per step index
  const [cursorPos, setCursorPos] = useState<Record<number, number>>({})

  const load = async () => {
    setLoading(true)
    try { setRules(await getAdjustmentRules()) }
    catch (e: unknown) { message.error(String(e)) }
    finally { setLoading(false) }
  }

  const loadItemDefs = async () => {
    try { setItemDefs(await getItemDefs()) }
    catch { /* non-critical */ }
  }

  useEffect(() => { load(); loadItemDefs() }, [])

  const openAdd = () => {
    setEditing(null)
    form.setFieldsValue({ isActive: true, steps: [] })
    setModalOpen(true)
  }

  const openEdit = (r: AdjustmentRule) => {
    setEditing(r)
    form.setFieldsValue(r)
    setModalOpen(true)
  }

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

  // Insert {CODE} at cursor position in the formula of step `pickerTarget`
  const insertCode = (code: string) => {
    if (pickerTarget === null) return
    const steps: Record<string, string>[] = form.getFieldValue('steps') ?? []
    const current: string = steps[pickerTarget]?.formula ?? ''
    const pos = cursorPos[pickerTarget] ?? current.length
    const token = `{${code}}`
    const updated = current.slice(0, pos) + token + current.slice(pos)
    form.setFieldValue(['steps', pickerTarget, 'formula'], updated)
    setCursorPos(prev => ({ ...prev, [pickerTarget!]: pos + token.length }))
    setPickerOpen(false)
    setItemSearch('')
  }

  // When user selects output item from dictionary, populate both outputCode and outputName
  const handleOutputSelect = (stepIndex: number, code: string) => {
    const def = itemDefs.find(d => d.code === code)
    if (!def) return
    form.setFieldValue(['steps', stepIndex, 'outputCode'], def.code)
    form.setFieldValue(['steps', stepIndex, 'outputName'], def.name)
  }

  const itemSelectOptions = (stepType?: string) =>
    itemDefs
      .filter(d => !stepType || d.statementType === stepType)
      .map(d => ({ value: d.code, label: `${d.code} — ${d.name}` }))

  const filteredItems = itemDefs.filter(d =>
    (!pickerType || d.statementType === pickerType) &&
    (d.code.toLowerCase().includes(itemSearch.toLowerCase()) ||
     d.name.toLowerCase().includes(itemSearch.toLowerCase()))
  )

  const columns = [
    { title: 'Kural Adı', dataIndex: 'name', key: 'name' },
    { title: 'Açıklama', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Adım', key: 'steps', width: 80, render: (_: unknown, rec: AdjustmentRule) => rec.steps?.length ?? 0 },
    {
      title: 'Aktif', dataIndex: 'isActive', key: 'isActive', width: 80,
      render: (v: boolean, rec: AdjustmentRule) => (
        <Switch checked={v} size="small" onChange={() => rec.id && handleToggle(rec.id)} />
      )
    },
    {
      title: 'İşlemler', key: 'actions', width: 100,
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
        <Space>
          <Button onClick={async () => {
            try {
              const n = await cleanOrphanItemDefs()
              message.success(`${n} boşta kalem silindi`)
              loadItemDefs()
            } catch (e: unknown) { message.error(String(e)) }
          }}>
            Boşta Kalemleri Temizle
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Yeni Kural</Button>
        </Space>
      </div>

      <Table rowKey="id" columns={columns} dataSource={rules} loading={loading} pagination={{ pageSize: 20 }} />

      {/* Kural düzenleme modal */}
      <Modal
        title={editing ? 'Kuralı Düzenle' : 'Yeni Aktarma/Arındırma Kuralı'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="Kaydet"
        cancelText="İptal"
        width={920}
        styles={{ body: { maxHeight: '78vh', overflowY: 'auto' } }}
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
          <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
            Her adım bir finansal kaleme hesaplanmış değer yazar.
            Formülde <b>&#123;KOD&#125;</b> sözdizimini kullanın — <b>Kalem Ekle</b> butonuyla sözlükten seçin.
          </Text>

          <Form.List name="steps">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name: stepIdx }) => (
                  <div key={key} style={{ border: '1px solid #e8e8e8', borderRadius: 6, padding: 12, marginBottom: 12, background: '#fafafa' }}>
                    <Space align="start" style={{ width: '100%', flexWrap: 'wrap' }} size={8}>
                      <Form.Item name={[stepIdx, 'stepOrder']} label="Sıra" rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: 64 }} />
                      </Form.Item>

                      {/* Output item — filtered by sourceStatementType */}
                      <Form.Item shouldUpdate noStyle>
                        {({ getFieldValue }) => {
                          const stepType = getFieldValue(['steps', stepIdx, 'sourceStatementType'])
                          return (
                            <Form.Item
                              name={[stepIdx, 'outputCode']}
                              label="Sonuç Kalemi"
                              rules={[{ required: true, message: 'Kalem seçiniz' }]}
                              style={{ flex: 1, minWidth: 260 }}
                            >
                              <Select
                                showSearch
                                placeholder="Kalemi listeden seçin"
                                options={itemSelectOptions(stepType)}
                                filterOption={(input, opt) =>
                                  (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                onChange={(val: string) => handleOutputSelect(stepIdx, val)}
                                notFoundContent={
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {stepType ? 'Bu tabloya ait kalem yok' : 'Kalem bulunamadı — önce Excel yükleyin'}
                                  </Text>
                                }
                              />
                            </Form.Item>
                          )
                        }}
                      </Form.Item>

                      {/* Hidden outputName — auto-filled when outputCode selected */}
                      <Form.Item name={[stepIdx, 'outputName']} hidden>
                        <Input />
                      </Form.Item>

                      <Form.Item name={[stepIdx, 'sourceStatementType']} label="Kaynak Tablo">
                        <Select options={STATEMENT_OPTIONS} placeholder="Seçiniz" style={{ width: 155 }} allowClear />
                      </Form.Item>

                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(stepIdx)}
                        style={{ marginTop: 30 }}
                      />
                    </Space>

                    {/* Formula with autocomplete */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <Form.Item shouldUpdate noStyle>
                        {({ getFieldValue }) => {
                          const stmtType = getFieldValue(['steps', stepIdx, 'sourceStatementType'])
                          return (
                            <Form.Item
                              name={[stepIdx, 'formula']}
                              label="Formül"
                              rules={[{ validator: validateFormula }]}
                              style={{ flex: 1, marginBottom: 0 }}
                            >
                              <FormulaInput
                                itemDefs={itemDefs}
                                filterType={stmtType}
                                placeholder="örn: {FI0001} + {FI0002} - {FI0003}"
                                onCursorChange={pos => setCursorPos(p => ({ ...p, [stepIdx]: pos }))}
                              />
                            </Form.Item>
                          )
                        }}
                      </Form.Item>
                      <Button
                        icon={<SearchOutlined />}
                        style={{ marginTop: 30 }}
                        onClick={() => {
                          setPickerTarget(stepIdx)
                          const steps = form.getFieldValue('steps') ?? []
                          setPickerType(steps[stepIdx]?.sourceStatementType ?? null)
                          setPickerOpen(true)
                        }}
                      >
                        Kalem Ekle
                      </Button>
                    </div>

                    <Form.Item name={[stepIdx, 'description']} label="Açıklama" style={{ marginBottom: 0, marginTop: 8 }}>
                      <Input placeholder="İsteğe bağlı açıklama" />
                    </Form.Item>
                  </div>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add({ stepOrder: fields.length + 1 })}
                  icon={<PlusOutlined />}
                  block
                >
                  Adım Ekle
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* Kalem seçici */}
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
            { value: 'CASH_FLOW', label: 'Nakit Akım Tablosu' },
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
              { title: 'Kod', dataIndex: 'code', key: 'code', width: 90 },
              { title: 'Kalem Adı', dataIndex: 'name', key: 'name' },
              {
                title: 'Tablo', dataIndex: 'statementType', key: 'statementType', width: 110,
                render: (v: string) => {
                  const labels: Record<string, string> = { BALANCE_SHEET: 'Bilanço', INCOME_STATEMENT: 'Gelir Tab.', CASH_FLOW: 'Nakit Akım', TRIAL_BALANCE: 'Mizan' }
                  const colors: Record<string, string> = { BALANCE_SHEET: 'blue', INCOME_STATEMENT: 'green', CASH_FLOW: 'cyan', TRIAL_BALANCE: 'orange' }
                  return v ? <Tag color={colors[v]} style={{ fontSize: 11 }}>{labels[v] ?? v}</Tag> : '-'
                },
              },
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

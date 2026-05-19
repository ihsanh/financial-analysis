import { useEffect, useMemo, useState } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Space, Popconfirm,
  message, Typography, Tag, Switch, Tooltip, Checkbox
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, BulbOutlined } from '@ant-design/icons'
import { getRatioRules, createRatioRule, updateRatioRule, toggleRatioRule, deleteRatioRule, getItemDefs } from '../api/client'
import type { RatioRule, FinancialItemDef } from '../types'
import { FormulaInput } from '../components/FormulaInput'

const { Title, Text } = Typography

// ---------------------------------------------------------------------------
// Formula validator
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Standard ratio templates (name-based matching)
// ---------------------------------------------------------------------------
interface RatioTemplate {
  name: string
  category: string
  description: string
  components: Array<{ role: string; namePatterns: string[]; statementType?: string }>
  formulaBuilder: (codes: string[]) => string
}

interface SuggestedRatio {
  key: string
  name: string
  category: string
  description: string
  formula: string
  resolvedComponents: Array<{ role: string; code: string; itemName: string }>
}

const RATIO_TEMPLATES: RatioTemplate[] = [
  // Likidite
  {
    name: 'Cari Oran',
    category: 'LIQUIDITY',
    description: 'Dönen Varlıklar / Kısa Vadeli Yükümlülükler',
    components: [
      { role: 'Dönen Varlıklar', namePatterns: ['toplam dönen varlık', 'dönen varlıklar toplam', 'dönen varlık'], statementType: 'BALANCE_SHEET' },
      { role: 'Kısa Vadeli Yükümlülükler', namePatterns: ['toplam kısa vadeli yükümlülük', 'kısa vadeli yükümlülükler toplam', 'toplam kısa vadeli borç', 'kısa vadeli yükümlülük', 'kısa vadeli borç'], statementType: 'BALANCE_SHEET' },
    ],
    formulaBuilder: ([a, b]) => `{${a}} / {${b}}`,
  },
  {
    name: 'Asit-Test Oranı',
    category: 'LIQUIDITY',
    description: '(Dönen Varlıklar - Stoklar) / Kısa Vadeli Yükümlülükler',
    components: [
      { role: 'Dönen Varlıklar', namePatterns: ['toplam dönen varlık', 'dönen varlıklar toplam', 'dönen varlık'], statementType: 'BALANCE_SHEET' },
      { role: 'Stoklar', namePatterns: ['stok'], statementType: 'BALANCE_SHEET' },
      { role: 'Kısa Vadeli Yükümlülükler', namePatterns: ['toplam kısa vadeli yükümlülük', 'kısa vadeli yükümlülükler toplam', 'toplam kısa vadeli borç', 'kısa vadeli yükümlülük', 'kısa vadeli borç'], statementType: 'BALANCE_SHEET' },
    ],
    formulaBuilder: ([a, b, c]) => `({${a}} - {${b}}) / {${c}}`,
  },
  {
    name: 'Nakit Oranı',
    category: 'LIQUIDITY',
    description: 'Nakit ve Nakit Benzerleri / Kısa Vadeli Yükümlülükler',
    components: [
      { role: 'Nakit ve Nakit Benzerleri', namePatterns: ['nakit ve nakit', 'nakit benzeri'], statementType: 'BALANCE_SHEET' },
      { role: 'Kısa Vadeli Yükümlülükler', namePatterns: ['toplam kısa vadeli yükümlülük', 'kısa vadeli yükümlülükler toplam', 'toplam kısa vadeli borç', 'kısa vadeli yükümlülük', 'kısa vadeli borç'], statementType: 'BALANCE_SHEET' },
    ],
    formulaBuilder: ([a, b]) => `{${a}} / {${b}}`,
  },
  // Kaldıraç
  {
    name: 'Finansal Kaldıraç Oranı',
    category: 'LEVERAGE',
    description: 'Toplam Yükümlülükler / Toplam Varlıklar',
    components: [
      { role: 'Toplam Yükümlülükler', namePatterns: ['toplam yükümlülük', 'yükümlülükler toplam', 'toplam borç'], statementType: 'BALANCE_SHEET' },
      { role: 'Toplam Varlıklar', namePatterns: ['toplam varlık', 'aktif toplam', 'toplam aktif'], statementType: 'BALANCE_SHEET' },
    ],
    formulaBuilder: ([a, b]) => `{${a}} / {${b}}`,
  },
  {
    name: 'Özkaynak Oranı',
    category: 'LEVERAGE',
    description: 'Özkaynaklar / Toplam Varlıklar',
    components: [
      { role: 'Özkaynaklar', namePatterns: ['toplam özkaynak', 'özkaynaklar toplam', 'özkaynak'], statementType: 'BALANCE_SHEET' },
      { role: 'Toplam Varlıklar', namePatterns: ['toplam varlık', 'aktif toplam', 'toplam aktif'], statementType: 'BALANCE_SHEET' },
    ],
    formulaBuilder: ([a, b]) => `{${a}} / {${b}}`,
  },
  {
    name: 'Borç / Özkaynak Oranı',
    category: 'LEVERAGE',
    description: 'Toplam Yükümlülükler / Özkaynaklar',
    components: [
      { role: 'Toplam Yükümlülükler', namePatterns: ['toplam yükümlülük', 'yükümlülükler toplam', 'toplam borç'], statementType: 'BALANCE_SHEET' },
      { role: 'Özkaynaklar', namePatterns: ['toplam özkaynak', 'özkaynaklar toplam', 'özkaynak'], statementType: 'BALANCE_SHEET' },
    ],
    formulaBuilder: ([a, b]) => `{${a}} / {${b}}`,
  },
  // Karlılık
  {
    name: 'Brüt Kar Marjı',
    category: 'PROFITABILITY',
    description: 'Brüt Kar / Hasılat',
    components: [
      { role: 'Brüt Kar / Zarar', namePatterns: ['brüt kar', 'brüt zarar', 'ticari faaliyetlerden brüt'], statementType: 'INCOME_STATEMENT' },
      { role: 'Hasılat / Net Satışlar', namePatterns: ['hasılat', 'net satış', 'satış gelir'], statementType: 'INCOME_STATEMENT' },
    ],
    formulaBuilder: ([a, b]) => `{${a}} / {${b}}`,
  },
  {
    name: 'Net Kar Marjı',
    category: 'PROFITABILITY',
    description: 'Net Dönem Karı / Hasılat',
    components: [
      { role: 'Net Dönem Karı', namePatterns: ['net dönem kar', 'dönem net kar', 'dönem karı', 'dönem kar/zarar'], statementType: 'INCOME_STATEMENT' },
      { role: 'Hasılat / Net Satışlar', namePatterns: ['hasılat', 'net satış', 'satış gelir'], statementType: 'INCOME_STATEMENT' },
    ],
    formulaBuilder: ([a, b]) => `{${a}} / {${b}}`,
  },
  {
    name: 'Varlık Karlılığı (ROA)',
    category: 'PROFITABILITY',
    description: 'Net Dönem Karı / Toplam Varlıklar',
    components: [
      { role: 'Net Dönem Karı', namePatterns: ['net dönem kar', 'dönem net kar', 'dönem karı', 'dönem kar/zarar'], statementType: 'INCOME_STATEMENT' },
      { role: 'Toplam Varlıklar', namePatterns: ['toplam varlık', 'aktif toplam', 'toplam aktif'], statementType: 'BALANCE_SHEET' },
    ],
    formulaBuilder: ([a, b]) => `{${a}} / {${b}}`,
  },
  {
    name: 'Özkaynak Karlılığı (ROE)',
    category: 'PROFITABILITY',
    description: 'Net Dönem Karı / Özkaynaklar',
    components: [
      { role: 'Net Dönem Karı', namePatterns: ['net dönem kar', 'dönem net kar', 'dönem karı', 'dönem kar/zarar'], statementType: 'INCOME_STATEMENT' },
      { role: 'Özkaynaklar', namePatterns: ['toplam özkaynak', 'özkaynaklar toplam', 'özkaynak'], statementType: 'BALANCE_SHEET' },
    ],
    formulaBuilder: ([a, b]) => `{${a}} / {${b}}`,
  },
  // Faaliyet
  {
    name: 'Stok Devir Hızı',
    category: 'ACTIVITY',
    description: 'Satışların Maliyeti / Stoklar',
    components: [
      { role: 'Satışların Maliyeti', namePatterns: ['satışların maliyeti', 'satılan mamul', 'ticari mal maliyet', 'satış maliyeti'], statementType: 'INCOME_STATEMENT' },
      { role: 'Stoklar', namePatterns: ['stok'], statementType: 'BALANCE_SHEET' },
    ],
    formulaBuilder: ([a, b]) => `{${a}} / {${b}}`,
  },
  {
    name: 'Alacak Devir Hızı',
    category: 'ACTIVITY',
    description: 'Hasılat / Ticari Alacaklar',
    components: [
      { role: 'Hasılat / Net Satışlar', namePatterns: ['hasılat', 'net satış', 'satış gelir'], statementType: 'INCOME_STATEMENT' },
      { role: 'Ticari Alacaklar', namePatterns: ['ticari alacak'], statementType: 'BALANCE_SHEET' },
    ],
    formulaBuilder: ([a, b]) => `{${a}} / {${b}}`,
  },
]

function findBestMatch(
  patterns: string[],
  stType: string | undefined,
  items: FinancialItemDef[],
): FinancialItemDef | null {
  const shortest = (arr: FinancialItemDef[]) =>
    [...arr].sort((a, b) => a.name.length - b.name.length)[0]

  // For each level threshold (prefer indented items, fall back to level-0 totals)
  for (const minLevel of [1, 0]) {
    const pool = items.filter(d =>
      (d.level === undefined || d.level >= minLevel) &&
      (!stType || d.statementType === stType)
    )

    // 1. Exact match
    for (const p of patterns) {
      const pl = p.toLowerCase()
      const hit = pool.find(d => d.name.toLowerCase() === pl)
      if (hit) return hit
    }

    // 2. Starts-with match (catches "Toplam Dönen Varlıklar" via "toplam dönen varlık")
    for (const p of patterns) {
      const pl = p.toLowerCase()
      const hits = pool.filter(d => d.name.toLowerCase().startsWith(pl))
      if (hits.length > 0) return shortest(hits)
    }

    // 3. Contains match — complete this level before falling back
    for (const p of patterns) {
      const pl = p.toLowerCase()
      const hits = pool.filter(d => d.name.toLowerCase().includes(pl))
      if (hits.length > 0) return shortest(hits)
    }
  }

  return null
}

function buildSuggestions(items: FinancialItemDef[]): SuggestedRatio[] {
  return RATIO_TEMPLATES.flatMap((tmpl, idx) => {
    const resolved: SuggestedRatio['resolvedComponents'] = []
    for (const comp of tmpl.components) {
      const match = findBestMatch(comp.namePatterns, comp.statementType, items)
      if (!match) return []
      resolved.push({ role: comp.role, code: match.code, itemName: match.name })
    }
    return [{
      key: String(idx),
      name: tmpl.name,
      category: tmpl.category,
      description: tmpl.description,
      formula: tmpl.formulaBuilder(resolved.map(r => r.code)),
      resolvedComponents: resolved,
    }]
  })
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CATEGORY_OPTIONS = [
  { value: 'LIQUIDITY', label: 'Likidite' },
  { value: 'LEVERAGE', label: 'Kaldıraç' },
  { value: 'PROFITABILITY', label: 'Karlılık' },
  { value: 'ACTIVITY', label: 'Faaliyet' },
  { value: 'OTHER', label: 'Diğer' },
]

const CATEGORY_COLORS: Record<string, string> = {
  LIQUIDITY: 'blue', LEVERAGE: 'orange', PROFITABILITY: 'green', ACTIVITY: 'purple', OTHER: 'default',
}

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map(o => [o.value, o.label])
)

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
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

  // Suggestion state
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestedRatio[]>([])
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

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
    form.resetFields()
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

  const openSuggestions = () => {
    if (itemDefs.length === 0) {
      message.warning('Önce Excel yükleyin — kalem tanımları yüklendikten sonra öneriler oluşturulabilir.')
      return
    }
    const s = buildSuggestions(itemDefs)
    if (s.length === 0) {
      message.info('Yüklü kalemler arasında eşleşen standart rasyo bulunamadı.')
      return
    }
    setSuggestions(s)
    setSelectedKeys(s.map(r => r.key))
    setSuggestOpen(true)
  }

  const createSuggested = async () => {
    const selected = suggestions.filter(s => selectedKeys.includes(s.key))
    if (selected.length === 0) { message.warning('En az bir rasyo seçin'); return }
    setCreating(true)
    try {
      for (const s of selected) {
        await createRatioRule({
          name: s.name,
          category: s.category,
          description: s.description,
          formula: s.formula,
          isActive: true,
          variables: [],
        })
      }
      message.success(`${selected.length} rasyo kuralı oluşturuldu`)
      setSuggestOpen(false)
      load()
    } catch (e: unknown) { message.error(String(e)) }
    finally { setCreating(false) }
  }

  const columns = [
    { title: 'Ad', dataIndex: 'name', key: 'name' },
    {
      title: 'Kategori', dataIndex: 'category', key: 'category',
      render: (v: string) => v
        ? <Tag color={CATEGORY_COLORS[v] ?? 'default'}>{CATEGORY_LABELS[v] ?? v}</Tag>
        : '-',
    },
    {
      title: 'Formül', dataIndex: 'formula', key: 'formula',
      render: (v: string) => renderFormulaTokens(v),
    },
    {
      title: 'Aktif', dataIndex: 'isActive', key: 'isActive',
      render: (v: boolean, rec: RatioRule) => (
        <Switch checked={v} size="small" onChange={() => rec.id && handleToggle(rec.id)} />
      ),
    },
    {
      title: 'İşlemler', key: 'actions', width: 120,
      render: (_: unknown, rec: RatioRule) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(rec)} />
          <Popconfirm title="Silinsin mi?" onConfirm={() => rec.id && handleDelete(rec.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const suggestionColumns = [
    { title: 'Rasyo Adı', dataIndex: 'name', key: 'name', width: 200 },
    {
      title: 'Kategori', dataIndex: 'category', key: 'category', width: 110,
      render: (v: string) => <Tag color={CATEGORY_COLORS[v] ?? 'default'}>{CATEGORY_LABELS[v] ?? v}</Tag>,
    },
    {
      title: 'Formül', dataIndex: 'formula', key: 'formula',
      render: (v: string, rec: SuggestedRatio) => (
        <Tooltip
          title={
            <div>
              {rec.resolvedComponents.map(c => (
                <div key={c.code} style={{ fontSize: 12 }}>
                  <b>{c.role}:</b> {c.code} — {c.itemName}
                </div>
              ))}
            </div>
          }
        >
          <Text code style={{ fontSize: 12, cursor: 'default' }}>{v}</Text>
        </Tooltip>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Rasyo Kuralları</Title>
        <Space>
          <Button icon={<BulbOutlined />} onClick={openSuggestions}>Rasyo Önerileri</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Yeni Kural</Button>
        </Space>
      </div>

      <Table rowKey="id" columns={columns} dataSource={rules} loading={loading} pagination={{ pageSize: 25 }} />

      {/* Kural düzenleme modal */}
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
            Kalem adı yazmaya başlayın — eşleşen kalemler otomatik önerilir.
            Seçmek için tıklayın veya ↑↓ Enter kullanın. <b>Kalem Ekle</b> ile listeden seçebilirsiniz.
          </Text>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Form.Item
              name="formula"
              label="Formül"
              rules={[{ validator: validateFormula }]}
              style={{ flex: 1, marginBottom: 0 }}
            >
              <FormulaInput
                itemDefs={itemDefs}
                placeholder="örn: {FI0001} / {FI0002}"
                onCursorChange={pos => setCursorPos(pos)}
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
                  const labels: Record<string, string> = { BALANCE_SHEET: 'Bilanço', INCOME_STATEMENT: 'Gelir Tab.', TRIAL_BALANCE: 'Mizan' }
                  const colors: Record<string, string> = { BALANCE_SHEET: 'blue', INCOME_STATEMENT: 'green', TRIAL_BALANCE: 'orange' }
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

      {/* Rasyo öneri modal */}
      <Modal
        title={`Standart Rasyo Önerileri — ${suggestions.length} rasyo eşleşti`}
        open={suggestOpen}
        onCancel={() => setSuggestOpen(false)}
        width={820}
        footer={[
          <Button key="cancel" onClick={() => setSuggestOpen(false)}>İptal</Button>,
          <Button
            key="create"
            type="primary"
            loading={creating}
            disabled={selectedKeys.length === 0}
            onClick={createSuggested}
          >
            Seçilenleri Oluştur ({selectedKeys.length})
          </Button>,
        ]}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
          Yüklü kalem adlarından otomatik eşleştirilen standart rasyolar aşağıda listelendi.
          Formülün üzerine gelerek hangi kalemlerle eşleştiğini görebilirsiniz.
          Oluşturmak istemediklerinizin seçimini kaldırın.
        </Text>
        <div style={{ marginBottom: 8 }}>
          <Checkbox
            checked={selectedKeys.length === suggestions.length}
            indeterminate={selectedKeys.length > 0 && selectedKeys.length < suggestions.length}
            onChange={e => setSelectedKeys(e.target.checked ? suggestions.map(s => s.key) : [])}
          >
            Tümünü seç
          </Checkbox>
        </div>
        <Table
          size="small"
          rowKey="key"
          dataSource={suggestions}
          columns={suggestionColumns}
          pagination={false}
          rowSelection={{
            selectedRowKeys: selectedKeys,
            onChange: keys => setSelectedKeys(keys as string[]),
          }}
        />
      </Modal>
    </>
  )
}

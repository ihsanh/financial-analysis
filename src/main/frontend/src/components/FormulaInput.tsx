import { useEffect, useRef, useState } from 'react'
import { Tag } from 'antd'
import type { FinancialItemDef } from '../types'

const STMT_LABELS: Record<string, string> = {
  BALANCE_SHEET: 'Bilanço',
  INCOME_STATEMENT: 'Gelir Tab.',
  TRIAL_BALANCE: 'Mizan',
}
const STMT_COLORS: Record<string, string> = {
  BALANCE_SHEET: 'blue',
  INCOME_STATEMENT: 'green',
  TRIAL_BALANCE: 'orange',
}

// Detect the word fragment the user is actively typing (for autocomplete trigger).
// Returns null if cursor is inside an existing {CODE} block or there's no word fragment.
function detectFragment(text: string, pos: number): { fragment: string; start: number } | null {
  const before = text.slice(0, pos)
  // Suppress autocomplete when inside an already-opened {CODE} block
  const lastOpen = before.lastIndexOf('{')
  const lastClose = before.lastIndexOf('}')
  if (lastOpen > lastClose) return null
  // Match trailing alphabetic word (handles Turkish chars via broad [^\s…] range)
  const match = before.match(/([^\s+\-*/(){},.%\d][^\s+\-*/(){},%]*)$/)
  if (!match || match[1].trim().length < 1) return null
  return { fragment: match[1].trim(), start: pos - match[1].length }
}

export interface FormulaInputProps {
  value?: string
  onChange?: (value: string) => void
  itemDefs: FinancialItemDef[]
  filterType?: string          // when set, autocomplete only shows this statement type
  placeholder?: string
  onCursorChange?: (pos: number) => void
}

export function FormulaInput({
  value, onChange, itemDefs, filterType, placeholder, onCursorChange,
}: FormulaInputProps) {
  const [open, setOpen] = useState(false)
  const [fragment, setFragment] = useState('')
  const [fragmentStart, setFragmentStart] = useState(0)
  const [activeIdx, setActiveIdx] = useState(0)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const filtered = fragment.length > 0
    ? itemDefs
        .filter(d =>
          (!filterType || d.statementType === filterType) &&
          (d.name.toLowerCase().includes(fragment.toLowerCase()) ||
           d.code.toLowerCase().includes(fragment.toLowerCase()))
        )
        .slice(0, 10)
    : []

  const insertItem = (def: FinancialItemDef) => {
    const current = value ?? ''
    const pos = inputRef.current?.selectionStart ?? current.length
    const token = `{${def.code}}`
    const newVal = current.slice(0, fragmentStart) + token + current.slice(pos)
    onChange?.(newVal)
    setOpen(false)
    setFragment('')
    const newPos = fragmentStart + token.length
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(newPos, newPos)
      onCursorChange?.(newPos)
    }, 0)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    const pos = e.target.selectionStart ?? val.length
    onChange?.(val)
    onCursorChange?.(pos)
    const det = detectFragment(val, pos)
    if (det) {
      setFragment(det.fragment)
      setFragmentStart(det.start)
      setActiveIdx(0)
      setOpen(true)
    } else {
      setOpen(false)
      setFragment('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[activeIdx]) insertItem(filtered[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const trackCursor = (e: React.SyntheticEvent<HTMLInputElement>) => {
    onCursorChange?.((e.target as HTMLInputElement).selectionStart ?? 0)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !dropRef.current?.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        value={value ?? ''}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={e => { setFocused(false); trackCursor(e) }}
        onClick={trackCursor}
        onKeyUp={trackCursor}
        placeholder={placeholder}
        style={{
          display: 'block', width: '100%', boxSizing: 'border-box',
          padding: '4px 11px',
          color: 'rgba(0,0,0,0.88)', fontSize: 14,
          lineHeight: '1.5714285714285714',
          border: `1px solid ${focused ? '#4096ff' : '#d9d9d9'}`,
          borderRadius: 6, outline: 'none',
          background: '#ffffff', fontFamily: 'inherit',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: focused ? '0 0 0 2px rgba(5,145,255,0.1)' : 'none',
        }}
      />

      {open && filtered.length > 0 && (
        <div
          ref={dropRef}
          onMouseDown={e => e.preventDefault()} // prevent input blur when clicking scrollbar or items
          style={{
            position: 'absolute', zIndex: 1050, left: 0, right: 0, top: '100%',
            marginTop: 4, background: '#fff',
            border: '1px solid #d9d9d9', borderRadius: 6,
            boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
            maxHeight: 220, overflowY: 'auto',
          }}
        >
          {filtered.map((def, idx) => (
            <div
              key={def.id}
              onMouseDown={e => { e.preventDefault(); insertItem(def) }}
              onMouseEnter={() => setActiveIdx(idx)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 12px', cursor: 'pointer',
                background: idx === activeIdx ? '#e6f4ff' : undefined,
                borderBottom: idx < filtered.length - 1 ? '1px solid #f0f0f0' : undefined,
              }}
            >
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#8c8c8c', minWidth: 60, flexShrink: 0 }}>
                {def.code}
              </span>
              <span style={{ flex: 1, fontSize: 13 }}>{def.name}</span>
              {def.statementType && (
                <Tag
                  color={STMT_COLORS[def.statementType] ?? 'default'}
                  style={{ fontSize: 10, margin: 0, flexShrink: 0 }}
                >
                  {STMT_LABELS[def.statementType] ?? def.statementType}
                </Tag>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

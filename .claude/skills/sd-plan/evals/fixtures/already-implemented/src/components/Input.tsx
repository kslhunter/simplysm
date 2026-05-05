// 디자인 시스템 stub
import React from 'react'

export const Input: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
}

export const Table: React.FC<{ rows: any[]; columns: { key: string; label: string }[] }> = ({ rows, columns }) => {
  return (
    <table>
      <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{columns.map((c) => <td key={c.key}>{r[c.key]}</td>)}</tr>)}</tbody>
    </table>
  )
}

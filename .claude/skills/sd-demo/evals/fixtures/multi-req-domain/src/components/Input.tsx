// 디자인 시스템 컴포넌트 (stub)
import React from 'react'

export const Input: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  return <input value={value} onChange={(e) => onChange(e.target.value)} />
}

export const Table: React.FC<{ rows: any[]; columns: string[] }> = ({ rows, columns }) => {
  return (
    <table>
      <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{columns.map((c) => <td key={c}>{r[c]}</td>)}</tr>)}</tbody>
    </table>
  )
}

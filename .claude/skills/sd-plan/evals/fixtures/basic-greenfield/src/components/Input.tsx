// 디자인 시스템 stub
import React from 'react'

export const Checkbox: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label?: string }> = ({ checked, onChange, label }) => {
  return <label><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}</label>
}

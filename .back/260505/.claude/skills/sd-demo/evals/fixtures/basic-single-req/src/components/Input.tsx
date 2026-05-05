// 디자인 시스템 컴포넌트 (stub)
import React from 'react'

export interface InputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export const Input: React.FC<InputProps> = ({ value, onChange, placeholder }) => {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
}

export interface CheckboxProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}

export const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange, label }) => {
  return (
    <label>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

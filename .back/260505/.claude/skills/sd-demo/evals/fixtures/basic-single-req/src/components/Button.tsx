// 디자인 시스템 컴포넌트 (stub)
import React from 'react'

export interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
}

export const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'primary' }) => {
  return <button className={`btn btn-${variant}`} onClick={onClick}>{children}</button>
}

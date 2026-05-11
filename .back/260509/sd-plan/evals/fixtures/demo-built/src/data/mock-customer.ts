// MOCK DATA - replaced in implement stage
export interface Customer {
  id: string
  name: string
  bizNumber: string
  manager: string
  phone: string
}

export const MOCK_CUSTOMER_LIST: Customer[] = Array.from({ length: 25 }, (_, i) => ({
  id: `c-${i + 1}`,
  name: `샘플거래처 ${i + 1}`,
  bizNumber: `123-45-${String(i).padStart(5, '0')}`,
  manager: `담당자 ${i + 1}`,
  phone: `010-0000-${String(i).padStart(4, '0')}`,
}))

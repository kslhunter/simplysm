// demo가 만든 UI scaffold (mock data 사용, 기능 미구현)
import React, { useState } from 'react'
import { Input, Table, Pagination } from '../components/Input'
import { MOCK_CUSTOMER_LIST } from '../data/mock-customer'

export const CustomerList: React.FC = () => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const columns = [
    { key: 'name', label: '이름' },
    { key: 'bizNumber', label: '사업자번호' },
    { key: 'manager', label: '담당자' },
    { key: 'phone', label: '연락처' },
  ]

  // NOTE: mock 데이터 그대로 표시. 실제 검색/페이지네이션 로직 없음 (demo 단계)
  return (
    <div>
      <Input value={search} onChange={setSearch} placeholder="거래처명 검색" />
      <Table rows={MOCK_CUSTOMER_LIST} columns={columns} />
      <Pagination page={page} total={2} onChange={setPage} />
    </div>
  )
}

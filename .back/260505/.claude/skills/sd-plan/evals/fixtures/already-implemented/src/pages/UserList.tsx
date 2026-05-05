// 이미 구현된 사용자 목록 화면 (실제 API 호출, 검색 동작)
import React, { useState, useEffect } from 'react'
import { Input, Table } from '../components/Input'
import { fetchUsers, User } from '../api/user'

export const UserList: React.FC = () => {
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchUsers(search || undefined)
      .then(setUsers)
      .finally(() => setLoading(false))
  }, [search])

  const columns = [
    { key: 'name', label: '이름' },
    { key: 'email', label: '이메일' },
  ]

  return (
    <div>
      <Input value={search} onChange={setSearch} placeholder="이메일 검색" />
      {loading ? <p>로딩 중...</p> : <Table rows={users} columns={columns} />}
    </div>
  )
}

// R1만 구현됨. R2(이메일 검색) 코드는 없음 — impl.md는 거짓 보고
import React from 'react'

const USERS = [
  { name: '홍길동', email: 'hong@example.com' },
  { name: '김철수', email: 'kim@example.com' },
  { name: '이영희', email: 'lee@example.com' },
]

export const UserList: React.FC = () => {
  return (
    <table>
      <thead><tr><th>이름</th><th>이메일</th></tr></thead>
      <tbody>
        {USERS.map((u, i) => <tr key={i}><td>{u.name}</td><td>{u.email}</td></tr>)}
      </tbody>
    </table>
  )
}

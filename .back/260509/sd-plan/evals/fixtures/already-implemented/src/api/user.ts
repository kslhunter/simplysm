// 실제 구현된 API 호출
export interface User {
  id: string
  name: string
  email: string
}

export async function fetchUsers(emailQuery?: string): Promise<User[]> {
  const url = emailQuery ? `/api/users?email=${encodeURIComponent(emailQuery)}` : '/api/users'
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}

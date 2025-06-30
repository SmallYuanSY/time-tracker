"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Users, UserPlus, Shield, User, Settings, Edit3 } from 'lucide-react'

interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'WEB_ADMIN' | 'EMPLOYEE'
}

export default function UsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  const checkUserRole = useCallback(async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        // 找到當前用戶的角色
        const currentUser = data.find((user: User) => user.email === session?.user?.email)
        if (currentUser?.role !== 'WEB_ADMIN') {
          alert('您沒有權限訪問此頁面')
          router.push('/')
          return
        }
        setCurrentUserRole(currentUser.role)
        setUsers(data)
      } else {
        alert('無法載入用戶資料')
        router.push('/')
      }
    } catch (error) {
      console.error('檢查用戶角色失敗:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }, [session, router])

  // 身份驗證檢查
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    if (status === 'authenticated' && session?.user) {
      checkUserRole()
    }
  }, [status, session, router, checkUserRole])

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setShowEditModal(true)
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="w-4 h-4 text-red-400" />
      case 'WEB_ADMIN':
        return <Settings className="w-4 h-4 text-purple-400" />
      case 'EMPLOYEE':
        return <User className="w-4 h-4 text-blue-400" />
      default:
        return <User className="w-4 h-4 text-gray-400" />
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return '管理員'
      case 'WEB_ADMIN':
        return '網頁管理'
      case 'EMPLOYEE':
        return '員工'
      default:
        return '未知'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-500/20 text-red-200 border-red-400/30'
      case 'WEB_ADMIN':
        return 'bg-purple-500/20 text-purple-200 border-purple-400/30'
      case 'EMPLOYEE':
        return 'bg-blue-500/20 text-blue-200 border-blue-400/30'
      default:
        return 'bg-gray-500/20 text-gray-200 border-gray-400/30'
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-white">載入中...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (currentUserRole !== 'WEB_ADMIN') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-400">您沒有權限訪問此頁面</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* 頁面標題和操作列 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6" />
              用戶管理
            </h1>
            <p className="text-white/60 text-sm mt-1">
              管理系統用戶和權限設定
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            新增用戶
          </button>
        </div>

        {/* 用戶列表 */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">系統用戶列表</h2>
          
          {users.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-white/60 text-lg mb-2">👥</div>
              <div className="text-white/60">尚無用戶資料</div>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                        {user.name?.[0] || user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">
                          {user.name || '未設定姓名'}
                        </div>
                        <div className="text-white/60 text-sm">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-lg border text-sm flex items-center gap-2 ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        {getRoleText(user.role)}
                      </div>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 flex items-center justify-center"
                        title="編輯用戶"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 新增用戶彈窗 */}
      {showCreateModal && (
        <CreateUserModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            checkUserRole() // 重新載入用戶列表
          }}
        />
      )}

      {/* 編輯用戶彈窗 */}
      {showEditModal && editingUser && (
        <EditUserModal 
          user={editingUser}
          onClose={() => {
            setShowEditModal(false)
            setEditingUser(null)
          }}
          onSuccess={() => {
            setShowEditModal(false)
            setEditingUser(null)
            checkUserRole() // 重新載入用戶列表
          }}
        />
      )}
    </DashboardLayout>
  )
}

// 新增用戶彈窗組件
function CreateUserModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'EMPLOYEE'
  })
  const [errors, setErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.password) {
      setErrors(['請填寫必要欄位'])
      return
    }

    setIsSubmitting(true)
    setErrors([])

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        alert('用戶創建成功！')
        onSuccess()
      } else {
        const error = await response.json()
        setErrors([error.error || '創建失敗'])
      }
    } catch (error) {
      console.error('創建用戶失敗:', error)
      setErrors(['創建失敗，請稍後再試'])
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-white mb-4">新增用戶</h3>
        
        {errors.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 text-red-100 border border-red-400/30">
            <ul className="text-sm space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-white/80 font-medium block mb-2">
              電子郵件 *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/60 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <label className="text-sm text-white/80 font-medium block mb-2">
              密碼 *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/60 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
              placeholder="請輸入密碼"
              required
            />
          </div>

          <div>
            <label className="text-sm text-white/80 font-medium block mb-2">
              姓名
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/60 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
              placeholder="請輸入姓名"
            />
          </div>

          <div>
            <label className="text-sm text-white/80 font-medium block mb-2">
              角色 *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
            >
              <option value="EMPLOYEE" className="bg-gray-800">員工</option>
              <option value="WEB_ADMIN" className="bg-gray-800">網頁管理</option>
              <option value="ADMIN" className="bg-gray-800">管理員</option>
            </select>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm rounded-xl bg-white/10 text-white border border-white/30 hover:bg-white/20 transition disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '創建中...' : '創建用戶'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// 編輯用戶彈窗組件
function EditUserModal({ user, onClose, onSuccess }: { user: User, onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    email: user.email,
    password: '',
    name: user.name,
    role: user.role
  })
  const [errors, setErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email) {
      setErrors(['請填寫電子郵件'])
      return
    }

    setIsSubmitting(true)
    setErrors([])

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, id: user.id }),
      })

      if (response.ok) {
        alert('用戶更新成功！')
        onSuccess()
      } else {
        const error = await response.json()
        setErrors([error.error || '更新失敗'])
      }
    } catch (error) {
      console.error('更新用戶失敗:', error)
      setErrors(['更新失敗，請稍後再試'])
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-white mb-4">編輯用戶</h3>
        
        {errors.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 text-red-100 border border-red-400/30">
            <ul className="text-sm space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-white/80 font-medium block mb-2">
              電子郵件 *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/60 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <label className="text-sm text-white/80 font-medium block mb-2">
              密碼 (留空表示不更改)
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/60 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
              placeholder="留空表示不更改密碼"
            />
          </div>

          <div>
            <label className="text-sm text-white/80 font-medium block mb-2">
              姓名
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/60 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
              placeholder="請輸入姓名"
            />
          </div>

          <div>
            <label className="text-sm text-white/80 font-medium block mb-2">
              角色 *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'ADMIN' | 'WEB_ADMIN' | 'EMPLOYEE' }))}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
            >
              <option value="EMPLOYEE" className="bg-gray-800">員工</option>
              <option value="WEB_ADMIN" className="bg-gray-800">網頁管理</option>
              <option value="ADMIN" className="bg-gray-800">管理員</option>
            </select>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm rounded-xl bg-white/10 text-white border border-white/30 hover:bg-white/20 transition disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '更新中...' : '更新用戶'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 
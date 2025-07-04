'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock } from 'lucide-react'

export default function PasswordSettingsPage() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (newPassword !== confirmPassword) {
      setError('新密碼與確認密碼不符')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/users/settings/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || '更新失敗')
      }

      router.push('/settings')
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-6">
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="text-white/60 hover:text-white mb-4 flex items-center gap-2"
            >
              ← 返回設定
            </button>
            <h1 className="text-2xl font-bold text-white">🔒 修改密碼</h1>
            <p className="text-white/60 mt-2">
              請輸入當前密碼和新密碼
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-white mb-2">
                  當前密碼
                </label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="請輸入當前密碼"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-white mb-2">
                  新密碼
                </label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="請輸入新密碼"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
                  確認新密碼
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="請再次輸入新密碼"
                />
              </div>

              {error && (
                <div className="text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent"></div>
                  </div>
                ) : (
                  '更新密碼'
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 
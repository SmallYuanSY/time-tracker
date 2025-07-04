'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail } from 'lucide-react'

export default function EmailSettingsPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/users/settings/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          currentPassword
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || '更新失敗')
      }

      // 更新 session 中的信箱
      await update()
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
            <h1 className="text-2xl font-bold text-white">📧 修改信箱</h1>
            <p className="text-white/60 mt-2">
              請輸入新的信箱地址和當前密碼
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  目前信箱
                </label>
                <div className="text-white/60">
                  {session?.user?.email}
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                  新信箱地址
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="請輸入新的信箱地址"
                />
              </div>

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
                  '更新信箱'
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 
'use client'

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError("")
    
    const res = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    })

    if (res?.ok) {
      router.push("/") // 登入成功後導向首頁
    } else {
      setError("登入失敗，請確認帳號和密碼。")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center p-4">
      <div className="relative bg-white/10 backdrop-blur-lg border border-white/20 ring-1 ring-white/10 rounded-3xl shadow-xl p-8 w-full max-w-md">
        <h2 className="text-white text-2xl font-bold mb-6 text-center">登入系統</h2>
        
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 text-red-100 border border-red-400/30 text-center">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Email 或姓名"
            className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-3 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <input
            type="password"
            placeholder="密碼"
            className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-3 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        
        <button
          onClick={handleLogin}
          disabled={loading || !identifier || !password}
          className="w-full mt-6 px-4 py-3 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white font-semibold shadow-md hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {loading ? "登入中..." : "登入"}
        </button>
        


        <div className="absolute inset-0 rounded-3xl pointer-events-none ring-1 ring-white/10 border border-white/10" />
      </div>
    </div>
  )
}

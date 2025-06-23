'use client'

import { useState } from "react"

export default function RegisterPage() {
  const [form, setForm] = useState({ email: "", password: "", name: "" })
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    setLoading(true)
    setMessage("")
    
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const result = await res.json()
      if (res.ok) {
        setMessage("✅ 使用者建立成功")
        setForm({ email: "", password: "", name: "" }) // 清空表單
      } else {
        setMessage(`❌ 發生錯誤：${result.error || "未知錯誤"}`)
      }
    } catch (error) {
      setMessage("❌ 網路錯誤，請稍後再試")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center p-4">
      <div className="relative bg-white/10 backdrop-blur-lg border border-white/20 ring-1 ring-white/10 rounded-3xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-white text-2xl font-bold mb-6 text-center">建立使用者帳號</h1>
        
        <div className="space-y-4">
          <input 
            name="email" 
            type="email"
            placeholder="Email" 
            value={form.email}
            onChange={handleChange} 
            className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-3 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30" 
          />
          <input 
            name="password" 
            placeholder="密碼" 
            type="password" 
            value={form.password}
            onChange={handleChange} 
            className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-3 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30" 
          />
          <input 
            name="name" 
            placeholder="姓名（選填）" 
            value={form.name}
            onChange={handleChange} 
            className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-3 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30" 
          />
        </div>

        <button 
          onClick={handleSubmit} 
          disabled={loading || !form.email || !form.password}
          className="w-full mt-6 px-4 py-3 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white font-semibold shadow-md hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {loading ? "建立中..." : "建立帳號"}
        </button>

        {message && (
          <div className={`mt-4 p-3 rounded-xl text-center font-medium ${
            message.includes("✅") 
              ? "bg-green-500/20 text-green-100 border border-green-400/30" 
              : "bg-red-500/20 text-red-100 border border-red-400/30"
          }`}>
            {message}
          </div>
        )}

        <div className="mt-4 text-center">
          <a href="/login" className="text-white/70 hover:text-white transition text-sm">
            已經有帳號？點此登入
          </a>
        </div>

        <div className="absolute inset-0 rounded-3xl pointer-events-none ring-1 ring-white/10 border border-white/10" />
      </div>
    </div>
  )
} 
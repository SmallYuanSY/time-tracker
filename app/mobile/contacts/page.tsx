'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus, Search, Users, Mail, Phone, Building, User } from 'lucide-react'

interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  position?: string
  department?: string
  notes?: string
  createdAt: string
}

export default function MobileContactsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  // 身份驗證檢查
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // 載入聯絡人列表
  useEffect(() => {
    if (status === 'authenticated') {
      loadContacts()
    }
  }, [status])

  const loadContacts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/contacts')
      if (response.ok) {
        const data = await response.json()
        setContacts(data)
      }
    } catch (error) {
      console.error('載入聯絡人失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  // 過濾聯絡人
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.position?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 按公司分組
  const groupedContacts = filteredContacts.reduce((groups, contact) => {
    const company = contact.company || '未分類'
    if (!groups[company]) {
      groups[company] = []
    }
    groups[company].push(contact)
    return groups
  }, {} as Record<string, Contact[]>)

  if (status === 'loading' || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-600 via-purple-600 to-indigo-600 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white mx-auto mb-4"></div>
            <div>載入中...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-600 via-purple-600 to-indigo-600">
      {/* 頂部導航欄 */}
      <header className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-white font-semibold text-lg">聯絡人</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              onClick={() => router.push('/contacts')}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* 主要內容 */}
      <main className="p-4 space-y-4">
        {/* 搜尋框 */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4" />
            <input
              type="text"
              placeholder="搜尋聯絡人..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
        </Card>

        {/* 聯絡人統計 */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
          <div className="flex items-center gap-2 mb-3 text-white">
            <Users className="w-5 h-5" />
            <h3 className="font-semibold">聯絡人統計</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {contacts.length}
              </div>
              <div className="text-sm text-white/70">總聯絡人</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {Object.keys(groupedContacts).length}
              </div>
              <div className="text-sm text-white/70">公司數量</div>
            </div>
          </div>
        </Card>

        {/* 聯絡人列表 */}
        <div className="space-y-4">
          {loading ? (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
              <div className="text-center text-white/60">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white mx-auto mb-2"></div>
                <p>載入聯絡人中...</p>
              </div>
            </Card>
          ) : filteredContacts.length === 0 ? (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
              <div className="text-center text-white/60">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{searchTerm ? '找不到符合的聯絡人' : '尚無聯絡人'}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 bg-white/10 text-white border-white/20 hover:bg-white/20"
                  onClick={() => router.push('/contacts')}
                >
                  新增聯絡人
                </Button>
              </div>
            </Card>
          ) : (
            Object.entries(groupedContacts).map(([company, companyContacts]) => (
              <div key={company} className="space-y-2">
                {/* 公司標題 */}
                <div className="flex items-center gap-2 px-2">
                  <Building className="w-4 h-4 text-white/60" />
                  <h3 className="text-white font-medium">{company}</h3>
                  <span className="text-white/60 text-sm">({companyContacts.length})</span>
                </div>

                {/* 該公司的聯絡人 */}
                {companyContacts.map((contact) => (
                  <Card
                    key={contact.id}
                    className="bg-white/10 backdrop-blur-lg border-white/20 p-4 touch-manipulation active:scale-95 transition-transform cursor-pointer"
                    onClick={() => {
                      // 可以在這裡添加聯絡人詳情頁面的導航
                      console.log('查看聯絡人:', contact)
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white text-lg truncate">
                            {contact.name}
                          </h3>
                        </div>
                        
                        {contact.position && (
                          <p className="text-white/70 text-sm mb-1">
                            {contact.position}
                            {contact.department && ` • ${contact.department}`}
                          </p>
                        )}
                        
                        <div className="space-y-1">
                          {contact.email && (
                            <div className="flex items-center gap-2 text-sm text-white/60">
                              <Mail className="w-3 h-3" />
                              <span className="truncate">{contact.email}</span>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-2 text-sm text-white/60">
                              <Phone className="w-3 h-3" />
                              <span>{contact.phone}</span>
                            </div>
                          )}
                        </div>
                        
                        {contact.notes && (
                          <div className="mt-2 text-sm text-white/50 line-clamp-2">
                            {contact.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ))
          )}
        </div>

        {/* 新增聯絡人按鈕 */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
          <Button
            onClick={() => router.push('/contacts')}
            className="w-full h-12 bg-white text-purple-600 hover:bg-white/90 font-semibold text-lg touch-manipulation"
          >
            <Plus className="w-5 h-5 mr-2" />
            新增聯絡人
          </Button>
        </Card>
      </main>
    </div>
  )
} 
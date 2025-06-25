"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import ContactModal from '@/components/ui/ContactModal'
import { Search } from 'lucide-react'

interface Contact {
  id: string
  companyName: string
  address: string
  phone: string
  contactName: string
  notes?: string
  projects?: {
    id: string
    code: string
    name: string
  }[]
  createdAt: string
  updatedAt: string
}

export default function ContactsPage() {
  const { data: session } = useSession()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [showContactModal, setShowContactModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (session?.user) {
      loadContacts()
    }
  }, [session])

  useEffect(() => {
    // 搜尋邏輯
    if (!searchTerm.trim()) {
      setFilteredContacts(contacts)
    } else {
      const term = searchTerm.toLowerCase()
      const filtered = contacts.filter(contact =>
        contact.companyName.toLowerCase().includes(term) ||
        contact.contactName.toLowerCase().includes(term) ||
        contact.phone.includes(term) ||
        contact.address.toLowerCase().includes(term) ||
        (contact.notes && contact.notes.toLowerCase().includes(term))
      )
      setFilteredContacts(filtered)
    }
  }, [searchTerm, contacts])

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

  const handleSaveContact = async (contactData: { companyName: string; address: string; phone: string; contactName: string; notes: string }) => {
    try {
      const url = editingContact ? `/api/contacts/${editingContact.id}` : '/api/contacts'
      const method = editingContact ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData),
      })

      if (response.ok) {
        await loadContacts()
        setShowContactModal(false)
        setEditingContact(null)
      } else {
        throw new Error('儲存失敗')
      }
    } catch (error) {
      console.error('儲存聯絡人失敗:', error)
      alert('儲存失敗，請稍後再試')
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('確定要刪除此聯絡人嗎？')) return

    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadContacts()
      } else {
        const errorText = await response.text()
        throw new Error(errorText)
      }
    } catch (error) {
      console.error('刪除聯絡人失敗:', error)
      alert(error instanceof Error ? error.message : '刪除失敗，請稍後再試')
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

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* 頁面標題和操作列 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">聯絡人管理</h1>
            <p className="text-white/60 text-sm mt-1">
              管理所有客戶聯絡資訊，共 {contacts.length} 個聯絡人
            </p>
          </div>
          <button
            onClick={() => {
              setEditingContact(null)
              setShowContactModal(true)
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition flex items-center gap-2"
          >
            ➕ 新增聯絡人
          </button>
        </div>

        {/* 搜尋列 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            placeholder="搜尋公司名稱、聯絡人、電話、地址或備註..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/60 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
          />
        </div>

        {/* 統計資訊 */}
        {searchTerm && (
          <div className="text-white/60 text-sm">
            找到 {filteredContacts.length} 個符合「{searchTerm}」的聯絡人
          </div>
        )}

        {/* 聯絡人列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-white/60">
                {searchTerm ? '沒有找到符合條件的聯絡人' : '尚未有聯絡人資料'}
              </div>
              {!searchTerm && (
                <button
                  onClick={() => {
                    setEditingContact(null)
                    setShowContactModal(true)
                  }}
                  className="mt-4 text-blue-400 hover:text-blue-300 underline"
                >
                  立即新增第一個聯絡人
                </button>
              )}
            </div>
          ) : (
            filteredContacts.map(contact => (
              <div key={contact.id} className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-1">{contact.companyName}</h3>
                    <div className="text-white/70 text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span>👤</span>
                        <span>{contact.contactName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>📞</span>
                        <span>{contact.phone}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span>📍</span>
                        <span className="flex-1">{contact.address}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => {
                        setEditingContact(contact)
                        setShowContactModal(true)
                      }}
                      className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition"
                      title="編輯"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="p-2 text-white/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title="刪除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* 備註 */}
                {contact.notes && (
                  <div className="mb-4">
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <div className="text-white/50 text-xs mb-1">備註：</div>
                      <div className="text-white/80 text-sm">{contact.notes}</div>
                    </div>
                  </div>
                )}

                {/* 關聯專案 */}
                {contact.projects && contact.projects.length > 0 && (
                  <div className="border-t border-white/10 pt-3">
                    <div className="text-white/50 text-xs mb-2">關聯專案：</div>
                    <div className="flex flex-wrap gap-1">
                      {contact.projects.map(project => (
                        <span key={project.id} className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">
                          {project.code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 建立時間 */}
                <div className="border-t border-white/10 pt-3 mt-3">
                  <div className="text-white/40 text-xs">
                    建立於 {new Date(contact.createdAt).toLocaleDateString('zh-TW')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ContactModal
        open={showContactModal}
        onClose={() => {
          setShowContactModal(false)
          setEditingContact(null)
        }}
        onSave={handleSaveContact}
        editData={editingContact}
      />
    </DashboardLayout>
  )
} 
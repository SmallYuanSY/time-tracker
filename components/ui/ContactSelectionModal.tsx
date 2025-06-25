"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Search, Plus } from 'lucide-react'

interface Contact {
  id: string
  companyName: string
  address: string
  phone: string
  contactName: string
  notes?: string
}

interface ContactSelectionModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (contactIds: string[]) => void
  selectedContactIds?: string[]
  projectCode?: string
  projectName?: string
}

export default function ContactSelectionModal({ 
  open, 
  onClose, 
  onConfirm, 
  selectedContactIds = [],
  projectCode,
  projectName
}: ContactSelectionModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedContactIds)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadContacts()
      setSelectedIds(selectedContactIds)
    }
  }, [open, selectedContactIds])

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

  const handleContactToggle = (contactId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId)
      } else {
        return [...prev, contactId]
      }
    })
  }

  const handleConfirm = () => {
    onConfirm(selectedIds)
  }

  const handleSelectAll = () => {
    setSelectedIds(filteredContacts.map(contact => contact.id))
  }

  const handleClearAll = () => {
    setSelectedIds([])
  }

  const selectedContacts = contacts.filter(contact => selectedIds.includes(contact.id))

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            👥 選擇聯絡人
            {projectCode && (
              <span className="text-sm text-white/70">
                - {projectCode} {projectName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* 搜尋列 */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="搜尋公司名稱、聯絡人、電話、地址..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/60 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
          />
        </div>

        {/* 批量操作 */}
        <div className="flex items-center justify-between mb-4 text-sm">
          <div className="text-white/70">
            已選擇 {selectedIds.length} 個聯絡人
            {filteredContacts.length > 0 && ` / 共 ${filteredContacts.length} 個`}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              disabled={filteredContacts.length === 0}
              className="px-3 py-1 text-xs bg-blue-600/20 text-blue-300 rounded hover:bg-blue-600/30 transition disabled:opacity-50"
            >
              全選
            </button>
            <button
              onClick={handleClearAll}
              disabled={selectedIds.length === 0}
              className="px-3 py-1 text-xs bg-red-600/20 text-red-300 rounded hover:bg-red-600/30 transition disabled:opacity-50"
            >
              清除
            </button>
          </div>
        </div>

        {/* 已選擇的聯絡人 */}
        {selectedIds.length > 0 && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-400/20 rounded-lg">
            <div className="text-sm text-blue-300 mb-2">已選擇的聯絡人：</div>
            <div className="flex flex-wrap gap-2">
              {selectedContacts.map(contact => (
                <span
                  key={contact.id}
                  className="inline-flex items-center gap-1 bg-blue-600/20 text-blue-200 px-2 py-1 rounded text-xs"
                >
                  {contact.companyName} - {contact.contactName}
                  <button
                    onClick={() => handleContactToggle(contact.id)}
                    className="ml-1 text-blue-300 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 聯絡人列表 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-white/60">載入中...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-white/60">
              {searchTerm ? '沒有找到符合條件的聯絡人' : '尚未有聯絡人資料'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContacts.map(contact => {
                const isSelected = selectedIds.includes(contact.id)
                return (
                  <div
                    key={contact.id}
                    onClick={() => handleContactToggle(contact.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-500/20 border-blue-400/50 text-blue-100'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-4 h-4 rounded border-2 mt-0.5 transition-colors ${
                        isSelected
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-white/30'
                      }`}>
                        {isSelected && (
                          <div className="w-full h-full flex items-center justify-center text-white text-xs">
                            ✓
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium mb-1">{contact.companyName}</div>
                        <div className="text-sm opacity-80 space-y-0.5">
                          <div>👤 {contact.contactName}</div>
                          <div>📞 {contact.phone}</div>
                          <div>📍 {contact.address}</div>
                          {contact.notes && (
                            <div className="text-xs opacity-70">💬 {contact.notes}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl bg-white/10 text-white border border-white/30 hover:bg-white/20 transition"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
          >
            確認選擇 ({selectedIds.length})
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 
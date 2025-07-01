"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface Contact {
  id: string
  companyName: string
  address: string
  phone: string
  contactName: string
  type: 'CONTACT' | 'SUPPLIER' | 'CUSTOMER' | 'BUILDER'
  notes?: string
}

interface ContactFormData {
  companyName: string
  address: string
  phone: string
  contactName: string
  type: 'CONTACT' | 'SUPPLIER' | 'CUSTOMER' | 'BUILDER'
  notes: string
}

interface ContactModalProps {
  open: boolean
  onClose: () => void
  onSave: (contact: ContactFormData) => void
  editData?: Contact | null
}

export default function ContactModal({ open, onClose, onSave, editData }: ContactModalProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    companyName: '',
    address: '',
    phone: '',
    contactName: '',
    type: 'CONTACT',
    notes: '',
  })
  const [errors, setErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (editData) {
      setFormData({
        companyName: editData.companyName,
        address: editData.address,
        phone: editData.phone,
        contactName: editData.contactName,
        type: editData.type,
        notes: editData.notes || '',
      })
    } else {
      setFormData({
        companyName: '',
        address: '',
        phone: '',
        contactName: '',
        type: 'CONTACT',
        notes: '',
      })
    }
    setErrors([])
  }, [editData, open])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const validateForm = () => {
    const newErrors: string[] = []

    if (!formData.companyName.trim()) newErrors.push('公司名稱為必填欄位')
    if (!formData.address.trim()) newErrors.push('地址為必填欄位')
    if (!formData.phone.trim()) newErrors.push('聯絡電話為必填欄位')
    if (!formData.contactName.trim()) newErrors.push('聯絡人為必填欄位')

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      onSave(formData)
    } catch (error) {
      console.error('儲存聯絡人失敗:', error)
      setErrors(['儲存失敗，請稍後再試'])
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="w-full max-w-md text-white" 
        style={{ backgroundColor: '#0f172a', color: 'white' }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            📝 {editData ? '編輯聯絡人' : '新增聯絡人'}
          </DialogTitle>
          <DialogDescription>
            {editData ? '修改聯絡人的基本資訊' : '填寫新聯絡人的基本資訊'}
          </DialogDescription>
        </DialogHeader>

        {errors.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 text-red-100 border border-red-400/30">
            <ul className="text-sm space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-4 bg-transparent">
          <div>
            <label className="text-sm text-white/80 font-medium block mb-2">
              公司名稱 *
            </label>
            <input
              name="companyName"
              placeholder="請輸入公司名稱"
              value={formData.companyName}
              onChange={handleChange}
              className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-3 text-white placeholder:text-white/60 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
            />
          </div>

          <div>
            <label className="text-sm text-white/80 font-medium block mb-2">
              地址 *
            </label>
            <textarea
              name="address"
              placeholder="請輸入完整地址"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-3 text-white placeholder:text-white/60 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 resize-none"
            />
          </div>

          <div>
            <label className="text-sm text-white/80 font-medium block mb-2">
              聯絡人類型 *
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-3 text-white focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
            >
              <option value="CONTACT">一般聯絡人</option>
              <option value="SUPPLIER">供應商</option>
              <option value="CUSTOMER">客戶</option>
              <option value="BUILDER">建商</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-white/80 font-medium block mb-2">
              聯絡電話 *
            </label>
            <input
              name="phone"
              placeholder="請輸入聯絡電話"
              value={formData.phone}
              onChange={handleChange}
              className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-3 text-white placeholder:text-white/60 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
            />
          </div>

          <div>
            <label className="text-sm text-white/80 font-medium block mb-2">
              聯絡人 *
            </label>
            <input
              name="contactName"
              placeholder="請輸入聯絡人姓名"
              value={formData.contactName}
              onChange={handleChange}
              className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-3 text-white placeholder:text-white/60 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
            />
          </div>

          <div>
            <label className="text-sm text-white/80 font-medium block mb-2">
              備註
            </label>
            <textarea
              name="notes"
              placeholder="請輸入備註資訊"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-3 text-white placeholder:text-white/60 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm rounded-xl bg-white/10 text-white border border-white/30 hover:bg-white/20 transition disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '儲存中...' : '確認儲存'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 
"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import ContactModal from '@/components/ui/ContactModal'
import ContactSelectionModal from '@/components/ui/ContactSelectionModal'

interface Contact {
  id: string
  companyName: string
  address: string
  phone: string
  contactName: string
  projects?: {
    id: string
    code: string
    name: string
  }[]
}

interface Project {
  projectCode: string
  projectName: string
  category: string
  contact?: Contact
  lastUsedTime?: string | null
  lastUsedBy?: {
    name: string | null
    email: string
  } | null
  totalWorkLogs?: number
}

export default function ProjectsPage() {
  const { data: session } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [showContactModal, setShowContactModal] = useState(false)
  const [showContactSelectionModal, setShowContactSelectionModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [migrating, setMigrating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [sortBy, setSortBy] = useState<'code' | 'lastUsed'>('code')

  // 防抖搜尋
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (session?.user) {
      loadProjects()
    }
  }, [session, searchTerm, sortBy])

  const loadProjects = async () => {
    try {
      setLoading(true)
      
      // 載入所有已使用的案件
      const params = new URLSearchParams({
        includeContacts: 'true',
        sortBy,
        ...(searchTerm && { search: searchTerm })
      })
      
      const projectsResponse = await fetch(`/api/projects?${params}`)
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json()
        setProjects(projectsData)
      }
    } catch (error) {
      console.error('載入資料失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatLastUsedTime = (lastUsedTime: string | null) => {
    if (!lastUsedTime) return '未使用'
    
    const date = new Date(lastUsedTime)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return diffInMinutes <= 1 ? '剛剛' : `${diffInMinutes} 分鐘前`
    } else if (diffInHours < 24) {
      return `${diffInHours} 小時前`
    } else if (diffInDays === 0) {
      return '今天'
    } else if (diffInDays === 1) {
      return '昨天'
    } else if (diffInDays <= 7) {
      return `${diffInDays} 天前`
    } else if (diffInDays <= 30) {
      const weeks = Math.floor(diffInDays / 7)
      return `${weeks} 週前`
    } else if (diffInDays <= 365) {
      const months = Math.floor(diffInDays / 30)
      return `${months} 個月前`
    } else {
      return date.toLocaleDateString('zh-TW')
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
        await loadProjects()
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

  const handleAssignContacts = async (contactIds: string[]) => {
    if (!selectedProject) return

    try {
      const response = await fetch(`/api/projects/${selectedProject.projectCode}/assign-contact`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds }),
      })

      if (response.ok) {
        await loadProjects()
        setShowContactSelectionModal(false)
        setSelectedProject(null)
      } else {
        throw new Error('指派失敗')
      }
    } catch (error) {
      console.error('指派聯絡人失敗:', error)
      alert('指派失敗，請稍後再試')
    }
  }

  const openContactSelection = (project: Project) => {
    setSelectedProject(project)
    setShowContactSelectionModal(true)
  }

  const handleMigration = async () => {
    if (!confirm('確定要執行資料遷移嗎？這會將現有的工作記錄轉換為案件管理記錄。')) {
      return
    }

    try {
      setMigrating(true)
      const response = await fetch('/api/projects/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await response.json()

      if (response.ok && result.success) {
        alert(result.message)
        await loadProjects() // 重新載入案件列表
      } else {
        throw new Error(result.error || '遷移失敗')
      }
    } catch (error) {
      console.error('遷移失敗:', error)
      alert(`遷移失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    } finally {
      setMigrating(false)
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
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">案件管理</h1>
            <p className="text-white/60 text-sm mt-1">
              管理所有案件的聯絡人資訊，共 {projects.length} 個案件
              {searchTerm && (
                <span className="ml-2 text-blue-300">
                  （搜尋「{searchTerm}」的結果）
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleMigration}
              disabled={migrating}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition flex items-center gap-2"
            >
              {migrating ? '⏳ 遷移中...' : '🔄 遷移工作記錄'}
            </button>
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
        </div>

        {/* 案件列表 */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">已使用案件</h2>
            
            {/* 查詢和排序控制 */}
            <div className="flex items-center gap-4">
              {/* 查詢欄位 */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜尋案件編號、名稱或分類..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-64 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50">
                  🔍
                </div>
              </div>
              
              {/* 排序選項 */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'code' | 'lastUsed')}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
              >
                <option value="code" className="bg-gray-800">依編號排序</option>
                <option value="lastUsed" className="bg-gray-800">依使用時間排序</option>
              </select>
            </div>
          </div>
          
          {projects.length === 0 ? (
            <div className="text-white/60 text-center py-12">
              <div className="text-lg mb-2">{searchTerm ? '🔍' : '🗂️'}</div>
              <div>
                {searchTerm ? '找不到符合條件的案件' : '尚未有案件記錄'}
              </div>
              <div className="text-sm mt-2">
                {searchTerm ? '請嘗試其他搜尋關鍵字' : '開始工作記錄後，案件會自動出現在這裡'}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project, index) => (
                <div key={index} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-200">

                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-sm font-medium">
                            {project.projectCode}
                          </span>
                        </div>
                        <div className="text-white font-medium mb-1">{project.projectName}</div>
                        <div className="text-white/70 text-sm mb-2">{project.category}</div>
                        
                        {/* 最後使用時間和統計資訊 */}
                        <div className="space-y-1 mb-3">
                          <div className="flex items-center gap-1 text-white/60 text-xs">
                            <span>⏱️</span>
                            <span>最後使用：{formatLastUsedTime(project.lastUsedTime || null)}</span>
                          </div>
                          {project.lastUsedBy && (
                            <div className="flex items-center gap-1 text-white/50 text-xs">
                              <span>👤</span>
                              <span>使用者：{project.lastUsedBy.name || project.lastUsedBy.email}</span>
                            </div>
                          )}
                          {project.totalWorkLogs && (
                            <div className="flex items-center gap-1 text-white/50 text-xs">
                              <span>📊</span>
                              <span>總工作記錄：{project.totalWorkLogs} 筆</span>
                            </div>
                          )}
                        </div>
                        
                        {project.contact && (
                          <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-3">
                            <div className="text-green-200 text-sm">
                              <div className="font-medium flex items-center gap-1">
                                🏢 {project.contact.companyName}
                              </div>
                              <div className="text-xs mt-1 flex items-center gap-1">
                                👤 {project.contact.contactName}
                              </div>
                              <div className="text-xs mt-1 flex items-center gap-1">
                                📞 {project.contact.phone}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => openContactSelection(project)}
                        className="flex-1 px-3 py-2 bg-blue-600/20 text-blue-300 rounded-lg hover:bg-blue-600/30 transition text-sm font-medium"
                      >
                        {project.contact ? '📝 更換聯絡人' : '👥 指派聯絡人'}
                      </button>
                      {project.contact && (
                        <button
                          onClick={() => openContactSelection(project)}
                          className="px-3 py-2 bg-purple-600/20 text-purple-300 rounded-lg hover:bg-purple-600/30 transition text-sm"
                          title="管理聯絡人"
                        >
                          ⚙️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* 聯絡人新增/編輯彈窗 */}
      <ContactModal
        open={showContactModal}
        onClose={() => {
          setShowContactModal(false)
          setEditingContact(null)
        }}
        onSave={handleSaveContact}
        editData={editingContact}
      />

      {/* 聯絡人選擇彈窗 */}
      <ContactSelectionModal
        open={showContactSelectionModal}
        onClose={() => {
          setShowContactSelectionModal(false)
          setSelectedProject(null)
        }}
        onConfirm={handleAssignContacts}
        selectedContactIds={selectedProject?.contact ? [selectedProject.contact.id] : []}
        projectCode={selectedProject?.projectCode}
        projectName={selectedProject?.projectName}
      />
    </DashboardLayout>
  )
} 
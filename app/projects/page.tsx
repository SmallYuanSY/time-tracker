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

  useEffect(() => {
    if (session?.user) {
      loadProjects()
    }
  }, [session])

  const loadProjects = async () => {
    try {
      setLoading(true)
      
      // 載入所有已使用的案件
      const projectsResponse = await fetch('/api/projects?includeContacts=true')
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
          <h2 className="text-lg font-semibold text-white mb-4">已使用案件</h2>
          
          {projects.length === 0 ? (
            <div className="text-white/60 text-center py-12">
              <div className="text-lg mb-2">🗂️</div>
              <div>尚未有案件記錄</div>
              <div className="text-sm mt-2">開始工作記錄後，案件會自動出現在這裡</div>
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
                      <div className="text-white/70 text-sm mb-3">{project.category}</div>
                      
                      {project.contact ? (
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
                      ) : (
                        <div className="bg-amber-500/20 border border-amber-400/30 rounded-lg p-3">
                          <div className="text-amber-200 text-sm flex items-center gap-1">
                            ⚠️ 尚未指派聯絡人
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
'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Project, Contact } from '@/types/project'
import { UserPlus, Building2, User, Mail, Phone, Edit, Trash2, Save, X } from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import ContactModal from '@/components/ui/ContactModal'
import ContactSelectionModal from '@/components/ui/ContactSelectionModal'
import { Contact as PrismaContact, ContactType } from '@prisma/client'

interface User {
  id: string
  name: string | null
  email: string
  role?: string
}

export default function ProjectMembersPage() {
  const params = useParams() as { code: string }
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [isEditingManager, setIsEditingManager] = useState(false)
  const [selectedManagerId, setSelectedManagerId] = useState<string>('')
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showContactSelectionModal, setShowContactSelectionModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 獲取專案資料
        const projectResponse = await fetch(`/api/projects/${params.code}`)
        if (projectResponse.ok) {
          const projectData = await projectResponse.json()
          setProject(projectData)
          setSelectedManagerId(projectData.manager?.id || '')
        }

        // 獲取所有使用者列表
        const usersResponse = await fetch('/api/users')
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          setAllUsers(usersData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.code])

  const handleUpdateManager = async () => {
    if (!selectedManagerId || !project) return

    try {
      const response = await fetch(`/api/projects/${params.code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId: selectedManagerId })
      })

      if (response.ok) {
        // 更新本地狀態
        const updatedManager = allUsers.find(user => user.id === selectedManagerId)
        if (updatedManager) {
          setProject(prev => prev ? { ...prev, manager: updatedManager } : null)
        }
        setIsEditingManager(false)
      } else {
        alert('更新管理者失敗')
      }
    } catch (error) {
      console.error('Error updating manager:', error)
      alert('更新管理者失敗')
    }
  }

  const handleAddMember = async (userId: string) => {
    if (!project) return

    try {
      const response = await fetch(`/api/projects/${params.code}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        // 更新本地狀態
        const newMember = allUsers.find(user => user.id === userId)
        if (newMember) {
          setProject(prev => prev ? {
            ...prev,
            users: [...(prev.users || []), newMember]
          } : null)
        }
        setIsAddMemberModalOpen(false)
      } else {
        alert('新增成員失敗')
      }
    } catch (error) {
      console.error('Error adding member:', error)
      alert('新增成員失敗')
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!project || !confirm('確定要移除此成員嗎？')) return

    try {
      const response = await fetch(`/api/projects/${params.code}/members/${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // 更新本地狀態
        setProject(prev => prev ? {
          ...prev,
          users: prev.users?.filter(user => user.id !== userId) || []
        } : null)
      } else {
        alert('移除成員失敗')
      }
    } catch (error) {
      console.error('Error removing member:', error)
      alert('移除成員失敗')
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
        // 重新載入專案資料以更新聯絡人資訊
        const projectResponse = await fetch(`/api/projects/${params.code}`)
        if (projectResponse.ok) {
          const projectData = await projectResponse.json()
          setProject(projectData)
        }
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
    try {
      const response = await fetch(`/api/projects/${params.code}/assign-contact`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds }),
      })

      if (response.ok) {
        // 重新載入專案資料以更新聯絡人資訊
        const projectResponse = await fetch(`/api/projects/${params.code}`)
        if (projectResponse.ok) {
          const projectData = await projectResponse.json()
          setProject(projectData)
        }
        setShowContactSelectionModal(false)
      } else {
        throw new Error('指派失敗')
      }
    } catch (error) {
      console.error('指派聯絡人失敗:', error)
      alert('指派失敗，請稍後再試')
    }
  }

  // 獲取可以添加的成員（排除已經是成員和管理者的使用者）
  const getAvailableUsers = () => {
    if (!project || !allUsers) return []
    
    const existingUserIds = new Set([
      project.manager?.id,
      ...(project.users?.map(user => user.id) || [])
    ].filter(Boolean))
    
    return allUsers.filter(user => !existingUserIds.has(user.id))
  }

  if (loading) {
    return <div>載入中...</div>
  }

  if (!project) {
    return <div>找不到專案資料</div>
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">專案成員與聯絡人</h1>
        <p className="text-muted-foreground mt-1">管理專案的內部成員與外部聯絡人</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左邊：公司內部使用者 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="w-5 h-5" />
              內部成員
            </h2>
            <Dialog open={isAddMemberModalOpen} onOpenChange={setIsAddMemberModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  新增成員
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新增專案成員</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">選擇要加入此專案的成員：</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {getAvailableUsers().map(user => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleAddMember(user.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{user.name || '未設定名稱'}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          加入
                        </Button>
                      </div>
                    ))}
                    {getAvailableUsers().length === 0 && (
                      <p className="text-center py-4 text-muted-foreground">沒有可新增的成員</p>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* 專案管理者 */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm text-muted-foreground">專案管理者</h3>
              <div className="flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">管理者</span>
                {!isEditingManager ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => setIsEditingManager(true)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-green-600"
                      onClick={handleUpdateManager}
                    >
                      <Save className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-red-600"
                      onClick={() => {
                        setIsEditingManager(false)
                        setSelectedManagerId(project.manager?.id || '')
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {isEditingManager ? (
              <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇專案管理者" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center space-x-2">
                        <span>{user.name || '未設定名稱'}</span>
                        <span className="text-muted-foreground text-sm">({user.email})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{project.manager?.name || '未設定名稱'}</p>
                  <p className="text-sm text-muted-foreground">{project.manager?.email}</p>
                </div>
              </div>
            )}
          </Card>

          {/* 專案成員列表 */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm text-muted-foreground">專案成員</h3>
              <span className="text-xs text-muted-foreground">
                {project.users?.length || 0} 位成員
              </span>
            </div>
            <div className="space-y-3">
              {project.users && project.users.length > 0 ? (
                project.users.map((user) => (
                  <div key={user.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{user.name || '未設定名稱'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-red-600"
                      onClick={() => handleRemoveMember(user.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <User className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm">尚未指派專案成員</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 右邊：案件聯絡人 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              案件聯絡人
            </h2>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-2"
              onClick={() => setShowContactSelectionModal(true)}
            >
              <UserPlus className="w-4 h-4" />
              選擇聯絡人
            </Button>
          </div>

          {/* 聯絡人資訊 */}
          <Card className="p-4">
            {project?.Contact ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{project.Contact.companyName}</h3>
                    <p className="text-sm text-muted-foreground">主要聯絡公司</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      if (project.Contact) {
                        const contact: Contact = {
                          id: project.Contact.id,
                          companyName: project.Contact.companyName,
                          address: project.Contact.address,
                          phone: project.Contact.phone,
                          contactName: project.Contact.contactName,
                          type: project.Contact.type,
                          notes: project.Contact.notes || undefined,
                          createdAt: project.Contact.createdAt,
                          updatedAt: project.Contact.updatedAt
                        }
                        setEditingContact(contact)
                        setShowContactModal(true)
                      }
                    }}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{project.Contact.contactName}</p>
                      <p className="text-xs text-muted-foreground">聯絡人</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{project.Contact.phone}</p>
                      <p className="text-xs text-muted-foreground">聯絡電話</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{project.Contact.address}</p>
                      <p className="text-xs text-muted-foreground">地址</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-medium mb-1">尚未設定聯絡人</p>
                <p className="text-sm">為此專案添加聯絡人資訊</p>
                <Button 
                  className="mt-3" 
                  size="sm"
                  onClick={() => setShowContactSelectionModal(true)}
                >
                  選擇聯絡人
                </Button>
              </div>
            )}
          </Card>

          {/* 額外聯絡人列表（預留空間） */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm text-muted-foreground">其他聯絡人</h3>
              <Button size="sm" variant="ghost" className="text-xs h-6 px-2">
                管理
              </Button>
            </div>
            <div className="text-center py-4 text-muted-foreground">
              <Mail className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm">尚無其他聯絡人</p>
            </div>
          </Card>
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
        onClose={() => setShowContactSelectionModal(false)}
        onConfirm={handleAssignContacts}
        selectedContactIds={project?.Contact ? [project.Contact.id] : []}
        projectCode={project?.code}
        projectName={project?.name}
      />
    </>
  )
} 
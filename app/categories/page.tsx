"use client"

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, Edit, Trash2, Settings, Shield, Eye, EyeOff, X, Building2, Tags } from 'lucide-react'
import DashboardLayout from '@/components/layouts/DashboardLayout'

interface WorkCategory {
  id: string
  categoryId: string
  title: string
  content: string
  icon?: string
  description?: string
  colorBg: string
  colorText: string
  colorBorder: string
  colorAccent: string
  isActive: boolean
  isSystem: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

interface ProjectType {
  id: string
  typeId: string
  name: string
  description: string | null
  color: string
  icon: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

type CategoryType = 'work' | 'project'

export default function CategoriesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentTab, setCurrentTab] = useState<CategoryType>('work')
  const [categories, setCategories] = useState<WorkCategory[]>([])
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<WorkCategory | null>(null)
  const [editingProjectType, setEditingProjectType] = useState<ProjectType | null>(null)
  const [formData, setFormData] = useState({
    categoryId: '',
    title: '',
    content: '',
    icon: '',
    description: '',
    colorBg: 'bg-blue-500/20',
    colorText: 'text-blue-200',
    colorBorder: 'border-blue-400/30',
    colorAccent: 'bg-blue-500',
    sortOrder: 0
  })
  const [projectTypeFormData, setProjectTypeFormData] = useState({
    typeId: '',
    name: '',
    description: '',
    color: '#3B82F6',
    icon: '📁',
    sortOrder: 0
  })

  // 檢查權限
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }

    // 檢查用戶角色
    const checkUserRole = async () => {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()
        
        if (!response.ok) {
          alert('權限檢查失敗')
          router.push('/')
          return
        }
        
        if (!data.user || (data.user.role !== 'ADMIN' && data.user.role !== 'WEB_ADMIN')) {
          alert('權限不足，只有管理員可以管理工作分類')
          router.push('/')
          return
        }
      } catch (error) {
        console.error('檢查權限失敗:', error)
        alert('檢查權限失敗')
        router.push('/')
      }
    }

    checkUserRole()
  }, [session, status, router])

  // 載入分類列表
  const loadCategories = async () => {
    try {
      const response = await fetch('/api/work-categories?includeInactive=true')
      const data = await response.json()
      
      if (response.ok) {
        setCategories(data.categories || [])
      } else {
        alert(data.error || '載入分類失敗')
      }
    } catch (error) {
      console.error('載入分類失敗:', error)
      alert('載入分類失敗')
    } finally {
      setLoading(false)
    }
  }

  // 載入案件類別列表
  const loadProjectTypes = async () => {
    try {
      const response = await fetch('/api/project-types')
      const data = await response.json()
      
      if (response.ok) {
        setProjectTypes(data.projectTypes || [])
      } else {
        alert(data.error || '載入案件類別失敗')
      }
    } catch (error) {
      console.error('載入案件類別失敗:', error)
      alert('載入案件類別失敗')
    }
  }

  useEffect(() => {
    if (session) {
      if (currentTab === 'work') {
        loadCategories()
      } else {
        loadProjectTypes()
      }
    }
  }, [session, currentTab])

  // 初始化預設分類
  const initializeCategories = async () => {
    try {
      const response = await fetch('/api/work-categories/init', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (response.ok) {
        alert(data.message)
        loadCategories()
      } else {
        alert(data.error || '初始化失敗')
      }
    } catch (error) {
      console.error('初始化失敗:', error)
      alert('初始化失敗')
    }
  }

  // 重置表單
  const resetForm = () => {
    setFormData({
      categoryId: '',
      title: '',
      content: '',
      icon: '',
      description: '',
      colorBg: 'bg-blue-500/20',
      colorText: 'text-blue-200',
      colorBorder: 'border-blue-400/30',
      colorAccent: 'bg-blue-500',
      sortOrder: 0
    })
    setEditingCategory(null)
  }

  // 開啟新增模態框
  const handleAdd = () => {
    resetForm()
    setShowModal(true)
  }

  // 開啟編輯模態框
  const handleEdit = (category: WorkCategory) => {
    setFormData({
      categoryId: category.categoryId,
      title: category.title,
      content: category.content,
      icon: category.icon || '',
      description: category.description || '',
      colorBg: category.colorBg,
      colorText: category.colorText,
      colorBorder: category.colorBorder,
      colorAccent: category.colorAccent,
      sortOrder: category.sortOrder
    })
    setEditingCategory(category)
    setShowModal(true)
  }

  // 儲存分類
  const handleSave = async () => {
    try {
      if (!formData.categoryId || !formData.title || !formData.content) {
        alert('請填寫必要欄位')
        return
      }

      const url = '/api/work-categories'
      const method = editingCategory ? 'PUT' : 'POST'
      const body = editingCategory 
        ? { ...formData, id: editingCategory.id }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (response.ok) {
        alert(editingCategory ? '分類更新成功' : '分類新增成功')
        setShowModal(false)
        resetForm()
        loadCategories()
      } else {
        alert(data.error || '操作失敗')
      }
    } catch (error) {
      console.error('儲存分類失敗:', error)
      alert('儲存分類失敗')
    }
  }

  // 刪除分類
  const handleDelete = async (category: WorkCategory) => {
    if (category.isSystem) {
      alert('無法刪除系統預設分類')
      return
    }

    if (!confirm('確定要刪除此分類嗎？如果此分類已被使用，將會設為不活躍狀態。')) {
      return
    }

    try {
      const response = await fetch(`/api/work-categories/${category.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message)
        loadCategories()
      } else {
        alert(data.error || '刪除失敗')
      }
    } catch (error) {
      console.error('刪除分類失敗:', error)
      alert('刪除分類失敗')
    }
  }

  // 切換活躍狀態
  const toggleActive = async (category: WorkCategory) => {
    try {
      const response = await fetch('/api/work-categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: category.id,
          isActive: !category.isActive
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert(`分類已${!category.isActive ? '啟用' : '停用'}`)
        loadCategories()
      } else {
        alert(data.error || '操作失敗')
      }
    } catch (error) {
      console.error('更新狀態失敗:', error)
      alert('更新狀態失敗')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-white text-lg">載入中...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* 標題 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="h-8 w-8 text-white" />
              <h1 className="text-3xl font-bold text-white">分類管理</h1>
              <Shield className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="flex gap-3">
              {currentTab === 'work' && (
                <Button 
                  onClick={initializeCategories}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {categories.length === 0 ? '初始化預設分類' : '重新載入預設分類'}
                </Button>
              )}
              <Button 
                onClick={handleAdd}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                {currentTab === 'work' ? '新增工作分類' : '新增案件類別'}
              </Button>
            </div>
          </div>

          {/* 標籤切換 */}
          <div className="mt-6 flex bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setCurrentTab('work')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                currentTab === 'work'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Tags className="h-4 w-4" />
              工作分類
            </button>
            <button
              onClick={() => setCurrentTab('project')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                currentTab === 'project'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Building2 className="h-4 w-4" />
              案件類別
            </button>
          </div>
          <p className="text-white/70 mt-2">
            {currentTab === 'work' 
              ? '管理系統工作分類，用於工作記錄的分類標記' 
              : '管理案件類別，用於專案的類別分類'
            }
          </p>
        </div>

        {/* 分類列表 */}
        {categories.length === 0 ? (
          <Card className="bg-white/10 backdrop-blur border-white/20 p-8 text-center">
            <div className="text-white/60 mb-4">
              <Settings className="h-16 w-16 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">尚未設定工作分類</h3>
              <p>點擊上方按鈕初始化預設分類或新增自訂分類</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {categories.map((category) => (
              <Card key={category.id} className="bg-white/10 backdrop-blur border-white/20 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* 分類圖示和顏色 */}
                    <div className={`w-12 h-12 rounded-xl ${category.colorBg} ${category.colorBorder} border flex items-center justify-center`}>
                      <span className="text-2xl">{category.icon || '📦'}</span>
                    </div>
                    
                    {/* 分類資訊 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className={`text-lg font-semibold ${category.colorText}`}>
                          {category.title}
                        </h3>
                        <span className="text-white/60 text-sm">({category.categoryId})</span>
                        {category.isSystem && (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-200 text-xs rounded-full">
                            系統預設
                          </span>
                        )}
                        {!category.isActive && (
                          <span className="px-2 py-1 bg-red-500/20 text-red-200 text-xs rounded-full">
                            已停用
                          </span>
                        )}
                      </div>
                      <p className="text-white/80 text-sm">{category.content}</p>
                      {category.description && (
                        <p className="text-white/60 text-xs mt-1">{category.description}</p>
                      )}
                    </div>
                    
                    {/* 排序 */}
                    <div className="text-white/40 text-sm">
                      順序: {category.sortOrder}
                    </div>
                  </div>

                  {/* 操作按鈕 */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(category)}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      {category.isActive ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-1" />
                          停用
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          啟用
                        </>
                      )}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(category)}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      編輯
                    </Button>
                    
                    {!category.isSystem && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(category)}
                        className="border-red-400/30 text-red-200 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        刪除
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* 新增/編輯模態框 */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-white/20 rounded-2xl text-white max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold">
                    {editingCategory ? '編輯工作分類' : '新增工作分類'}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowModal(false)}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {/* 基本資訊 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium block mb-2">分類 ID *</label>
                      <input
                        type="text"
                        value={formData.categoryId}
                        onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                        disabled={!!editingCategory}
                        className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/60 disabled:opacity-50"
                        placeholder="例: frontend"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-2">分類標題 *</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/60"
                        placeholder="例: 前端開發"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium block mb-2">分類內容 *</label>
                      <input
                        type="text"
                        value={formData.content}
                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/60"
                        placeholder="例: 前端開發"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-2">圖示</label>
                      <input
                        type="text"
                        value={formData.icon}
                        onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                        className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/60"
                        placeholder="例: 💻"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-2">描述</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/60 h-20 resize-none"
                      placeholder="分類的詳細描述..."
                    />
                  </div>

                  {/* 顏色設定 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium block mb-2">背景顏色 *</label>
                      <select
                        value={formData.colorBg}
                        onChange={(e) => setFormData(prev => ({ ...prev, colorBg: e.target.value }))}
                        className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white"
                      >
                        <option value="bg-blue-500/20">藍色</option>
                        <option value="bg-green-500/20">綠色</option>
                        <option value="bg-purple-500/20">紫色</option>
                        <option value="bg-orange-500/20">橙色</option>
                        <option value="bg-cyan-500/20">青色</option>
                        <option value="bg-yellow-500/20">黃色</option>
                        <option value="bg-indigo-500/20">靛色</option>
                        <option value="bg-red-500/20">紅色</option>
                        <option value="bg-pink-500/20">粉色</option>
                        <option value="bg-gray-500/20">灰色</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-2">文字顏色 *</label>
                      <select
                        value={formData.colorText}
                        onChange={(e) => setFormData(prev => ({ ...prev, colorText: e.target.value }))}
                        className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white"
                      >
                        <option value="text-blue-200">藍色</option>
                        <option value="text-green-200">綠色</option>
                        <option value="text-purple-200">紫色</option>
                        <option value="text-orange-200">橙色</option>
                        <option value="text-cyan-200">青色</option>
                        <option value="text-yellow-200">黃色</option>
                        <option value="text-indigo-200">靛色</option>
                        <option value="text-red-200">紅色</option>
                        <option value="text-pink-200">粉色</option>
                        <option value="text-gray-200">灰色</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium block mb-2">邊框顏色 *</label>
                      <select
                        value={formData.colorBorder}
                        onChange={(e) => setFormData(prev => ({ ...prev, colorBorder: e.target.value }))}
                        className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white"
                      >
                        <option value="border-blue-400/30">藍色</option>
                        <option value="border-green-400/30">綠色</option>
                        <option value="border-purple-400/30">紫色</option>
                        <option value="border-orange-400/30">橙色</option>
                        <option value="border-cyan-400/30">青色</option>
                        <option value="border-yellow-400/30">黃色</option>
                        <option value="border-indigo-400/30">靛色</option>
                        <option value="border-red-400/30">紅色</option>
                        <option value="border-pink-400/30">粉色</option>
                        <option value="border-gray-400/30">灰色</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-2">強調色 *</label>
                      <select
                        value={formData.colorAccent}
                        onChange={(e) => setFormData(prev => ({ ...prev, colorAccent: e.target.value }))}
                        className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white"
                      >
                        <option value="bg-blue-500">藍色</option>
                        <option value="bg-green-500">綠色</option>
                        <option value="bg-purple-500">紫色</option>
                        <option value="bg-orange-500">橙色</option>
                        <option value="bg-cyan-500">青色</option>
                        <option value="bg-yellow-500">黃色</option>
                        <option value="bg-indigo-500">靛色</option>
                        <option value="bg-red-500">紅色</option>
                        <option value="bg-pink-500">粉色</option>
                        <option value="bg-gray-500">灰色</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-2">排序順序</label>
                    <input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                      className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/60"
                      placeholder="0"
                    />
                  </div>

                  {/* 預覽 */}
                  <div className="border border-white/20 rounded-xl p-4">
                    <h4 className="text-sm font-medium mb-3">預覽</h4>
                    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${formData.colorBg} ${formData.colorBorder} border`}>
                      {formData.icon && <span className="text-lg">{formData.icon}</span>}
                      <div className={`w-3 h-3 rounded-full ${formData.colorAccent}`}></div>
                      <span className={formData.colorText}>{formData.title || '分類標題'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowModal(false)}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    取消
                  </Button>
                  <Button 
                    onClick={handleSave}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {editingCategory ? '更新' : '新增'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 
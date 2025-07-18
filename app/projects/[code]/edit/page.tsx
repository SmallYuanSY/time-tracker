'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Edit } from 'lucide-react'
import Link from 'next/link'
import ProjectTypeSelector from '@/components/ui/ProjectTypeSelector'
import WorkCategoryMultiSelect from '@/components/ui/WorkCategoryMultiSelect'
import { Project, ProjectType } from '@/types/project'

export default function EditProjectPage() {
  const params = useParams() as { code: string }
  const router = useRouter()
  const { data: session } = useSession()
  
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectTypeId: '',
    workCategoryIds: [] as string[],
    status: 'ACTIVE'
  })

  // 載入專案資料
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/projects/${params.code}`)
        if (response.ok) {
          const data = await response.json()
          setProject(data)
          setFormData({
            name: data.name || '',
            description: data.description || '',
            projectTypeId: data.projectType?.id || '',
            workCategoryIds: data.workCategories?.map((wc: any) => wc.categoryId) || [],
            status: data.status || 'ACTIVE'
          })
        } else {
          setError('載入專案失敗')
        }
      } catch (err) {
        setError('載入專案失敗')
      } finally {
        setLoading(false)
      }
    }

    if (params.code) {
      fetchProject()
    }
  }, [params.code])

  // 處理表單提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!project) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${params.code}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          projectTypeId: formData.projectTypeId || null,
          workCategoryIds: formData.workCategoryIds,
          status: formData.status
        })
      })

      if (response.ok) {
        router.push(`/projects/${params.code}`)
      } else {
        const errorData = await response.text()
        setError(errorData || '更新失敗')
      }
    } catch (err) {
      setError('更新失敗')
    } finally {
      setSaving(false)
    }
  }

  // 權限檢查
  if (!session?.user || !((session.user as any).role === 'ADMIN' || (session.user as any).role === 'WEB_ADMIN')) {
    return (
      <div className="p-4">
        <Card className="p-6 bg-red-50 border-red-200">
          <div className="text-red-700">
            <p className="font-medium">權限不足</p>
            <p className="text-sm mt-1">只有管理員和網頁管理員可以編輯專案</p>
          </div>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4">
        <Card className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </Card>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-4">
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <div className="text-yellow-700">
            <p className="font-medium">找不到專案</p>
            <p className="text-sm mt-1">請檢查專案代碼是否正確</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${params.code}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回專案詳情
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Edit className="h-6 w-6" />
              編輯專案
            </h1>
            <p className="text-gray-600">
              {project.code} - {project.name}
            </p>
          </div>
        </div>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="text-red-700">
            <p className="font-medium">錯誤</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </Card>
      )}

      {/* 編輯表單 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">基本資訊</h2>
          
          <div className="space-y-4">
            {/* 專案名稱 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                專案名稱 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* 專案描述 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                專案描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="請描述專案的詳細資訊..."
              />
            </div>

            {/* 專案狀態 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                專案狀態
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ACTIVE">進行中</option>
                <option value="COMPLETED">已完成</option>
                <option value="PAUSED">暫停</option>
                <option value="CANCELLED">已取消</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">分類設定</h2>
          
          <div className="space-y-6">
            {/* 專案類別 */}
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
              <ProjectTypeSelector
                value={formData.projectTypeId}
                onChange={(projectType: ProjectType | null) => {
                  setFormData({ ...formData, projectTypeId: projectType?.id || '' })
                }}
                placeholder="選擇專案類別"
                className=""
              />
            </div>

            {/* 工作分類 */}
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
              <WorkCategoryMultiSelect
                selectedCategoryIds={formData.workCategoryIds}
                onChange={(categoryIds) => {
                  setFormData({ ...formData, workCategoryIds: categoryIds })
                }}
                placeholder="選擇適用的工作分類"
                className=""
              />
            </div>
          </div>
        </Card>

        {/* 操作按鈕 */}
        <div className="flex justify-end gap-3">
          <Link href={`/projects/${params.code}`}>
            <Button type="button" variant="outline" disabled={saving}>
              取消
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? '儲存中...' : '儲存變更'}
          </Button>
        </div>
      </form>
    </div>
  )
}
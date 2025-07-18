'use client'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Edit } from 'lucide-react'
import { Project } from '@/types/project'

export default function ProjectDetailPage() {
  const params = useParams() as { code: string }
  const { data: session } = useSession()
  const [project, setProject] = useState<Project | null>(null)

  useEffect(() => {
    const fetchProject = async () => {
      const response = await fetch(`/api/projects/${params.code}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data)
      }
    }

      fetchProject()
  }, [params.code])

  if (!project) {
    return <div className="p-4">載入中...</div>
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <Link href="/projects" className="text-blue-500 hover:text-blue-700">
          ← 返回案件列表
        </Link>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">案件詳細資訊</h1>
            <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-sm font-medium">
              {project.code}
            </span>
            <span className={`px-2 py-1 rounded text-sm ${
              project.status === 'ACTIVE' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
            }`}>
              {project.status === 'ACTIVE' ? '進行中' : '已結案'}
            </span>
          </div>
          
          {/* 編輯按鈕（只有管理員可見） */}
          {session?.user && ((session.user as any).role === 'ADMIN' || (session.user as any).role === 'WEB_ADMIN') && (
            <Link href={`/projects/${project.code}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                編輯專案
              </Button>
            </Link>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">基本資訊</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">案件名稱</h3>
              <p className="mt-1">{project.name}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">案件描述</h3>
              <p className="mt-1">{project.description || '無描述'}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">案件類別</h3>
              {project.projectType ? (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-lg">{project.projectType.icon}</span>
                  <span>{project.projectType.name}</span>
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: project.projectType.color }}
                  ></div>
                </div>
              ) : (
                <p className="mt-1 text-gray-500">未設定案件類別</p>
              )}
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">工作分類</h3>
              {project.workCategories && project.workCategories.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-2">
                  {project.workCategories.map((wc: any) => (
                    <span
                      key={wc.id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-600 rounded-md text-xs"
                    >
                      {wc.category.icon && <span>{wc.category.icon}</span>}
                      <span>{wc.category.content}</span>
                      {wc.category.color && (
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: wc.category.color }}
                        ></div>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-gray-500">未設定工作分類</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">聯絡資訊</h2>
          {project.Contact ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">公司名稱</h3>
                <p className="mt-1">{project.Contact.companyName}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">聯絡人</h3>
                <p className="mt-1">{project.Contact.contactName}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">聯絡電話</h3>
                <p className="mt-1">{project.Contact.phone}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">地址</h3>
                <p className="mt-1">{project.Contact.address}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">尚未設定聯絡人</p>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">專案成員</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">專案管理者</h3>
              <p className="mt-1">
                {project.manager ? (project.manager.name || project.manager.email) : '未指派管理者'}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">專案成員</h3>
              {project.users && project.users.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {project.users.map(user => (
                    <div key={user.id} className="p-2 bg-gray-800 rounded text-white-100">
                      {user.name || user.email}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-gray-500">尚未指派專案成員</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
} 
'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Project } from '@/types/project'

export default function ProjectDetailPage() {
  const params = useParams() as { code: string }
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
    return <div>載入中...</div>
  }

  return (
    <>
      <div className="mb-4">
        <Link href="/projects" className="text-blue-500 hover:text-blue-700">
          ← 返回案件列表
        </Link>
      </div>

      <div className="mb-6">
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
              <p className="mt-1">{project.category}</p>
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
                    <div key={user.id} className="p-2 bg-gray-50 rounded">
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
    </>
  )
} 
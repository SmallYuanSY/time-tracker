'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus, Search, Briefcase, Users, Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

interface Project {
  id: string
  code: string
  name: string
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED'
  description?: string
  startDate?: string
  endDate?: string
  _count?: {
    members: number
    workLogs: number
  }
}

export default function MobileProjectsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  // 身份驗證檢查
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // 載入專案列表
  useEffect(() => {
    if (status === 'authenticated') {
      loadProjects()
    }
  }, [status])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/projects?includeStats=true')
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('載入專案失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  // 過濾專案
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 狀態顯示
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500'
      case 'COMPLETED': return 'bg-blue-500'
      case 'PAUSED': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '進行中'
      case 'COMPLETED': return '已完成'
      case 'PAUSED': return '暫停'
      default: return '未知'
    }
  }

  if (status === 'loading' || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-pink-600 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white mx-auto mb-4"></div>
            <div>載入中...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-pink-600">
      {/* 頂部導航欄 */}
      <header className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-white font-semibold text-lg">案件管理</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              onClick={() => router.push('/projects')}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* 主要內容 */}
      <main className="p-4 space-y-4">
        {/* 搜尋框 */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4" />
            <input
              type="text"
              placeholder="搜尋專案..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
        </Card>

        {/* 專案統計 */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
          <div className="flex items-center gap-2 mb-3 text-white">
            <Briefcase className="w-5 h-5" />
            <h3 className="font-semibold">專案統計</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {projects.filter(p => p.status === 'ACTIVE').length}
              </div>
              <div className="text-sm text-white/70">進行中</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {projects.filter(p => p.status === 'COMPLETED').length}
              </div>
              <div className="text-sm text-white/70">已完成</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {projects.length}
              </div>
              <div className="text-sm text-white/70">總計</div>
            </div>
          </div>
        </Card>

        {/* 專案列表 */}
        <div className="space-y-3">
          {loading ? (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
              <div className="text-center text-white/60">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white mx-auto mb-2"></div>
                <p>載入專案中...</p>
              </div>
            </Card>
          ) : filteredProjects.length === 0 ? (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
              <div className="text-center text-white/60">
                <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{searchTerm ? '找不到符合的專案' : '尚無專案'}</p>
              </div>
            </Card>
          ) : (
            filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="bg-white/10 backdrop-blur-lg border-white/20 p-4 touch-manipulation active:scale-95 transition-transform cursor-pointer"
                onClick={() => router.push(`/projects/${project.code}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white text-lg">{project.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs text-white ${getStatusColor(project.status)}`}>
                        {getStatusText(project.status)}
                      </span>
                    </div>
                    <p className="text-white/70 text-sm">{project.code}</p>
                    {project.description && (
                      <p className="text-white/60 text-sm mt-1 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-white/70">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{project._count?.members || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{project._count?.workLogs || 0}</span>
                    </div>
                  </div>
                  {project.startDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(project.startDate), 'yyyy/MM/dd')}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  )
} 
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus, Calendar, Clock, FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import MobileLeaveRequestModal from '../components/MobileLeaveRequestModal'

interface LeaveRequest {
  id: string
  leaveType: string
  startDate: string
  endDate: string
  reason: string
  status: 'PENDING_AGENT' | 'PENDING_ADMIN' | 'APPROVED' | 'AGENT_REJECTED' | 'ADMIN_REJECTED'
  createdAt: string
  startTime: string
  endTime: string
  totalHours: number
  requester: {
    id: string
    name: string
    email: string
  }
  agent: {
    id: string
    name: string
    email: string
  }
  approvedAt?: string
  rejectedAt?: string
  approverName?: string
  rejectReason?: string
}

export default function MobileLeavePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'all'>('all')
  const [showRequestModal, setShowRequestModal] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 身份驗證檢查
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // 載入請假記錄
  useEffect(() => {
    if (status === 'authenticated') {
      loadLeaveRequests()
    }
  }, [status])

  const loadLeaveRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/leaves')
      if (response.ok) {
        const data = await response.json()
        setLeaveRequests(data)
      }
    } catch (error) {
      console.error('載入請假記錄失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestSuccess = () => {
    loadLeaveRequests()
  }

  // 請假類型翻譯
  const getLeaveTypeText = (type: string) => {
    const typeMap: { [key: string]: string } = {
      PERSONAL: '事假',
      SICK: '病假',
      ANNUAL: '特休',
      OFFICIAL: '公假',
      FUNERAL: '喪假',
      MARRIAGE: '婚假',
      MATERNITY: '產假',
      PATERNITY: '陪產假',
      OTHER: '其他假'
    }
    return typeMap[type] || type
  }

  // 過濾請假記錄
  const filteredRequests = leaveRequests.filter(request => {
    switch (activeTab) {
      case 'pending':
        return request.status === 'PENDING_AGENT' || request.status === 'PENDING_ADMIN'
      case 'approved':
        return request.status === 'APPROVED'
      default:
        return true
    }
  })

  // 狀態顯示
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING_AGENT':
      case 'PENDING_ADMIN':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'AGENT_REJECTED':
      case 'ADMIN_REJECTED':
        return <XCircle className="w-4 h-4 text-red-400" />
      default:
        return null
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING_AGENT': return '代理人審核中'
      case 'PENDING_ADMIN': return '管理員審核中'
      case 'APPROVED': return '已核准'
      case 'AGENT_REJECTED': return '代理人拒絕'
      case 'ADMIN_REJECTED': return '管理員拒絕'
      default: return '未知'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING_AGENT':
      case 'PENDING_ADMIN':
        return 'bg-yellow-500/20 text-yellow-200'
      case 'APPROVED': 
        return 'bg-green-500/20 text-green-200'
      case 'AGENT_REJECTED':
      case 'ADMIN_REJECTED':
        return 'bg-red-500/20 text-red-200'
      default: 
        return 'bg-gray-500/20 text-gray-200'
    }
  }

  if (status === 'loading' || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-600 via-red-600 to-pink-600 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-orange-600 via-red-600 to-pink-600">
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
            <h1 className="text-white font-semibold text-lg">請假管理</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              onClick={() => setShowRequestModal(true)}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* 主要內容 */}
      <main className="p-4 space-y-4">
        {/* 狀態標籤 */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
          <div className="flex gap-2 overflow-x-auto">
            <Button
              variant={activeTab === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('all')}
              className={`whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-white text-orange-600'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            >
              全部 ({leaveRequests.length})
            </Button>
            <Button
              variant={activeTab === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('pending')}
              className={`whitespace-nowrap ${
                activeTab === 'pending'
                  ? 'bg-white text-orange-600'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            >
              待審核 ({leaveRequests.filter(r => r.status === 'PENDING_AGENT' || r.status === 'PENDING_ADMIN').length})
            </Button>
            <Button
              variant={activeTab === 'approved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('approved')}
              className={`whitespace-nowrap ${
                activeTab === 'approved'
                  ? 'bg-white text-orange-600'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            >
              已核准 ({leaveRequests.filter(r => r.status === 'APPROVED').length})
            </Button>
          </div>
        </Card>

        {/* 統計卡片 */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
          <div className="flex items-center gap-2 mb-3 text-white">
            <Calendar className="w-5 h-5" />
            <h3 className="font-semibold">請假統計</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {leaveRequests.filter(r => r.status === 'PENDING_AGENT' || r.status === 'PENDING_ADMIN').length}
              </div>
              <div className="text-sm text-white/70">待審核</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {leaveRequests.filter(r => r.status === 'APPROVED').length}
              </div>
              <div className="text-sm text-white/70">已核准</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {leaveRequests.length}
              </div>
              <div className="text-sm text-white/70">總申請</div>
            </div>
          </div>
        </Card>

        {/* 請假記錄列表 */}
        <div className="space-y-3">
          {loading ? (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
              <div className="text-center text-white/60">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white mx-auto mb-2"></div>
                <p>載入請假記錄中...</p>
              </div>
            </Card>
          ) : filteredRequests.length === 0 ? (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
              <div className="text-center text-white/60">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>尚無請假記錄</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 bg-white/10 text-white border-white/20 hover:bg-white/20"
                  onClick={() => setShowRequestModal(true)}
                >
                  申請請假
                </Button>
              </div>
            </Card>
          ) : (
            filteredRequests.map((request) => (
              <Card
                key={request.id}
                className="bg-white/10 backdrop-blur-lg border-white/20 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-white">{getLeaveTypeText(request.leaveType)}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        {getStatusText(request.status)}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm text-white/70">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {mounted ? format(new Date(request.startDate), 'yyyy/MM/dd') : request.startDate} - {mounted ? format(new Date(request.endDate), 'yyyy/MM/dd') : request.endDate}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>申請時間：{mounted ? format(new Date(request.createdAt), 'yyyy/MM/dd HH:mm') : request.createdAt}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-white/80 text-sm mb-3">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{request.reason}</span>
                  </div>
                </div>

                {request.status === 'APPROVED' && request.approverName && (
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-sm">
                    <div className="text-green-200">
                      ✓ 已由 {request.approverName} 於 {mounted && request.approvedAt ? format(new Date(request.approvedAt), 'yyyy/MM/dd HH:mm') : request.approvedAt} 核准
                    </div>
                  </div>
                )}

                {(request.status === 'AGENT_REJECTED' || request.status === 'ADMIN_REJECTED') && request.rejectReason && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-sm">
                    <div className="text-red-200 mb-1">
                      ✗ 已拒絕
                    </div>
                    <div className="text-red-200/80">
                      拒絕原因：{request.rejectReason}
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        {/* 新增請假按鈕 */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-4">
          <Button
            onClick={() => setShowRequestModal(true)}
            className="w-full h-12 bg-white text-orange-600 hover:bg-white/90 font-semibold text-lg touch-manipulation"
          >
            <Plus className="w-5 h-5 mr-2" />
            申請新請假
          </Button>
        </Card>
      </main>

      {/* 請假申請模態框 */}
      <MobileLeaveRequestModal
        open={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSuccess={handleRequestSuccess}
      />
    </div>
  )
} 
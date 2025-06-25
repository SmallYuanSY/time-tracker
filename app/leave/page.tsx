"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import LeaveRequestModal from '@/components/ui/LeaveRequestModal'
import { Calendar, Clock, User, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface LeaveRequest {
  id: string
  reason: string
  startDate: string
  endDate: string
  status: string
  createdAt: string
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
}

export default function LeavePage() {
  const { data: session } = useSession()
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user) {
      loadLeaveRequests()
    }
  }, [session])

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING_AGENT':
        return 'bg-amber-500/20 text-amber-200 border-amber-400/30'
      case 'PENDING_ADMIN':
        return 'bg-blue-500/20 text-blue-200 border-blue-400/30'
      case 'APPROVED':
        return 'bg-green-500/20 text-green-200 border-green-400/30'
      case 'REJECTED':
        return 'bg-red-500/20 text-red-200 border-red-400/30'
      default:
        return 'bg-gray-500/20 text-gray-200 border-gray-400/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING_AGENT':
        return <AlertCircle className="w-4 h-4" />
      case 'PENDING_ADMIN':
        return <Clock className="w-4 h-4" />
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4" />
      case 'REJECTED':
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING_AGENT':
        return '代理人審核中'
      case 'PENDING_ADMIN':
        return '管理員審核中'
      case 'APPROVED':
        return '已批准'
      case 'REJECTED':
        return '已拒絕'
      default:
        return '未知狀態'
    }
  }

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  // 分離我的申請和需要我審核的
  const myRequests = leaveRequests.filter(req => req.requester.email === session?.user?.email)
  const pendingApprovals = leaveRequests.filter(req => 
    req.agent.email === session?.user?.email && req.status === 'PENDING_AGENT'
  )

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
        {/* 頁面標題和操作列 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">請假管理</h1>
            <p className="text-white/60 text-sm mt-1">
              管理您的請假申請和審核事項
            </p>
          </div>
          <button
            onClick={() => setShowRequestModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition flex items-center gap-2"
          >
            📝 申請請假
          </button>
        </div>

        {/* 需要審核的請假申請 */}
        {pendingApprovals.length > 0 && (
          <div className="bg-amber-500/10 backdrop-blur-lg border border-amber-400/20 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-amber-200 mb-4 flex items-center gap-2">
              ⏰ 待您審核 ({pendingApprovals.length})
            </h2>
            <div className="space-y-3">
              {pendingApprovals.map((request) => (
                <div key={request.id} className="bg-amber-500/5 rounded-xl p-4 border border-amber-400/10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                          {request.requester.name?.[0] || request.requester.email[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-medium">
                            {request.requester.name || '未設定姓名'}
                          </div>
                          <div className="text-white/60 text-sm">{request.requester.email}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-white/80">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(request.startDate)} - {formatDate(request.endDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/80">
                          <Clock className="w-4 h-4" />
                          <span>{calculateDays(request.startDate, request.endDate)} 天</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/80">
                          <FileText className="w-4 h-4" />
                          <span className="truncate">{request.reason}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button className="px-3 py-1 bg-green-600/20 text-green-300 rounded-lg hover:bg-green-600/30 transition text-sm">
                        批准
                      </button>
                      <button className="px-3 py-1 bg-red-600/20 text-red-300 rounded-lg hover:bg-red-600/30 transition text-sm">
                        拒絕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 我的請假申請 */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">我的請假申請</h2>
          
          {myRequests.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-white/60 text-lg mb-2">📋</div>
              <div className="text-white/60">尚無請假記錄</div>
              <button
                onClick={() => setShowRequestModal(true)}
                className="mt-4 text-blue-400 hover:text-blue-300 underline"
              >
                立即申請請假
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myRequests.map((request) => (
                <div key={request.id} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`px-3 py-1 rounded-lg border text-sm flex items-center gap-1 ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          {getStatusText(request.status)}
                        </div>
                        <div className="text-white/60 text-sm">
                          申請於 {formatDate(request.createdAt)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-white/80">
                          <Calendar className="w-4 h-4" />
                          <div>
                            <div className="font-medium">請假期間</div>
                            <div>{formatDate(request.startDate)} - {formatDate(request.endDate)}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-white/80">
                          <Clock className="w-4 h-4" />
                          <div>
                            <div className="font-medium">請假天數</div>
                            <div>{calculateDays(request.startDate, request.endDate)} 天</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-white/80">
                          <User className="w-4 h-4" />
                          <div>
                            <div className="font-medium">代理人</div>
                            <div>{request.agent.name || '未設定姓名'}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-white/80">
                          <FileText className="w-4 h-4" />
                          <div>
                            <div className="font-medium">請假原因</div>
                            <div className="truncate">{request.reason}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 請假申請彈窗 */}
      <LeaveRequestModal
        open={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSuccess={handleRequestSuccess}
      />
    </DashboardLayout>
  )
}

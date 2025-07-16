"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import LeaveRequestModal from '@/components/ui/LeaveRequestModal'
import { LeaveRequest, LeaveStatus, LeaveType } from '@/types/leave'
import LeaveProgressSteps from '@/components/ui/LeaveProgressSteps'
import { Calendar, Clock, User, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

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

  const handleAgentResponse = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/leaves/${requestId}/agent`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      if (response.ok) {
        alert(action === 'approve' ? '已批准請假申請' : '已拒絕請假申請')
        loadLeaveRequests()
      } else {
        alert('操作失敗，請稍後再試')
      }
    } catch (error) {
      console.error('處理請假申請失敗:', error)
      alert('操作失敗，請稍後再試')
    }
  }

  // 管理員審核處理
  const handleAdminApproval = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/leaves/${requestId}/admin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      if (response.ok) {
        alert(action === 'approve' ? '已最終批准請假申請' : '已拒絕請假申請')
        loadLeaveRequests()
      } else {
        alert('操作失敗，請稍後再試')
      }
    } catch (error) {
      console.error('管理員審核失敗:', error)
      alert('審核失敗，請稍後再試')
    }
  }

  const getStatusColor = (status: LeaveStatus) => {
    switch (status) {
      case 'PENDING_AGENT':
        return 'bg-amber-500/20 text-amber-200 border-amber-400/30'
      case 'AGENT_REJECTED':
        return 'bg-red-500/20 text-red-200 border-red-400/30'
      case 'PENDING_ADMIN':
        return 'bg-blue-500/20 text-blue-200 border-blue-400/30'
      case 'ADMIN_REJECTED':
        return 'bg-red-500/20 text-red-200 border-red-400/30'
      case 'APPROVED':
        return 'bg-green-500/20 text-green-200 border-green-400/30'
      default:
        return 'bg-gray-500/20 text-gray-200 border-gray-400/30'
    }
  }

  const getStatusIcon = (status: LeaveStatus) => {
    switch (status) {
      case 'PENDING_AGENT':
        return <AlertCircle className="w-4 h-4" />
      case 'AGENT_REJECTED':
        return <XCircle className="w-4 h-4" />
      case 'PENDING_ADMIN':
        return <Clock className="w-4 h-4" />
      case 'ADMIN_REJECTED':
        return <XCircle className="w-4 h-4" />
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getStatusText = (status: LeaveStatus) => {
    switch (status) {
      case 'PENDING_AGENT':
        return '代理人審核中'
      case 'AGENT_REJECTED':
        return '代理人拒絕'
      case 'PENDING_ADMIN':
        return '管理員審核中'
      case 'ADMIN_REJECTED':
        return '管理員拒絕'
      case 'APPROVED':
        return '已批准'
      default:
        return '未知狀態'
    }
  }

  const getLeaveTypeText = (type: LeaveType) => {
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
    return typeMap[type] || '請假'
  }

  const formatDateTime = (date: string, time: string) => {
    return `${formatDate(date)} ${time}`
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
  
  // 管理員需要審核的申請（僅對 ADMIN 顯示，WEB_ADMIN 不參與業務流程）
  const [userRole, setUserRole] = useState<string | null>(null)
  const adminPendingApprovals = leaveRequests.filter(req => 
    req.status === 'PENDING_ADMIN'
  )

  // 獲取用戶角色
  useEffect(() => {
    if (session?.user?.email) {
      const fetchUserRole = async () => {
        try {
          const response = await fetch('/api/users')
          if (response.ok) {
            const users = await response.json()
            const currentUser = users.find((user: any) => user.email === session.user?.email)
            setUserRole(currentUser?.role || null)
          }
        } catch (error) {
          console.error('獲取用戶角色失敗:', error)
        }
      }
      fetchUserRole()
    }
  }, [session?.user?.email])

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

        {/* 我的請假申請 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">我的請假申請</h2>
          <div className="grid gap-4">
            {myRequests.map((request) => (
              <div
                key={request.id}
                className="bg-gray-800 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm text-gray-400">
                      申請時間：{formatDate(request.createdAt.toString())}
                    </div>
                    <div className="font-medium text-white">
                      {getLeaveTypeText(request.leaveType)} - {request.reason}
                    </div>
                    <div className="text-sm text-gray-300">
                      時間：{formatDateTime(request.startDate.toString(), request.startTime)} ~ {formatDateTime(request.endDate.toString(), request.endTime)}
                      <span className="ml-2 text-blue-400">({request.totalHours} 小時)</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      代理人：{request.agent.name || request.agent.email}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-2 py-1 rounded text-sm ${
                      request.status === 'APPROVED' ? 'bg-green-500/20 text-green-300' :
                      request.status.includes('REJECTED') ? 'bg-red-500/20 text-red-300' :
                      'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {getStatusText(request.status)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {myRequests.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                尚無請假記錄
              </div>
            )}
          </div>
        </div>

        {/* 需要我審核的請假 */}
        {pendingApprovals.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">需要我審核的請假</h2>
            <div className="grid gap-4">
              {pendingApprovals.map((request) => (
                <div
                  key={request.id}
                  className="bg-gray-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm text-gray-400">
                        申請時間：{formatDate(request.createdAt.toString())}
                      </div>
                      <div className="font-medium text-white">
                        {request.requester.name || request.requester.email}
                      </div>
                      <div className="text-white">
                        {getLeaveTypeText(request.leaveType)} - {request.reason}
                      </div>
                      <div className="text-sm text-gray-300">
                        時間：{formatDateTime(request.startDate.toString(), request.startTime)} ~ {formatDateTime(request.endDate.toString(), request.endTime)}
                        <span className="ml-2 text-blue-400">({request.totalHours} 小時)</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAgentResponse(request.id, 'approve')}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                        >
                          批准
                        </button>
                        <button
                          onClick={() => handleAgentResponse(request.id, 'reject')}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                        >
                          拒絕
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 管理員審核區域 */}
        {userRole === 'ADMIN' && adminPendingApprovals.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">待管理員審核的請假</h2>
            <div className="grid gap-4">
              {adminPendingApprovals.map((request) => (
                <div
                  key={request.id}
                  className="bg-gray-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm text-gray-400">
                        申請時間：{formatDate(request.createdAt.toString())}
                      </div>
                      <div className="font-medium text-white">
                        {request.requester.name || request.requester.email}
                      </div>
                      <div className="text-white">
                        {getLeaveTypeText(request.leaveType)} - {request.reason}
                      </div>
                      <div className="text-sm text-gray-300">
                        時間：{formatDateTime(request.startDate.toString(), request.startTime)} ~ {formatDateTime(request.endDate.toString(), request.endTime)}
                        <span className="ml-2 text-blue-400">({request.totalHours} 小時)</span>
                      </div>
                      <div className="text-sm text-gray-400">
                        代理人：{request.agent.name || request.agent.email}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAdminApproval(request.id, 'approve')}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                        >
                          批准
                        </button>
                        <button
                          onClick={() => handleAdminApproval(request.id, 'reject')}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                        >
                          拒絕
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 請假申請表單 */}
        <LeaveRequestModal
          open={showRequestModal}
          onClose={() => setShowRequestModal(false)}
          onSuccess={handleRequestSuccess}
        />
      </div>
    </DashboardLayout>
  )
}

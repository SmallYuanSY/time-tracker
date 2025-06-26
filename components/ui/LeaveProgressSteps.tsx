import React from 'react'
import { CheckCircle, Clock, XCircle, User, Shield } from 'lucide-react'

type LeaveStatus = 'PENDING_AGENT' | 'AGENT_REJECTED' | 'PENDING_ADMIN' | 'ADMIN_REJECTED' | 'APPROVED'

interface LeaveProgressStepsProps {
  status: LeaveStatus
  className?: string
}

export default function LeaveProgressSteps({ status, className = '' }: LeaveProgressStepsProps) {
  const steps = [
    {
      key: 'submitted',
      label: '已提交申請',
      icon: User,
      description: '請假申請已提交'
    },
    {
      key: 'agent_review',
      label: '代理人審核',
      icon: User,
      description: '等待代理人確認'
    },
    {
      key: 'admin_review',
      label: '管理員審核',
      icon: Shield,
      description: '等待管理員最終審核'
    },
    {
      key: 'completed',
      label: '審核完成',
      icon: CheckCircle,
      description: '申請已處理完成'
    }
  ]

  const getStepStatus = (stepKey: string) => {
    switch (status) {
      case 'PENDING_AGENT':
        if (stepKey === 'submitted') return 'completed'
        if (stepKey === 'agent_review') return 'current'
        return 'pending'
      
      case 'AGENT_REJECTED':
        if (stepKey === 'submitted') return 'completed'
        if (stepKey === 'agent_review') return 'rejected'
        return 'pending'
      
      case 'PENDING_ADMIN':
        if (stepKey === 'submitted' || stepKey === 'agent_review') return 'completed'
        if (stepKey === 'admin_review') return 'current'
        return 'pending'
      
      case 'ADMIN_REJECTED':
        if (stepKey === 'submitted' || stepKey === 'agent_review') return 'completed'
        if (stepKey === 'admin_review') return 'rejected'
        return 'pending'
      
      case 'APPROVED':
        return 'completed'
      
      default:
        return 'pending'
    }
  }

  const getStatusColor = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
        return 'text-green-400 bg-green-500/20 border-green-400/30'
      case 'current':
        return 'text-blue-400 bg-blue-500/20 border-blue-400/30 animate-pulse'
      case 'rejected':
        return 'text-red-400 bg-red-500/20 border-red-400/30'
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-400/30'
    }
  }

  const getStatusIcon = (stepStatus: string, IconComponent: any) => {
    switch (stepStatus) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />
      case 'current':
        return <Clock className="w-4 h-4" />
      case 'rejected':
        return <XCircle className="w-4 h-4" />
      default:
        return <IconComponent className="w-4 h-4" />
    }
  }

  const getConnectorColor = (currentStep: number, totalSteps: number) => {
    if (currentStep >= totalSteps - 1) return '' // 最後一步不需要連接線
    
    const nextStepStatus = getStepStatus(steps[currentStep + 1].key)
    if (nextStepStatus === 'completed') return 'bg-green-400'
    if (nextStepStatus === 'rejected') return 'bg-red-400'
    return 'bg-gray-400/30'
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepStatus = getStepStatus(step.key)
          const IconComponent = step.icon
          
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center min-w-0 flex-1">
                {/* 步驟圓圈 */}
                <div 
                  className={`
                    w-8 h-8 rounded-full border-2 flex items-center justify-center mb-2
                    ${getStatusColor(stepStatus)}
                  `}
                >
                  {getStatusIcon(stepStatus, IconComponent)}
                </div>
                
                {/* 步驟標籤 */}
                <div className="text-center">
                  <div className={`
                    text-xs font-medium mb-1
                    ${stepStatus === 'completed' ? 'text-green-200' : 
                      stepStatus === 'current' ? 'text-blue-200' :
                      stepStatus === 'rejected' ? 'text-red-200' : 'text-gray-400'}
                  `}>
                    {step.label}
                  </div>
                  <div className="text-xs text-white/50 hidden sm:block">
                    {step.description}
                  </div>
                </div>
              </div>
              
              {/* 連接線 */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2 mt-4 mb-8">
                  <div className={`h-0.5 w-full ${getConnectorColor(index, steps.length)}`} />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
      
      {/* 當前狀態說明 */}
      <div className="mt-4 text-center">
        <div className="text-sm text-white/70">
          {status === 'PENDING_AGENT' && '⏳ 等待代理人確認申請'}
          {status === 'AGENT_REJECTED' && '❌ 請假申請已被代理人拒絕'}
          {status === 'PENDING_ADMIN' && '⏳ 等待管理員最終審核'}
          {status === 'ADMIN_REJECTED' && '❌ 請假申請已被管理員拒絕'}
          {status === 'APPROVED' && '✅ 請假申請已獲得批准'}
        </div>
      </div>
    </div>
  )
} 
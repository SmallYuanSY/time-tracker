export type LeaveType = 
  | 'PERSONAL'    // 事假
  | 'SICK'        // 病假
  | 'ANNUAL'      // 特休
  | 'OFFICIAL'    // 公假
  | 'FUNERAL'     // 喪假
  | 'MARRIAGE'    // 婚假
  | 'MATERNITY'   // 產假
  | 'PATERNITY'   // 陪產假
  | 'OTHER'       // 其他

export type LeaveStatus = 
  | 'PENDING_AGENT'
  | 'AGENT_REJECTED'
  | 'PENDING_ADMIN'
  | 'ADMIN_REJECTED'
  | 'APPROVED'

export interface LeaveRequest {
  id: string
  requesterId: string
  agentId: string
  leaveType: LeaveType
  status: LeaveStatus
  reason: string
  startDate: Date | string
  endDate: Date | string
  startTime: string
  endTime: string
  totalHours: number
  agentApproved: boolean
  createdAt: Date | string
  updatedAt: Date | string
  requester: {
    id: string
    name: string | null
    email: string
  }
  agent: {
    id: string
    name: string | null
    email: string
  }
} 
export interface ExtraTask {
  projectCode: string
  projectName: string
  category: string
}

export const extraTasks: ExtraTask[] = [
  { projectCode: '00', projectName: '無案件編號', category: '' },
  { projectCode: '01', projectName: '非特定工作', category: '' },
  { projectCode: '08', projectName: '公司開會', category: '' },
  { projectCode: '09', projectName: '公司內務', category: '' }
] 
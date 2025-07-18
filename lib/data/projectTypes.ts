export interface ProjectType {
  id: string
  typeId: string
  name: string
  description: string
  color: string
  icon: string
  isActive: boolean
  sortOrder: number
}

export const defaultProjectTypes: Omit<ProjectType, 'id'>[] = [
  {
    typeId: 'software_development',
    name: '軟體開發',
    description: '軟體開發、程式設計、系統建置相關案件',
    color: '#3B82F6',
    icon: '💻',
    isActive: true,
    sortOrder: 1
  },
  {
    typeId: 'engineering_construction',
    name: '工程建設',
    description: '土木工程、建築工程、基礎設施建設相關案件',
    color: '#F59E0B',
    icon: '🏗️',
    isActive: true,
    sortOrder: 2
  },
  {
    typeId: 'consulting_service',
    name: '顧問服務',
    description: '顧問諮詢、專業服務、技術顧問相關案件',
    color: '#10B981',
    icon: '🤝',
    isActive: true,
    sortOrder: 3
  },
  {
    typeId: 'system_maintenance',
    name: '系統維護',
    description: '系統維護、設備保養、技術支援相關案件',
    color: '#EF4444',
    icon: '🔧',
    isActive: true,
    sortOrder: 4
  },
  {
    typeId: 'research_project',
    name: '研發專案',
    description: '研究開發、創新專案、技術研究相關案件',
    color: '#8B5CF6',
    icon: '🔬',
    isActive: true,
    sortOrder: 5
  },
  {
    typeId: 'business_operations',
    name: '營運管理',
    description: '日常營運、行政管理、業務推廣相關案件',
    color: '#06B6D4',
    icon: '📊',
    isActive: true,
    sortOrder: 6
  }
]

// 根據 typeId 獲取案件類別
export const getProjectType = (typeId: string): Omit<ProjectType, 'id'> | undefined => {
  return defaultProjectTypes.find(type => type.typeId === typeId)
}

// 根據名稱獲取案件類別
export const getProjectTypeByName = (name: string): Omit<ProjectType, 'id'> | undefined => {
  return defaultProjectTypes.find(type => type.name === name)
}

// 獲取所有案件類別選項（用於下拉選單）
export const getProjectTypeOptions = () => {
  return defaultProjectTypes.map(type => ({
    value: type.typeId,
    label: type.name,
    description: type.description,
    color: type.color,
    icon: type.icon
  }))
}
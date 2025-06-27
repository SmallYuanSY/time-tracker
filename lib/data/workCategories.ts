export interface WorkCategory {
  id: string
  title: string
  content: string
  color: {
    bg: string      // 背景顏色
    text: string    // 文字顏色
    border: string  // 邊框顏色
    accent: string  // 強調色
  }
  icon?: string     // 可選的圖示
  description?: string // 可選的描述
}

export const workCategories: WorkCategory[] = [
  // 軟體開發相關分類
  {
    id: 'meeting',
    title: '會議',
    content: '會議',
    color: {
      bg: 'bg-blue-500/20',
      text: 'text-blue-200',
      border: 'border-blue-400/30',
      accent: 'bg-blue-500'
    },
    icon: '💬',
    description: '專案會議、需求討論、技術分享、內部溝通'
  },
  {
    id: 'documentation',
    title: '文件',
    content: '文件',
    color: {
      bg: 'bg-cyan-500/20',
      text: 'text-cyan-200',
      border: 'border-cyan-400/30',
      accent: 'bg-cyan-500'
    },
    icon: '📝',
    description: '技術文件、使用手冊、規格書、報告撰寫'
  },
  {
    id: 'development',
    title: '開發',
    content: '開發',
    color: {
      bg: 'bg-green-500/20',
      text: 'text-green-200',
      border: 'border-green-400/30',
      accent: 'bg-green-500'
    },
    icon: '💻',
    description: '軟體開發、程式設計、功能實作'
  },
  {
    id: 'maintenance',
    title: '維護',
    content: '維護',
    color: {
      bg: 'bg-orange-500/20',
      text: 'text-orange-200',
      border: 'border-orange-400/30',
      accent: 'bg-orange-500'
    },
    icon: '🔧',
    description: '系統維護、bug 修復、效能優化'
  },
  {
    id: 'testing',
    title: '測試',
    content: '測試',
    color: {
      bg: 'bg-purple-500/20',
      text: 'text-purple-200',
      border: 'border-purple-400/30',
      accent: 'bg-purple-500'
    },
    icon: '🔍',
    description: '功能測試、系統測試、品質驗證'
  },

  // 工程相關分類
  {
    id: 'water_supply',
    title: '給水',
    content: '給水',
    color: {
      bg: 'bg-blue-600/20',
      text: 'text-blue-300',
      border: 'border-blue-500/30',
      accent: 'bg-blue-600'
    },
    icon: '🚰',
    description: '給水系統設計、管線配置、水壓計算'
  },
  {
    id: 'drainage',
    title: '排水',
    content: '排水',
    color: {
      bg: 'bg-teal-500/20',
      text: 'text-teal-200',
      border: 'border-teal-400/30',
      accent: 'bg-teal-500'
    },
    icon: '🌊',
    description: '污水排放、廢水處理、排水管設計'
  },
  {
    id: 'stormwater',
    title: '雨水',
    content: '雨水',
    color: {
      bg: 'bg-sky-500/20',
      text: 'text-sky-200',
      border: 'border-sky-400/30',
      accent: 'bg-sky-500'
    },
    icon: '🌧️',
    description: '雨水收集、雨水排放、防洪設計'
  },
  {
    id: 'electrical',
    title: '電力',
    content: '電力',
    color: {
      bg: 'bg-yellow-500/20',
      text: 'text-yellow-200',
      border: 'border-yellow-400/30',
      accent: 'bg-yellow-500'
    },
    icon: '⚡',
    description: '電力系統、配電設計、電氣工程'
  },
  {
    id: 'telecom',
    title: '電信',
    content: '電信',
    color: {
      bg: 'bg-indigo-500/20',
      text: 'text-indigo-200',
      border: 'border-indigo-400/30',
      accent: 'bg-indigo-500'
    },
    icon: '📡',
    description: '通訊設備、網路配線、電信系統'
  },
  {
    id: 'fire_protection',
    title: '消防',
    content: '消防',
    color: {
      bg: 'bg-red-500/20',
      text: 'text-red-200',
      border: 'border-red-400/30',
      accent: 'bg-red-500'
    },
    icon: '🔥',
    description: '消防系統、安全設備、防火設計'
  },
  {
    id: 'ventilation',
    title: '通風',
    content: '通風',
    color: {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-200',
      border: 'border-emerald-400/30',
      accent: 'bg-emerald-500'
    },
    icon: '💨',
    description: '通風系統、空調設計、空氣品質'
  },
  {
    id: 'monitoring',
    title: '監控',
    content: '監控',
    color: {
      bg: 'bg-slate-500/20',
      text: 'text-slate-200',
      border: 'border-slate-400/30',
      accent: 'bg-slate-500'
    },
    icon: '📹',
    description: '監控系統、安全監控、設備監測'
  },
  {
    id: 'planning',
    title: '規劃',
    content: '規劃',
    color: {
      bg: 'bg-violet-500/20',
      text: 'text-violet-200',
      border: 'border-violet-400/30',
      accent: 'bg-violet-500'
    },
    icon: '📋',
    description: '專案規劃、設計規劃、工程規劃'
  },
  {
    id: 'other',
    title: '其他',
    content: '其他',
    color: {
      bg: 'bg-gray-500/20',
      text: 'text-gray-200',
      border: 'border-gray-400/30',
      accent: 'bg-gray-500'
    },
    icon: '📦',
    description: '未分類或其他類型工作'
  }
]

// 根據 ID 獲取工作分類
export const getWorkCategory = (id: string): WorkCategory | undefined => {
  return workCategories.find(category => category.id === id)
}

// 根據內容獲取工作分類
export const getWorkCategoryByContent = (content: string): WorkCategory | undefined => {
  return workCategories.find(category => 
    category.content === content || 
    category.title === content ||
    category.id === content
  )
}

// 獲取所有分類的選項（用於下拉選單）
export const getCategoryOptions = () => {
  return workCategories.map(category => ({
    value: category.id,
    label: category.title,
    content: category.content,
    color: category.color,
    icon: category.icon,
    description: category.description
  }))
} 
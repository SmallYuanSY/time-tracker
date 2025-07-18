"use client"

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Building2 } from 'lucide-react'
import { defaultProjectTypes } from '@/lib/data/projectTypes'

interface ProjectType {
  id: string
  typeId: string
  name: string
  description: string
  color: string
  icon: string
  isActive: boolean
  sortOrder: number
}

interface ProjectTypeSelectorProps {
  value: string | null
  onChange: (projectType: ProjectType | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  required?: boolean
}

export default function ProjectTypeSelector({
  value,
  onChange,
  placeholder = "選擇案件類別",
  disabled = false,
  className = "",
  required = false
}: ProjectTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([])
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // 載入資料庫中的案件類別
  useEffect(() => {
    const loadProjectTypes = async () => {
      try {
        const response = await fetch('/api/project-types')
        if (response.ok) {
          const data = await response.json()
          setProjectTypes(data.projectTypes || [])
        } else {
          // 發生錯誤時使用預設類別
          setProjectTypes(defaultProjectTypes.map((type, index) => ({
            id: `default_${index}`,
            ...type
          })))
        }
      } catch (error) {
        console.error('載入案件類別失敗:', error)
        // 發生錯誤時使用預設類別
        setProjectTypes(defaultProjectTypes.map((type, index) => ({
          id: `default_${index}`,
          ...type
        })))
      } finally {
        setLoading(false)
      }
    }

    loadProjectTypes()
  }, [])
  
  // 獲取當前選中的案件類別
  const selectedType = projectTypes.find(type => type.id === value || type.typeId === value)

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 處理類別選擇
  const handleSelect = (projectType: ProjectType | null) => {
    onChange(projectType)
    setIsOpen(false)
  }

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <label className="text-sm font-medium flex items-center gap-2 text-white">
          <Building2 className="h-4 w-4" />
          案件類別 {required && <span className="text-red-500">*</span>}
        </label>
        <div className="w-full p-3 border rounded-xl bg-white/10 border-white/20 text-white/50">
          載入中...
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-white">
        <Building2 className="h-4 w-4" />
        案件類別 {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative" ref={dropdownRef}>
        {/* 選擇按鈕 */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full p-3 border rounded-xl text-left flex items-center justify-between transition-colors ${
            disabled 
              ? 'bg-gray-100 dark:bg-white/10 border-gray-300 dark:border-white/20 cursor-not-allowed text-gray-400 dark:text-white/50' 
              : 'bg-white dark:bg-white/20 border-gray-300 dark:border-white/30 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          }`}
        >
          <div className="flex items-center gap-3">
            {selectedType ? (
              <>
                <span className="text-lg">{selectedType.icon}</span>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: selectedType.color }}
                  ></div>
                  <span className="text-gray-700 dark:text-white">{selectedType.name}</span>
                </div>
              </>
            ) : (
              <span className="text-gray-500 dark:text-white/60">{placeholder}</span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-500 dark:text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* 下拉選單 */}
        {isOpen && !disabled && (
          <div className="absolute top-full left-0 right-0 mt-1 backdrop-blur bg-slate-900/90 border border-white/20 rounded-xl max-h-60 overflow-y-auto z-[100] shadow-xl">
            <div className="p-2">
              {/* 清除選項 */}
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="w-full p-3 rounded-lg text-left hover:bg-white/10 transition-colors border-l-4 border-l-transparent"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🚫</span>
                  <div className="flex-1">
                    <div className="font-medium text-white/60">無類別</div>
                    <div className="text-xs text-white/40">清除案件類別</div>
                  </div>
                </div>
              </button>
              
              {/* 分隔線 */}
              <div className="h-px bg-white/10 my-2"></div>
              
              {/* 案件類別選項 */}
              {projectTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleSelect(type)}
                  className={`w-full p-3 rounded-lg text-left hover:bg-white/10 transition-colors border-l-4 ${
                    selectedType?.id === type.id 
                      ? 'bg-white/10 border-l-blue-400' 
                      : 'border-l-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{type.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: type.color }}
                        ></div>
                        <div className="font-medium text-white">{type.name}</div>
                      </div>
                      {type.description && (
                        <div className="text-xs text-white/60">{type.description}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 已選擇的類別顯示 */}
      {selectedType && (
        <div 
          className="p-3 rounded-lg border border-white/20"
          style={{ backgroundColor: `${selectedType.color}20` }}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">{selectedType.icon}</span>
            <div className="flex-1">
              <div className="font-medium text-white">
                {selectedType.name}
              </div>
              {selectedType.description && (
                <div className="text-xs mt-1 text-white/80">
                  {selectedType.description}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
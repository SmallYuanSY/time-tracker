"use client"

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, Tag, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WorkCategory {
  id: string
  content: string
  description?: string
  color?: string
  icon?: string
  isActive: boolean
}

interface WorkCategoryMultiSelectProps {
  selectedCategoryIds: string[]
  onChange: (categoryIds: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  required?: boolean
}

export default function WorkCategoryMultiSelect({
  selectedCategoryIds,
  onChange,
  placeholder = "選擇工作分類",
  disabled = false,
  className = "",
  required = false
}: WorkCategoryMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [categories, setCategories] = useState<WorkCategory[]>([])
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 載入工作分類
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/work-categories')
        if (response.ok) {
          const data = await response.json()
          setCategories(data.categories || [])
        }
      } catch (error) {
        console.error('載入工作分類失敗:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCategories()
  }, [])

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

  // 獲取選中的分類
  const selectedCategories = categories.filter(cat => selectedCategoryIds.includes(cat.id))

  // 處理分類選擇
  const handleCategoryToggle = (categoryId: string) => {
    if (selectedCategoryIds.includes(categoryId)) {
      // 移除選擇
      onChange(selectedCategoryIds.filter(id => id !== categoryId))
    } else {
      // 添加選擇
      onChange([...selectedCategoryIds, categoryId])
    }
  }

  // 移除單個分類
  const handleRemoveCategory = (categoryId: string) => {
    onChange(selectedCategoryIds.filter(id => id !== categoryId))
  }

  // 清空所有選擇
  const handleClearAll = () => {
    onChange([])
  }

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <label className="text-sm font-medium flex items-center gap-2 text-white">
          <Tag className="h-4 w-4" />
          工作分類 {required && <span className="text-red-500">*</span>}
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
        <Tag className="h-4 w-4" />
        工作分類 {required && <span className="text-red-500">*</span>}
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
          <div className="flex-1 min-w-0">
            {selectedCategories.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedCategories.map((category) => (
                  <span
                    key={category.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-100 rounded-md text-xs"
                  >
                    {category.icon && <span>{category.icon}</span>}
                    <span>{category.content}</span>
                    {!disabled && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveCategory(category.id)
                        }}
                        className="hover:text-red-300 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
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
              {/* 清空按鈕 */}
              {selectedCategories.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="w-full p-3 rounded-lg text-left hover:bg-white/10 transition-colors border-l-4 border-l-red-400"
                  >
                    <div className="flex items-center gap-3">
                      <X className="h-4 w-4 text-red-400" />
                      <div className="flex-1">
                        <div className="font-medium text-white">清空所有選擇</div>
                        <div className="text-xs text-white/60">取消選擇所有工作分類</div>
                      </div>
                    </div>
                  </button>
                  <div className="h-px bg-white/10 my-2"></div>
                </>
              )}
              
              {/* 分類選項 */}
              {categories.map((category) => {
                const isSelected = selectedCategoryIds.includes(category.id)
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategoryToggle(category.id)}
                    className={`w-full p-3 rounded-lg text-left hover:bg-white/10 transition-colors border-l-4 ${
                      isSelected 
                        ? 'bg-white/10 border-l-blue-400' 
                        : 'border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {category.icon && <span className="text-lg">{category.icon}</span>}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {category.color && (
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: category.color }}
                            ></div>
                          )}
                          <div className="font-medium text-white">{category.content}</div>
                        </div>
                        {category.description && (
                          <div className="text-xs text-white/60">{category.description}</div>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-green-400" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 選擇摘要 */}
      {selectedCategories.length > 0 && (
        <div className="text-sm text-gray-600 dark:text-white/70">
          已選擇 {selectedCategories.length} 個工作分類
        </div>
      )}
    </div>
  )
}
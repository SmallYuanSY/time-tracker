"use client"

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Layers } from 'lucide-react'
import { workCategories as defaultCategories, WorkCategory, getWorkCategoryByContent } from '@/lib/data/workCategories'

interface CategorySelectorProps {
  value: string
  onChange: (category: WorkCategory) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  required?: boolean
}

export default function CategorySelector({
  value,
  onChange,
  placeholder = "選擇工作分類",
  disabled = false,
  className = "",
  required = false
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [categories, setCategories] = useState<WorkCategory[]>(defaultCategories)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // 載入資料庫中的工作分類
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/work-categories')
        if (response.ok) {
          const data = await response.json()
          
          // 將資料庫分類轉換為 WorkCategory 格式
          const dbCategories: WorkCategory[] = data.categories.map((cat: any) => ({
            id: cat.categoryId,
            title: cat.title,
            content: cat.content,
            color: {
              bg: cat.colorBg,
              text: cat.colorText,
              border: cat.colorBorder,
              accent: cat.colorAccent
            },
            icon: cat.icon,
            description: cat.description
          }))
          
          // 如果資料庫有分類，使用資料庫的；否則使用預設的
          if (dbCategories.length > 0) {
            setCategories(dbCategories)
          }
        }
      } catch (error) {
        console.error('載入工作分類失敗:', error)
        // 發生錯誤時使用預設分類
      } finally {
        setLoading(false)
      }
    }

    loadCategories()
  }, [])
  
  // 獲取當前選中的分類
  const selectedCategory = getWorkCategoryByContent(value) || 
    categories.find(cat => cat.content === value || cat.title === value || cat.id === value)

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

  // 處理分類選擇
  const handleSelect = (category: WorkCategory) => {
    onChange(category)
    setIsOpen(false)
  }

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <label className="text-sm font-medium flex items-center gap-2 text-white">
          <Layers className="h-4 w-4" />
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
      <label className="text-sm font-medium flex items-center gap-2 text-white">
        <Layers className="h-4 w-4" />
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
              ? 'bg-white/10 border-white/20 cursor-not-allowed text-white/50' 
              : 'bg-white/20 border-white/30 text-white hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          } ${selectedCategory ? selectedCategory.color.border : ''}`}
        >
          <div className="flex items-center gap-3">
            {selectedCategory ? (
              <>
                {selectedCategory.icon && (
                  <span className="text-lg">{selectedCategory.icon}</span>
                )}
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${selectedCategory.color.accent}`}></div>
                  <span className={selectedCategory.color.text}>{selectedCategory.title}</span>
                </div>
              </>
            ) : (
              <span className="text-white/60">{placeholder}</span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* 下拉選單 */}
        {isOpen && !disabled && (
          <div className="category-selector-dropdown absolute top-full left-0 right-0 mt-1 backdrop-blur bg-linear-60 from-purple-700/70 to-violet-600/70 border border-purple-500/30 rounded-xl max-h-60 overflow-y-auto z-[100] shadow-xl">
            <div className="p-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleSelect(category)}
                  className={`w-full p-3 rounded-lg text-left hover:bg-purple-800/50 transition-colors border-l-4 ${
                    selectedCategory?.id === category.id 
                      ? 'bg-purple-800/70 border-l-purple-300' 
                      : 'border-l-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {category.icon && (
                      <span className="text-lg">{category.icon}</span>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-3 h-3 rounded-full ${category.color.accent}`}></div>
                        <div className="font-medium text-white">{category.title}</div>
                      </div>
                      {category.description && (
                        <div className="text-xs text-purple-200">{category.description}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 已選擇的分類顯示 */}
      {selectedCategory && (
        <div className={`p-3 rounded-lg border ${selectedCategory.color.bg} ${selectedCategory.color.border}`}>
          <div className="flex items-center gap-3">
            {selectedCategory.icon && (
              <span className="text-lg">{selectedCategory.icon}</span>
            )}
            <div className="flex-1">
              <div className={`font-medium ${selectedCategory.color.text}`}>
                {selectedCategory.title}
              </div>
              {selectedCategory.description && (
                <div className={`text-xs mt-1 ${selectedCategory.color.text} opacity-80`}>
                  {selectedCategory.description}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
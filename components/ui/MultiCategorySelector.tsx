"use client"

import { useState } from 'react'
import { Layers } from 'lucide-react'
import { workCategories as defaultCategories, WorkCategory } from '@/lib/data/workCategories'
import { cn } from '@/lib/utils'

interface MultiCategorySelectorProps {
  value: string[]
  onChange: (categories: string[]) => void
  disabled?: boolean
  className?: string
}

export default function MultiCategorySelector({
  value,
  onChange,
  disabled = false,
  className = ""
}: MultiCategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const handleToggleCategory = (categoryContent: string) => {
    if (value.includes(categoryContent)) {
      onChange(value.filter(v => v !== categoryContent))
    } else {
      onChange([...value, categoryContent])
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium flex items-center gap-2">
        <Layers className="h-4 w-4" />
        工作分類
      </label>
      
      <div className="flex flex-wrap gap-2">
        {defaultCategories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => handleToggleCategory(category.content)}
            disabled={disabled}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2",
              value.includes(category.content)
                ? "bg-primary/20 border-primary/30 text-primary"
                : "bg-muted/20 border-muted/30 text-muted-foreground hover:bg-muted/30",
              "border",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {category.icon && (
              <span className="text-base">{category.icon}</span>
            )}
            {category.title}
          </button>
        ))}
      </div>
    </div>
  )
} 
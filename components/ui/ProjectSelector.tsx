"use client"

import { useEffect, useRef } from 'react'
import { Clock, Building2, Plus } from 'lucide-react'
import { useProjectSelection, Project } from '@/lib/hooks/useProjectSelection'
import CategorySelector from '@/components/ui/CategorySelector'
import { WorkCategory } from '@/lib/data/workCategories'
import { extraTasks } from '@/lib/data/extraTasks'

interface ProjectSelectorProps {
  selectedProjects: Project[]
  onProjectSelect: (project: Project) => void
  onProjectRemove: (code: string) => void
  onProjectCodeChange?: (code: string, project: Project | null) => void
  onNewProject?: (code: string, name: string) => void
  projectCode?: string
  projectName?: string
  onProjectCodeInputChange?: (code: string) => void
  onProjectNameChange?: (name: string) => void
  onCategoryChange?: (category: string) => void // 新增分類變更回調
  disabled?: boolean
  showRecentProjects?: boolean
  showExtraTasks?: boolean
  showCategorySelector?: boolean // 是否顯示分類選擇器
  categoryValue?: string // 當前分類值
  className?: string
}

export default function ProjectSelector({
  selectedProjects,
  onProjectSelect,
  onProjectRemove,
  onProjectCodeChange,
  onNewProject,
  projectCode = '',
  projectName = '',
  onProjectCodeInputChange,
  onProjectNameChange,
  onCategoryChange,
  disabled = false,
  showRecentProjects = true,
  showExtraTasks = false,
  showCategorySelector = false,
  categoryValue = '',
  className = ''
}: ProjectSelectorProps) {
  const {
    filteredProjects,
    showProjectDropdown,
    isNewProject,
    recentProjects,
    extraTasks,
    handleProjectCodeChange,
    selectProject,
    closeDropdown,
    setIsNewProject
  } = useProjectSelection(selectedProjects)

  const dropdownRef = useRef<HTMLDivElement>(null)

  // 處理專案編號輸入
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value
    onProjectCodeInputChange?.(code)
    
    const result = handleProjectCodeChange(code)
    if (result && onProjectCodeChange) {
      onProjectCodeChange(code, result)
    } else if (onProjectCodeChange) {
      onProjectCodeChange(code, null)
    }
  }

  // 處理專案選擇
  const handleSelectProject = (project: Project) => {
    const selected = selectProject(project)
    onProjectSelect(selected)
  }

  // 處理新專案確認
  const handleConfirmNewProject = () => {
    if (projectCode && projectName && onNewProject) {
      onNewProject(projectCode, projectName)
      setIsNewProject(false)
    }
  }

  // 處理分類選擇
  const handleCategorySelect = (category: WorkCategory) => {
    if (onCategoryChange) {
      onCategoryChange(category.content)
    }
  }

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdown()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [closeDropdown])

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 最近使用的專案 */}
      {showRecentProjects && recentProjects.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2 text-white">
            <Clock className="h-4 w-4" />
            最近使用
          </label>
          <div className="flex gap-2 flex-wrap">
            {recentProjects.map((project) => (
              <button
                key={project.projectCode}
                type="button"
                onClick={() => handleSelectProject(project)}
                disabled={disabled}
                className={`px-3 py-1 rounded-full border text-xs transition-colors ${
                  selectedProjects.find(p => p.projectCode === project.projectCode)
                    ? 'bg-green-500/30 border-green-400 text-green-100'
                    : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                [{project.projectCode}] {project.projectName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 專案搜尋輸入 */}
      <div className="relative" ref={dropdownRef}>
        <label className="text-sm font-medium flex items-center gap-2 text-white mb-2">
          <Building2 className="h-4 w-4" />
          專案編號
        </label>
        <input 
          name="projectCode" 
          placeholder="輸入2位數自動搜尋專案" 
          value={projectCode} 
          onChange={handleCodeChange}
          disabled={disabled}
          className={`w-full rounded-xl bg-white/20 border border-white/30 px-4 py-2 text-white placeholder:text-white/60 focus:outline-none ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        />

        {/* 專案下拉選單 */}
        {showProjectDropdown && filteredProjects.length > 0 && !disabled && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur border border-white/30 rounded-xl max-h-40 overflow-y-auto z-10 shadow-lg">
            <div className="px-4 py-2 bg-blue-500/20 text-blue-800 text-xs font-medium border-b border-white/20">
              找到 {filteredProjects.length} 個相關專案
            </div>
            {filteredProjects.map((project, index) => (
              <div
                key={index}
                onClick={() => handleSelectProject(project)}
                className="px-4 py-3 hover:bg-blue-500/20 cursor-pointer border-b border-white/20 last:border-b-0 transition-colors"
              >
                <div className="text-gray-800 font-bold text-sm">{project.projectCode}</div>
                <div className="text-gray-700 text-sm font-medium">{project.projectName}</div>
                <div className="text-gray-500 text-xs mt-1 bg-gray-100 px-2 py-1 rounded inline-block">{project.category}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 專案名稱輸入 */}
      <div className="relative">
        <label className="text-sm font-medium text-white mb-2 block">專案名稱</label>
        <input
          name="projectName"
          placeholder={isNewProject ? "請輸入新專案名稱" : "請先輸入專案編號"}
          value={projectName}
          onChange={(e) => onProjectNameChange?.(e.target.value)}
          disabled={disabled || (!isNewProject && !projectCode)}
          className={`w-full rounded-xl border px-4 py-2 text-white placeholder:text-white/60 focus:outline-none ${
            (!isNewProject && !projectCode) || disabled
              ? 'bg-white/10 border-white/20 cursor-not-allowed text-white/50' 
              : 'bg-white/20 border-white/30'
          }`}
        />
      </div>

      {/* 新專案提示與確認按鈕 */}
      {isNewProject && !disabled && (
        <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-3 text-blue-100 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>這是新專案，請填寫專案名稱</span>
            </div>
            {projectCode && projectName && (
              <button
                type="button"
                onClick={handleConfirmNewProject}
                className="ml-3 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors font-medium"
              >
                ✓ 確認新增
              </button>
            )}
          </div>
        </div>
      )}

      {/* 已選擇的專案 */}
      {selectedProjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedProjects.map(project => (
            <span key={project.projectCode} className="bg-blue-500/20 text-white text-sm px-2 py-1 rounded-full flex items-center gap-1">
              {project.projectCode} {project.projectName}
              {!disabled && (
                <button 
                  type="button" 
                  onClick={() => onProjectRemove(project.projectCode)} 
                  className="ml-1 hover:text-red-300 transition-colors"
                >
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* 工作分類選擇器 */}
      {showCategorySelector && (
        <CategorySelector
          value={categoryValue}
          onChange={handleCategorySelect}
          disabled={disabled}
          required={false}
        />
      )}
    </div>
  )
} 
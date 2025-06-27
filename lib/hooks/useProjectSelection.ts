"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

export interface Project {
  projectCode: string
  projectName: string
  category: string
}

export const useProjectSelection = (initialProjects: Project[] = []) => {
  const { data: session } = useSession()
  
  // 狀態管理
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [isNewProject, setIsNewProject] = useState(false)
  const [selectedProjects, setSelectedProjects] = useState<Project[]>(initialProjects)
  const [recentProjects, setRecentProjects] = useState<Project[]>([])

  // 額外的工作類型
  const extraTasks: Project[] = [
    { projectCode: '01', projectName: '非特定工作', category: '' },
    { projectCode: '09', projectName: '公司內務', category: '' },
  ]

  // 載入用戶的專案列表
  const loadProjects = useCallback(async () => {
    if (!session?.user) return

    try {
      const userId = (session.user as any).id
      const response = await fetch(`/api/projects?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('載入專案列表失敗:', error)
      }
    }
  }, [session])

  // 載入最近使用的專案
  const loadRecentProjects = useCallback(async () => {
    if (!session?.user) return

    try {
      const userId = (session.user as any).id
      const response = await fetch(`/api/worklog?userId=${userId}&date=${new Date().toISOString().split('T')[0]}`)
      if (response.ok) {
        const workLogs = await response.json()
        // 提取最近使用的專案
        const uniqueProjects = workLogs.reduce((acc: Project[], log: any) => {
          const existing = acc.find(p => p.projectCode === log.projectCode)
          if (!existing) {
            acc.push({
              projectCode: log.projectCode,
              projectName: log.projectName,
              category: log.category,
            })
          }
          return acc
        }, [])
        setRecentProjects(uniqueProjects.slice(0, 5)) // 取最近5個
      }
    } catch (error) {
      console.error('載入最近專案失敗:', error)
    }
  }, [session])

  // 初始載入
  useEffect(() => {
    if (session?.user) {
      loadProjects()
      loadRecentProjects()
    }
  }, [session, loadProjects, loadRecentProjects])

  // 處理專案編號輸入
  const handleProjectCodeChange = useCallback((code: string) => {
    // 當輸入兩位數或更多時，嘗試搜尋專案
    if (code.length >= 2) {
      // 搜尋現有專案（精確匹配開頭）
      const matchingProjects = projects.filter(p => 
        p.projectCode.toLowerCase().startsWith(code.toLowerCase())
      )
      
      setFilteredProjects(matchingProjects)
      
      if (matchingProjects.length > 0) {
        setShowProjectDropdown(true)
        setIsNewProject(false)

        // 如果只有一個完全匹配的專案，返回它
        const exactMatch = matchingProjects.find(p =>
          p.projectCode.toLowerCase() === code.toLowerCase()
        )
        if (exactMatch) {
          return exactMatch
        }
      } else {
        // 沒有找到現有專案，顯示新建專案模式
        setIsNewProject(true)
        setShowProjectDropdown(false)
      }
    } else {
      setShowProjectDropdown(false)
      setIsNewProject(false)
    }
    
    return null
  }, [projects])

  // 選擇現有專案
  const selectProject = useCallback((project: Project) => {
    setSelectedProjects(prev => {
      if (prev.find(p => p.projectCode === project.projectCode)) return prev
      return [...prev, project]
    })
    setShowProjectDropdown(false)
    setIsNewProject(false)
    return project
  }, [])

  // 移除專案
  const removeProject = useCallback((code: string) => {
    setSelectedProjects(prev => prev.filter(p => p.projectCode !== code))
  }, [])

  // 切換額外工作類型
  const toggleExtraTask = useCallback((task: Project) => {
    setSelectedProjects(prev => {
      const exists = prev.find(p => p.projectCode === task.projectCode)
      if (exists) {
        return prev.filter(p => p.projectCode !== task.projectCode)
      } else {
        return [...prev, task]
      }
    })
  }, [])

  // 清空所有選擇
  const clearSelection = useCallback(() => {
    setSelectedProjects([])
    setShowProjectDropdown(false)
    setIsNewProject(false)
  }, [])

  // 關閉下拉選單
  const closeDropdown = useCallback(() => {
    setShowProjectDropdown(false)
  }, [])

  return {
    // 狀態
    projects,
    filteredProjects,
    showProjectDropdown,
    isNewProject,
    selectedProjects,
    recentProjects,
    extraTasks,
    
    // 方法
    handleProjectCodeChange,
    selectProject,
    removeProject,
    toggleExtraTask,
    clearSelection,
    closeDropdown,
    loadProjects,
    loadRecentProjects,
    
    // 設置狀態的方法
    setSelectedProjects,
    setIsNewProject,
    setShowProjectDropdown,
  }
} 
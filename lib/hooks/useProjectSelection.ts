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
      const response = await fetch(`/api/projects?includeContacts=true`)
      if (response.ok) {
        const data = await response.json()
        const convertedProjects = data.map((p: any) => ({
          projectCode: p.code || p.projectCode,
          projectName: p.name || p.projectName,
          category: p.category || ''
        }))
        setProjects(convertedProjects)
      }
    } catch (error) {
      console.error('載入專案列表失敗:', error)
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

  // 處理專案代號輸入
  const handleProjectCodeChange = useCallback((code: string): Project | null => {
    if (!code) {
      setFilteredProjects([])
      setShowProjectDropdown(false)
      setIsNewProject(false)
      return null
    }

    const searchLower = code.toLowerCase()
    const filtered = [...extraTasks, ...projects].filter(project => 
      project.projectCode.toLowerCase().startsWith(searchLower)
    )

    setFilteredProjects(filtered)
    setShowProjectDropdown(filtered.length > 0)

    // 檢查是否為新專案
    const exactMatch = filtered.find(
      project => project.projectCode.toLowerCase() === searchLower
    )
    setIsNewProject(!exactMatch && code.length > 0)

    return exactMatch || null
  }, [projects])

  // 選擇專案
  const selectProject = useCallback((project: Project): Project => {
    setSelectedProjects(prev => {
      const exists = prev.some(p => p.projectCode === project.projectCode)
      if (exists) return prev
      return [...prev, project]
    })
    setShowProjectDropdown(false)
    return project
  }, [])

  // 關閉下拉選單
  const closeDropdown = useCallback(() => {
    setShowProjectDropdown(false)
  }, [])

  return {
    projects,
    filteredProjects,
    showProjectDropdown,
    setShowProjectDropdown,
    isNewProject,
    setIsNewProject,
    selectedProjects,
    recentProjects,
    extraTasks,
    handleProjectCodeChange,
    selectProject,
    closeDropdown,
    loadProjects,
  }
} 
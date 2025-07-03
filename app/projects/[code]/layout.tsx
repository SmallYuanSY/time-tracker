'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ProjectLayout } from '@/components/layouts/ProjectLayout'
import { Project } from '@/types/project'

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams() as { code: string }
  const [project, setProject] = useState<Project | null>(null)

  useEffect(() => {
    const fetchProject = async () => {
      const response = await fetch(`/api/projects/${params.code}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data)
      }
    }

    fetchProject()
  }, [params.code])

  if (!project) {
    return <div className="flex items-center justify-center min-h-screen">載入中...</div>
  }

  return <ProjectLayout project={project}>{children}</ProjectLayout>
} 
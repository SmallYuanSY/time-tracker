'use client'

import { Card } from '@/components/ui/card'

export default function ProjectMembersPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">專案成員</h1>
      </div>
      
      <div className="grid gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">專案管理者</h2>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="font-medium">管理者名稱</p>
                <p className="text-sm text-gray-500">manager@example.com</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">專案成員列表</h2>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="font-medium">成員名稱</p>
                  <p className="text-sm text-gray-500">member@example.com</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
} 
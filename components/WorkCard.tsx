// components/WorkCard.tsx
export default function WorkCard({ data }: { data: any }) {
    return (
      <div className="relative rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-md p-4 transition-all hover:shadow-xl dark:border-white/10 dark:bg-white/5">
        <div className="text-xs text-gray-300">
          {new Date(data.startTime).toLocaleTimeString()} - {new Date(data.endTime).toLocaleTimeString()}
        </div>
        <div className="text-lg font-semibold text-white drop-shadow">{data.projectCode} {data.projectName}</div>
        <div className="text-sm text-gray-200">{data.category}</div>
        <div className="mt-1 text-white">{data.content}</div>
  
        {/* 邊框光暈效果 */}
        <div className="absolute inset-0 rounded-2xl border border-white/10 ring-1 ring-white/10 pointer-events-none" />
      </div>
    )
  }
  
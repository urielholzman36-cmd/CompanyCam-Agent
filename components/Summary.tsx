'use client'
import { ProcessedPhoto } from '@/types'

interface Props {
  photos: ProcessedPhoto[]
  projectName: string
}

export default function Summary({ photos, projectName }: Props) {
  const folderMap: Record<string, { count: number; isUnclassified: boolean; label: string }> = {}

  for (const photo of photos) {
    if (photo.status !== 'done') continue
    const key = photo.driveFolderId
    if (!folderMap[key]) {
      const label = photo.keyword === 'unclassified'
        ? 'Unclassified'
        : `${photo.keyword.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} ${photo.city}`
      folderMap[key] = { count: 0, isUnclassified: photo.keyword === 'unclassified', label }
    }
    folderMap[key].count++
  }

  const firstDone = photos.find((p) => p.status === 'done' && p.projectFolderUrl)

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-1">Done!</h1>
      <p className="text-gray-400 text-sm mb-8">All files saved to Google Drive — {projectName}</p>

      <div className="space-y-2 mb-8">
        {Object.entries(folderMap).map(([key, { count, isUnclassified, label }]) => (
          <div key={key} className="bg-navy rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-300">📁 {label}/</span>
            <span className={`text-sm font-semibold ${isUnclassified ? 'text-red-400' : 'text-green-400'}`}>
              {count} photo{count !== 1 ? 's' : ''}
            </span>
          </div>
        ))}
      </div>

      {firstDone && (
        <a
          href={firstDone.projectFolderUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center bg-navy border border-brand-blue text-brand-cyan rounded-lg py-3 font-semibold hover:bg-navy-light transition-colors"
        >
          Open Project Folder in Drive ↗
        </a>
      )}
    </div>
  )
}

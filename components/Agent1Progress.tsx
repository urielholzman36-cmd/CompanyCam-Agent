'use client'
import { useState, useEffect, useRef } from 'react'
import { CompanyCamProject, CompanyCamPhoto, ProcessedPhoto } from '@/types'
import { getPhotoUrl } from '@/lib/companycam'

interface Props {
  project: CompanyCamProject | null
  onComplete: (photos: ProcessedPhoto[]) => void
}

export default function Agent1Progress({ project, onComplete }: Props) {
  const [photos, setPhotos] = useState<CompanyCamPhoto[]>([])
  const [results, setResults] = useState<ProcessedPhoto[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [loaded, setLoaded] = useState(false)
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const url = project ? `/api/projects/${project.id}/photos` : '/api/photos'
    fetch(url)
      .then((r) => r.json())
      .then((data: CompanyCamPhoto[]) => {
        setPhotos(data)
        setLoaded(true)
      })
  }, [project])

  useEffect(() => {
    if (!loaded || photos.length === 0) return
    processNext(0, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  async function processNext(index: number, accumulated: ProcessedPhoto[]) {
    if (index >= photos.length) {
      onComplete(accumulated)
      return
    }

    setCurrentIndex(index)
    const photo = photos[index]
    const photoUrl = getPhotoUrl(photo)
    const coord = photo.coordinates?.[0]
    const projectName = project?.name ?? 'All Photos'

    try {
      const res = await fetch('/api/process-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoId: photo.id,
          photoUrl,
          projectName,
          lat: coord?.lat,
          lon: coord?.lon,
        }),
      })
      const data = await res.json()
      const processed: ProcessedPhoto = res.ok
        ? { ...data, originalUrl: photoUrl, status: 'done' }
        : {
            id: photo.id, originalUrl: photoUrl, keyword: 'error', confidence: 'low',
            city: 'Unknown', filename: '', driveFileId: '', driveFolderId: '', driveFolderUrl: '',
            projectFolderId: '', projectFolderUrl: '', status: 'failed', error: data.error,
          }

      const next = [...accumulated, processed]
      setResults(next)
      processNext(index + 1, next)
    } catch {
      const failed: ProcessedPhoto = {
        id: photo.id, originalUrl: photoUrl, keyword: 'error', confidence: 'low',
        city: 'Unknown', filename: '', driveFileId: '', driveFolderId: '', driveFolderUrl: '',
        projectFolderId: '', projectFolderUrl: '', status: 'failed', error: 'Network error',
      }
      const next = [...accumulated, failed]
      setResults(next)
      processNext(index + 1, next)
    }
  }

  const total = photos.length
  const done = results.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Agent 1 — Processing Photos</h1>
      <p className="text-gray-400 text-sm mb-6">{project?.name ?? 'All Photos'}</p>

      <div className="bg-navy rounded-lg h-2 mb-6">
        <div
          className="h-2 rounded-lg bg-gradient-to-r from-brand-orange to-yellow-400 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm text-gray-400 mb-4">{done} of {total} photos processed</p>

      <div className="space-y-2">
        {photos.map((photo, i) => {
          const result = results.find((r) => r.id === photo.id)
          const isActive = i === currentIndex && !result
          return (
            <div key={photo.id} className="bg-navy rounded-lg px-4 py-3 flex items-center gap-3 text-sm">
              {result?.status === 'done' && <span className="text-green-400">✅</span>}
              {result?.status === 'failed' && <span className="text-red-400">❌</span>}
              {isActive && <span className="text-yellow-400">⏳</span>}
              {!result && !isActive && <span className="text-gray-600">○</span>}
              <span className="text-gray-300 truncate">{result?.filename || `photo ${i + 1}`}</span>
              {result?.keyword && result.status === 'done' && (
                <span className="ml-auto text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded">{result.keyword}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

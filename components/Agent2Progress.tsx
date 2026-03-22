'use client'
import { useState, useEffect, useRef } from 'react'
import { ProcessedPhoto, AfterPhoto } from '@/types'

interface Props {
  photos: ProcessedPhoto[]
  onComplete: () => void
}

export default function Agent2Progress({ photos, onComplete }: Props) {
  const [results, setResults] = useState<AfterPhoto[]>([])
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true
    processNext(0, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function processNext(index: number, accumulated: AfterPhoto[]) {
    if (index >= photos.length) {
      onComplete()
      return
    }

    const photo = photos[index]
    try {
      const res = await fetch('/api/generate-after', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveFileId: photo.driveFileId,
          driveFolderId: photo.driveFolderId,
          keyword: photo.keyword,
          city: photo.city,
        }),
      })
      const data = await res.json()
      const result: AfterPhoto = res.ok
        ? { originalDriveFileId: photo.driveFileId, filename: data.filename, driveFileId: data.driveFileId, status: 'done' }
        : { originalDriveFileId: photo.driveFileId, filename: '', driveFileId: '', status: 'failed', error: data.error }

      const next = [...accumulated, result]
      setResults(next)
      processNext(index + 1, next)
    } catch {
      const failed: AfterPhoto = { originalDriveFileId: photo.driveFileId, filename: '', driveFileId: '', status: 'failed', error: 'Network error' }
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
      <h1 className="text-2xl font-bold mb-1">Agent 2 — Generating After Photos</h1>
      <p className="text-gray-400 text-sm mb-6">Using Krea AI to create renovation after-photos</p>

      <div className="bg-navy rounded-lg h-2 mb-6">
        <div
          className="h-2 rounded-lg bg-gradient-to-r from-brand-blue to-brand-cyan transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm text-gray-400 mb-4">{done} of {total} after photos generated</p>

      <div className="space-y-2">
        {photos.map((photo, i) => {
          const result = results[i]
          return (
            <div key={photo.id} className="bg-navy rounded-lg px-4 py-3 flex items-center gap-3 text-sm">
              {result?.status === 'done' && <span className="text-green-400">✅</span>}
              {result?.status === 'failed' && <span className="text-red-400">❌</span>}
              {!result && i === done && <span className="text-yellow-400">⏳</span>}
              {!result && i > done && <span className="text-gray-600">○</span>}
              <span className="text-gray-300 truncate">{result?.filename || photo.filename}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

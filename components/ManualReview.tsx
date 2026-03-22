'use client'
import { useState } from 'react'
import { ProcessedPhoto } from '@/types'

interface Props {
  photos: ProcessedPhoto[]
  projectName: string
  onGenerate: (selected: ProcessedPhoto[]) => void
}

export default function ManualReview({ photos, projectName, onGenerate }: Props) {
  const [items, setItems] = useState<ProcessedPhoto[]>(photos)
  const [checked, setChecked] = useState<Set<string>>(
    new Set(photos.filter((p) => p.keyword !== 'unclassified' && p.status === 'done').map((p) => p.id))
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const startEdit = (photo: ProcessedPhoto) => {
    setEditingId(photo.id)
    setEditValue(photo.keyword)
  }

  const confirmEdit = async (photo: ProcessedPhoto) => {
    if (editValue === photo.keyword || !editValue.trim()) {
      setEditingId(null)
      return
    }

    setRenaming(photo.id)
    try {
      const res = await fetch('/api/rename-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: photo.driveFileId,
          oldFolderId: photo.driveFolderId,
          newKeyword: editValue.trim().toLowerCase().replace(/\s+/g, '_'),
          city: photo.city,
          projectName,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setItems((prev) =>
          prev.map((p) =>
            p.id === photo.id
              ? {
                  ...p,
                  keyword: editValue.trim().toLowerCase().replace(/\s+/g, '_'),
                  filename: data.filename,
                  driveFolderId: data.driveFolderId,
                  driveFolderUrl: data.driveFolderUrl,
                }
              : p
          )
        )
      }
    } finally {
      setRenaming(null)
      setEditingId(null)
    }
  }

  const selectedPhotos = items.filter((p) => checked.has(p.id))

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Manual Review</h1>
      <p className="text-gray-400 text-sm mb-6">Edit keywords or uncheck photos you don&apos;t want to generate after-photos for.</p>

      <div className="space-y-2 mb-8">
        {items.map((photo) => {
          const isUnclassified = photo.keyword === 'unclassified' || photo.status === 'failed'
          const isEditing = editingId === photo.id
          const isRenaming = renaming === photo.id

          return (
            <div key={photo.id} className="bg-navy rounded-lg px-4 py-3 flex items-center gap-3">
              <input
                type="checkbox"
                checked={checked.has(photo.id)}
                onChange={() => toggle(photo.id)}
                disabled={isUnclassified}
                className="accent-brand-pink w-4 h-4 disabled:opacity-30"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300 truncate">{photo.filename || photo.id}</p>
                <p className="text-xs text-gray-500">{photo.city}</p>
              </div>
              {isEditing ? (
                <div className="flex gap-2 items-center">
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmEdit(photo)}
                    className="bg-navy-dark border border-brand-blue rounded px-2 py-1 text-sm text-white w-44 focus:outline-none"
                    autoFocus
                  />
                  <button onClick={() => confirmEdit(photo)} className="text-xs text-brand-cyan">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-gray-500">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => !isUnclassified && startEdit(photo)}
                  disabled={isRenaming}
                  className={`text-xs px-2 py-1 rounded font-semibold ${
                    isUnclassified
                      ? 'bg-red-900 text-red-300 cursor-default'
                      : 'bg-green-900 text-green-300 hover:bg-green-800 cursor-pointer'
                  }`}
                >
                  {isRenaming ? 'Saving...' : photo.keyword}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={() => onGenerate(selectedPhotos)}
        disabled={selectedPhotos.length === 0}
        className="w-full py-3 rounded-lg font-bold bg-gradient-to-r from-brand-pink to-brand-orange text-white disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Generate After Photos ({selectedPhotos.length} selected)
      </button>
    </div>
  )
}

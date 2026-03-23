'use client'
import { useState, useEffect } from 'react'
import { CompanyCamProject } from '@/types'

interface Props {
  onRun: (project: CompanyCamProject) => void
  onRunAll: () => void
}

export default function ProjectSelector({ onRun, onRunAll }: Props) {
  const [projects, setProjects] = useState<CompanyCamProject[]>([])
  const [selected, setSelected] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setProjects(data)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleRun = () => {
    const project = projects.find((p) => p.id === selected)
    if (project) onRun(project)
  }

  return (
    <div className="max-w-lg mx-auto mt-20">
      <h1 className="text-2xl font-bold mb-2">Select a CompanyCam Project</h1>
      <p className="text-gray-400 mb-8 text-sm">Agent 1 will fetch and classify all photos in the project.</p>

      {loading && <p className="text-gray-400">Loading projects...</p>}
      {error && <p className="text-red-400 mb-4">Error: {error}</p>}

      {!loading && !error && (
        <>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full bg-navy border border-navy-light rounded-lg px-4 py-3 text-white mb-4 focus:outline-none focus:border-brand-blue"
          >
            <option value="">Select a project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <button
            onClick={handleRun}
            disabled={!selected}
            className="w-full py-3 rounded-lg font-bold bg-gradient-to-r from-brand-blue to-brand-cyan text-navy-dark disabled:opacity-40 disabled:cursor-not-allowed mb-4"
          >
            Run Agent 1
          </button>

          <div className="text-center text-gray-500 text-sm mb-4">— or —</div>

          <button
            onClick={onRunAll}
            className="w-full py-3 rounded-lg font-bold bg-gradient-to-r from-brand-pink to-brand-orange text-white"
          >
            Fetch All Photos
          </button>
        </>
      )}
    </div>
  )
}

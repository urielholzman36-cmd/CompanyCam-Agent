'use client'
import { useState } from 'react'
import { CompanyCamProject, ProcessedPhoto, AppScreen } from '@/types'
import ProjectSelector from '@/components/ProjectSelector'
import Agent1Progress from '@/components/Agent1Progress'
import ManualReview from '@/components/ManualReview'
import Agent2Progress from '@/components/Agent2Progress'
import Summary from '@/components/Summary'

export default function Home() {
  const [screen, setScreen] = useState<AppScreen>('selector')
  const [project, setProject] = useState<CompanyCamProject | null>(null)
  const [processedPhotos, setProcessedPhotos] = useState<ProcessedPhoto[]>([])
  const [selectedForAgent2, setSelectedForAgent2] = useState<ProcessedPhoto[]>([])

  return (
    <div>
      {screen === 'selector' && (
        <ProjectSelector
          onRun={(p) => {
            setProject(p)
            setScreen('agent1')
          }}
          onRunAll={() => {
            setProject(null)
            setScreen('agent1')
          }}
        />
      )}
      {screen === 'agent1' && (
        <Agent1Progress
          project={project}
          onComplete={(photos) => {
            setProcessedPhotos(photos)
            setScreen('review')
          }}
        />
      )}
      {screen === 'review' && (
        <ManualReview
          photos={processedPhotos}
          projectName={project?.name ?? 'All Photos'}
          onGenerate={(selected) => {
            setSelectedForAgent2(selected)
            setScreen('agent2')
          }}
        />
      )}
      {screen === 'agent2' && (
        <Agent2Progress
          photos={selectedForAgent2}
          onComplete={() => setScreen('summary')}
        />
      )}
      {screen === 'summary' && (
        <Summary
          photos={processedPhotos}
          projectName={project?.name ?? 'All Photos'}
        />
      )}
    </div>
  )
}

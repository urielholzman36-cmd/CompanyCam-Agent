export interface CompanyCamProject {
  id: string
  name: string
  address: {
    street_address_1: string
    city: string
    state: string
    postal_code: string
  }
}

export interface CompanyCamPhoto {
  id: string
  coordinates: { lat: number; lon: number }[]
  uris: { type: string; uri: string; url?: string }[]
}

export type PhotoStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface ProcessedPhoto {
  id: string              // CompanyCam photo ID
  originalUrl: string     // CompanyCam photo URL
  keyword: string         // e.g. "bathroom_remodeling"
  confidence: 'high' | 'low'
  city: string            // e.g. "Chula_Vista"
  filename: string        // e.g. "bathroom_remodeling_Chula_Vista.jpg"
  driveFileId: string
  driveFolderId: string
  driveFolderUrl: string
  projectFolderId: string   // root project folder in Drive (for Summary link)
  projectFolderUrl: string  // webViewLink to the project-level folder
  status: PhotoStatus
  error?: string
}

export interface AfterPhoto {
  originalDriveFileId: string
  filename: string        // e.g. "bathroom_remodeling_Chula_Vista_after.jpg"
  driveFileId: string
  status: PhotoStatus
  error?: string
}

export type AppScreen = 'selector' | 'agent1' | 'review' | 'agent2' | 'summary'

export interface ClassificationResult {
  keyword: string
  confidence: 'high' | 'low'
}

import axios from 'axios'
import { CompanyCamProject, CompanyCamPhoto } from '@/types'

const BASE = 'https://api.companycam.com/v2'
const headers = () => ({
  Authorization: `Bearer ${process.env.COMPANYCAM_API_KEY}`,
  'Content-Type': 'application/json',
})

export function extractCity(address: CompanyCamProject['address']): string {
  return address.city || ''
}

export async function fetchProjects(): Promise<CompanyCamProject[]> {
  const projects: CompanyCamProject[] = []
  let url = `${BASE}/projects?per_page=50`

  while (url) {
    const response = await axios.get(url, { headers: headers() })
    projects.push(...response.data)
    const linkHeader: string = response.headers['link'] || ''
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
    url = nextMatch ? nextMatch[1] : ''
  }

  return projects
}

export async function fetchPhotos(projectId: string): Promise<CompanyCamPhoto[]> {
  const photos: CompanyCamPhoto[] = []
  let url = `${BASE}/projects/${projectId}/photos?per_page=100`

  while (url) {
    const response = await axios.get(url, { headers: headers() })
    photos.push(...response.data)
    const linkHeader: string = response.headers['link'] || ''
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
    url = nextMatch ? nextMatch[1] : ''
  }

  return photos
}

export async function fetchProject(projectId: string): Promise<CompanyCamProject> {
  const response = await axios.get(`${BASE}/projects/${projectId}`, { headers: headers() })
  return response.data
}

export async function fetchAllPhotos(): Promise<CompanyCamPhoto[]> {
  const photos: CompanyCamPhoto[] = []
  let page = 1

  while (true) {
    const response = await axios.get(`${BASE}/photos?per_page=100&page=${page}`, { headers: headers() })
    const batch: CompanyCamPhoto[] = response.data
    if (batch.length === 0) break
    photos.push(...batch)
    page++
  }

  return photos
}

export function getPhotoUrl(photo: CompanyCamPhoto): string {
  const original = photo.uris.find((u) => u.type === 'original')
  const web = photo.uris.find((u) => u.type === 'web')
  const any = photo.uris[0]
  const chosen = original || web || any
  return chosen?.uri || chosen?.url || ''
}

import { NextResponse } from 'next/server'
import { fetchProjects } from '@/lib/companycam'

export async function GET() {
  try {
    const projects = await fetchProjects()
    return NextResponse.json(projects)
  } catch (error) {
    console.error('Failed to fetch CompanyCam projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

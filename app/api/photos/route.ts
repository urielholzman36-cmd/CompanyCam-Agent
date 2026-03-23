import { NextResponse } from 'next/server'
import { fetchAllPhotos } from '@/lib/companycam'

export async function GET() {
  try {
    const photos = await fetchAllPhotos()
    return NextResponse.json(photos)
  } catch (error) {
    console.error('Failed to fetch all photos:', error)
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
  }
}

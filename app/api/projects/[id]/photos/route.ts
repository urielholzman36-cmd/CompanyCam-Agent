import { NextRequest, NextResponse } from 'next/server'
import { fetchPhotos } from '@/lib/companycam'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const photos = await fetchPhotos(params.id)
    return NextResponse.json(photos)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
  }
}

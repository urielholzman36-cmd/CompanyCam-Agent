import { NextRequest, NextResponse } from 'next/server'
import { fetchPhotos } from '@/lib/companycam'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/projects/[id]/photos'>) {
  try {
    const { id } = await ctx.params
    const photos = await fetchPhotos(id)
    return NextResponse.json(photos)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
  }
}

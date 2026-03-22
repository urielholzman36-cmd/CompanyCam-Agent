export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { downloadFile, uploadBuffer, buildFilename } from '@/lib/google-drive'
import { generateAfterPhoto } from '@/lib/krea'

export async function POST(req: NextRequest) {
  try {
    const { driveFileId, driveFolderId, keyword, city } = await req.json()

    if (!driveFileId || !driveFolderId || !keyword || !city) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Download original from Drive
    const originalBuffer = await downloadFile(driveFileId)

    // 2. Generate after photo with Krea
    const afterBuffer = await generateAfterPhoto(originalBuffer)

    // 3. Build after filename and upload (overwrite if exists)
    const afterFilename = buildFilename(keyword, city, true)
    const { fileId } = await uploadBuffer(afterBuffer, afterFilename, driveFolderId, true)

    return NextResponse.json({ filename: afterFilename, driveFileId: fileId })
  } catch (error) {
    console.error('generate-after error:', error)
    return NextResponse.json({ error: 'Failed to generate after photo' }, { status: 500 })
  }
}

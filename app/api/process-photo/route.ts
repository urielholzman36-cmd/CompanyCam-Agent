export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { classifyPhoto } from '@/lib/claude-vision'
import {
  findOrCreateFolder,
  buildFilename,
  buildFolderName,
  getUniqueFilename,
  uploadFile,
  getFolderWebViewLink,
} from '@/lib/google-drive'
import { reverseGeocode } from '@/lib/geocode'

export async function POST(req: NextRequest) {
  try {
    const { photoId, photoUrl, projectName, city: providedCity, lat, lon } = await req.json()

    if (!photoUrl || !projectName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const city = providedCity || (lat != null && lon != null ? await reverseGeocode(lat, lon) : 'Unknown')

    // 1. Classify photo with Claude Vision
    const { keyword, confidence } = await classifyPhoto(photoUrl)
    const finalKeyword = confidence === 'low' ? 'unclassified' : keyword

    // 2. Build folder and file names
    const folderName = buildFolderName(finalKeyword, city)
    const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID!

    // 3. Find or create: root/ProjectName/FolderName/
    const projectFolderId = await findOrCreateFolder(projectName, rootFolderId)
    const subFolderId = await findOrCreateFolder(folderName, projectFolderId)

    // 4. Get unique filename (handles duplicates)
    const baseFilename = buildFilename(finalKeyword, city)
    const uniqueFilename = await getUniqueFilename(baseFilename, subFolderId)

    // 5. Upload photo to Drive
    const { fileId, webViewLink } = await uploadFile(photoUrl, uniqueFilename, subFolderId)

    // 6. Get folder links
    const driveFolderUrl = await getFolderWebViewLink(subFolderId)
    const projectFolderUrl = await getFolderWebViewLink(projectFolderId)

    return NextResponse.json({
      photoId,
      keyword: finalKeyword,
      confidence,
      city,
      filename: uniqueFilename,
      driveFileId: fileId,
      driveFolderId: subFolderId,
      driveFolderUrl,
      projectFolderId,
      projectFolderUrl,
    })
  } catch (error) {
    console.error('process-photo error:', error)
    return NextResponse.json({ error: 'Failed to process photo' }, { status: 500 })
  }
}

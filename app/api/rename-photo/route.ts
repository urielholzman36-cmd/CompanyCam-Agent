export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import {
  findOrCreateFolder,
  buildFilename,
  buildFolderName,
  renameAndMoveFile,
  getFolderWebViewLink,
} from '@/lib/google-drive'

export async function POST(req: NextRequest) {
  try {
    const { fileId, oldFolderId, newKeyword, city, projectName } = await req.json()

    if (!fileId || !oldFolderId || !newKeyword || !city || !projectName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const newFolderName = buildFolderName(newKeyword, city)
    const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID!
    const projectFolderId = await findOrCreateFolder(projectName, rootFolderId)
    const newFolderId = await findOrCreateFolder(newFolderName, projectFolderId)
    const newFilename = buildFilename(newKeyword, city)

    await renameAndMoveFile(fileId, newFilename, newFolderId, oldFolderId)
    const driveFolderUrl = await getFolderWebViewLink(newFolderId)

    return NextResponse.json({ filename: newFilename, driveFolderId: newFolderId, driveFolderUrl })
  } catch (error) {
    console.error('rename-photo error:', error)
    return NextResponse.json({ error: 'Failed to rename photo' }, { status: 500 })
  }
}

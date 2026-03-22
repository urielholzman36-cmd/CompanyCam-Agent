import { google } from 'googleapis'
import { Readable } from 'stream'
import axios from 'axios'

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS!)
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
}

function getDrive() {
  return google.drive({ version: 'v3', auth: getAuth() })
}

// --- Pure utility functions (testable without API calls) ---

export function cityToFileCase(city: string): string {
  return city
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('_')
}

export function buildFilename(keyword: string, city: string, isAfter = false): string {
  const cityPart = cityToFileCase(city)
  const suffix = isAfter ? '_after' : ''
  return `${keyword}_${cityPart}${suffix}.jpg`
}

export function buildFolderName(keyword: string, city: string): string {
  if (keyword === 'unclassified') return 'Unclassified'
  const keywordTitle = keyword
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  return `${keywordTitle} ${city}`
}

// --- Google Drive API functions ---

export async function findOrCreateFolder(name: string, parentId: string): Promise<string> {
  const drive = getDrive()

  const search = await drive.files.list({
    q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
  })

  if (search.data.files && search.data.files.length > 0) {
    return search.data.files[0].id!
  }

  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  })

  return folder.data.id!
}

export async function getUniqueFilename(filename: string, folderId: string): Promise<string> {
  const drive = getDrive()
  const base = filename.replace('.jpg', '')

  const search = await drive.files.list({
    q: `'${folderId}' in parents and name contains '${base}' and trashed=false`,
    fields: 'files(name)',
  })

  const existing = (search.data.files || []).map((f) => f.name!)
  if (!existing.includes(filename)) return filename

  let counter = 2
  while (existing.includes(`${base}_${counter}.jpg`)) counter++
  return `${base}_${counter}.jpg`
}

export async function uploadFile(
  imageUrl: string,
  filename: string,
  folderId: string
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = getDrive()
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' })
  const buffer = Buffer.from(response.data)
  const stream = Readable.from(buffer)

  const file = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType: 'image/jpeg', body: stream },
    fields: 'id,webViewLink',
  })

  return { fileId: file.data.id!, webViewLink: file.data.webViewLink! }
}

export async function uploadBuffer(
  buffer: Buffer,
  filename: string,
  folderId: string,
  overwrite = false
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = getDrive()
  const stream = Readable.from(buffer)

  if (overwrite) {
    const search = await drive.files.list({
      q: `name='${filename}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id)',
    })
    if (search.data.files && search.data.files.length > 0) {
      await drive.files.delete({ fileId: search.data.files[0].id! })
    }
  }

  const file = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType: 'image/jpeg', body: stream },
    fields: 'id,webViewLink',
  })

  return { fileId: file.data.id!, webViewLink: file.data.webViewLink! }
}

export async function renameAndMoveFile(
  fileId: string,
  newFilename: string,
  newFolderId: string,
  oldFolderId: string
): Promise<void> {
  const drive = getDrive()
  await drive.files.update({
    fileId,
    addParents: newFolderId,
    removeParents: oldFolderId,
    requestBody: { name: newFilename },
    fields: 'id',
  })
}

export async function downloadFile(fileId: string): Promise<Buffer> {
  const drive = getDrive()
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  )
  return Buffer.from(response.data as ArrayBuffer)
}

export async function getFolderWebViewLink(folderId: string): Promise<string> {
  const drive = getDrive()
  const folder = await drive.files.get({ fileId: folderId, fields: 'webViewLink' })
  return folder.data.webViewLink!
}

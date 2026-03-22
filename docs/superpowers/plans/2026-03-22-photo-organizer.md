# VO360 Photo Organizer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js web app that uses two AI agents to fetch, classify, rename, and upload CompanyCam project photos to Google Drive, with a manual review step and optional Krea AI after-photo generation.

**Architecture:** Client-driven per-photo processing — the React frontend calls one Next.js API route per photo sequentially, updating the UI after each response. This avoids Vercel function timeouts and gives real-time progress. Four API routes handle: listing projects, processing a single photo (Agent 1), renaming a file in Drive, and generating an after photo (Agent 2).

**Tech Stack:** Next.js 14 (App Router, TypeScript), Tailwind CSS, Anthropic SDK (`@anthropic-ai/sdk`), Google Drive API v3 (`googleapis`), CompanyCam REST API, Krea REST API, Jest for testing.

---

## File Structure

```
photo-organizer/
├── app/
│   ├── layout.tsx                  # Root layout — VO360 nav header
│   ├── page.tsx                    # Screen 1: Project Selector
│   ├── globals.css                 # Tailwind base + VO360 CSS vars
│   └── api/
│       ├── projects/route.ts       # GET  — list CompanyCam projects
│       ├── process-photo/route.ts  # POST — Agent 1: classify + upload one photo
│       ├── rename-photo/route.ts   # POST — rename + move Drive file on keyword edit
│       └── generate-after/route.ts # POST — Agent 2: Krea generation + upload
├── components/
│   ├── ProjectSelector.tsx         # Screen 1 UI
│   ├── Agent1Progress.tsx          # Screen 2 UI — drives the Agent 1 loop
│   ├── ManualReview.tsx            # Screen 3 UI — keyword editing + selection
│   ├── Agent2Progress.tsx          # Screen 4 UI — drives the Agent 2 loop
│   └── Summary.tsx                 # Screen 5 UI
├── lib/
│   ├── companycam.ts               # CompanyCam API client (projects + photos)
│   ├── google-drive.ts             # Google Drive client (auth, folders, upload, rename)
│   ├── claude-vision.ts            # Claude Vision classifier (keyword + confidence)
│   └── krea.ts                     # Krea API client (after-photo generation)
├── types/index.ts                  # All shared TypeScript types
├── __tests__/
│   ├── lib/companycam.test.ts
│   ├── lib/google-drive.test.ts
│   ├── lib/claude-vision.test.ts
│   └── lib/krea.test.ts
├── jest.config.ts
├── jest.setup.ts
├── .env.local                      # Local secrets (gitignored)
└── vercel.json                     # Function timeout config
```

---

## Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `next.config.js`, `tailwind.config.ts`, `tsconfig.json`, `jest.config.ts`, `jest.setup.ts`, `.env.local`, `.gitignore`, `vercel.json`

- [ ] **Step 1: Scaffold Next.js app**

Run in `/Users/urielholzman/photo-organizer`:
```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*"
```
When prompted: answer Yes to all defaults.

- [ ] **Step 2: Install dependencies**

```bash
npm install googleapis @anthropic-ai/sdk axios
npm install --save-dev jest @types/jest ts-jest jest-environment-node
```

- [ ] **Step 3: Configure Jest**

Create `jest.config.ts`:
```typescript
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
}

export default config
```

Create `jest.setup.ts`:
```typescript
// Global test setup
process.env.COMPANYCAM_API_KEY = 'test-companycam-key'
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
process.env.KREA_API_KEY = 'test-krea-key'
process.env.GOOGLE_DRIVE_CREDENTIALS = JSON.stringify({
  type: 'service_account',
  project_id: 'test',
  private_key_id: 'test',
  private_key: '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----\n',
  client_email: 'test@test.iam.gserviceaccount.com',
  client_id: '123',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
})
process.env.GOOGLE_DRIVE_FOLDER_ID = 'test-folder-id'
```

- [ ] **Step 4: Create .env.local**

```bash
cat > .env.local << 'EOF'
COMPANYCAM_API_KEY=your_companycam_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
KREA_API_KEY=your_krea_api_key_here
GOOGLE_DRIVE_CREDENTIALS={"type":"service_account",...paste full JSON here...}
GOOGLE_DRIVE_FOLDER_ID=your_root_drive_folder_id_here
EOF
```

- [ ] **Step 5: Create vercel.json**

```json
{
  "functions": {
    "app/api/process-photo/route.ts": { "maxDuration": 60 },
    "app/api/generate-after/route.ts": { "maxDuration": 60 },
    "app/api/rename-photo/route.ts": { "maxDuration": 30 },
    "app/api/projects/route.ts": { "maxDuration": 15 }
  }
}
```

- [ ] **Step 6: Update .gitignore — confirm `.env.local` is listed**

```bash
grep ".env.local" .gitignore || echo ".env.local" >> .gitignore
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with dependencies and config"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `types/index.ts`

- [ ] **Step 1: Create types**

Create `types/index.ts`:
```typescript
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
  uri: string // direct download URL
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
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: CompanyCam API Client

**Files:**
- Create: `lib/companycam.ts`
- Test: `__tests__/lib/companycam.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/companycam.test.ts`:
```typescript
import { fetchProjects, fetchPhotos, extractCity } from '@/lib/companycam'

// Mock axios
jest.mock('axios')
import axios from 'axios'
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('extractCity', () => {
  it('returns city from address object when available', () => {
    const address = { city: 'Chula Vista', state: 'CA', street_address_1: '123 Main St', postal_code: '91910' }
    expect(extractCity(address)).toBe('Chula Vista')
  })

  it('returns empty string when city is missing', () => {
    const address = { city: '', state: 'CA', street_address_1: '123 Main St, San Diego, CA', postal_code: '92101' }
    expect(extractCity(address)).toBe('')
  })
})

describe('fetchProjects', () => {
  it('returns list of projects from CompanyCam', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [{ id: '1', name: 'Test Project', address: { city: 'Chula Vista', state: 'CA', street_address_1: '123 Main', postal_code: '91910' } }],
      headers: { link: '' },
    })
    const projects = await fetchProjects()
    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe('Test Project')
  })
})

describe('fetchPhotos', () => {
  it('returns all photos for a project', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [{ id: 'p1', uri: 'https://example.com/photo1.jpg' }],
      headers: { link: '' },
    })
    const photos = await fetchPhotos('project-1')
    expect(photos).toHaveLength(1)
    expect(photos[0].uri).toBe('https://example.com/photo1.jpg')
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx jest __tests__/lib/companycam.test.ts --no-coverage
```
Expected: FAIL — "Cannot find module '@/lib/companycam'"

- [ ] **Step 3: Implement CompanyCam client**

Create `lib/companycam.ts`:
```typescript
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
    // Parse Link header for next page
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
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest __tests__/lib/companycam.test.ts --no-coverage
```
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/companycam.ts __tests__/lib/companycam.test.ts
git commit -m "feat: add CompanyCam API client with pagination"
```

---

## Task 4: Claude Vision Client

**Files:**
- Create: `lib/claude-vision.ts`
- Test: `__tests__/lib/claude-vision.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/claude-vision.test.ts`:
```typescript
import { classifyPhoto } from '@/lib/claude-vision'

jest.mock('@anthropic-ai/sdk', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn(),
      },
    })),
  }
})

import Anthropic from '@anthropic-ai/sdk'

describe('classifyPhoto', () => {
  it('returns keyword and high confidence when Claude responds clearly', async () => {
    const mockCreate = jest.fn().mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"keyword":"bathroom_remodeling","confidence":"high"}' }],
    })
    ;(Anthropic as jest.Mock).mockImplementation(() => ({
      messages: { create: mockCreate },
    }))

    const result = await classifyPhoto('https://example.com/photo.jpg')
    expect(result.keyword).toBe('bathroom_remodeling')
    expect(result.confidence).toBe('high')
  })

  it('returns unclassified when Claude returns low confidence', async () => {
    const mockCreate = jest.fn().mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"keyword":"unclear_image","confidence":"low"}' }],
    })
    ;(Anthropic as jest.Mock).mockImplementation(() => ({
      messages: { create: mockCreate },
    }))

    const result = await classifyPhoto('https://example.com/blurry.jpg')
    expect(result.confidence).toBe('low')
  })

  it('returns low confidence when Claude response is invalid JSON', async () => {
    const mockCreate = jest.fn().mockResolvedValueOnce({
      content: [{ type: 'text', text: 'I cannot determine the work type.' }],
    })
    ;(Anthropic as jest.Mock).mockImplementation(() => ({
      messages: { create: mockCreate },
    }))

    const result = await classifyPhoto('https://example.com/photo.jpg')
    expect(result.confidence).toBe('low')
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx jest __tests__/lib/claude-vision.test.ts --no-coverage
```
Expected: FAIL — "Cannot find module '@/lib/claude-vision'"

- [ ] **Step 3: Implement Claude Vision client**

Create `lib/claude-vision.ts`:
```typescript
import Anthropic from '@anthropic-ai/sdk'
import { ClassificationResult } from '@/types'

const PROMPT = `You are analyzing a construction or renovation photo.
Identify the type of work shown in the image and return a JSON response:
{
  "keyword": "snake_case_description_of_work",
  "confidence": "high" | "low"
}
Use short descriptive keywords like "bathroom_remodeling", "roof_inspection", "kitchen_plumbing", "flooring_installation", "window_replacement", "electrical_work", "plumbing_repair", etc.
Return confidence "low" if the image is blurry, unclear, or does not clearly show a specific type of work.
Return only valid JSON, no other text.`

export async function classifyPhoto(imageUrl: string): Promise<ClassificationResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: imageUrl },
            },
            {
              type: 'text',
              text: PROMPT,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text)

    return {
      keyword: parsed.keyword as string,
      confidence: parsed.confidence as 'high' | 'low',
    }
  } catch {
    return { keyword: 'unclassified', confidence: 'low' }
  }
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest __tests__/lib/claude-vision.test.ts --no-coverage
```
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/claude-vision.ts __tests__/lib/claude-vision.test.ts
git commit -m "feat: add Claude Vision classifier with confidence fallback"
```

---

## Task 5: Google Drive Client

**Files:**
- Create: `lib/google-drive.ts`
- Test: `__tests__/lib/google-drive.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/google-drive.test.ts`:
```typescript
import { buildFilename, buildFolderName, cityToFileCase } from '@/lib/google-drive'

describe('cityToFileCase', () => {
  it('converts city name to underscore title case', () => {
    expect(cityToFileCase('Chula Vista')).toBe('Chula_Vista')
    expect(cityToFileCase('San Diego')).toBe('San_Diego')
    expect(cityToFileCase('Phoenix')).toBe('Phoenix')
  })
})

describe('buildFilename', () => {
  it('builds correct original filename', () => {
    expect(buildFilename('bathroom_remodeling', 'Chula Vista')).toBe('bathroom_remodeling_Chula_Vista.jpg')
  })

  it('builds correct after filename', () => {
    expect(buildFilename('bathroom_remodeling', 'Chula Vista', true)).toBe('bathroom_remodeling_Chula_Vista_after.jpg')
  })

  it('builds unclassified filename', () => {
    expect(buildFilename('unclassified', 'Chula Vista')).toBe('unclassified_Chula_Vista.jpg')
  })
})

describe('buildFolderName', () => {
  it('builds title case folder name', () => {
    expect(buildFolderName('bathroom_remodeling', 'Chula Vista')).toBe('Bathroom Remodeling Chula Vista')
  })

  it('handles unclassified keyword', () => {
    expect(buildFolderName('unclassified', 'Chula Vista')).toBe('Unclassified')
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx jest __tests__/lib/google-drive.test.ts --no-coverage
```
Expected: FAIL — "Cannot find module '@/lib/google-drive'"

- [ ] **Step 3: Implement Google Drive client**

Create `lib/google-drive.ts`:
```typescript
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
    // Check if file exists and delete it
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
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest __tests__/lib/google-drive.test.ts --no-coverage
```
Expected: PASS (4 tests — pure utility functions only)

- [ ] **Step 5: Commit**

```bash
git add lib/google-drive.ts __tests__/lib/google-drive.test.ts
git commit -m "feat: add Google Drive client with folder management and file upload"
```

---

## Task 6: Krea API Client

**Files:**
- Create: `lib/krea.ts`
- Test: `__tests__/lib/krea.test.ts`

> **Note:** Before implementing, check the Krea API documentation for the Nano Banana model endpoint, request format (how to pass the input image), and response format (URL or binary). Update the implementation accordingly.

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/krea.test.ts`:
```typescript
import { generateAfterPhoto } from '@/lib/krea'

jest.mock('axios')
import axios from 'axios'
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('generateAfterPhoto', () => {
  it('returns a buffer from Krea API response URL', async () => {
    // Mock the generation call
    mockedAxios.post.mockResolvedValueOnce({
      data: { output_url: 'https://krea.ai/generated/result.jpg' },
    })
    // Mock the download of the generated image
    mockedAxios.get.mockResolvedValueOnce({
      data: Buffer.from('fake-image-data'),
    })

    const inputBuffer = Buffer.from('fake-input-image')
    const result = await generateAfterPhoto(inputBuffer)
    expect(result).toBeInstanceOf(Buffer)
  })

  it('throws on Krea API error', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Krea API error'))
    const inputBuffer = Buffer.from('fake-input-image')
    await expect(generateAfterPhoto(inputBuffer)).rejects.toThrow('Krea API error')
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx jest __tests__/lib/krea.test.ts --no-coverage
```
Expected: FAIL — "Cannot find module '@/lib/krea'"

- [ ] **Step 3: Implement Krea client**

> Check Krea API docs for the exact endpoint and request format before writing this.

Create `lib/krea.ts`:
```typescript
import axios from 'axios'

// TODO: Verify these values against Krea API documentation before deploying
const KREA_API_BASE = 'https://api.krea.ai/v1' // Confirm from docs
const KREA_MODEL = 'nano-banana'                // Confirm exact model ID from docs

export async function generateAfterPhoto(inputImageBuffer: Buffer): Promise<Buffer> {
  const base64Image = inputImageBuffer.toString('base64')

  // Step 1: Submit generation request
  // NOTE: Adjust request body shape to match actual Krea API spec
  const response = await axios.post(
    `${KREA_API_BASE}/generate`,
    {
      model: KREA_MODEL,
      image: base64Image,
      // Add any required parameters from Krea docs (style, strength, etc.)
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.KREA_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )

  // Step 2: Download the generated image
  // NOTE: Adjust based on actual response shape from Krea
  const outputUrl: string = response.data.output_url
  const imageResponse = await axios.get(outputUrl, { responseType: 'arraybuffer' })
  return Buffer.from(imageResponse.data)
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest __tests__/lib/krea.test.ts --no-coverage
```
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/krea.ts __tests__/lib/krea.test.ts
git commit -m "feat: add Krea API client for after-photo generation"
```

---

## Task 7: API Route — GET /api/projects

**Files:**
- Create: `app/api/projects/route.ts`

- [ ] **Step 1: Implement route**

Create `app/api/projects/route.ts`:
```typescript
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
```

- [ ] **Step 2: Smoke test manually**

Start the dev server: `npm run dev`
Visit: `http://localhost:3000/api/projects`
Expected: JSON array of CompanyCam projects (requires real `COMPANYCAM_API_KEY` in `.env.local`).

- [ ] **Step 3: Commit**

```bash
git add app/api/projects/route.ts
git commit -m "feat: add GET /api/projects route"
```

---

## Task 8: API Route — POST /api/process-photo

**Files:**
- Create: `app/api/process-photo/route.ts`

- [ ] **Step 1: Implement route**

Create `app/api/process-photo/route.ts`:
```typescript
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

export async function POST(req: NextRequest) {
  try {
    const { photoId, photoUrl, projectName, city } = await req.json()

    if (!photoUrl || !projectName || !city) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

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
```

- [ ] **Step 2: Commit**

```bash
git add app/api/process-photo/route.ts
git commit -m "feat: add POST /api/process-photo route (Agent 1 core)"
```

---

## Task 9: API Route — POST /api/rename-photo

**Files:**
- Create: `app/api/rename-photo/route.ts`

- [ ] **Step 1: Implement route**

Create `app/api/rename-photo/route.ts`:
```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add app/api/rename-photo/route.ts
git commit -m "feat: add POST /api/rename-photo route for keyword edits"
```

---

## Task 10: API Route — POST /api/generate-after

**Files:**
- Create: `app/api/generate-after/route.ts`

- [ ] **Step 1: Implement route**

Create `app/api/generate-after/route.ts`:
```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add app/api/generate-after/route.ts
git commit -m "feat: add POST /api/generate-after route (Agent 2 core)"
```

---

## Task 11: VO360 Global Styles and Layout

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Add VO360 colors to Tailwind config**

In `tailwind.config.ts`, add inside `theme.extend.colors`:
```typescript
colors: {
  navy: {
    DEFAULT: '#0d1b4b',
    dark: '#080f2a',
    light: '#111e50',
  },
  brand: {
    blue: '#0096ff',
    cyan: '#00d4ff',
    orange: '#f97316',
    pink: '#e91e8c',
  },
}
```

- [ ] **Step 2: Update globals.css**

Replace `app/globals.css` content with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #080f2a;
  --navy: #0d1b4b;
  --blue: #0096ff;
  --cyan: #00d4ff;
  --orange: #f97316;
  --pink: #e91e8c;
}

body {
  background-color: var(--bg);
  color: white;
  font-family: 'Segoe UI', system-ui, sans-serif;
  min-height: 100vh;
}
```

- [ ] **Step 3: Update layout.tsx**

Replace `app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VO360 Photo Organizer',
  description: 'Your Intelligent Execution Partner',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="border-b border-navy-light bg-navy px-6 py-4 flex items-center gap-3">
          <span className="text-xl font-extrabold">
            <span className="text-white">VO</span>
            <span className="bg-gradient-to-r from-brand-blue to-brand-orange bg-clip-text text-transparent">360</span>
          </span>
          <span className="text-sm text-gray-400">Photo Organizer</span>
        </nav>
        <main className="p-6">{children}</main>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/globals.css tailwind.config.ts app/layout.tsx
git commit -m "feat: apply VO360 brand colors and nav layout"
```

---

## Task 12: Screen 1 — Project Selector

**Files:**
- Create: `components/ProjectSelector.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create ProjectSelector component**

Create `components/ProjectSelector.tsx`:
```tsx
'use client'
import { useState, useEffect } from 'react'
import { CompanyCamProject } from '@/types'

interface Props {
  onRun: (project: CompanyCamProject) => void
}

export default function ProjectSelector({ onRun }: Props) {
  const [projects, setProjects] = useState<CompanyCamProject[]>([])
  const [selected, setSelected] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setProjects(data)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleRun = () => {
    const project = projects.find((p) => p.id === selected)
    if (project) onRun(project)
  }

  return (
    <div className="max-w-lg mx-auto mt-20">
      <h1 className="text-2xl font-bold mb-2">Select a CompanyCam Project</h1>
      <p className="text-gray-400 mb-8 text-sm">Agent 1 will fetch and classify all photos in the project.</p>

      {loading && <p className="text-gray-400">Loading projects...</p>}
      {error && <p className="text-red-400 mb-4">Error: {error}</p>}

      {!loading && !error && (
        <>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full bg-navy border border-navy-light rounded-lg px-4 py-3 text-white mb-4 focus:outline-none focus:border-brand-blue"
          >
            <option value="">Select a project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <button
            onClick={handleRun}
            disabled={!selected}
            className="w-full py-3 rounded-lg font-bold bg-gradient-to-r from-brand-blue to-brand-cyan text-navy-dark disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Run Agent 1
          </button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update app/page.tsx**

Replace `app/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { CompanyCamProject, ProcessedPhoto, AppScreen } from '@/types'
import ProjectSelector from '@/components/ProjectSelector'
import Agent1Progress from '@/components/Agent1Progress'
import ManualReview from '@/components/ManualReview'
import Agent2Progress from '@/components/Agent2Progress'
import Summary from '@/components/Summary'

export default function Home() {
  const [screen, setScreen] = useState<AppScreen>('selector')
  const [project, setProject] = useState<CompanyCamProject | null>(null)
  const [processedPhotos, setProcessedPhotos] = useState<ProcessedPhoto[]>([])
  const [selectedForAgent2, setSelectedForAgent2] = useState<ProcessedPhoto[]>([])

  return (
    <div>
      {screen === 'selector' && (
        <ProjectSelector
          onRun={(p) => {
            setProject(p)
            setScreen('agent1')
          }}
        />
      )}
      {screen === 'agent1' && project && (
        <Agent1Progress
          project={project}
          onComplete={(photos) => {
            setProcessedPhotos(photos)
            setScreen('review')
          }}
        />
      )}
      {screen === 'review' && (
        <ManualReview
          photos={processedPhotos}
          projectName={project?.name ?? ''}
          onGenerate={(selected) => {
            setSelectedForAgent2(selected)
            setScreen('agent2')
          }}
        />
      )}
      {screen === 'agent2' && (
        <Agent2Progress
          photos={selectedForAgent2}
          onComplete={() => setScreen('summary')}
        />
      )}
      {screen === 'summary' && (
        <Summary
          photos={processedPhotos}
          projectName={project?.name ?? ''}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ProjectSelector.tsx app/page.tsx
git commit -m "feat: add Screen 1 project selector and app screen state machine"
```

---

## Task 13: Screen 2 — Agent 1 Progress

**Files:**
- Create: `components/Agent1Progress.tsx`

- [ ] **Step 1: Create component**

Create `components/Agent1Progress.tsx`:
```tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { CompanyCamProject, CompanyCamPhoto, ProcessedPhoto } from '@/types'
import { extractCity } from '@/lib/companycam'

interface Props {
  project: CompanyCamProject
  onComplete: (photos: ProcessedPhoto[]) => void
}

export default function Agent1Progress({ project, onComplete }: Props) {
  const [photos, setPhotos] = useState<CompanyCamPhoto[]>([])
  const [results, setResults] = useState<ProcessedPhoto[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [loaded, setLoaded] = useState(false)
  const ranRef = useRef(false)

  const city = extractCity(project.address)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    fetch(`/api/projects/${project.id}/photos`)
      .then((r) => r.json())
      .then((data: CompanyCamPhoto[]) => {
        setPhotos(data)
        setLoaded(true)
      })
  }, [project.id])

  useEffect(() => {
    if (!loaded || photos.length === 0) return
    processNext(0, [])
  }, [loaded])

  async function processNext(index: number, accumulated: ProcessedPhoto[]) {
    if (index >= photos.length) {
      onComplete(accumulated)
      return
    }

    setCurrentIndex(index)
    const photo = photos[index]

    try {
      const res = await fetch('/api/process-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoId: photo.id,
          photoUrl: photo.uri,
          projectName: project.name,
          city,
        }),
      })
      const data = await res.json()
      const processed: ProcessedPhoto = res.ok
        ? { ...data, originalUrl: photo.uri, status: 'done' }
        : { id: photo.id, originalUrl: photo.uri, keyword: 'error', confidence: 'low', city, filename: '', driveFileId: '', driveFolderId: '', driveFolderUrl: '', status: 'failed', error: data.error }

      const next = [...accumulated, processed]
      setResults(next)
      processNext(index + 1, next)
    } catch (e) {
      const failed: ProcessedPhoto = {
        id: photo.id, originalUrl: photo.uri, keyword: 'error', confidence: 'low',
        city, filename: '', driveFileId: '', driveFolderId: '', driveFolderUrl: '',
        status: 'failed', error: 'Network error',
      }
      const next = [...accumulated, failed]
      setResults(next)
      processNext(index + 1, next)
    }
  }

  const total = photos.length
  const done = results.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Agent 1 — Processing Photos</h1>
      <p className="text-gray-400 text-sm mb-6">{project.name}</p>

      <div className="bg-navy rounded-lg h-2 mb-6">
        <div
          className="h-2 rounded-lg bg-gradient-to-r from-brand-orange to-yellow-400 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm text-gray-400 mb-4">{done} of {total} photos processed</p>

      <div className="space-y-2">
        {photos.map((photo, i) => {
          const result = results.find((r) => r.id === photo.id)
          const isActive = i === currentIndex && !result
          return (
            <div key={photo.id} className="bg-navy rounded-lg px-4 py-3 flex items-center gap-3 text-sm">
              {result?.status === 'done' && <span className="text-green-400">✅</span>}
              {result?.status === 'failed' && <span className="text-red-400">❌</span>}
              {isActive && <span className="text-yellow-400">⏳</span>}
              {!result && !isActive && <span className="text-gray-600">○</span>}
              <span className="text-gray-300 truncate">{result?.filename || `photo ${i + 1}`}</span>
              {result?.keyword && result.status === 'done' && (
                <span className="ml-auto text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded">{result.keyword}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the photos API route**

Create `app/api/projects/[id]/photos/route.ts`:
```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add components/Agent1Progress.tsx app/api/projects/
git commit -m "feat: add Screen 2 Agent 1 progress and photos API route"
```

---

## Task 14: Screen 3 — Manual Review

**Files:**
- Create: `components/ManualReview.tsx`

- [ ] **Step 1: Create component**

Create `components/ManualReview.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { ProcessedPhoto } from '@/types'

interface Props {
  photos: ProcessedPhoto[]
  projectName: string
  onGenerate: (selected: ProcessedPhoto[]) => void
}

export default function ManualReview({ photos, projectName, onGenerate }: Props) {
  const [items, setItems] = useState<ProcessedPhoto[]>(photos)
  const [checked, setChecked] = useState<Set<string>>(
    new Set(photos.filter((p) => p.keyword !== 'unclassified' && p.status === 'done').map((p) => p.id))
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const startEdit = (photo: ProcessedPhoto) => {
    setEditingId(photo.id)
    setEditValue(photo.keyword)
  }

  const confirmEdit = async (photo: ProcessedPhoto) => {
    if (editValue === photo.keyword || !editValue.trim()) {
      setEditingId(null)
      return
    }

    setRenaming(photo.id)
    try {
      const res = await fetch('/api/rename-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: photo.driveFileId,
          oldFolderId: photo.driveFolderId,
          newKeyword: editValue.trim().toLowerCase().replace(/\s+/g, '_'),
          city: photo.city,
          projectName,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setItems((prev) =>
          prev.map((p) =>
            p.id === photo.id
              ? { ...p, keyword: editValue.trim().toLowerCase().replace(/\s+/g, '_'), filename: data.filename, driveFolderId: data.driveFolderId, driveFolderUrl: data.driveFolderUrl }
              : p
          )
        )
      }
    } finally {
      setRenaming(null)
      setEditingId(null)
    }
  }

  const selectedPhotos = items.filter((p) => checked.has(p.id))

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Manual Review</h1>
      <p className="text-gray-400 text-sm mb-6">Edit keywords or uncheck photos you don't want to generate after-photos for.</p>

      <div className="space-y-2 mb-8">
        {items.map((photo) => {
          const isUnclassified = photo.keyword === 'unclassified' || photo.status === 'failed'
          const isEditing = editingId === photo.id
          const isRenaming = renaming === photo.id

          return (
            <div key={photo.id} className="bg-navy rounded-lg px-4 py-3 flex items-center gap-3">
              <input
                type="checkbox"
                checked={checked.has(photo.id)}
                onChange={() => toggle(photo.id)}
                disabled={isUnclassified}
                className="accent-brand-pink w-4 h-4 disabled:opacity-30"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300 truncate">{photo.filename || photo.id}</p>
                <p className="text-xs text-gray-500">{photo.city}</p>
              </div>
              {isEditing ? (
                <div className="flex gap-2 items-center">
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmEdit(photo)}
                    className="bg-navy-dark border border-brand-blue rounded px-2 py-1 text-sm text-white w-44 focus:outline-none"
                    autoFocus
                  />
                  <button onClick={() => confirmEdit(photo)} className="text-xs text-brand-cyan">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-gray-500">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => startEdit(photo)}
                  disabled={isRenaming}
                  className={`text-xs px-2 py-1 rounded font-semibold ${
                    isUnclassified
                      ? 'bg-red-900 text-red-300'
                      : 'bg-green-900 text-green-300 hover:bg-green-800'
                  }`}
                >
                  {isRenaming ? 'Saving...' : photo.keyword}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={() => onGenerate(selectedPhotos)}
        disabled={selectedPhotos.length === 0}
        className="w-full py-3 rounded-lg font-bold bg-gradient-to-r from-brand-pink to-brand-orange text-white disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Generate After Photos ({selectedPhotos.length} selected)
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ManualReview.tsx
git commit -m "feat: add Screen 3 manual review with inline keyword editing"
```

---

## Task 15: Screen 4 — Agent 2 Progress & Screen 5 — Summary

**Files:**
- Create: `components/Agent2Progress.tsx`
- Create: `components/Summary.tsx`

- [ ] **Step 1: Create Agent2Progress**

Create `components/Agent2Progress.tsx`:
```tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { ProcessedPhoto, AfterPhoto } from '@/types'

interface Props {
  photos: ProcessedPhoto[]
  onComplete: () => void
}

export default function Agent2Progress({ photos, onComplete }: Props) {
  const [results, setResults] = useState<AfterPhoto[]>([])
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true
    processNext(0, [])
  }, [])

  async function processNext(index: number, accumulated: AfterPhoto[]) {
    if (index >= photos.length) {
      onComplete()
      return
    }

    const photo = photos[index]
    try {
      const res = await fetch('/api/generate-after', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveFileId: photo.driveFileId,
          driveFolderId: photo.driveFolderId,
          keyword: photo.keyword,
          city: photo.city,
        }),
      })
      const data = await res.json()
      const result: AfterPhoto = res.ok
        ? { originalDriveFileId: photo.driveFileId, filename: data.filename, driveFileId: data.driveFileId, status: 'done' }
        : { originalDriveFileId: photo.driveFileId, filename: '', driveFileId: '', status: 'failed', error: data.error }

      const next = [...accumulated, result]
      setResults(next)
      processNext(index + 1, next)
    } catch {
      const failed: AfterPhoto = { originalDriveFileId: photo.driveFileId, filename: '', driveFileId: '', status: 'failed', error: 'Network error' }
      const next = [...accumulated, failed]
      setResults(next)
      processNext(index + 1, next)
    }
  }

  const total = photos.length
  const done = results.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Agent 2 — Generating After Photos</h1>
      <p className="text-gray-400 text-sm mb-6">Using Krea AI to create renovation after-photos</p>

      <div className="bg-navy rounded-lg h-2 mb-6">
        <div
          className="h-2 rounded-lg bg-gradient-to-r from-brand-blue to-brand-cyan transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm text-gray-400 mb-4">{done} of {total} after photos generated</p>

      <div className="space-y-2">
        {photos.map((photo, i) => {
          const result = results[i]
          return (
            <div key={photo.id} className="bg-navy rounded-lg px-4 py-3 flex items-center gap-3 text-sm">
              {result?.status === 'done' && <span className="text-green-400">✅</span>}
              {result?.status === 'failed' && <span className="text-red-400">❌</span>}
              {!result && i === done && <span className="text-yellow-400">⏳</span>}
              {!result && i > done && <span className="text-gray-600">○</span>}
              <span className="text-gray-300 truncate">{result?.filename || photo.filename}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create Summary**

Create `components/Summary.tsx`:
```tsx
'use client'
import { ProcessedPhoto } from '@/types'

interface Props {
  photos: ProcessedPhoto[]
  projectName: string
}

export default function Summary({ photos, projectName }: Props) {
  // Group by folder name (keyword + city)
  const folderMap: Record<string, { count: number; url: string; isUnclassified: boolean }> = {}

  for (const photo of photos) {
    if (photo.status !== 'done') continue
    const folderKey = photo.driveFolderId
    const displayName = photo.keyword === 'unclassified'
      ? 'Unclassified'
      : `${photo.keyword.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} ${photo.city}`

    if (!folderMap[folderKey]) {
      folderMap[folderKey] = { count: 0, url: photo.driveFolderUrl, isUnclassified: photo.keyword === 'unclassified' }
    }
    folderMap[folderKey].count++
  }

  // Get the project-level Drive folder URL from any successfully processed photo
  const firstDone = photos.find((p) => p.status === 'done')

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-1">Done!</h1>
      <p className="text-gray-400 text-sm mb-8">All files saved to Google Drive — {projectName}</p>

      <div className="space-y-2 mb-8">
        {Object.entries(folderMap).map(([folderId, { count, url, isUnclassified }]) => {
          const label = photos.find((p) => p.driveFolderId === folderId && p.keyword === 'unclassified')
            ? 'Unclassified'
            : photos.find((p) => p.driveFolderId === folderId)?.keyword
                ?.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' ' +
              photos.find((p) => p.driveFolderId === folderId)?.city

          return (
            <div key={folderId} className="bg-navy rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-300">📁 {label}/</span>
              <span className={`text-sm font-semibold ${isUnclassified ? 'text-red-400' : 'text-green-400'}`}>
                {count} photo{count !== 1 ? 's' : ''}
              </span>
            </div>
          )
        })}
      </div>

      {firstDone && (
        <a
          href={firstDone.projectFolderUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center bg-navy border border-brand-blue text-brand-cyan rounded-lg py-3 font-semibold hover:bg-navy-light transition-colors"
        >
          Open Project Folder in Drive ↗
        </a>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Agent2Progress.tsx components/Summary.tsx
git commit -m "feat: add Screen 4 Agent 2 progress and Screen 5 summary"
```

---

## Task 16: End-to-End Smoke Test

- [ ] **Step 1: Run all unit tests**

```bash
npx jest --no-coverage
```
Expected: All tests pass.

- [ ] **Step 2: Start dev server and test full flow manually**

```bash
npm run dev
```
Open `http://localhost:3000`. Walk through:
1. Select a project from the dropdown
2. Click "Run Agent 1" — verify photos process one by one with real Claude Vision
3. Review screen — verify keywords, try editing one keyword and confirm it renames in Drive
4. Select photos and click "Generate After Photos"
5. Verify after photos appear in Drive with `_after` suffix
6. Verify summary screen shows correct folder breakdown and Drive link works

- [ ] **Step 3: Verify Drive folder structure**

Open Google Drive and confirm:
- Project folder created inside root folder
- Sub-folders named `[Keyword] [City]` with title case
- `Unclassified/` folder for low-confidence photos
- `_after` files alongside originals

---

## Task 17: Vercel Deployment

- [ ] **Step 1: Create Vercel project**

```bash
npx vercel
```
Follow prompts. Select: "Link to existing project" or create new. Set framework to Next.js.

- [ ] **Step 2: Add environment variables in Vercel dashboard**

Go to Vercel project → Settings → Environment Variables. Add:
- `COMPANYCAM_API_KEY`
- `ANTHROPIC_API_KEY`
- `KREA_API_KEY`
- `GOOGLE_DRIVE_CREDENTIALS` (paste the full service account JSON as a single line)
- `GOOGLE_DRIVE_FOLDER_ID`

- [ ] **Step 3: Deploy**

```bash
npx vercel --prod
```

- [ ] **Step 4: Smoke test production URL**

Open the production URL. Run through the same manual flow as Task 16 Step 2.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete VO360 Photo Organizer — ready for production"
```

# VO360 Photo Organizer — Design Spec

**Date:** 2026-03-22
**Company:** VO360
**Stack:** Next.js (TypeScript), React, Tailwind CSS, Anthropic SDK, Krea API, Google Drive API, CompanyCam API
**Deployment:** Vercel Pro (required for 60s function timeout)

---

## Overview

A web application with two AI agents and a manual review step in between. It fetches photos from CompanyCam projects, classifies them using Claude Vision, organizes and uploads them to Google Drive, and optionally generates AI "after renovation" versions using Krea.

---

## Users

- The VO360 team (owner + uncle), both using the same CompanyCam account and uploading to the same Google Drive.
- No authentication required. The app URL is treated as an internal secret.

---

## UI Flow (5 Screens)

### Screen 1 — Project Selector
- Dropdown populated from CompanyCam API listing all projects.
- "Run Agent 1" button to start processing.

### Screen 2 — Agent 1 Progress
- Shows per-photo live status: pending, analyzing, done, or failed.
- Progress bar showing "X of N photos" where N is the actual total fetched from CompanyCam (not hardcoded).
- Each row shows the resulting filename once done.

### Screen 3 — Manual Review
- Grid of all processed photos with their assigned keyword tag and city.
- Unclassified photos shown with a red tag and **disabled checkbox** (cannot be selected for Agent 2).
- User can click any keyword tag to edit it inline.
- When a keyword is edited and confirmed, the app calls `POST /api/rename-photo` to rename and move the file in Google Drive immediately.
- Checkboxes to select which classified photos proceed to Agent 2 (all classified checked by default).
- "Generate After Photos" button only enabled when at least one photo is checked.

### Screen 4 — Agent 2 Progress
- Live status per selected photo.
- Progress bar showing "X of N after photos generated."

### Screen 5 — Summary
- Folder breakdown with photo counts per keyword/city folder.
- Unclassified count shown in red.
- "Open Project Folder in Drive ↗" link to the parent project folder in Google Drive.

---

## Agent 1 — Photo Organization

**Trigger:** User clicks "Run Agent 1" on Screen 1.

**Process (client-driven, one API call per photo):**

1. Client calls `GET /api/projects` to populate dropdown on load.
2. On "Run", client fetches project details including the address object from CompanyCam. City is extracted from the `city` field of the address object. If `city` is not available, parse it from the address string (the word before the state abbreviation).
3. Client fetches all photo URLs for the selected project from CompanyCam, paginating through all pages until all photos are retrieved.
4. For each photo, client calls `POST /api/process-photo` sequentially, updating the UI after each response.

**`POST /api/process-photo` — server logic:**
```
export const maxDuration = 60; // Vercel Pro required
```
1. Fetch photo binary from CompanyCam URL.
2. Send to Claude Vision (`claude-sonnet-4-6`) with the prompt below.
3. If confidence is `low` → keyword is `unclassified`.
4. Build filename: `[keyword]_[city].jpg` (spaces replaced with underscores, lowercase keyword, title-cased city words joined by underscores).
   - Check Google Drive for existing files with this name in the target folder.
   - If a duplicate exists, append a number: `_2.jpg`, `_3.jpg`, etc.
5. Create or find the Google Drive folder: `[Project Name]/[Keyword Title Case] [City Title Case]/`
6. Upload the renamed photo to that folder.
7. Return `{ keyword, confidence, filename, driveFileId, driveFolderId, driveFolderUrl }` to the client.

**Claude Vision prompt:**
```
You are analyzing a construction or renovation photo.
Identify the type of work shown in the image and return a JSON response:
{
  "keyword": "snake_case_description_of_work",
  "confidence": "high" | "low"
}
Use short descriptive keywords like "bathroom_remodeling", "roof_inspection", "kitchen_plumbing", "flooring_installation", etc.
Return confidence "low" if the image is blurry, unclear, or does not clearly show a specific type of work.
Return only valid JSON, no other text.
```

---

## Manual Review Step

- Displayed after Agent 1 completes.
- All processed photos shown with thumbnail (if available from CompanyCam), filename, keyword tag, city.
- **Unclassified photos:** shown with red tag, checkbox permanently disabled.
- **Classified photos:** checkbox enabled, checked by default.
- User can click any keyword tag to edit it inline.
- On keyword edit confirmation → client calls `POST /api/rename-photo`:
  - Renames the file in Google Drive.
  - Moves it to the correct folder (creating the folder if it doesn't exist).
  - The old folder is left as-is (may be empty if it was the only photo).
- "Generate After Photos" button triggers Agent 2 for all checked photos.

---

## Agent 2 — AI After Photos

**Trigger:** User clicks "Generate After Photos" on Screen 3.

**Process (client-driven, one API call per selected photo):**

For each selected photo, client calls `POST /api/generate-after` sequentially.

**`POST /api/generate-after` — server logic:**
```
export const maxDuration = 60; // Vercel Pro required
```
1. Fetch the original photo from Google Drive by `driveFileId`.
2. Send to Krea API (Nano Banana model) for AI after-renovation image generation.
   - Endpoint and request parameters to be confirmed from Krea API documentation.
   - Pass the image as input; no custom prompt required (model handles renovation style).
3. Download the generated image from Krea's response URL.
4. Build the `_after` filename: `[keyword]_[city]_after.jpg`
   - If this file already exists in the Drive folder, **overwrite it**.
5. Upload to the same Google Drive folder as the original photo.
6. Return `{ filename, driveFileId }` to the client.

---

## Google Drive Structure

```
[Project Name]/
  [Keyword Title Case] [City Title Case]/
    [keyword]_[city].jpg              (original, Agent 1)
    [keyword]_[city]_after.jpg        (AI generated, Agent 2 — overwrites if re-run)
    [keyword]_[city]_2.jpg            (duplicate keyword, numbered)
  Unclassified/
    unclassified_[city].jpg
```

**Examples:**
```
12 Main St Renovation/
  Bathroom Remodeling Chula Vista/
    bathroom_remodeling_Chula_Vista.jpg
    bathroom_remodeling_Chula_Vista_after.jpg
    bathroom_remodeling_Chula_Vista_2.jpg
  Kitchen Plumbing Chula Vista/
    kitchen_plumbing_Chula_Vista.jpg
    kitchen_plumbing_Chula_Vista_after.jpg
  Unclassified/
    unclassified_Chula_Vista.jpg
    unclassified_Chula_Vista_2.jpg
```

**Google Drive auth:** Service account with JSON credentials. The service account must be granted access to the root folder identified by `GOOGLE_DRIVE_FOLDER_ID`. Credentials stored as `GOOGLE_DRIVE_CREDENTIALS` env var (JSON stringified).

**Root folder:** Identified by `GOOGLE_DRIVE_FOLDER_ID` env var. All project folders are created inside this root folder.

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/projects` | Fetch all CompanyCam projects (paginated) |
| POST | `/api/process-photo` | Agent 1: analyze + rename + upload one photo |
| POST | `/api/rename-photo` | Rename + move a file in Drive when user edits a keyword |
| POST | `/api/generate-after` | Agent 2: generate after photo + upload one photo |

---

## Error Handling

- **Per-photo failures (Claude, Drive upload, Krea):** Mark the photo as failed (red status) in the UI, continue processing remaining photos.
- **CompanyCam fetch failure:** Show error on Screen 1, block Run button.
- **Invalid Google Drive credentials:** Fail fast on first API call with a clear error in the UI.
- **Krea API failure:** Mark the specific photo as failed, continue with others.
- **Rename failure:** Show inline error on the edited keyword tag, keep the old name in Drive.

---

## File Naming Rules

- Keywords: lowercase, words separated by underscores (e.g., `bathroom_remodeling`)
- City: title case words separated by underscores (e.g., `Chula_Vista`)
- Full filename: `[keyword]_[city].jpg`
- After photo: `[keyword]_[city]_after.jpg` (overwrites if already exists)
- Duplicates (originals only): `[keyword]_[city]_2.jpg`, `_3.jpg`, etc.
- Folder names: Title case with space separator (e.g., `Bathroom Remodeling Chula Vista`)

---

## Environment Variables

```
COMPANYCAM_API_KEY=
ANTHROPIC_API_KEY=
KREA_API_KEY=
GOOGLE_DRIVE_CREDENTIALS=     # JSON stringified service account credentials
GOOGLE_DRIVE_FOLDER_ID=       # ID of the root Drive folder for all project uploads
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (TypeScript) |
| Frontend | React, Tailwind CSS |
| AI Vision | Anthropic SDK (`claude-sonnet-4-6`) |
| AI Generation | Krea API (Nano Banana model) |
| Photo Source | CompanyCam REST API |
| File Storage | Google Drive API v3 (service account) |
| Deployment | Vercel Pro |

---

## Branding

- Color palette: Deep navy `#0d1b4b`, Electric blue `#0096ff` / Cyan `#00d4ff`, Orange `#f97316`, Hot pink `#e91e8c`
- App name: **VO360 Photo Organizer**
- Tagline: Your Intelligent Execution Partner

# VO360 Photo Organizer — Design Spec

**Date:** 2026-03-22
**Company:** VO360
**Stack:** Next.js (TypeScript), React, Anthropic SDK, Krea API, Google Drive API, CompanyCam API
**Deployment:** Vercel

---

## Overview

A web application with two AI agents and a manual review step in between. It fetches photos from CompanyCam projects, classifies them using Claude Vision, organizes and uploads them to Google Drive, and optionally generates AI "after renovation" versions using Krea.

---

## Users

- The VO360 team (owner + uncle), both using the same CompanyCam account and uploading to the same Google Drive.

---

## UI Flow (5 Screens)

### Screen 1 — Project Selector
- Dropdown populated from CompanyCam API listing all projects.
- "Run Agent 1" button to start processing.

### Screen 2 — Agent 1 Progress
- Shows per-photo live status: pending, analyzing, done, or failed.
- Progress bar showing X of 20 photos processed.
- Each row shows the resulting filename once done.

### Screen 3 — Manual Review
- Grid of all processed photos with their assigned keyword tag and city.
- Unclassified photos shown with a red tag.
- User can edit any keyword inline if misclassified.
- Checkboxes to select which photos should proceed to Agent 2.
- "Generate After Photos" button triggers Agent 2 for selected photos only.

### Screen 4 — Agent 2 Progress
- Live status per selected photo.
- Progress bar showing X of N after photos generated.

### Screen 5 — Summary
- Folder breakdown with photo counts per keyword/city folder.
- Unclassified count shown in red.
- "Open Project Folder in Drive ↗" link to the parent project folder in Google Drive.

---

## Agent 1 — Photo Organization

**Trigger:** User clicks "Run Agent 1" on Screen 1.

**Process (client-driven, one API call per photo):**

1. Client calls `GET /api/projects` to populate dropdown on load.
2. On "Run", client fetches project details (address → extract city).
3. Client fetches all photo URLs for the selected project from CompanyCam.
4. For each photo, client calls `POST /api/process-photo` sequentially, updating the UI after each response.

**`POST /api/process-photo` — server logic:**
1. Fetch photo binary from CompanyCam URL.
2. Send to Claude Vision (`claude-sonnet-4-6`) with prompt asking for a keyword and confidence level (`high` or `low`).
3. If confidence is `low` → keyword is `unclassified`.
4. Build filename: `[keyword]_[city].jpg` (spaces replaced with underscores, lowercase).
   - If a file with this name already exists in the Drive folder, append a number: `_2.jpg`, `_3.jpg`, etc.
5. Create or find the Google Drive folder: `[Project Name]/[Keyword City Title Case]/`
6. Upload the renamed photo to that folder.
7. Return `{ keyword, confidence, filename, driveFileId, driveFolderUrl }` to the client.

**Claude Vision prompt:**
- Ask Claude to identify the type of construction/renovation work shown.
- Return a short snake_case keyword (e.g., `bathroom_remodeling`, `roof_inspection`).
- Return confidence: `high` if clearly identifiable, `low` if ambiguous or unclear.

---

## Manual Review Step

- Displayed after Agent 1 completes.
- All processed photos shown with thumbnail (if available), filename, keyword tag, city.
- User can click any keyword tag to edit it inline.
- Checkboxes (default: all classified photos checked, unclassified unchecked).
- "Generate After Photos" button only enabled when at least one photo is checked.

---

## Agent 2 — AI After Photos

**Trigger:** User clicks "Generate After Photos" on Screen 3.

**Process (client-driven, one API call per selected photo):**

For each selected photo, client calls `POST /api/generate-after` sequentially.

**`POST /api/generate-after` — server logic:**
1. Fetch the original photo from Google Drive (by driveFileId).
2. Send to Krea API (Nano Banana model) for AI after-renovation generation.
3. Download the generated image.
4. Upload to the same Google Drive folder as the original, with `_after` suffix:
   - `bathroom_remodeling_Chula_Vista_after.jpg`
5. Return `{ filename, driveFileId }` to the client.

---

## Google Drive Structure

```
[Project Name]/
  [Keyword City]/
    [keyword]_[city].jpg          (original, Agent 1)
    [keyword]_[city]_after.jpg    (AI generated, Agent 2)
    [keyword]_[city]_2.jpg        (duplicate keyword, numbered)
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
```

**Google Drive auth:** Service account with a JSON credentials file. The service account is shared with the target Drive folder. Credentials stored as `GOOGLE_DRIVE_CREDENTIALS` env var (JSON stringified).

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/projects` | Fetch all CompanyCam projects |
| POST | `/api/process-photo` | Agent 1: analyze + rename + upload one photo |
| POST | `/api/generate-after` | Agent 2: generate after photo + upload one photo |

---

## Error Handling

- **Per-photo failures (Claude, Drive upload, Krea):** Mark the photo as failed (red status) in the UI, continue processing remaining photos. Do not abort the full run.
- **CompanyCam fetch failure:** Show error on Screen 1, block Run button.
- **Invalid Google Drive credentials:** Fail fast on first API call with a clear error message in the UI.
- **Krea API failure:** Mark the specific photo as failed, continue with others.

---

## File Naming Rules

- Keywords: lowercase, words separated by underscores (e.g., `bathroom_remodeling`)
- City: title case words separated by underscores (e.g., `Chula_Vista`)
- Full filename: `[keyword]_[city].jpg`
- After photo: `[keyword]_[city]_after.jpg`
- Duplicates: `[keyword]_[city]_2.jpg`, `_3.jpg`, etc.
- Folder names: Title case with space separator (e.g., `Bathroom Remodeling Chula Vista`)

---

## Environment Variables

```
COMPANYCAM_API_KEY=
ANTHROPIC_API_KEY=
KREA_API_KEY=
GOOGLE_DRIVE_CREDENTIALS=   # JSON stringified service account credentials
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
| Deployment | Vercel |

---

## Branding

- Color palette: Deep navy `#0d1b4b`, Electric blue `#0096ff` / Cyan `#00d4ff`, Orange `#f97316`, Hot pink `#e91e8c`
- App name: **VO360 Photo Organizer**
- Tagline: Your Intelligent Execution Partner

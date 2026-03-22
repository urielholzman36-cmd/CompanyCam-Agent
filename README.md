# VO360 Photo Organizer

Your Intelligent Execution Partner

## Setup

### Environment Variables

Create a `.env.local` file with:

```
COMPANYCAM_API_KEY=your_companycam_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
KREA_API_KEY=your_krea_api_key
GOOGLE_DRIVE_CREDENTIALS={"type":"service_account",...}
GOOGLE_DRIVE_FOLDER_ID=your_root_drive_folder_id
```

### Google Drive Setup

1. Create a Google Cloud project and enable the Drive API
2. Create a Service Account and download the JSON credentials
3. Share your target Drive folder with the service account email
4. Copy the folder ID from the Drive URL and set as `GOOGLE_DRIVE_FOLDER_ID`
5. Paste the full credentials JSON (single line) as `GOOGLE_DRIVE_CREDENTIALS`

### Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add all 5 environment variables in Vercel dashboard
4. Deploy (Vercel Pro plan required for 60s function timeouts)

### Krea API

Before deploying, verify the Krea API endpoint and request format in `lib/krea.ts` against the official Krea API documentation. The current implementation uses a placeholder endpoint.

## How It Works

1. **Select a project** from CompanyCam
2. **Agent 1** fetches all photos, classifies them with Claude Vision, and uploads to Google Drive
3. **Review** the classifications and correct any mistakes
4. **Agent 2** generates AI "after renovation" versions of selected photos using Krea
5. **Summary** shows the folder breakdown with a link to the Drive folder

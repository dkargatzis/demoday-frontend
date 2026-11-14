# DemoDay Frontend Client (Next.js 15)

The developer dashboard client for DemoDay Launch Studio:
- **Next.js 15 App Router** & React 19.
- **Tailwind CSS & Lucide** dark hacker UI.
- **Server-Sent Events (SSE)** via `lib/useJobStream.ts`: live progress, stages and logs from `/api/pipeline/events/{job_id}`, with automatic reconnects and a polling fallback.
- **Video Player** with direct MP4 download.
- **Launch Kit Export Studio**: One-click copy for README.md, Devpost submission pitch, and X/LinkedIn social posts.
- **Accounts**: `/login` (sign in or create an account); the dashboard (`/`) and `/settings` are only available signed in.
- **Settings**: a GitHub token for private repositories, and app logins captured through a live view of a server-side
  browser, so demos can record pages behind your app's sign-in.
- **Staged sample data** (Settings): capture your dashboard's API responses, let Gemini rewrite them as rich sample
  data of the same shape, review and edit them, and replay them in demos (labelled "Sample data" in the video).

Open the dashboard at `http://localhost:3000` (not `127.0.0.1`): the backend's session cookie is shared with
`localhost`, and a different host name would be treated as another site.

---

## Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Checks
```bash
npm run typecheck   # tsc --noEmit
npm run build       # production build
```

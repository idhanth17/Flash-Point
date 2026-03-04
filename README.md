# FlashPoint ⚡

FlashPoint is a real-time web application for capturing, streaming, and transcribing audio using the Deepgram API. It supports live microphone streaming, file uploads, and direct extraction of YouTube live streams.

## Features

- **Live Microphone Transcription**: Stream audio directly from your browser to Deepgram for real-time transcription.
- **YouTube Live Stream Support**: Input a YouTube Live Stream URL. The backend will extract the stream using `yt-dlp`, process it with system-native `ffmpeg`, and transcribe it live.
- **File Uploads**: Target video or audio files up to 500MB. The backend extracts audio (via `ffmpeg`) and generates transcripts with word-level timestamps, properly chunked for the UI.
- **Keyword Alerts**: Set up custom keywords in the "Mission Control" sidebar. When the transcription engine detects these keywords, it triggers visual alerts.

## Architecture

FlashPoint is divided into two main components:

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (React)
- **Styling**: Tailwind CSS
- **Real-time Comms**: Socket.IO Client
- **Deployment**: Configured for [Vercel](https://vercel.com)

**Frontend Environment Variables:**
- `NEXT_PUBLIC_BACKEND_URL`: The URL of the deployed backend server (e.g., `wss://flash-point-production.up.railway.app` or `http://localhost:3001`).

### Backend
- **Framework**: [Fastify](https://fastify.dev/) for high-performance HTTP requests.
- **Real-time Comms**: `fastify-socket.io` for WebSocket streams.
- **Transcription Engine**: [Deepgram SDK](https://developers.deepgram.com/) (using the `nova-3` model).
- **Media Processing**: Uses system-native `ffmpeg` and standalone `yt-dlp` executables for reliable streaming, bypassing Datacenter 403 blocks.
- **Deployment**: Configured for [Railway](https://railway.app). Uses `nixpacks.toml` to globally install `ffmpeg` onto the Linux container.

**Backend Environment Variables:**
- `DEEPGRAM_API_KEY`: Your private Deepgram API key.
- `PORT`: (Provided automatically by Railway)

---

## Local Development

### Prerequisites
- Node.js (v18+ recommended)
- `ffmpeg` installed globally on your system (required for processing YouTube and file uploads).

### Running the Project
The project uses a root `package.json` to manage both services simultaneously, or you can run them individually.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/idhanth17/Flash-Point.git
   cd Flash-Point
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   # Create a .env file and add your DEEPGRAM_API_KEY
   echo "DEEPGRAM_API_KEY=your_key_here" > .env
   npm run dev
   ```

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   # Create a .env.local file and point to your local backend
   echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:3001" > .env.local
   npm run dev
   ```

---

## Deployment Quirks & Solutions

Over the course of development, several production-specific issues were solved:
- **CORS & Preflight Requests on Uploads**: Fastify CORS blocks custom headers on multipart uploads. Resolved by passing parameters (`socketId`, `timeOffset`) via URL Query Parameters instead of HTTP Headers.
- **Railway Fastify Body Limit**: Large uploads crashed `ERR_HTTP2_PROTOCOL_ERROR` because Fastify's default global body limit is 1MB. Increased globally to 500MB.
- **YouTube 403 Forbidden on Datacenters**: Attempting to grab direct HLS URLs from YouTube and feeding them to `ffmpeg` fails on Railway due to Datacenter IP blocking. Resolved by exclusively piping binary output directly through `yt-dlp` (`yt-dlp -o - | ffmpeg -i pipe:0`).
- **Railway/Linux Segmentation Fault (Code 11) for FFmpeg**: Precompiled NPM modules for `ffmpeg` (`ffmpeg-static`, `@ffmpeg-installer/ffmpeg`) encounter segmentation faults executing natively inside Railway's Nixpacks Alpine/Ubuntu containers. Resolved by explicitly commanding `nixpacks.toml` to install the `ffmpeg` package onto the OS globally.

## License
MIT

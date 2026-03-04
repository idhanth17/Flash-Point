'use client';

import { useState, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { KeywordSidebar } from '@/components/KeywordSidebar';
import { TranscriptWaterfall } from '@/components/TranscriptWaterfall';
import { WaveformVisualizer } from '@/components/WaveformVisualizer';
import { ChannelList } from '@/components/ChannelList';
import { ChannelSetup } from '@/components/ChannelSetup';
import { useAppStore, useActiveChannel } from '@/lib/store';
import { Mic, Square, Upload, ArrowLeft, Trash2, Youtube, Video, VideoOff, Zap, Loader2, CheckCircle2, AlertCircle, Wifi } from 'lucide-react';

// ─── Connection Loading Screen ────────────────────────────────────────────────
function ConnectingScreen() {
  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center fp-fade-in">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-6 fp-slide-up">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Zap size={24} className="text-white fill-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Flash Point</h1>
            <p className="text-xs text-zinc-500">Real-time transcription</p>
          </div>
        </div>

        {/* Spinner ring */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-zinc-800" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 fp-spinner" />
          <div className="absolute inset-2 rounded-full border border-transparent border-t-indigo-400 fp-spinner" style={{ animationDuration: '1.2s', animationDirection: 'reverse' }} />
        </div>

        <div className="text-center">
          <p className="text-zinc-300 font-medium">Connecting to server...</p>
          <p className="text-xs text-zinc-600 mt-1">Establishing WebSocket connection</p>
        </div>

        {/* Dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Upload Progress Overlay ──────────────────────────────────────────────────
function UploadOverlay({ fileName }: { fileName: string }) {
  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950/80 backdrop-blur-md flex items-center justify-center fp-fade-in">
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md shadow-2xl fp-slide-up">
        {/* Top glow */}
        <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

        <div className="flex flex-col items-center text-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Upload size={24} className="text-blue-400 animate-bounce" style={{ animationDuration: '1s' }} />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-zinc-100">Uploading File</h3>
            <p className="text-sm text-zinc-400 mt-1 truncate max-w-[280px]">{fileName}</p>
          </div>

          {/* Shimmer progress bar */}
          <div className="w-full">
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full fp-shimmer-bar rounded-full" style={{ width: '100%', animation: 'fp-shimmer 1.5s linear infinite' }} />
            </div>
            <p className="text-xs text-zinc-500 mt-2">Processing audio — this may take a moment</p>
          </div>

          {/* Steps */}
          <div className="w-full flex flex-col gap-2 text-left">
            {[
              { label: 'Sending to server', done: true },
              { label: 'Transcribing with ASR engine', done: false },
              { label: 'Detecting keywords', done: false },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {step.done ? (
                  <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                ) : (
                  <Loader2 size={14} className="text-blue-400 fp-spinner shrink-0" />
                )}
                <span className={`text-xs ${step.done ? 'text-zinc-400' : 'text-zinc-300'}`}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── YouTube Connecting Banner ────────────────────────────────────────────────
function YouTubeConnectingBanner({ url }: { url: string }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-3 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 fp-slide-up">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-transparent border-t-red-500 fp-spinner" />
        <Youtube size={16} className="text-red-500" />
        <span className="text-sm text-zinc-300 font-medium">Connecting to YouTube stream...</span>
        <span className="text-xs text-zinc-500 max-w-[200px] truncate hidden sm:block">{url}</span>
      </div>
    </div>
  );
}

// ─── Status Dot ───────────────────────────────────────────────────────────────
function StatusDot({ status }: { status: string }) {
  const isReady = status.includes('Ready');
  const isError = status.includes('Error') || status.includes('failed');
  const isConnecting = status.includes('Connecting') || status === 'Disconnected';

  const color = isError
    ? 'bg-red-500 shadow-red-500/40'
    : isReady
      ? 'bg-green-500 shadow-green-500/40'
      : 'bg-yellow-500 shadow-yellow-500/40';

  return (
    <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${color} ${!isReady && !isError ? 'animate-pulse' : ''}`} />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState('Connecting...');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [activeYtUrl, setActiveYtUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);

  const activeChannelId = useAppStore(state => state.activeChannelId);
  const channel = useActiveChannel();
  const setHasAudio = useAppStore(state => state.setHasAudio);
  const clearAudio = useAppStore(state => state.clearAudio);
  const setActiveChannel = useAppStore(state => state.setActiveChannel);

  useEffect(() => {
    const host = window.location.hostname;
    const newSocket = io(`http://${host}:3001`, {
      transports: ['websocket', 'polling']
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnecting(false);
      setStatus('Connected to Server');
    });
    newSocket.on('deepgram_ready', () => setStatus('ASR Engine Ready (Nova-3)'));
    newSocket.on('asr_error', (msg) => {
      alert("Error: " + msg);
      setStatus('Error');
      stopRecording();
    });
    newSocket.on('disconnect', () => {
      setIsConnecting(true);
      setStatus('Disconnected');
    });
    newSocket.on('connect_error', () => {
      setStatus('Connection failed');
    });

    return () => { newSocket.close(); };
  }, []);

  useEffect(() => {
    if (stream) {
      stream.getVideoTracks().forEach(track => { track.enabled = isVideoEnabled; });
    }
  }, [isVideoEnabled, stream]);

  useEffect(() => {
    // BUG FIX: also re-run when isVideoEnabled changes, because toggling
    // video on/off changes CSS visibility but the element stays in the DOM —
    // we need to reassign srcObject after the element becomes visible again.
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isVideoEnabled]);

  // If YouTube status changes to "ready", clear the connecting URL display
  useEffect(() => {
    if (status.includes('Ready') || status.includes('ASR Engine')) {
      // YouTube connected successfully, banner can go down
    }
  }, [status]);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Your browser does not support media recording or you are not on a secure (HTTPS) connection.");
        return;
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideoEnabled });
      setStream(mediaStream);

      const audioStream = new MediaStream([mediaStream.getAudioTracks()[0]]);
      const recorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });

      recorder.addEventListener('dataavailable', async (event) => {
        if (event.data.size > 0 && socket?.connected) {
          const buffer = await event.data.arrayBuffer();
          socket.emit('audio_chunk', buffer);
        }
      });

      const currentChannel = useAppStore.getState().channels.find(c => c.id === activeChannelId);
      const lastTranscript = currentChannel?.transcripts?.[currentChannel.transcripts.length - 1];
      const offset = lastTranscript ? lastTranscript.timestamp + 1 : 0;

      socket?.emit('start_stream', offset);
      recorder.start(250);
      mediaRecorder.current = recorder;
      setIsRecording(true);
      setHasAudio(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (activeYtUrl) {
      socket?.emit('stop_stream');
    }
    setIsRecording(false);
    setStream(null);
    setActiveYtUrl('');
  };

  const handleStartYouTube = (url: string) => {
    if (!url) return;
    setActiveYtUrl(url);
    setStatus('Connecting to YouTube...');
    socket?.emit('start_youtube_stream', url);
    setIsRecording(true);
    setHasAudio(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(file.name);
    setStatus('Uploading file...');

    // BUG FIX: Set hasAudio BEFORE the fetch so TranscriptWaterfall mounts
    // and registers its socket listener in time to receive transcript events.
    setHasAudio(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const host = window.location.hostname;
      const protocol = window.location.protocol;
      const baseUrl = protocol === 'https:' ? `https://${host}:3003` : `http://${host}:3001`;

      const currentChannel = useAppStore.getState().channels.find(c => c.id === activeChannelId);
      const lastTranscript = currentChannel?.transcripts?.[currentChannel.transcripts.length - 1];
      const offset = lastTranscript ? lastTranscript.timestamp + 1 : 0;

      const res = await fetch(`${baseUrl}/upload`, {
        method: 'POST',
        headers: {
          ...(socket?.id ? { 'x-socket-id': socket.id } : {}),
          'x-time-offset': offset.toString()
        },
        body: formData,
      });

      if (!res.ok) {
        let errDetails = "Upload failed on server";
        try {
          const errJson = await res.json();
          errDetails = errJson.details || errJson.error || errDetails;
          if (errJson.rawError) errDetails += "\n\n" + JSON.stringify(errJson.rawError, null, 2);
        } catch (e) { }
        throw new Error(errDetails);
      }

      const json = await res.json();
      setStatus(`File uploaded. Size: ${json.size} bytes.`);
      // hasAudio was already set above; no-op to keep existing behavior
    } catch (err: any) {
      console.error(err);
      setStatus('Upload failed');
      alert("Error uploading file: " + (err.message || err));
    } finally {
      setUploadingFile(null);
    }
  };

  // ── Screens ────────────────────────────────────────────────────────────────
  if (isConnecting) return <ConnectingScreen />;

  if (!activeChannelId) {
    return (
      <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
        <ChannelList />
      </div>
    );
  }

  if (channel && !channel.hasAudio) {
    return (
      <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
        {uploadingFile && <UploadOverlay fileName={uploadingFile} />}
        <ChannelSetup onStartLive={startRecording} onUpload={handleFileUpload} onStartYouTube={handleStartYouTube} />
      </div>
    );
  }

  const isYouTubeConnecting = status === 'Connecting to YouTube...' && isRecording;

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Overlays */}
      {uploadingFile && <UploadOverlay fileName={uploadingFile} />}
      {isYouTubeConnecting && <YouTubeConnectingBanner url={activeYtUrl} />}

      <KeywordSidebar />

      <main className={`flex-1 flex flex-col items-center relative min-w-0 ${isYouTubeConnecting ? 'pt-[52px]' : ''}`}>
        {/* Header Controls */}
        <header className="w-full p-4 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md z-10 gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setActiveChannel(null)}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors text-sm font-medium border border-zinc-800"
            >
              <ArrowLeft size={14} />
              Channels
            </button>
            <h2 className="text-zinc-100 font-bold ml-1 truncate max-w-[150px]">{channel?.name}</h2>
            <div className="w-px h-4 bg-zinc-800 mx-1" />
            <StatusDot status={status} />
            <span className="text-xs font-medium text-zinc-400 truncate hidden sm:block max-w-[220px]">{status}</span>
          </div>

          <div className="flex gap-2 items-center">
            <button
              onClick={() => {
                if (confirm('Are you sure you want to clear all audio and alerts for this channel?')) {
                  clearAudio();
                  stopRecording();
                }
              }}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-red-900/40 text-red-500 hover:text-red-400 border border-zinc-800 rounded-lg transition-colors text-sm font-medium"
            >
              <Trash2 size={15} />
              <span className="hidden sm:inline">Clear</span>
            </button>

            {!isRecording && (
              <form onSubmit={(e) => { e.preventDefault(); handleStartYouTube((e.target as any).yt.value); }} className="hidden xl:flex items-center gap-2">
                <input name="yt" type="text" placeholder="YouTube URL..." className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500 w-32 focus:w-48 transition-all" />
                <button type="submit" className="p-1.5 bg-zinc-900 hover:bg-red-900/40 text-zinc-400 hover:text-red-500 border border-zinc-800 rounded-lg transition-colors">
                  <Youtube size={16} />
                </button>
              </form>
            )}

            {!activeYtUrl && (
              <button
                onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                className={`flex items-center justify-center p-2 rounded-lg transition-colors border ${isVideoEnabled ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}
                title={isVideoEnabled ? "Disable Camera" : "Enable Camera"}
              >
                {isVideoEnabled ? <Video size={16} /> : <VideoOff size={16} />}
              </button>
            )}

            {!isRecording ? (
              <button
                onClick={startRecording}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all text-sm font-medium shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] whitespace-nowrap"
              >
                <Mic size={16} />
                <span className="hidden sm:inline">Stream Local</span>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all text-sm font-medium shadow-[0_0_15px_rgba(220,38,38,0.3)] animate-pulse whitespace-nowrap"
              >
                <Square size={16} fill="currentColor" />
                <span className="hidden sm:inline">Stop</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Waterfall */}
        <div className="flex-1 w-full relative flex max-h-[calc(100vh-65px)]">
          {/* BUG FIX: Always keep video element in DOM (don't unmount on toggle)
               so the ref stays valid and srcObject persists. Use CSS to hide. */}
          <div className={`absolute top-4 right-4 w-64 aspect-video bg-black rounded-xl overflow-hidden border border-zinc-800 shadow-2xl z-20 ring-1 ring-white/5 transition-opacity duration-200 ${stream && isVideoEnabled ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <video ref={videoRef} autoPlay muted playsInline style={{ transform: 'scaleX(-1)' }} className="w-full h-full object-cover" />
          </div>
          <TranscriptWaterfall socket={socket} />
        </div>

        {/* Footer Visualizer */}
        <div className="w-full max-w-4xl p-6 absolute bottom-0 z-50 pointer-events-none pb-12">
          <WaveformVisualizer isRecording={isRecording} stream={stream} />
        </div>
      </main>
    </div>
  );
}

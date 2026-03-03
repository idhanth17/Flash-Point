'use client';

import { useState, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { KeywordSidebar } from '@/components/KeywordSidebar';
import { TranscriptWaterfall } from '@/components/TranscriptWaterfall';
import { WaveformVisualizer } from '@/components/WaveformVisualizer';
import { ChannelList } from '@/components/ChannelList';
import { ChannelSetup } from '@/components/ChannelSetup';
import { useAppStore, useActiveChannel } from '@/lib/store';
import { Mic, Square, Upload, ArrowLeft, Trash2, Youtube, Video, VideoOff } from 'lucide-react';

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState('Disconnected');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [activeYtUrl, setActiveYtUrl] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);

  const activeChannelId = useAppStore(state => state.activeChannelId);
  const channel = useActiveChannel();
  const setHasAudio = useAppStore(state => state.setHasAudio);
  const clearAudio = useAppStore(state => state.clearAudio);
  const setActiveChannel = useAppStore(state => state.setActiveChannel);

  useEffect(() => {
    // Determine the current host to ensure websocket connects to the right IP/localhost
    const host = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Deepgram/Socket backend remains on 3001
    const newSocket = io(`http://${host}:3001`, {
      transports: ['websocket', 'polling']
    });
    setSocket(newSocket);

    newSocket.on('connect', () => setStatus('Connected to Server'));
    newSocket.on('deepgram_ready', () => setStatus('ASR Engine Ready (Nova-3)'));
    newSocket.on('asr_error', (msg) => { alert("Error: " + msg); setStatus('Error'); stopRecording(); });
    newSocket.on('disconnect', () => setStatus('Disconnected'));

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = isVideoEnabled;
      });
    }
  }, [isVideoEnabled, stream]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

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

      // Calculate cumulative offset based on current channel transcripts
      const currentChannel = useAppStore.getState().channels.find(c => c.id === activeChannelId);
      const lastTranscript = currentChannel?.transcripts?.[currentChannel.transcripts.length - 1];
      const offset = lastTranscript ? lastTranscript.timestamp + 1 : 0; // add 1 padded second to prevent overlapping same second

      // Emit chunks every 250ms for low latency streaming
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

    const formData = new FormData();
    formData.append('file', file);

    setStatus('Uploading file...');
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
          if (errJson.rawError) {
            errDetails += "\n\n" + JSON.stringify(errJson.rawError, null, 2);
          }
        } catch (e) { }
        throw new Error(errDetails);
      }

      const json = await res.json();
      setStatus(`File uploaded. Size: ${json.size} bytes. (Backend simulation complete)`);
      setHasAudio(true);
      // alert("File successfully uploaded to the local backend stream handler!");
    } catch (err: any) {
      console.error(err);
      setStatus('Upload failed');
      alert("Error uploading file: " + (err.message || err));
    }
  };

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
        <ChannelSetup onStartLive={startRecording} onUpload={handleFileUpload} onStartYouTube={handleStartYouTube} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      <KeywordSidebar />

      <main className="flex-1 flex flex-col items-center relative min-w-0">
        {/* Header Controls */}
        <header className="w-full p-6 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md z-10 gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => setActiveChannel(null)}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors text-sm font-medium border border-zinc-800"
            >
              <ArrowLeft size={14} />
              Channels
            </button>
            <h2 className="text-zinc-100 font-bold ml-2 truncate max-w-[150px]">{channel?.name}</h2>
            <div className="w-px h-4 bg-zinc-800 mx-1"></div>
            <div className={`w-2 h-2 rounded-full \${status.includes('Ready') ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-yellow-500 animate-pulse'}`} />
            <span className="text-xs font-medium text-zinc-400 truncate hidden sm:block max-w-[200px]">{status}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (confirm('Are you sure you want to clear all audio and alerts for this channel?')) {
                  clearAudio();
                  stopRecording();
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-red-900/40 text-red-500 hover:text-red-400 border border-zinc-800 rounded-lg transition-colors text-sm font-medium"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">Delete Audio</span>
            </button>

            {!isRecording && (
              <form onSubmit={(e) => { e.preventDefault(); handleStartYouTube((e.target as any).yt.value); }} className="hidden xl:flex items-center gap-2">
                <input name="yt" type="text" placeholder="YouTube URL..." className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500 w-32 focus:w-48 transition-all" />
                <button type="submit" className="p-1.5 bg-zinc-900 hover:bg-red-900/40 text-zinc-400 hover:text-red-500 border border-zinc-800 rounded-lg transition-colors">
                  <Youtube size={16} />
                </button>
              </form>
            )}

            <button
              onClick={() => setIsVideoEnabled(!isVideoEnabled)}
              className={`flex items-center justify-center p-2 rounded-lg transition-colors border ${isVideoEnabled ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}
              title={isVideoEnabled ? "Disable Camera" : "Enable Camera"}
            >
              {isVideoEnabled ? <Video size={16} /> : <VideoOff size={16} />}
            </button>

            {!isRecording ? (
              <button
                onClick={startRecording}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-medium shadow-[0_0_15px_rgba(37,99,235,0.3)] whitespace-nowrap"
              >
                <Mic size={16} />
                <span className="hidden sm:inline">Stream Local</span>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors text-sm font-medium shadow-[0_0_15px_rgba(220,38,38,0.3)] animate-pulse whitespace-nowrap"
              >
                <Square size={16} fill="currentColor" />
                <span className="hidden sm:inline">Stop Streaming</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Waterfall */}
        <div className="flex-1 w-full relative flex max-h-[calc(100vh-80px)]">
          {stream && isVideoEnabled && (
            <div className="absolute top-4 right-4 w-64 aspect-video bg-black rounded-lg overflow-hidden border border-zinc-800 shadow-2xl z-20">
              <video ref={videoRef} autoPlay muted playsInline style={{ transform: 'scaleX(-1)' }} className="w-full h-full object-cover" />
            </div>
          )}
          <TranscriptWaterfall socket={socket} />
        </div>

        {/* Footer Visualizer Area */}
        <div className="w-full max-w-4xl p-6 absolute bottom-0 z-50 pointer-events-none pb-12">
          <WaveformVisualizer isRecording={isRecording} stream={stream} />
        </div>
      </main>
    </div>
  );
}

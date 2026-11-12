import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { DeviceSelector } from './components/DeviceSelector';
import { VideoCanvasCompositor } from './components/VideoCanvasCompositor';
import { MetadataForm } from './components/MetadataForm';
import { RecordingControls } from './components/RecordingControls';
import { AudioVisualizer } from './components/AudioVisualizer';
import { CrashRecoveryBanner } from './components/CrashRecoveryBanner';
import { ExtratoModal } from './components/ExtratoModal';
import { LegalHelpModal } from './components/LegalHelpModal';
import { SettingsModal } from './components/SettingsModal';
import { Focus } from 'lucide-react';

import { LayoutMode, OitivaMetadata } from './types/oitiva';
import {
  enumerateHardwareDevices,
  requestMediaPermissions,
  getCameraStream,
  getMicrophoneStream,
  DetectedDevice,
} from './services/deviceManager';
import { AudioEngine } from './services/audioEngine';
import {
  initRecoverySession,
  saveRecoveryChunk,
  finalizeRecoverySession,
  checkInterruptedSessions,
  recoverSessionBlob,
  deleteRecoverySession,
} from './services/storageRecovery';
import { computeSha256, generateRecordingFilename } from './services/cryptoHash';
import { ExtratoData } from './services/pdfGenerator';
import { AppSettings, loadSettings } from './services/settingsService';

export default function App() {
  // 0. Institutional Settings (Promotor vs Juiz, Órgão Padrão)
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);

  // 1. Metadata State
  const [metadata, setMetadata] = useState<OitivaMetadata>(() => {
    const s = loadSettings();
    const defaultAuthor = s.authorityName
      ? `${s.authorityTitle} - ${s.authorityName}`
      : s.authorityTitle;
    return {
      nomePessoa: '',
      qualificacao: 'Testemunha',
      documento: '',
      numeroProcesso: '',
      orgaoInstituicao: s.defaultOrgao || 'Ministério Público do Estado do Tocantins',
      autoridadeResponsavel: defaultAuthor || 'Promotor de Justiça',
      responsavelGravacao: s.defaultOfficer || '',
      observacoes: '',
    };
  });

  // 2. Hardware Devices State
  const [cameras, setCameras] = useState<DetectedDevice[]>([]);
  const [microphones, setMicrophones] = useState<DetectedDevice[]>([]);
  const [selectedCamera1Id, setSelectedCamera1Id] = useState<string | null>(null);
  const [selectedCamera2Id, setSelectedCamera2Id] = useState<string | null>(null);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split');
  const [isDetectingDevices, setIsDetectingDevices] = useState(false);
  const [autoFramingEnabled, setAutoFramingEnabled] = useState(false);

  // Selection refs to allow stable callbacks without dependency loops
  const selectedCamera1IdRef = useRef<string | null>(null);
  const selectedCamera2IdRef = useRef<string | null>(null);
  const selectedMicrophoneIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedCamera1IdRef.current = selectedCamera1Id;
  }, [selectedCamera1Id]);

  useEffect(() => {
    selectedCamera2IdRef.current = selectedCamera2Id;
  }, [selectedCamera2Id]);

  useEffect(() => {
    selectedMicrophoneIdRef.current = selectedMicrophoneId;
  }, [selectedMicrophoneId]);

  // 3. Streams
  const [camera1Stream, setCamera1Stream] = useState<MediaStream | null>(null);
  const [camera2Stream, setCamera2Stream] = useState<MediaStream | null>(null);
  const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(null);

  // 4. Audio Engine & Levels
  const audioEngineRef = useRef<AudioEngine>(new AudioEngine());
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioPeak, setAudioPeak] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [audioGain, setAudioGain] = useState(1.0);

  // 5. Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingElapsedSeconds, setRecordingElapsedSeconds] = useState(0);
  const [recordingBytes, setRecordingBytes] = useState(0);
  const [chunksCount, setChunksCount] = useState(0);
  const [directDiskActive, setDirectDiskActive] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const currentSessionIdRef = useRef<string | null>(null);
  const recordingStartTimeRef = useRef<Date | null>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const fileWritableStreamRef = useRef<any>(null);

  // 6. Crash Recovery & Modals
  const [recoverySessions, setRecoverySessions] = useState<any[]>([]);
  const [isRecovering, setIsRecovering] = useState(false);
  const [extratoData, setExtratoData] = useState<ExtratoData | null>(null);
  const [completedVideoBlob, setCompletedVideoBlob] = useState<Blob | null>(null);
  const [showLegalHelp, setShowLegalHelp] = useState(false);

  // --- Initial Hardware Scan & Interrupted Session Check ---
  const refreshDevices = useCallback(async () => {
    audioEngineRef.current.resume();
    setIsDetectingDevices(true);
    await requestMediaPermissions();
    const { cameras: detectedCameras, microphones: detectedMics } = await enumerateHardwareDevices();
    setCameras(detectedCameras);
    setMicrophones(detectedMics);

    // Auto-assignment Camera 1
    setSelectedCamera1Id((prev) => {
      if (prev && detectedCameras.some((c) => c.deviceId === prev)) {
        return prev;
      }
      return detectedCameras[0]?.deviceId || null;
    });

    // Auto-assignment Camera 2 (separate physical camera if available)
    setSelectedCamera2Id((prev) => {
      if (prev && detectedCameras.some((c) => c.deviceId === prev)) {
        return prev;
      }
      if (detectedCameras.length > 1) {
        const c1 = selectedCamera1IdRef.current || detectedCameras[0]?.deviceId;
        const other = detectedCameras.find((c) => c.deviceId !== c1);
        return other ? other.deviceId : detectedCameras[1].deviceId;
      }
      return null;
    });

    // Auto-assignment Microphone
    setSelectedMicrophoneId((prev) => {
      if (prev && detectedMics.some((m) => m.deviceId === prev)) {
        return prev;
      }
      return detectedMics[0]?.deviceId || null;
    });

    if (detectedCameras.length <= 1) {
      setLayoutMode('single-camera1');
    } else {
      setLayoutMode('split');
    }

    setIsDetectingDevices(false);
  }, []);

  useEffect(() => {
    refreshDevices();

    // Check for crash recovery
    checkInterruptedSessions().then((sessions) => {
      setRecoverySessions(sessions);
    });

    // Device change listener (USB plug/unplug)
    const handleDeviceChange = () => {
      refreshDevices();
    };

    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    }

    return () => {
      if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      }
      audioEngineRef.current.close();
    };
  }, [refreshDevices]);

  // --- Camera 1 Stream Lifecycle ---
  useEffect(() => {
    let active = true;
    let streamToStop: MediaStream | null = null;

    if (selectedCamera1Id) {
      getCameraStream(selectedCamera1Id).then((stream) => {
        if (!active) {
          stream?.getTracks().forEach((t) => t.stop());
          return;
        }
        streamToStop = stream;
        setCamera1Stream(stream);
      });
    } else {
      setCamera1Stream(null);
    }

    return () => {
      active = false;
      if (streamToStop) {
        streamToStop.getTracks().forEach((t) => t.stop());
      }
    };
  }, [selectedCamera1Id]);

  // --- Camera 2 Stream Lifecycle ---
  useEffect(() => {
    let active = true;
    let streamToStop: MediaStream | null = null;

    if (selectedCamera2Id) {
      if (selectedCamera2Id === selectedCamera1Id && camera1Stream) {
        // Clone stream track instead of attempting duplicate exclusive hardware grab
        try {
          const cloned = camera1Stream.clone();
          setCamera2Stream(cloned);
          return () => {
            cloned.getTracks().forEach((t) => t.stop());
          };
        } catch {
          // fallback
        }
      }

      getCameraStream(selectedCamera2Id).then((stream) => {
        if (!active) {
          stream?.getTracks().forEach((t) => t.stop());
          return;
        }
        streamToStop = stream;
        setCamera2Stream(stream);
      });
    } else {
      setCamera2Stream(null);
    }

    return () => {
      active = false;
      if (streamToStop) {
        streamToStop.getTracks().forEach((t) => t.stop());
      }
    };
  }, [selectedCamera2Id, selectedCamera1Id, camera1Stream]);

  // --- Microphone & Audio Engine Lifecycle ---
  useEffect(() => {
    // Avoid ghost stream acquisition before hardware devices have been enumerated
    if (microphones.length === 0 && !selectedMicrophoneId) return;

    let active = true;
    let streamToStop: MediaStream | null = null;

    getMicrophoneStream(selectedMicrophoneId).then((stream) => {
      if (!active) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }
      streamToStop = stream;
      setMicrophoneStream(stream);

      if (stream) {
        audioEngineRef.current.init(stream).catch((err) => {
          console.error('AudioEngine init error:', err);
        });
        audioEngineRef.current.onLevel((level, peak) => {
          setAudioLevel(level);
          setAudioPeak(peak);
        });
      }
    });

    return () => {
      active = false;
      if (streamToStop) {
        streamToStop.getTracks().forEach((t) => t.stop());
      }
    };
  }, [selectedMicrophoneId, microphones.length]);

  // Save settings and optionally update current metadata if unedited
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    setMetadata((prev) => {
      const isOrgaoDefault =
        !prev.orgaoInstituicao || prev.orgaoInstituicao === settings.defaultOrgao;
      const isAuthorDefault =
        !prev.autoridadeResponsavel ||
        prev.autoridadeResponsavel.includes(settings.authorityTitle);

      const newAuthor = newSettings.authorityName
        ? `${newSettings.authorityTitle} - ${newSettings.authorityName}`
        : newSettings.authorityTitle;

      return {
        ...prev,
        orgaoInstituicao: isOrgaoDefault ? newSettings.defaultOrgao : prev.orgaoInstituicao,
        autoridadeResponsavel: isAuthorDefault ? newAuthor : prev.autoridadeResponsavel,
        responsavelGravacao: prev.responsavelGravacao || newSettings.defaultOfficer,
      };
    });
  };

  // Audio mute & gain handlers
  const handleToggleMute = () => {
    audioEngineRef.current.resume();
    if (microphoneStream) {
      const newMuteState = !isMicMuted;
      microphoneStream.getAudioTracks().forEach((t) => {
        t.enabled = !newMuteState;
      });
      setIsMicMuted(newMuteState);
    }
  };

  const handleChangeGain = (gain: number) => {
    audioEngineRef.current.resume();
    setAudioGain(gain);
    audioEngineRef.current.setGain(gain);
  };

  // --- Direct Disk Streaming Setup (FileSystem API) ---
  const handleToggleDirectDisk = async () => {
    if (directDiskActive) {
      setDirectDiskActive(false);
      fileWritableStreamRef.current = null;
      return;
    }

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: generateRecordingFilename(
            metadata.nomePessoa,
            metadata.numeroProcesso,
            new Date(),
            'webm'
          ),
          types: [
            {
              description: 'Vídeo WebM / Matroska',
              accept: { 'video/webm': ['.webm', '.mkv'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        fileWritableStreamRef.current = writable;
        setDirectDiskActive(true);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error opening file handle:', err);
        }
      }
    } else {
      alert('A gravação direta com acesso ao sistema de arquivos é suportada nos navegadores Chrome e Edge.');
    }
  };

  // --- Start Recording ---
  const handleStartRecording = async () => {
    if (!metadata.nomePessoa.trim()) {
      alert('Por favor, insira o nome da pessoa ouvida antes de iniciar a gravação.');
      return;
    }

    if (!canvasStreamRef.current) {
      alert('O compositor de vídeo ainda está inicializando. Aguarde um instante.');
      return;
    }

    // Ensure audio engine context is active
    await audioEngineRef.current.resume();

    // 1. Prepare combined stream: Canvas video + mixed microphone audio
    const compositeStream = canvasStreamRef.current;
    const finalStream = new MediaStream();

    compositeStream.getVideoTracks().forEach((t) => finalStream.addTrack(t));

    const mixedAudioTrack = audioEngineRef.current.getMixedAudioTrack();
    const isAudioContextRunning = audioEngineRef.current.getContextState() === 'running';

    if (isAudioContextRunning && mixedAudioTrack && mixedAudioTrack.readyState === 'live') {
      finalStream.addTrack(mixedAudioTrack);
    } else if (microphoneStream && microphoneStream.getAudioTracks().length > 0) {
      const rawTrack = microphoneStream.getAudioTracks()[0];
      rawTrack.enabled = !isMicMuted;
      finalStream.addTrack(rawTrack);
    }

    // 2. Select codec with priority on VP9/VP8 in WebM container (append-only tolerant)
    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
    }

    const sessionId = `oitiva_${Date.now()}`;
    currentSessionIdRef.current = sessionId;
    recordingStartTimeRef.current = new Date();
    recordedChunksRef.current = [];

    // Initialize Crash Recovery Journal in IndexedDB
    await initRecoverySession(sessionId, metadata, mimeType);

    try {
      const recorder = new MediaRecorder(finalStream, {
        mimeType,
        videoBitsPerSecond: 3000000, // 3.0 Mbps crystal clear Full HD
      });

      let chunkIndex = 0;
      recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
          setRecordingBytes((prev) => prev + e.data.size);
          setChunksCount((prev) => prev + 1);

          // Flush to IndexedDB crash journal
          await saveRecoveryChunk(sessionId, chunkIndex++, e.data);

          // Pipe to direct disk if enabled
          if (fileWritableStreamRef.current) {
            try {
              await fileWritableStreamRef.current.write(e.data);
            } catch (writeErr) {
              console.warn('Error writing direct disk chunk:', writeErr);
            }
          }
        }
      };

      recorder.onstop = async () => {
        // Finalize
        if (fileWritableStreamRef.current) {
          try {
            await fileWritableStreamRef.current.close();
          } catch {}
          fileWritableStreamRef.current = null;
        }

        const completeBlob = new Blob(recordedChunksRef.current, { type: mimeType });
        setCompletedVideoBlob(completeBlob);

        // Mark session as complete in IndexedDB
        await finalizeRecoverySession(sessionId);

        // Compute SHA-256 Hash of entire recording
        const sha256 = await computeSha256(completeBlob);

        const endedAt = new Date();
        const durationSeconds = Math.max(
          1,
          Math.round((endedAt.getTime() - (recordingStartTimeRef.current?.getTime() || endedAt.getTime())) / 1000)
        );

        const filename = generateRecordingFilename(
          metadata.nomePessoa,
          metadata.numeroProcesso,
          recordingStartTimeRef.current || new Date(),
          'webm'
        );

        const data: ExtratoData = {
          metadata,
          filename,
          durationSeconds,
          totalBytes: completeBlob.size,
          sha256,
          startedAt: recordingStartTimeRef.current || new Date(),
          endedAt,
          resolution: '1920x1080 (Full HD)',
          fps: 30,
          container: 'WebM / Matroska VP9 (Contínuo Tolerante a Falhas)',
        };

        setExtratoData(data);
      };

      // timeslice = 1500ms (pushes chunk every 1.5 seconds to IndexedDB)
      recorder.start(1500);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setIsPaused(false);
      setRecordingElapsedSeconds(0);
      setRecordingBytes(0);
      setChunksCount(0);

      // Start elapsed timer
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      alert('Erro ao iniciar gravador. Verifique as permissões de vídeo e áudio.');
    }
  };

  // --- Pause / Resume Recording ---
  const handleTogglePause = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  // --- Stop Recording ---
  const handleStopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
  };

  // --- Crash Recovery Actions ---
  const handleRecoverSession = async (sessionId: string) => {
    setIsRecovering(true);
    const recovered = await recoverSessionBlob(sessionId);
    if (!recovered) {
      alert('Não foi possível resgatar os blocos desta gravação.');
      setIsRecovering(false);
      return;
    }

    const { blob, mimeType } = recovered;
    const sha256 = await computeSha256(blob);

    const targetSession = recoverySessions.find((s) => s.session.id === sessionId);
    const sessionMeta = targetSession?.session.metadata || metadata;
    const startedAt = new Date(targetSession?.session.startedAt || Date.now());
    const endedAt = new Date();

    const durationSeconds = Math.max(1, Math.round((blob.size / 3000000) * 8)); // estimated from bytes

    const filename = generateRecordingFilename(
      sessionMeta.nomePessoa || 'Recuperada',
      sessionMeta.numeroProcesso || '000',
      startedAt,
      'webm'
    );

    const data: ExtratoData = {
      metadata: sessionMeta,
      filename,
      durationSeconds,
      totalBytes: blob.size,
      sha256,
      startedAt,
      endedAt,
      resolution: '1920x1080 (Recuperado)',
      fps: 30,
      container: 'WebM / Matroska (Restaurado do Diário de Falhas)',
    };

    setCompletedVideoBlob(blob);
    setExtratoData(data);
    setIsRecovering(false);
    setRecoverySessions((prev) => prev.filter((s) => s.session.id !== sessionId));
  };

  const handleDismissRecovery = async (sessionId: string) => {
    await deleteRecoverySession(sessionId);
    setRecoverySessions((prev) => prev.filter((s) => s.session.id !== sessionId));
  };

  const selectedMicObj = microphones.find((m) => m.deviceId === selectedMicrophoneId);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800">
      {/* Top Header */}
      <Header
        onOpenSettings={() => setShowSettings(true)}
        onOpenHelp={() => setShowLegalHelp(true)}
        settings={settings}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-4 md:p-5 flex flex-col gap-3.5">
        {/* Crash Recovery Notification (if an interrupted recording is detected) */}
        <CrashRecoveryBanner
          recoverySessions={recoverySessions}
          onRecover={handleRecoverSession}
          onDismiss={handleDismissRecovery}
          isRecovering={isRecovering}
        />

        {/* Camera in-use / locked by another program (e.g. OBS Studio) */}
        {cameras.length > 0 && !camera1Stream && !isDetectingDevices && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-zinc-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-150">
            <div>
              <strong className="text-zinc-100 block font-semibold text-[11px] uppercase tracking-wide">
                Aguardando Liberação da Câmera
              </strong>
              <span className="text-zinc-400 text-[11px]">
                Caso o OBS Studio ou Teams esteja em execução, feche-o para que o sistema operacional conceda acesso exclusivo da câmera ao Clio.
              </span>
            </div>
            <button
              onClick={refreshDevices}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded text-xs font-medium transition-colors shrink-0"
            >
              Reconectar Câmera
            </button>
          </div>
        )}

        {/* Top Split Layout: Left is Video Canvas Viewport, Right is Controls & Metadata */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 flex-1 items-stretch">
          {/* Main Video Viewport (Col 1-8) */}
          <div className="xl:col-span-8 flex flex-col gap-2.5 min-h-[460px] md:min-h-[540px]">
            <div className="flex-1 w-full bg-black rounded-lg overflow-hidden border border-zinc-800 flex items-center justify-center shadow-lg relative">
              <VideoCanvasCompositor
                camera1Stream={camera1Stream}
                camera2Stream={camera2Stream}
                layoutMode={layoutMode}
                metadata={metadata}
                isRecording={isRecording}
                recordingElapsedSeconds={recordingElapsedSeconds}
                autoFramingEnabled={autoFramingEnabled}
                onCanvasStreamReady={(stream) => {
                  canvasStreamRef.current = stream;
                }}
              />
            </div>

            {/* Quick Layout, Auto-Framing & Audio Bottom Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/90 border border-zinc-800/80 rounded-lg px-3.5 py-2">
              {/* Audio VU Meter */}
              <AudioVisualizer
                currentLevel={audioLevel}
                peakLevel={audioPeak}
                isMuted={isMicMuted}
                gain={audioGain}
                onToggleMute={handleToggleMute}
                onChangeGain={handleChangeGain}
                onActivateAudio={() => audioEngineRef.current.resume()}
                micLabel={selectedMicObj?.label}
              />

              {/* Center/Right Controls: Auto-Framing Toggle & Scene Indicator */}
              <div className="flex items-center gap-2.5">
                {/* Auto-Framing (Face Tracking) Toggle Button */}
                <button
                  type="button"
                  onClick={() => setAutoFramingEnabled((prev) => !prev)}
                  className={`h-8 flex items-center gap-2 px-3 rounded-md text-xs font-medium border transition-colors ${
                    autoFramingEnabled
                      ? 'bg-zinc-800 text-zinc-100 border-zinc-600 shadow-xs'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                  title="Enquadramento automático inteligente: a câmera segue o rosto do depoente (estilo Zoom/Center Stage). Clique para ativar ou desativar."
                >
                  <Focus className={`w-3.5 h-3.5 ${autoFramingEnabled ? 'text-zinc-100' : 'text-zinc-500'}`} />
                  <span>Foco Automático:</span>
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    autoFramingEnabled ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-900 text-zinc-500'
                  }`}>
                    {autoFramingEnabled ? 'ATIVADO' : 'DESATIVADO'}
                  </span>
                </button>

                {/* Layout mode indicator */}
                <div className="hidden sm:flex h-8 items-center gap-2 px-2.5 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-400">
                  <span className="text-[11px] font-medium text-zinc-400">Cena:</span>
                  <span className="font-mono text-zinc-200 text-[11px]">
                    {layoutMode === 'split' && 'Lado a Lado (50/50)'}
                    {layoutMode === 'pip-camera1' && 'PiP (Depoente)'}
                    {layoutMode === 'pip-camera2' && 'PiP (Mesa)'}
                    {layoutMode === 'single-camera1' && 'Câmera 1'}
                    {layoutMode === 'single-camera2' && 'Câmera 2'}
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span className="font-mono text-zinc-400 text-[11px]">1080p 30fps</span>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration & Form Sidebar (Col 9-12) */}
          <div className="xl:col-span-4 flex flex-col gap-3.5">
            {/* Metadata / Qualification Form */}
            <MetadataForm
              metadata={metadata}
              onChange={(updated) => setMetadata((prev) => ({ ...prev, ...updated }))}
              isRecording={isRecording}
            />

            {/* Automated Hardware Selector */}
            <DeviceSelector
              cameras={cameras}
              microphones={microphones}
              selectedCamera1Id={selectedCamera1Id}
              selectedCamera2Id={selectedCamera2Id}
              selectedMicrophoneId={selectedMicrophoneId}
              layoutMode={layoutMode}
              onSelectCamera1={(id) => {
                audioEngineRef.current.resume();
                setSelectedCamera1Id(id);
              }}
              onSelectCamera2={(id) => {
                audioEngineRef.current.resume();
                setSelectedCamera2Id(id);
              }}
              onSelectMicrophone={(id) => {
                audioEngineRef.current.resume();
                setSelectedMicrophoneId(id);
              }}
              onChangeLayout={(mode) => {
                audioEngineRef.current.resume();
                setLayoutMode(mode);
              }}
              onRefreshDevices={() => {
                audioEngineRef.current.resume();
                refreshDevices();
              }}
              isDetecting={isDetectingDevices}
            />
          </div>
        </div>

        {/* Bottom Recording Control Strip */}
        <RecordingControls
          isRecording={isRecording}
          isPaused={isPaused}
          elapsedSeconds={recordingElapsedSeconds}
          totalBytes={recordingBytes}
          chunksCount={chunksCount}
          hasName={metadata.nomePessoa.trim().length > 0}
          directDiskActive={directDiskActive}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onTogglePause={handleTogglePause}
          onToggleDirectDisk={handleToggleDirectDisk}
        />
      </main>

      {/* Extrato & PDF Modal */}
      {extratoData && completedVideoBlob && (
        <ExtratoModal
          data={extratoData}
          videoBlob={completedVideoBlob}
          onClose={() => {
            setExtratoData(null);
            setCompletedVideoBlob(null);
          }}
        />
      )}

      {/* Institutional Settings Modal */}
      {showSettings && (
        <SettingsModal
          currentSettings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Legal & Chain of Custody Help Modal */}
      {showLegalHelp && <LegalHelpModal onClose={() => setShowLegalHelp(false)} />}
    </div>
  );
}

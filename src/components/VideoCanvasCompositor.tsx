import React, { useEffect, useRef } from 'react';
import { LayoutMode, OitivaMetadata } from '../types/oitiva';
import { FaceTracker } from '../services/faceTracker';

interface VideoCanvasCompositorProps {
  camera1Stream: MediaStream | null;
  camera2Stream: MediaStream | null;
  layoutMode: LayoutMode;
  metadata: OitivaMetadata;
  isRecording: boolean;
  recordingElapsedSeconds: number;
  autoFramingEnabled: boolean;
  onCanvasStreamReady?: (stream: MediaStream) => void;
}

export const VideoCanvasCompositor: React.FC<VideoCanvasCompositorProps> = ({
  camera1Stream,
  camera2Stream,
  layoutMode,
  metadata,
  isRecording,
  recordingElapsedSeconds,
  autoFramingEnabled,
  onCanvasStreamReady,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const video1Ref = useRef<HTMLVideoElement | null>(null);
  const video2Ref = useRef<HTMLVideoElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const compositeStreamRef = useRef<MediaStream | null>(null);

  // Dedicated Auto-Framing / Face Trackers for each video input
  const tracker1Ref = useRef<FaceTracker>(new FaceTracker());
  const tracker2Ref = useRef<FaceTracker>(new FaceTracker());

  // Sync Video 1 Stream
  useEffect(() => {
    if (video1Ref.current) {
      if (camera1Stream) {
        video1Ref.current.srcObject = camera1Stream;
        video1Ref.current.play().catch(() => {});
      } else {
        video1Ref.current.srcObject = null;
      }
    }
  }, [camera1Stream]);

  // Sync Video 2 Stream
  useEffect(() => {
    if (video2Ref.current) {
      if (camera2Stream) {
        video2Ref.current.srcObject = camera2Stream;
        video2Ref.current.play().catch(() => {});
      } else {
        video2Ref.current.srcObject = null;
      }
    }
  }, [camera2Stream]);

  // Setup Canvas Stream
  useEffect(() => {
    if (canvasRef.current && !compositeStreamRef.current) {
      const stream = canvasRef.current.captureStream(30);
      compositeStreamRef.current = stream;
      if (onCanvasStreamReady) {
        onCanvasStreamReady(stream);
      }
    }
  }, [onCanvasStreamReady]);

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const width = 1920;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    const drawPlaceholder = (
      x: number,
      y: number,
      w: number,
      h: number,
      title: string,
      subtitle: string
    ) => {
      ctx.fillStyle = '#09090b';
      ctx.fillRect(x, y, w, h);

      // Subtle minimalist grid
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 1;
      const step = 64;
      for (let px = x; px < x + w; px += step) {
        ctx.beginPath();
        ctx.moveTo(px, y);
        ctx.lineTo(px, y + h);
        ctx.stroke();
      }
      for (let py = y; py < y + h; py += step) {
        ctx.beginPath();
        ctx.moveTo(x, py);
        ctx.lineTo(x + w, py);
        ctx.stroke();
      }

      // Title & sub
      ctx.fillStyle = '#d4d4d8';
      ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, x + w / 2, y + h / 2 - 8);

      ctx.fillStyle = '#71717a';
      ctx.font = '400 14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(subtitle, x + w / 2, y + h / 2 + 18);
    };

    const drawFittedVideo = (
      video: HTMLVideoElement | null,
      tracker: FaceTracker,
      dx: number,
      dy: number,
      dw: number,
      dh: number,
      placeholderTitle: string,
      placeholderSub: string
    ) => {
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const dAspect = dw / dh;

        // Compute smooth auto-framing crop or standard wide crop
        const crop = tracker.computeCrop(vw, vh, dAspect, autoFramingEnabled);

        ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, dx, dy, dw, dh);

        // Subtle indicator if auto-framing is tracking the speaker
        if (autoFramingEnabled && crop.isTracking) {
          ctx.fillStyle = 'rgba(9, 9, 11, 0.75)';
          ctx.fillRect(dx + dw - 140, dy + 16, 124, 24);
          ctx.fillStyle = '#e4e4e7';
          ctx.font = '500 11px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('FOCO ATIVO', dx + dw - 78, dy + 32);
        }
      } else {
        drawPlaceholder(dx, dy, dw, dh, placeholderTitle, placeholderSub);
      }
    };

    const render = () => {
      const v1 = video1Ref.current;
      const v2 = video2Ref.current;

      // Update face tracking analysis
      tracker1Ref.current.update(v1, autoFramingEnabled);
      tracker2Ref.current.update(v2, autoFramingEnabled);

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // 1. Draw based on Layout Mode
      if (layoutMode === 'split') {
        const halfW = width / 2;
        // Left: Camera 1 (Depoente)
        drawFittedVideo(
          v1,
          tracker1Ref.current,
          0,
          0,
          halfW - 1,
          height,
          'CÂMERA 1 · DEPOENTE',
          'Aguardando Sinal de Entrada'
        );
        // Right: Camera 2 (Autoridade / Mesa)
        drawFittedVideo(
          v2,
          tracker2Ref.current,
          halfW + 1,
          0,
          halfW - 1,
          height,
          'CÂMERA 2 · AUTORIDADE / MESA',
          'Aguardando Sinal de Entrada'
        );

        // Central divider line
        ctx.fillStyle = '#27272a';
        ctx.fillRect(halfW - 1, 0, 2, height);

        // Header label tags inside video
        ctx.fillStyle = 'rgba(9, 9, 11, 0.85)';
        ctx.fillRect(20, 20, 210, 28);
        ctx.fillRect(halfW + 20, 20, 210, 28);

        ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#f4f4f5';
        ctx.textAlign = 'left';
        ctx.fillText('DEPOENTE / TESTEMUNHA', 32, 38);
        ctx.fillText('AUTORIDADE / CONDUÇÃO', halfW + 32, 38);
      } else if (layoutMode === 'pip-camera1') {
        // Main: Camera 1
        drawFittedVideo(
          v1,
          tracker1Ref.current,
          0,
          0,
          width,
          height,
          'CÂMERA 1 · DEPOENTE',
          'Sinal Primário'
        );

        // Pip: Camera 2 (Bottom right)
        const pipW = 480;
        const pipH = 270;
        const pipX = width - pipW - 32;
        const pipY = height - pipH - 110;

        ctx.fillStyle = '#09090b';
        ctx.fillRect(pipX - 2, pipY - 2, pipW + 4, pipH + 4);
        drawFittedVideo(
          v2,
          tracker2Ref.current,
          pipX,
          pipY,
          pipW,
          pipH,
          'CÂMERA 2',
          'Secundária'
        );
        ctx.strokeStyle = '#3f3f46';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(pipX, pipY, pipW, pipH);
      } else if (layoutMode === 'pip-camera2') {
        // Main: Camera 2
        drawFittedVideo(
          v2,
          tracker2Ref.current,
          0,
          0,
          width,
          height,
          'CÂMERA 2 · AUTORIDADE',
          'Sinal Secundário'
        );

        // Pip: Camera 1
        const pipW = 480;
        const pipH = 270;
        const pipX = width - pipW - 32;
        const pipY = height - pipH - 110;

        ctx.fillStyle = '#09090b';
        ctx.fillRect(pipX - 2, pipY - 2, pipW + 4, pipH + 4);
        drawFittedVideo(
          v1,
          tracker1Ref.current,
          pipX,
          pipY,
          pipW,
          pipH,
          'CÂMERA 1',
          'Depoente'
        );
        ctx.strokeStyle = '#3f3f46';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(pipX, pipY, pipW, pipH);
      } else if (layoutMode === 'single-camera1') {
        drawFittedVideo(
          v1,
          tracker1Ref.current,
          0,
          0,
          width,
          height,
          'CÂMERA 1 · DEPOENTE',
          'Modo Câmera Única'
        );
      } else if (layoutMode === 'single-camera2') {
        drawFittedVideo(
          v2,
          tracker2Ref.current,
          0,
          0,
          width,
          height,
          'CÂMERA 2 · SALA / AUTORIDADE',
          'Modo Câmera Única'
        );
      }

      // 2. BURN-IN PROBATORY WATERMARK (Carimbo Legal Inalterável no Vídeo)
      const barHeight = 84;
      const barY = height - barHeight;

      // Dark translucent bar
      ctx.fillStyle = 'rgba(9, 9, 11, 0.94)';
      ctx.fillRect(0, barY, width, barHeight);

      // Top subtle accent hairline
      ctx.fillStyle = isRecording ? '#dc2626' : 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(0, barY, width, 1.5);

      // Left Column: Depoente & Processo
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
      const nomeExibicao = (metadata.nomePessoa || 'DEPOENTE NÃO INFORMADO').toUpperCase();
      const qualifExibicao = metadata.qualificacao ? ` · ${metadata.qualificacao.toUpperCase()}` : '';
      ctx.fillText(`${nomeExibicao}${qualifExibicao}`, 32, barY + 32);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '500 13px "JetBrains Mono", monospace';
      const proc = metadata.numeroProcesso ? `AUTOS: ${metadata.numeroProcesso}` : 'AUTOS NÃO INFORMADOS';
      const inst = metadata.orgaoInstituicao || 'SISTEMA DE JUSTIÇA';
      ctx.fillText(`${proc}  ·  ${inst}`, 32, barY + 62);

      // Right Column: Live Timestamp & Recording Status
      const now = new Date();
      const datePart = now.toLocaleDateString('pt-BR');
      const timePart = now.toLocaleTimeString('pt-BR');

      ctx.textAlign = 'right';
      ctx.fillStyle = '#f4f4f5';
      ctx.font = '600 20px "JetBrains Mono", monospace';
      ctx.fillText(`${datePart}  ${timePart}`, width - 32, barY + 34);

      if (isRecording) {
        const h = Math.floor(recordingElapsedSeconds / 3600);
        const m = Math.floor((recordingElapsedSeconds % 3600) / 60);
        const s = Math.floor(recordingElapsedSeconds % 60);
        const pad = (n: number) => String(n).padStart(2, '0');
        const timerText = `${pad(h)}:${pad(m)}:${pad(s)}`;

        ctx.fillStyle = '#ef4444';
        ctx.font = '700 13px "JetBrains Mono", monospace';
        ctx.fillText(`● GRAVANDO [REC ${timerText}] · FLUXO SEGURO`, width - 32, barY + 62);
      } else {
        ctx.fillStyle = '#71717a';
        ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('CLIO · SISTEMA PRONTO PARA GRAVAÇÃO', width - 32, barY + 62);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [layoutMode, metadata, isRecording, recordingElapsedSeconds, autoFramingEnabled]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden rounded-lg border border-zinc-800 shadow-xl">
      {/* Hidden elements for capturing video tracks */}
      <video ref={video1Ref} playsInline muted className="hidden" />
      <video ref={video2Ref} playsInline muted className="hidden" />

      {/* Main Composite Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain max-h-[76vh] aspect-video rounded-lg"
      />
    </div>
  );
};

import { useRef, useState, useCallback } from 'react';

interface ScreenFrame {
  base64: string;
  mimeType: string;
}

interface UseScreenShareResult {
  isSharing: boolean;
  startSharing: () => Promise<void>;
  stopSharing: () => void;
  captureFrame: () => ScreenFrame | null;
  error: string | null;
}

export function useScreenShare(
  onStart: () => void,
  onStop: () => void
): UseScreenShareResult {
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stopSharing = useCallback(() => {
    console.log('[useScreenShare] stopSharing chamado');
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    videoRef.current = null;
    setIsSharing(false);
    console.log('[useScreenShare] isSharing setado para false');
    onStop();
  }, [onStop]);

  const startSharing = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('Seu navegador não suporta compartilhamento de tela.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      streamRef.current = stream;

      // Cria elemento de vídeo oculto para capturar frames
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      videoRef.current = video;

      // Canvas reutilizável para captura
      canvasRef.current = document.createElement('canvas');

      stream.getVideoTracks()[0].onended = () => {
        streamRef.current = null;
        videoRef.current = null;
        setIsSharing(false);
        onStop();
      };

      setIsSharing(true);
      onStart();
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        setError(`Erro ao compartilhar tela: ${err.message}`);
      }
    }
  }, [onStart, onStop]);

  // Captura um frame atual da tela como base64 JPEG
  const captureFrame = useCallback((): ScreenFrame | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !isSharing) return null;

    // Reduz resolução para acelerar Vision (960px é suficiente)
    const maxWidth = 960;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.floor(video.videoWidth * scale);
    canvas.height = Math.floor(video.videoHeight * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Qualidade 0.6 reduz tamanho sem perder legibilidade
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
    const base64 = dataUrl.split(',')[1];

    return { base64, mimeType: 'image/jpeg' };
  }, [isSharing]);

  return { isSharing, startSharing, stopSharing, captureFrame, error };
}

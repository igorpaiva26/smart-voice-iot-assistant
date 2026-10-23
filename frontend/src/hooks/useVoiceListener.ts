import { useRef, useState, useCallback, useEffect } from 'react';

export type ListeningState = 'idle' | 'listening' | 'processing';

interface UseVoiceListenerResult {
  listeningState: ListeningState;
  startListening: () => Promise<void>;
  stopListening: () => void;
  pauseListening: () => void;
  resumeListening: () => void;
  error: string | null;
}

const SILENCE_THRESHOLD = 6;      // volume mínimo para considerar fala
const SILENCE_DELAY_MS = 2000;    // silêncio contínuo para enviar
const MIN_SPEECH_MS = 700;        // duração mínima de fala válida
const SPEECH_GRACE_MS = 1200;     // tempo de graça após última fala antes de iniciar timer de silêncio

export function useVoiceListener(
  onAudioReady: (blob: Blob) => void
): UseVoiceListenerResult {
  const [listeningState, setListeningState] = useState<ListeningState>('idle');
  const [error, setError] = useState<string | null>(null);

  const activeRef = useRef(false);
  const pausedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechStartRef = useRef<number>(0);
  const lastSpeechRef = useRef<number>(0);
  const isRecordingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const flushRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    // Solicita os dados acumulados e para
    recorder.requestData();
    recorder.stop();
  }, []);

  // Grava continuamente desde o início, descarta se for silêncio
  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || isRecordingRef.current) return;

    chunksRef.current = [];
    isRecordingRef.current = true;
    speechStartRef.current = Date.now();

    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      isRecordingRef.current = false;
      const duration = Date.now() - speechStartRef.current;
      if (duration >= MIN_SPEECH_MS && chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setListeningState('processing');
        onAudioReady(blob);
        setTimeout(() => {
          if (activeRef.current && !pausedRef.current) setListeningState('listening');
        }, 300);
      }
      chunksRef.current = [];
    };

    // timeslice de 100ms garante chunks frequentes para não perder dados
    recorder.start(100);
  }, [onAudioReady]);

  // Inicia gravação contínua assim que o microfone estiver pronto
  const startContinuousRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || isRecordingRef.current) return;
    chunksRef.current = [];
    isRecordingRef.current = true;
    speechStartRef.current = Date.now();
    lastSpeechRef.current = 0; // Reset: só considera fala DESTA gravação
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      isRecordingRef.current = false;
      const hasSpeech = lastSpeechRef.current > speechStartRef.current;
      const duration = Date.now() - speechStartRef.current;
      if (hasSpeech && duration >= MIN_SPEECH_MS && chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setListeningState('processing');
        onAudioReady(blob);
        setTimeout(() => {
          if (activeRef.current && !pausedRef.current) {
            setListeningState('listening');
            startContinuousRecording();
          }
        }, 300);
      } else {
        // Sem fala detectada, reinicia gravação silenciosamente
        chunksRef.current = [];
        if (activeRef.current && !pausedRef.current) startContinuousRecording();
      }
    };
    recorder.start(100);
  }, [onAudioReady]);

  const monitorVolume = useCallback(() => {
    if (!activeRef.current) return;

    if (pausedRef.current) {
      if (isRecordingRef.current) {
        clearSilenceTimer();
        flushRecording();
      }
      return;
    }

    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += Math.abs(data[i] - 128);
    const volume = sum / data.length;
    const isSpeaking = volume > SILENCE_THRESHOLD;

    if (isSpeaking) {
      lastSpeechRef.current = Date.now();
      clearSilenceTimer();
    } else if (isRecordingRef.current && !silenceTimerRef.current) {
      const timeSinceLastSpeech = Date.now() - lastSpeechRef.current;
      if (timeSinceLastSpeech > SPEECH_GRACE_MS) {
        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null;
          flushRecording();
        }, SILENCE_DELAY_MS);
      }
    }
  }, [flushRecording]);

  const startListening = useCallback(async () => {
    if (activeRef.current) return;
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Seu navegador não suporta acesso ao microfone.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      activeRef.current = true;
      pausedRef.current = false;
      lastSpeechRef.current = 0;
      setListeningState('listening');

      intervalRef.current = setInterval(monitorVolume, 80);
      startContinuousRecording();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Permissão de microfone negada. Permita o acesso nas configurações do navegador.');
      } else {
        setError(`Erro ao acessar microfone: ${err.message}`);
      }
    }
  }, [monitorVolume]);

  const stopListening = useCallback(() => {
    activeRef.current = false;
    pausedRef.current = false;
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    clearSilenceTimer();
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();
    streamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    recorderRef.current = null;
    isRecordingRef.current = false;
    setListeningState('idle');
  }, []);

  const pauseListening = useCallback(() => {
    pausedRef.current = true;
  }, []);

  const resumeListening = useCallback(() => {
    setTimeout(() => {
      if (activeRef.current) {
        pausedRef.current = false;
        setListeningState('listening');
        // Reinicia gravação contínua se não estiver gravando
        if (!isRecordingRef.current) {
          startContinuousRecording();
        }
      }
    }, 1200);
  }, [startContinuousRecording]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearSilenceTimer();
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
    };
  }, []);

  return { listeningState, startListening, stopListening, pauseListening, resumeListening, error };
}

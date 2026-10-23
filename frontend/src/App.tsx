import { useEffect, useRef, useState, useCallback } from 'react';
import { OrbVisualizer, OrbState } from './components/OrbVisualizer';
import './index.css';

const API_BASE = 'http://localhost:3001/api';

export default function App() {
  const [appState, setAppState] = useState<OrbState>('ready');
  const [subtitle, setSubtitle] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const stateRef = useRef<OrbState>('ready');
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isSpeakingRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasVoiceRef = useRef<boolean>(false);

  const updateState = useCallback((s: OrbState) => {
    stateRef.current = s;
    setAppState(s);
  }, []);

  // ─── REPRODUÇÃO DE ÁUDIO (ELEVENLABS) ────────────────────────────────────
  const playSpeech = useCallback(async (text: string): Promise<void> => {
    updateState('speaking');
    setSubtitle(text);
    isProcessingRef.current = true;

    return new Promise((resolve) => {
      const finish = () => {
        isProcessingRef.current = false;
        setTimeout(() => {
          setSubtitle('');
          updateState('listening');
          resolve();
        }, 800);
      };

      fetch(`${API_BASE}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Status ${res.status}`);
          return res.blob();
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => {
            URL.revokeObjectURL(url);
            finish();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            finish();
          };
          audio.play().catch(finish);
        })
        .catch(() => {
          // Fallback se ElevenLabs falhar
          const utter = new SpeechSynthesisUtterance(text);
          utter.lang = 'pt-BR';
          utter.onend = finish;
          utter.onerror = finish;
          window.speechSynthesis.speak(utter);
        });
    });
  }, [updateState]);

  // ─── PROCESSAR COMANDO NO BACKEND ─────────────────────────────────────────
  const handleCommandText = useCallback(
    async (rawText: string) => {
      const clean = rawText.trim();
      if (!clean || isProcessingRef.current) return;

      console.log('[Aline] Texto recebido:', clean);
      setSubtitle(clean);
      updateState('processing');
      isProcessingRef.current = true;

      try {
        const res = await fetch(`${API_BASE}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: clean }),
        });
        const data = await res.json();
        console.log('[Aline] Resposta backend:', data);

        if (data.isCommand && data.response) {
          await playSpeech(data.response);
        } else {
          // Ignora frases não relacionadas à casa inteligente
          setTimeout(() => {
            setSubtitle('');
            isProcessingRef.current = false;
            updateState('listening');
          }, 600);
        }
      } catch (err: any) {
        console.error('[Aline] Erro comando:', err.message);
        isProcessingRef.current = false;
        updateState('listening');
      }
    },
    [playSpeech, updateState]
  );

  // ─── TRANSCRIÇÃO VIA GROQ WHISPER (FALLBACK ROBUSTO) ──────────────────────
  const sendAudioToGroqWhisper = useCallback(async (blob: Blob) => {
    if (blob.size < 3000 || isProcessingRef.current) return;

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'gravacao.webm');

      console.log('[Aline] Enviando áudio para Groq Whisper...');
      const res = await fetch(`${API_BASE}/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) return;
      const data = await res.json();
      if (data.text && data.text.trim()) {
        handleCommandText(data.text);
      }
    } catch (e: any) {
      console.warn('[Aline] Groq STT erro:', e.message);
    }
  }, [handleCommandText]);

  // ─── INICIALIZAR MICROFONE E ANALISADOR DE ÁUDIO ─────────────────────────
  const initMicrophone = useCallback(async () => {
    setErrorMessage('');
    try {
      // 1. Solicita acesso ao microfone nativamente
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // 2. AudioContext para visualizador em tempo real
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // 3. MediaRecorder para fallback contínuo
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        if (hasVoiceRef.current && !isProcessingRef.current) {
          sendAudioToGroqWhisper(audioBlob);
        }
        hasVoiceRef.current = false;
      };

      // 4. Web Speech API (reconhecimento rápido do navegador)
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        const recognition = new SpeechRec();
        recognition.lang = 'pt-BR';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              handleCommandText(transcript);
              return;
            } else {
              interim += transcript;
            }
          }
          if (interim && !isProcessingRef.current) {
            setSubtitle(interim);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('[Aline] SpeechRecognition aviso:', event.error);
        };

        recognition.onend = () => {
          if (!isProcessingRef.current && stateRef.current !== 'error') {
            try { recognition.start(); } catch (_) {}
          }
        };

        recognitionRef.current = recognition;
        try { recognition.start(); } catch (_) {}
      }

      updateState('listening');

      // 5. Loop de medição de volume (VAD + Animação do Orbe)
      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const updateVolumeLoop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buffer);

        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const avg = sum / buffer.length;
        const normalized = Math.min(avg / 90, 1);
        setAudioLevel(normalized);

        // Se detectar som perceptível (> 0.12)
        if (normalized > 0.12 && !isSpeakingRef.current && !isProcessingRef.current) {
          isSpeakingRef.current = true;
          hasVoiceRef.current = true;
          audioChunksRef.current = [];
          if (recorder.state === 'inactive') {
            try { recorder.start(); } catch (_) {}
          }
        }

        // Detecção de silêncio
        if (normalized <= 0.08 && isSpeakingRef.current) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              isSpeakingRef.current = false;
              silenceTimerRef.current = null;
              if (recorder.state === 'recording') {
                try { recorder.stop(); } catch (_) {}
              }
            }, 1200);
          }
        } else if (normalized > 0.08 && silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        requestAnimationFrame(updateVolumeLoop);
      };

      requestAnimationFrame(updateVolumeLoop);
    } catch (err: any) {
      console.error('[Aline] Erro ao acessar microfone:', err);
      updateState('error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Permissão negada. Clique no ícone de cadeado na barra do navegador e permita o microfone.');
      } else {
        setErrorMessage('Nenhum microfone encontrado ou erro ao conectar.');
      }
    }
  }, [handleCommandText, sendAudioToGroqWhisper, updateState]);

  // Limpeza
  useEffect(() => {
    return () => {
      try { recognitionRef.current?.abort(); } catch (_) {}
      try { mediaRecorderRef.current?.stop(); } catch (_) {}
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close();
    };
  }, []);

  return (
    <div className="app-container">
      <OrbVisualizer
        state={appState}
        subtitle={subtitle}
        audioLevel={audioLevel}
        errorMessage={errorMessage}
        onClick={() => {
          if (appState === 'ready' || appState === 'error') {
            initMicrophone();
          }
        }}
      />
    </div>
  );
}

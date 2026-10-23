import { useRef, useState, useCallback } from 'react';
import { synthesizeSpeech } from '../services/api';

interface UseSpeechSynthesisOptions {
  onSpeakEnd?: () => void;
}

export function useSpeechSynthesis(options: UseSpeechSynthesisOptions = {}) {
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingRef = useRef(false);
  const queueRef = useRef<string[]>([]);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const playNext = useCallback(async () => {
    if (isSpeakingRef.current || queueRef.current.length === 0) return;
    if (mutedRef.current) { queueRef.current = []; return; }

    isSpeakingRef.current = true;
    const text = queueRef.current.shift()!;

    const finish = () => {
      isSpeakingRef.current = false;
      if (queueRef.current.length > 0) {
        playNext();
      } else {
        optionsRef.current.onSpeakEnd?.();
      }
    };

    try {
      const url = await synthesizeSpeech(text);
      if (mutedRef.current) { URL.revokeObjectURL(url); finish(); return; }

      const audio = new Audio(url);
      audioRef.current = audio;

      // Aumentando a velocidade de leitura para ficar mais dinâmico
      audio.playbackRate = 1.2;

      audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; finish(); };
      audio.onerror = () => { URL.revokeObjectURL(url); audioRef.current = null; finish(); };

      await audio.play();
    } catch {
      // Fallback para speechSynthesis se ElevenLabs falhar
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      // Aumentando a velocidade da voz fallback
      utterance.rate = 1.2;
      utterance.onend = finish;
      utterance.onerror = finish;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    if (mutedRef.current) return;
    // Descarta fila anterior e começa do zero com o novo texto
    queueRef.current = [text];
    if (!isSpeakingRef.current) {
      await playNext();
    }
  }, [playNext]);

  const cancel = useCallback(() => {
    queueRef.current = [];
    isSpeakingRef.current = false;
    if (audioRef.current) {
      const src = audioRef.current.src;
      audioRef.current.pause();
      audioRef.current = null;
      if (src.startsWith('blob:')) URL.revokeObjectURL(src);
    }
    window.speechSynthesis?.cancel();
    optionsRef.current.onSpeakEnd?.();
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      if (!prev) {
        queueRef.current = [];
        isSpeakingRef.current = false;
        if (audioRef.current) {
          const src = audioRef.current.src;
          audioRef.current.pause();
          audioRef.current = null;
          if (src.startsWith('blob:')) URL.revokeObjectURL(src);
        }
        window.speechSynthesis?.cancel();
      }
      return !prev;
    });
  }, []);

  return { speak, cancel, muted, toggleMute };
}

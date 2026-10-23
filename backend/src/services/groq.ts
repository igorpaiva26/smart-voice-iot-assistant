/**
 * Serviço Groq — usado APENAS para STT (Whisper).
 * 
 * O chat e tools usam Gemini (gemini.ts).
 * Este arquivo mantém apenas a transcrição de áudio.
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import { loadEnv } from '../types/env';

const env = loadEnv();

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const form = new FormData();
  form.append('file', audioBuffer, {
    filename: 'audio.webm',
    contentType: mimeType || 'audio/webm',
  });
  form.append('model', env.GROQ_STT_MODEL);
  form.append('language', 'pt');
  form.append('response_format', 'json');

  console.log(`[groq] Transcrevendo áudio (${audioBuffer.length} bytes) com modelo ${env.GROQ_STT_MODEL}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.GROQ_TIMEOUT_MS);

  try {
    const res = await fetch(`${env.GROQ_BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        ...form.getHeaders(),
      },
      body: form,
      signal: controller.signal as any,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[groq] Erro na transcrição: ${res.status} ${err}`);
      throw new Error(`Groq STT retornou ${res.status}: ${err}`);
    }

    const data = (await res.json()) as { text: string };
    console.log(`[groq] Transcrição concluída: "${data.text}"`);
    return data.text ?? '';
  } finally {
    clearTimeout(timeout);
  }
}

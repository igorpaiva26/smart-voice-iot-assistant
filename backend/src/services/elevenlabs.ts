import fetch from 'node-fetch';
import { loadEnv } from '../types/env';

const env = loadEnv();

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  console.log(`[elevenlabs] Sintetizando: "${text.slice(0, 80)}"`);

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${env.ELEVENLABS_VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: env.ELEVENLABS_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${err}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

const BASE_URL = 'http://localhost:3001/api';

export interface ApiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Converte Uint8Array para base64 sem stack overflow (chunked) */
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function sendChatMessage(message: string, history: ApiChatMessage[], agentId?: string, customPrompt?: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, agentId, customPrompt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Erro ao enviar mensagem.');
  return data.reply as string;
}

export async function sendVisionMessage(
  imageBase64: string,
  mimeType: string,
  message: string,
  history: ApiChatMessage[],
  agentId?: string,
  customPrompt?: string
): Promise<string> {
  const res = await fetch(`${BASE_URL}/vision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64, mimeType, message, history, agentId, customPrompt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Erro ao analisar tela.');
  return data.reply as string;
}

export async function sendAudioVisionMessage(
  blob: Blob,
  imageBase64: string,
  imageMime: string,
  history: ApiChatMessage[],
  agentId?: string,
  customPrompt?: string
): Promise<{ transcription: string; reply: string }> {
  const arrayBuffer = await blob.arrayBuffer();
  const audio = uint8ToBase64(new Uint8Array(arrayBuffer));
  const res = await fetch(`${BASE_URL}/audiovision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio, audioMime: blob.type || 'audio/webm', image: imageBase64, imageMime, history, agentId, customPrompt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as any).error ?? 'Erro ao processar áudio+tela.');
  return data as { transcription: string; reply: string };
}

export async function sendAudioMessage(
  blob: Blob,
  history: ApiChatMessage[],
  agentId?: string,
  customPrompt?: string
): Promise<{ transcription: string; reply: string }> {
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = uint8ToBase64(new Uint8Array(arrayBuffer));
  const res = await fetch(`${BASE_URL}/audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio: base64, mimeType: blob.type || 'audio/webm', history, agentId, customPrompt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as any).error ?? 'Erro ao processar áudio.');
  return data as { transcription: string; reply: string };
}

export async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append('audio', blob, 'audio.webm');
  const res = await fetch(`${BASE_URL}/transcribe`, { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Erro ao transcrever áudio.');
  return data.text as string;
}

export async function synthesizeSpeech(text: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error((data as any).error ?? 'Erro ao sintetizar voz.');
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

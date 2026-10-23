/**
 * Serviço de TTS via Microsoft Edge TTS (Python edge-tts).
 * Gratuito, sem conta, sem limite. Voz: pt-BR-FranciscaNeural
 */

import { execFile } from 'child_process';
import { readFile, unlink } from 'fs/promises';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { join } from 'path';

const execFileAsync = promisify(execFile);

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  console.log(`[edgetts] Sintetizando: "${text.slice(0, 60)}"`);
  const t0 = Date.now();

  const outFile = join(tmpdir(), `edgetts_${Date.now()}.mp3`);

  await execFileAsync('python', [
    '-m', 'edge_tts',
    '--voice', 'pt-BR-FranciscaNeural',
    '--text', text,
    '--write-media', outFile,
  ]);

  const buffer = await readFile(outFile);
  await unlink(outFile).catch(() => {});
  
  console.log(`[edgetts] Áudio gerado: ${buffer.length} bytes em ${Date.now() - t0}ms`);
  return buffer;
}

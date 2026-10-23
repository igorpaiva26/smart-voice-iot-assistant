import { Router, Request, Response } from 'express';
import multer from 'multer';
import { transcribeAudio } from '../services/groq';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// Palavras que o Whisper alucina quando recebe silêncio ou ruído
const HALLUCINATIONS = new Set([
  'tchau', 'obrigado', 'obrigada', 'sim', 'não', 'ok', 'okay',
  'thanks', 'thank you', 'bye', 'goodbye', 'yes', 'no',
  'você', 'oi', 'olá', 'ah', 'eh', 'uh', 'um', 'e aí', 'eai',
]);

function isHallucination(text: string): boolean {
  const normalized = text.trim().toLowerCase().replace(/[.,!?]/g, '');
  // Bloqueia palavras isoladas conhecidas ou textos muito curtos
  if (HALLUCINATIONS.has(normalized) || normalized.length < 3) return true;
  // Bloqueia se for apenas 1 ou 2 palavras muito curtas
  const words = normalized.split(/\s+/);
  if (words.length <= 2 && words.every(w => w.length <= 3)) return true;
  return false;
}

router.post('/', upload.single('audio'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'Nenhum arquivo de áudio enviado.' });
    return;
  }

  try {
    const text = await transcribeAudio(req.file.buffer, req.file.mimetype);
    if (!text.trim() || isHallucination(text)) {
      res.status(422).json({ error: 'Áudio inválido ou muito curto.' });
      return;
    }
    res.json({ text });
  } catch (err: any) {
    console.error('[transcribe] Erro:', err.message);
    res.status(500).json({ error: `Erro ao transcrever áudio: ${err.message}` });
  }
});

export default router;

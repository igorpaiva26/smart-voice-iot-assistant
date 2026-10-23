import { Router, Request, Response } from 'express';
import { synthesizeSpeech } from '../services/elevenlabs';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { text } = req.body as { text?: string };

  if (!text || !text.trim()) {
    res.status(400).json({ error: 'Campo "text" é obrigatório.' });
    return;
  }

  try {
    const audio = await synthesizeSpeech(text.trim());
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Length', String(audio.length));
    res.send(audio);
  } catch (err: any) {
    console.error('[tts] Erro:', err.message);
    res.status(500).json({ error: `Erro TTS: ${err.message}` });
  }
});

export default router;

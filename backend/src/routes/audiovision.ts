import { Router, Request, Response } from 'express';
import { analyzeScreenWithAudio, ChatMessage } from '../services/gemini';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { audio, audioMime, image, imageMime, history, agentId, customPrompt } = req.body as {
    audio?: string;
    audioMime?: string;
    image?: string;
    imageMime?: string;
    history?: ChatMessage[];
    agentId?: string;
    customPrompt?: string;
  };

  if (!audio || !image) {
    res.status(400).json({ error: 'Campos "audio" e "image" são obrigatórios.' });
    return;
  }

  try {
    const result = await analyzeScreenWithAudio(
      audio, audioMime ?? 'audio/webm',
      image, imageMime ?? 'image/jpeg',
      history ?? [],
      agentId,
      customPrompt
    );
    res.json(result);
  } catch (err: any) {
    console.error('[audiovision] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

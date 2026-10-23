import { Router, Request, Response } from 'express';
import { generateAudioReply, ChatMessage } from '../services/gemini';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { audio, mimeType, history, agentId, customPrompt } = req.body as {
    audio?: string;
    mimeType?: string;
    history?: ChatMessage[];
    agentId?: string;
    customPrompt?: string;
  };

  if (!audio) {
    res.status(400).json({ error: 'Campo "audio" é obrigatório.' });
    return;
  }

  try {
    const result = await generateAudioReply(audio, mimeType ?? 'audio/webm', history ?? [], agentId, customPrompt);
    res.json(result);
  } catch (err: any) {
    console.error('[audio] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

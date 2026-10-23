import { Router, Request, Response } from 'express';
import { analyzeScreen, ChatMessage } from '../services/gemini';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { image, mimeType, message, history, agentId, customPrompt } = req.body as {
    image?: string;
    mimeType?: string;
    message?: string;
    history?: ChatMessage[];
    agentId?: string;
    customPrompt?: string;
  };

  if (!image || !message) {
    res.status(400).json({ error: 'Campos "image" e "message" são obrigatórios.' });
    return;
  }

  try {
    const reply = await analyzeScreen(image, mimeType ?? 'image/jpeg', message, history ?? [], agentId, customPrompt);
    res.json({ reply });
  } catch (err: any) {
    console.error('[vision] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

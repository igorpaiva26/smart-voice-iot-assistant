import { Router, Request, Response } from 'express';
import { generateChatReply, ChatMessage } from '../services/gemini';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { message, history, agentId, customPrompt } = req.body as { 
    message?: string; 
    history?: ChatMessage[];
    agentId?: string;
    customPrompt?: string;
  };

  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'Campo "message" é obrigatório.' });
    return;
  }

  try {
    const reply = await generateChatReply(message.trim(), history ?? [], agentId, customPrompt);
    res.json({ reply });
  } catch (err: any) {
    console.error('[chat] Erro:', err.message);
    res.status(500).json({ error: `Erro ao gerar resposta: ${err.message}` });
  }
});

export default router;

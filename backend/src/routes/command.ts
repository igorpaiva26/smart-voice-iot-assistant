import { Router, Request, Response } from 'express';
import { processSmartHomeCommand } from '../services/smartHome';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { text } = req.body as { text?: string };

  if (!text || !text.trim()) {
    res.status(400).json({ error: 'Campo "text" é obrigatório.' });
    return;
  }

  try {
    const result = await processSmartHomeCommand(text.trim());
    res.json(result);
  } catch (err: any) {
    console.error('[command] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

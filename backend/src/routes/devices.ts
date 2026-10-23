import { Router, Request, Response } from 'express';
import { deviceManager } from '../services/deviceManager';
import { tuya } from '../services/tuya';

const router = Router();

// Lista todos os dispositivos configurados
router.get('/', (_req: Request, res: Response) => {
  res.json({ devices: deviceManager.getAll() });
});

// Adiciona ou atualiza um dispositivo
router.post('/', (req: Request, res: Response) => {
  const { name, deviceId, channel, type, voiceKeywords, isReal } = req.body;
  if (!name || !deviceId) {
    res.status(400).json({ error: 'Campos "name" e "deviceId" são obrigatórios.' });
    return;
  }

  try {
    const saved = deviceManager.upsert({
      name,
      deviceId,
      channel: channel || 'switch_1',
      type: type || 'socket',
      voiceKeywords: Array.isArray(voiceKeywords) ? voiceKeywords : [name.toLowerCase()],
      isReal: isReal !== false,
    });
    res.json({ success: true, device: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Deleta um dispositivo
router.delete('/:id', (req: Request, res: Response) => {
  const success = deviceManager.delete(req.params.id);
  res.json({ success });
});

// Botão de Teste (Ligar / Desligar manualmente)
router.post('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { state } = req.body; // boolean opcional
    const result = await deviceManager.toggle(req.params.id, state);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Descoberta automática de aparelhos na conta Tuya do usuário
router.get('/tuya/discover', async (_req: Request, res: Response) => {
  try {
    const remoteDevices = await tuya.getAllDevices();
    res.json({ devices: remoteDevices });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

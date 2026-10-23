import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { loadEnv } from './types/env';
import ttsRouter from './routes/tts';
import commandRouter from './routes/command';
import transcribeRouter from './routes/transcribe';

const env = loadEnv();
const app = express();

// Permite conexões do frontend (Vite, Electron, etc)
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/tts', ttsRouter);
app.use('/api/command', commandRouter);
app.use('/api/transcribe', transcribeRouter);

app.listen(env.PORT, () => {
  console.log(`\n✅ Aline Backend rodando em http://localhost:${env.PORT}\n`);
});

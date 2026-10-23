export interface Env {
  PORT: number;
  CORS_ORIGIN: string;
  GROQ_API_KEY: string;
  GROQ_MODEL: string;
  GROQ_BASE_URL: string;
  GROQ_STT_MODEL: string;
  GROQ_TIMEOUT_MS: number;
  ELEVENLABS_API_KEY: string;
  ELEVENLABS_VOICE_ID: string;
  ELEVENLABS_MODEL: string;
  TUYA_API_KEY: string;
  TUYA_BASE_URL: string;
  TUYA_DEFAULT_DEVICE_ID: string;
}

let _env: Env | null = null;

export function loadEnv(): Env {
  if (_env) return _env;
  _env = {
    PORT: parseInt(process.env.PORT ?? '3001', 10),
    CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    GROQ_API_KEY: process.env.GROQ_API_KEY ?? '',
    GROQ_MODEL: process.env.GROQ_MODEL ?? 'qwen/qwen3.8-27b',
    GROQ_BASE_URL: process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1',
    GROQ_STT_MODEL: process.env.GROQ_STT_MODEL ?? 'whisper-large-v3-turbo',
    GROQ_TIMEOUT_MS: parseInt(process.env.GROQ_TIMEOUT_MS ?? '30000', 10),
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY ?? '',
    ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID ?? 'cgSgspJ2msm6clMCkdW9',
    ELEVENLABS_MODEL: process.env.ELEVENLABS_MODEL ?? 'eleven_multilingual_v2',
    TUYA_API_KEY: process.env.TUYA_API_KEY ?? 'sk-AZ4e209636ebf56b1d839142efd4c98da432f19a72d5ab1368',
    TUYA_BASE_URL: process.env.TUYA_BASE_URL ?? 'https://openapi.tuyaus.com',
    TUYA_DEFAULT_DEVICE_ID: process.env.TUYA_DEFAULT_DEVICE_ID ?? 'eb76c836cf22f27da3qdei',
  };
  return _env;
}

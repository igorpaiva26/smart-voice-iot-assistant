import fetch from 'node-fetch';
import { loadEnv } from '../types/env';
import { tuya } from './tuya';

const env = loadEnv();

interface CommandResult {
  isCommand: boolean;
  response?: string;
}

// Dispositivos mockados / virtuais adicionais
const MOCK_DEVICES: Record<string, { name: string; state: { on: boolean; temperature?: number; speed?: number } }> = {
  'ventilador': { name: 'ventilador', state: { on: false, speed: 1 } },
  'luz_sala': { name: 'luz da sala', state: { on: false } },
  'luz_quarto': { name: 'luz do quarto', state: { on: false } },
  'luz_cozinha': { name: 'luz da cozinha', state: { on: false } },
  'tomada_sala': { name: 'tomada da sala', state: { on: false } },
  'tomada_quarto': { name: 'tomada do quarto', state: { on: false } },
};

const SYSTEM_PROMPT = `Você é um assistente de casa inteligente estilo Alexa chamado Aline.
Dispositivos disponíveis:
- ar_condicionado (Dispositivo REAL: Smart Plug da tomada do Ar Condicionado no Smart Life)
- ventilador
- luz_sala
- luz_quarto
- luz_cozinha
- tomada_sala
- tomada_quarto

Analise o que o usuário falou. Responda APENAS em JSON no formato:
{
  "isCommand": true ou false,
  "device": "nome_do_dispositivo" ou null,
  "action": "on" ou "off" ou "set_temperature" ou "set_speed" ou null,
  "value": numero ou null
}

Regras:
1. Se for pedido para ligar, acender ou ativar: action="on"
2. Se for pedido para desligar, apagar ou desativar: action="off"
3. Se falar de "ar condicionado", "ar", "tomada do ar": escolha "ar_condicionado".
4. Se o dispositivo for o quarto: escolha "luz_quarto" ou "tomada_quarto".
5. Se NÃO for um comando de casa inteligente: responda "isCommand": false.`;

async function classifyWithGroq(text: string): Promise<any> {
  if (!env.GROQ_API_KEY) {
    return fallbackClassify(text);
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL || 'qwen/qwen3.8-27b',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        temperature: 0,
        max_tokens: 150,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[smartHome] Groq status ${res.status}:`, err);
      return fallbackClassify(text);
    }

    const data: any = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? '{"isCommand": false}';
    console.log('[smartHome] Groq LLM raw output:', raw);
    return JSON.parse(raw.trim());
  } catch (err: any) {
    console.error('[smartHome] Erro chamada Groq:', err.message);
    return fallbackClassify(text);
  }
}

function fallbackClassify(text: string): any {
  const lower = text.toLowerCase();
  const isOff = /\b(desliga|desligar|apaga|apagar|desative|desativar)\b/i.test(lower);
  const isOn = /\b(liga|ligar|acende|acender|ative|ativar)\b/i.test(lower);

  if (!isOff && !isOn) {
    return { isCommand: false };
  }

  const action = isOn ? 'on' : 'off';
  let device = 'ar_condicionado';

  if (/\b(ar|ar-condicionado|climatizador|ar condicionado)\b/i.test(lower)) {
    device = 'ar_condicionado';
  } else if (/\b(ventilador|ventoinha)\b/i.test(lower)) {
    device = 'ventilador';
  } else if (/\b(tomada)\b/i.test(lower)) {
    device = lower.includes('quarto') ? 'tomada_quarto' : 'tomada_sala';
  } else if (/\b(luz|lampada|lâmpada)\b/i.test(lower)) {
    if (lower.includes('quarto')) device = 'luz_quarto';
    else if (lower.includes('cozinha')) device = 'luz_cozinha';
    else device = 'luz_sala';
  }

  return { isCommand: true, device, action, value: null };
}

async function executeAction(device: string, action: string, value?: number | null): Promise<string> {
  // ─── 1. DISPOSITIVO REAL TUYA / SMART LIFE (Tomada do Ar Condicionado) ────
  if (device === 'ar_condicionado') {
    const targetState = action === 'on';
    const deviceId = env.TUYA_DEFAULT_DEVICE_ID;

    try {
      console.log(`[smartHome] Executando comando REAL na Tuya: deviceId=${deviceId} switch_1=${targetState}`);
      await tuya.setDeviceSwitch(deviceId, targetState);
      return targetState
        ? 'Pronto, tomada do ar condicionado ligada.'
        : 'Tomada do ar condicionado desligada.';
    } catch (err: any) {
      console.error('[smartHome] Falha ao enviar comando para Tuya:', err.message);
      return `Não consegui conectar com o Smart Life: ${err.message}`;
    }
  }

  // ─── 2. DISPOSITIVOS MOCKADOS / OUTROS ─────────────────────────────────────
  const dev = MOCK_DEVICES[device];
  const name = dev?.name ?? device;
  const isFem = name.startsWith('luz') || name.startsWith('tomada');

  switch (action) {
    case 'on':
      if (dev) dev.state.on = true;
      return `Pronto, ${name} ${isFem ? 'ligada' : 'ligado'}.`;
    case 'off':
      if (dev) dev.state.on = false;
      return `${name.charAt(0).toUpperCase() + name.slice(1)} ${isFem ? 'desligada' : 'desligado'}.`;
    case 'set_temperature':
      if (dev?.state.temperature !== undefined) dev.state.temperature = value ?? 24;
      if (dev) dev.state.on = true;
      return `Temperatura do ${name} ajustada para ${value} graus.`;
    case 'set_speed':
      if (dev?.state.speed !== undefined) dev.state.speed = value ?? 1;
      if (dev) dev.state.on = true;
      return `Velocidade do ${name} ajustada para ${value}.`;
    default:
      return `Comando executado no ${name}.`;
  }
}

export async function processSmartHomeCommand(text: string): Promise<CommandResult> {
  console.log(`[smartHome] Analisando: "${text}"`);

  const parsed = await classifyWithGroq(text);

  if (!parsed || !parsed.isCommand || !parsed.device) {
    console.log('[smartHome] Não é um comando. Ignorando.');
    return { isCommand: false };
  }

  const { device, action, value } = parsed;
  console.log(`[smartHome] Executando: device=${device} action=${action} value=${value}`);

  const response = await executeAction(device, action, value);
  console.log(`[smartHome] Resposta: "${response}"`);

  return { isCommand: true, response };
}

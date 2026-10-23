import fetch from 'node-fetch';
import { loadEnv } from '../types/env';
import { windowsControl } from './windowsControl';
import { deviceManager } from './deviceManager';

const env = loadEnv();

interface CommandResult {
  isCommand: boolean;
  response?: string;
}

function buildSystemPrompt(): string {
  const devices = deviceManager.getAll();
  const deviceListDesc = devices
    .map((d) => `- ${d.id}: "${d.name}" (palavras-chave: ${d.voiceKeywords.join(', ')})`)
    .join('\n');

  return `Você é um assistente pessoal estilo Alexa chamado Aline.
Dispositivos e Comandos disponíveis no momento:
${deviceListDesc}
- lock_screen: Bloquear a tela do computador / Windows + L
- close_app: Fechar aplicativo ou navegador de forma segura (ex: Brave, Chrome, etc.)

Analise o que o usuário falou. Responda APENAS em JSON no formato:
{
  "isCommand": true ou false,
  "device": "id_do_dispositivo_ou_comando" ou null,
  "action": "on" ou "off" ou "lock" ou "close" ou "set_temperature" ou null,
  "value": string ou numero ou null
}

Regras:
1. Para ligar/acender/ativar um aparelho: action="on"
2. Para desligar/apagar/desativar um aparelho: action="off"
3. Para bloquear a tela: device="lock_screen", action="lock"
4. Para fechar aplicativo: device="close_app", action="close", value="nome_do_app"
5. Se NÃO for um comando (conversa, perguntas genéricas sem ação): isCommand=false`;
}

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
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: text },
        ],
        temperature: 0,
        max_tokens: 120,
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

  // Bloquear tela
  if (/\b(bloqueia|bloquear|bloqueie|tranca|trancar)\b/i.test(lower) && /\b(tela|windows|computador|pc)\b/i.test(lower)) {
    return { isCommand: true, device: 'lock_screen', action: 'lock', value: null };
  }

  // Fechar aplicativo
  if (/\b(fecha|fechar|feche|encerra|encerrar)\b/i.test(lower)) {
    if (lower.includes('brave')) return { isCommand: true, device: 'close_app', action: 'close', value: 'brave' };
    if (lower.includes('chrome')) return { isCommand: true, device: 'close_app', action: 'close', value: 'chrome' };
    if (lower.includes('spotify')) return { isCommand: true, device: 'close_app', action: 'close', value: 'spotify' };
  }

  const isOff = /\b(desliga|desligar|apaga|apagar|desative|desativar)\b/i.test(lower);
  const isOn = /\b(liga|ligar|acende|acender|ative|ativar)\b/i.test(lower);

  if (!isOff && !isOn) {
    return { isCommand: false };
  }

  const action = isOn ? 'on' : 'off';
  const devices = deviceManager.getAll();

  // Busca dispositivo por palavra-chave
  for (const dev of devices) {
    for (const kw of dev.voiceKeywords) {
      if (lower.includes(kw.toLowerCase())) {
        return { isCommand: true, device: dev.id, action, value: null };
      }
    }
  }

  // Se não achou na lista dinâmica, fallback padrão
  if (devices.length > 0) {
    return { isCommand: true, device: devices[0].id, action, value: null };
  }

  return { isCommand: false };
}

async function executeAction(device: string, action: string, value?: any): Promise<string> {
  // ─── 1. BLOQUEAR TELA DO WINDOWS ──────────────────────────────────────────
  if (device === 'lock_screen') {
    return windowsControl.lockScreen();
  }

  // ─── 2. FECHAR APLICATIVO DE FORMA SEGURA (WM_CLOSE / X) ─────────────────
  if (device === 'close_app') {
    const appName = typeof value === 'string' ? value : 'brave';
    return windowsControl.closeAppGracefully(appName);
  }

  // ─── 3. DISPOSITIVO GERENCIADO DINAMICAMENTE (Tuya / Smart Life) ──────────
  const found = deviceManager.getById(device);
  if (found) {
    const targetState = action === 'on';
    try {
      console.log(`[smartHome] Acionando aparelho dinâmico: "${found.name}" (ID: ${found.id}) -> ${targetState ? 'LIGAR' : 'DESLIGAR'}`);
      await deviceManager.toggle(found.id, targetState);
      const isFem = found.name.toLowerCase().includes('luz') || found.name.toLowerCase().includes('tomada');
      return targetState
        ? `Pronto, ${found.name} ${isFem ? 'ligada' : 'ligado'}.`
        : `${found.name} ${isFem ? 'desligada' : 'desligado'}.`;
    } catch (err: any) {
      console.error('[smartHome] Erro ao acionar dispositivo:', err.message);
      return `Não consegui acionar o ${found.name}: ${err.message}`;
    }
  }

  return 'Dispositivo não encontrado ou não cadastrado.';
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

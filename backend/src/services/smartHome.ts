import fetch from 'node-fetch';
import { loadEnv } from '../types/env';
import { tuya } from './tuya';
import { windowsControl } from './windowsControl';

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

const SYSTEM_PROMPT = `Você é um assistente pessoal estilo Alexa chamado Aline.
Dispositivos e Comandos disponíveis:
- ar_condicionado (Smart Plug da tomada do Ar Condicionado no Smart Life)
- ventilador
- luz_sala, luz_quarto, luz_cozinha
- tomada_sala, tomada_quarto
- lock_screen (Bloquear a tela do Windows / Win + L)
- close_app (Fechar aplicativo/navegador de forma segura, ex: Brave, Chrome, etc.)

Analise o que o usuário falou. Responda APENAS em JSON no formato:
{
  "isCommand": true ou false,
  "device": "nome_do_dispositivo_ou_comando" ou null,
  "action": "on" ou "off" ou "lock" ou "close" ou "set_temperature" ou null,
  "value": string ou numero ou null
}

Regras:
1. Se for pedido para bloquear a tela, bloquear o computador, trancar o pc:
   device="lock_screen", action="lock", value=null
2. Se for pedido para fechar um aplicativo ou navegador (ex: "fechar o navegador brave", "fecha o brave", "fecha o chrome", "fecha o spotify"):
   device="close_app", action="close", value="nome_do_app" (ex: "brave", "chrome", "spotify")
3. Casa inteligente:
   - ar condicionado: device="ar_condicionado", action="on"|"off"
   - tomada: device="tomada_sala"|"tomada_quarto"
   - luz: device="luz_sala"|"luz_quarto"|"luz_cozinha"
4. Se NÃO for um comando (conversa, perguntas genéricas sem ação):
   isCommand=false`;

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

  // ─── 3. DISPOSITIVO REAL TUYA / SMART LIFE (Tomada do Ar Condicionado) ────
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

  // ─── 4. DISPOSITIVOS MOCKADOS / OUTROS ─────────────────────────────────────
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

/**
 * Serviço centralizado para o Google Gemini.
 * Usado para: chat de texto COM TOOLS, análise de tela (visão) e áudio.
 * 
 * O Gemini é o LLM principal para chat, tools e vision.
 * O Groq fica apenas para STT (Whisper).
 */

import fetch from 'node-fetch';
import { loadEnv } from '../types/env';
import { ChatMessage } from '../types/chat';
import { AGENT_PROFILES } from '../agents';
import { TOOLS } from '../tools/definitions';
import { executeTool } from '../tools/executor';
import { geminiRateLimiter } from '../utils/rateLimiter';

export type { ChatMessage };

const env = loadEnv();

// Limita histórico enviado ao LLM para economizar tokens/custos
const MAX_HISTORY_MESSAGES = 20;

// ─── UTILITÁRIOS ────────────────────────────────────────────────────────────

/** Resolve o system prompt baseado no agentId */
function resolvePrompt(agentId?: string, customPrompt?: string): string {
  if (agentId === 'custom' && customPrompt?.trim()) {
    return customPrompt;
  }
  return AGENT_PROFILES[agentId ?? 'default'] ?? AGENT_PROFILES['default'];
}

/** Converte histórico do formato interno para o formato Gemini */
function toGeminiHistory(history: ChatMessage[]) {
  return history
    .filter((m) => m.role !== 'system')
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
}

/** Converte tools para o formato Gemini function_declarations */
function toGeminiFunctionDeclarations() {
  return TOOLS.map((tool) => ({
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters,
  }));
}

/** Request genérico ao Gemini com rate limiting */
async function fetchGemini(body: object): Promise<any> {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY não configurada. Adicione no backend/.env');
  }

  await geminiRateLimiter.waitIfNeeded();

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error(`[gemini] Erro: ${res.status}`);
    throw new Error(`Gemini retornou ${res.status}: ${err}`);
  }

  return res.json();
}

// ─── CHAMADA GEMINI GENÉRICA (sem tools) ────────────────────────────────────

async function callGemini(contents: object[], agentId?: string, customPrompt?: string): Promise<string> {
  const systemPrompt = resolvePrompt(agentId, customPrompt);

  const visionSystemNote = `\nREGRAS EXTRAS PARA ANÁLISE DE TELA (MUITO IMPORTANTE): 
- Descreva a tela de forma extremamente objetiva e direta. Diga apenas o que viu e pronto.
- Use no máximo 2 ou 3 frases. 
- NUNCA use listas (1., 2.) ou marcadores (*). 
- NUNCA use formatação Markdown como negritos (**) ou itálicos. Responda apenas em texto corrido e puro.`;

  const data = await fetchGemini({
    system_instruction: { parts: [{ text: systemPrompt + visionSystemNote }] },
    contents,
    generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
  });

  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ─── CHAMADA GEMINI COM TOOLS (function calling) ────────────────────────────

async function callGeminiWithTools(
  contents: object[],
  systemPrompt: string
): Promise<{ text?: string; functionCall?: { name: string; args: Record<string, any> } }> {
  const toolSystemNote = `\nVocê é um ASSISTENTE DE AÇÃO. REGRAS ABSOLUTAS:

1. SEMPRE que o usuário pedir para FAZER algo, você DEVE chamar uma ferramenta. NUNCA apenas responda com texto.

2. Exemplos que EXIGEM ferramenta:
   - "feche a aba X" → DEVE usar browser_switch_tab + press_keys
   - "clica no botão X" → DEVE usar mouse_click
   - "abre calculadora" → DEVE usar open_application
   - "aumenta o volume" → DEVE usar set_volume

3. Se você apenas RESPONDER com texto ao invés de EXECUTAR, você FALHOU.

4. Para fechar aba específica:
   a) Conte quantas abas precisa pular (ex: "quarta aba" = pular 3 vezes)
   b) Use browser_switch_tab com direction="next" e times=3
   c) Use press_keys com keys="ctrl+w"

5. NUNCA diga "fechei", "cliquei", "abri" se você não chamou uma ferramenta.

6. Se não souber as coordenadas exatas, use as ferramentas de teclado (browser_switch_tab, press_keys).

7. SEMPRE confirme a ação APÓS executar a ferramenta, não antes.`;

  const data = await fetchGemini({
    system_instruction: { parts: [{ text: systemPrompt + toolSystemNote }] },
    contents,
    tools: [{ function_declarations: toGeminiFunctionDeclarations() }],
    tool_config: { function_calling_config: { mode: 'AUTO' } },
    generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
  });

  const parts = data?.candidates?.[0]?.content?.parts ?? [];

  // Verifica se tem function call
  for (const part of parts) {
    if (part.functionCall) {
      return {
        functionCall: {
          name: part.functionCall.name,
          args: part.functionCall.args || {},
        },
      };
    }
  }

  // Sem function call → retorna texto
  const text = parts.find((p: any) => p.text)?.text ?? '';
  return { text };
}

// ─── CHAT COM TOOLS (PRINCIPAL) ─────────────────────────────────────────────

export async function generateChatReply(
  message: string,
  history: ChatMessage[],
  agentId?: string,
  customPrompt?: string
): Promise<string> {
  const finalPrompt = resolvePrompt(agentId, customPrompt);

  console.log(`[gemini] Chat+Tools: "${message.slice(0, 60)}" (histórico: ${Math.min(history.length, MAX_HISTORY_MESSAGES)})`);

  const contents = [
    ...toGeminiHistory(history),
    { role: 'user', parts: [{ text: message }] },
  ];

  // Primeira chamada — pode retornar texto OU function call
  const firstResponse = await callGeminiWithTools(contents, finalPrompt);

  // Se obteve uma function call
  if (firstResponse.functionCall) {
    const { name, args } = firstResponse.functionCall;
    console.log(`[gemini] Function call: ${name}(${JSON.stringify(args)})`);

    // Executa a tool
    const result = await executeTool(name, args);
    console.log(`[gemini] Tool result: ${result}`);

    // Segunda chamada com o resultado da tool para gerar resposta natural
    const contentsWithResult = [
      ...contents,
      {
        role: 'model',
        parts: [{ functionCall: { name, args } }],
      },
      {
        role: 'user',
        parts: [{
          functionResponse: {
            name,
            response: { result },
          },
        }],
      },
    ];

    try {
      const data = await fetchGemini({
        system_instruction: { parts: [{ text: finalPrompt + '\nConfirme brevemente o que foi feito. Seja natural e direto.' }] },
        contents: contentsWithResult,
        generationConfig: { maxOutputTokens: 256, temperature: 0.7 },
      });

      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) {
        console.log(`[gemini] Resposta após tool: "${reply.slice(0, 80)}"`);
        return reply;
      }
    } catch (e) {
      console.warn('[gemini] Falha na segunda chamada, retornando resultado direto.');
    }

    // Fallback: retorna resultado cru da tool
    return result;
  }

  // Sem function call — resposta normal de texto
  const reply = firstResponse.text || '';
  console.log(`[gemini] Resposta: "${reply.slice(0, 80)}"`);
  return reply;
}

// ─── AUDIO ──────────────────────────────────────────────────────────────────

export async function generateAudioReply(
  audioBase64: string,
  mimeType: string,
  history: ChatMessage[],
  agentId?: string,
  customPrompt?: string
): Promise<{ transcription: string; reply: string }> {
  console.log('[gemini] Audio: transcrevendo e respondendo...');

  const contents = [
    ...toGeminiHistory(history),
    {
      role: 'user',
      parts: [
        { inline_data: { mime_type: mimeType, data: audioBase64 } },
        { text: 'Transcreva exatamente o que foi dito no áudio acima e responda à mensagem. Formato da resposta: TRANSCRICAO: <texto transcrito>\nRESPOSTA: <sua resposta>' },
      ],
    },
  ];

  const raw = await callGemini(contents, agentId, customPrompt);
  console.log(`[gemini] Audio raw: "${raw.slice(0, 120)}"`);

  const transcricaoMatch = raw.match(/TRANSCRICAO:\s*(.+?)(?:\n|$)/i);
  const respostaMatch = raw.match(/RESPOSTA:\s*([\s\S]+)/i);

  const transcription = transcricaoMatch?.[1]?.trim() ?? raw;
  const reply = respostaMatch?.[1]?.trim() ?? raw;

  return { transcription, reply };
}

// ─── VISION ─────────────────────────────────────────────────────────────────

export async function analyzeScreenWithAudio(
  audioBase64: string,
  audioMime: string,
  imageBase64: string,
  imageMime: string,
  history: ChatMessage[],
  agentId?: string,
  customPrompt?: string
): Promise<{ transcription: string; reply: string }> {
  console.log('[gemini] AudioVision: transcrevendo + analisando tela...');

  const contents = [
    ...toGeminiHistory(history),
    {
      role: 'user',
      parts: [
        { inline_data: { mime_type: audioMime, data: audioBase64 } },
        { inline_data: { mime_type: imageMime, data: imageBase64 } },
        { text: 'Transcreva exatamente o que foi dito no áudio e responda considerando a imagem da tela. Formato: TRANSCRICAO: <texto>\nRESPOSTA: <resposta>' },
      ],
    },
  ];

  const raw = await callGemini(contents, agentId, customPrompt);
  const transcription = raw.match(/TRANSCRICAO:\s*(.+?)(?:\n|$)/i)?.[1]?.trim() ?? raw;
  const reply = raw.match(/RESPOSTA:\s*([\s\S]+)/i)?.[1]?.trim() ?? raw;
  return { transcription, reply };
}

export async function analyzeScreen(
  imageBase64: string,
  mimeType: string,
  userMessage: string,
  history: ChatMessage[],
  agentId?: string,
  customPrompt?: string
): Promise<string> {
  console.log(`[gemini] Vision: "${userMessage.slice(0, 60)}"`);

  const contents = [
    ...toGeminiHistory(history),
    {
      role: 'user',
      parts: [
        { inline_data: { mime_type: mimeType, data: imageBase64 } },
        { text: userMessage },
      ],
    },
  ];

  const reply = await callGemini(contents, agentId, customPrompt);
  console.log(`[gemini] Vision resposta: "${reply.slice(0, 80)}"`);
  return reply;
}

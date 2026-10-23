/**
 * Tipo compartilhado de mensagem de chat.
 * Usado por todas as rotas e serviços do backend.
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

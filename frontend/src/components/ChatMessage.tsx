import { ChatMessage as ChatMessageType } from '../types/chat';

interface Props {
  message: ChatMessageType;
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';
  return (
    <div className={`chat-message ${isUser ? 'chat-message--user' : 'chat-message--assistant'}`}>
      <span className="chat-message__role">{isUser ? 'Você' : 'Assistente'}</span>
      <p className="chat-message__content">{message.content}</p>
      <span className="chat-message__time">
        {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

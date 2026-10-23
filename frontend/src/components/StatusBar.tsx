import { ListeningState } from '../types/chat';

interface Props {
  listeningState: ListeningState;
  isSharing: boolean;
  muted: boolean;
  error: string | null;
}

export function StatusBar({ listeningState, isSharing, muted, error }: Props) {
  return (
    <div className="status-bar">
      {listeningState === 'listening' && (
        <span className="status status--recording">🎙️ Ouvindo...</span>
      )}
      {listeningState === 'processing' && (
        <span className="status status--processing">⏳ Processando fala</span>
      )}
      {isSharing && <span className="status status--sharing">🖥️ Compartilhando tela</span>}
      {muted && <span className="status status--muted">🔇 Voz mutada</span>}
      {error && <span className="status status--error">⚠️ {error}</span>}
    </div>
  );
}

import { ListeningState } from '../types/chat';

interface Props {
  listeningState: ListeningState;
  isSharing: boolean;
  muted: boolean;
  supported: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  onStartSharing: () => void;
  onStopSharing: () => void;
  onToggleMute: () => void;
}

export function Controls({
  listeningState,
  isSharing,
  muted,
  supported,
  onStartListening,
  onStopListening,
  onStartSharing,
  onStopSharing,
  onToggleMute,
}: Props) {
  return (
    <div className="controls">
      {listeningState === 'idle' ? (
        <button
          className="btn btn--record"
          onClick={onStartListening}
          disabled={!supported}
          title={!supported ? 'Navegador não suporta reconhecimento de voz' : ''}
        >
          🎙️ Falar com assistente
        </button>
      ) : (
        <button className="btn btn--stop" onClick={onStopListening}>
          {listeningState === 'listening' ? '🔴 Parar de ouvir' : '⏳ Processando...'}
        </button>
      )}

      {!isSharing ? (
        <button className="btn btn--screen" onClick={onStartSharing}>
          🖥️ Compartilhar tela
        </button>
      ) : (
        <button className="btn btn--stop" onClick={onStopSharing}>
          🛑 Parar compartilhamento
        </button>
      )}

      <button className="btn btn--mute" onClick={onToggleMute}>
        {muted ? '🔇 Ativar voz' : '🔊 Mutar voz'}
      </button>
    </div>
  );
}

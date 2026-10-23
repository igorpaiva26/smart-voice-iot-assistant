import { useEffect, useRef } from 'react';
import './OrbVisualizer.css';

export type OrbState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error' | 'ready';

interface Props {
  state: OrbState;
  subtitle?: string;
  audioLevel?: number;
  errorMessage?: string;
  onClick?: () => void;
}

export function OrbVisualizer({ state, subtitle, audioLevel = 0, errorMessage, onClick }: Props) {
  const orbRef = useRef<HTMLDivElement>(null);

  // Efeito dinâmico baseado no volume da voz
  const scale = state === 'listening' ? 1 + Math.min(audioLevel * 0.45, 0.45) : 1;

  const labels: Record<OrbState, string> = {
    idle: 'Clique para ativar a Aline',
    ready: 'Clique na esfera para começar',
    listening: 'Aline ouvindo...',
    processing: 'Processando comando...',
    speaking: 'Falando...',
    error: 'Atenção ao microfone',
  };

  return (
    <div className="orb-wrapper" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="orb-glow-ring" data-state={state} />
      
      <div
        ref={orbRef}
        className={`orb orb--${state}`}
        style={{ transform: `scale(${scale})` }}
      />

      <div className="orb-text-area">
        <p className="orb-label">{labels[state]}</p>
        {subtitle && <p className="orb-subtitle">"{subtitle}"</p>}
        {errorMessage && <p className="orb-error-text">{errorMessage}</p>}
      </div>
    </div>
  );
}

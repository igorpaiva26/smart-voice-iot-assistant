import React from 'react';

export type AgentType = 'default' | 'social' | 'support' | 'finance' | 'law' | 'custom';

interface AgentSelectorProps {
  agentId: AgentType;
  setAgentId: (id: AgentType) => void;
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;
}

const AGENTS = [
  { id: 'default', icon: '🤖', label: 'Padrão' },
  { id: 'social', icon: '📱', label: 'Redes Sociais' },
  { id: 'support', icon: '💻', label: 'TI/Suporte' },
  { id: 'finance', icon: '💰', label: 'Financeiro' },
  { id: 'law', icon: '⚖️', label: 'Jurídico' },
  { id: 'custom', icon: '⚙️', label: 'Personalizar' },
] as const;

export const AgentSelector: React.FC<AgentSelectorProps> = ({ agentId, setAgentId, customPrompt, setCustomPrompt }) => {
  return (
    <div className="agent-selector-container">
      <div className="agent-selector-buttons">
        {AGENTS.map((agent) => (
          <button
            key={agent.id}
            onClick={() => setAgentId(agent.id as AgentType)}
            className={`agent-btn ${agentId === agent.id ? 'active' : ''}`}
            title={agent.label}
          >
            <span className="agent-icon">{agent.icon}</span>
            <span className="agent-label">{agent.label}</span>
          </button>
        ))}
      </div>
      
      {agentId === 'custom' && (
        <div className="agent-custom-area">
          <textarea 
            placeholder="Digite o comportamento que a IA deve seguir... (ex: 'Você é um pirata mal humorado...')"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="agent-textarea"
            rows={3}
          />
        </div>
      )}
    </div>
  );
};

import { useEffect, useState } from 'react';
import './RateLimitMonitor.css';

interface Stats {
  ultimo_minuto: {
    requisicoes: number;
    limite: number;
    restante: number;
    uso: string;
    status: string;
  };
  hoje: {
    requisicoes: number;
    limite: number;
    restante: number;
    uso: string;
    status: string;
  };
  total_desde_inicio: number;
  bloqueado: string;
}

export function RateLimitMonitor() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Não faz polling quando minimizado — economiza requests
    if (!visible) return;

    const fetchStats = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/stats');
        const data = await res.json();
        setStats(data.stats);
      } catch (err) {
        // Silencioso — backend pode não estar rodando
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000); // 10s é suficiente

    return () => clearInterval(interval);
  }, [visible]);

  if (!stats) return null;

  const minutePercent = parseInt(stats.ultimo_minuto.uso);
  const dayPercent = parseInt(stats.hoje.uso);

  const getColor = (percent: number) => {
    if (percent >= 90) return '#ef4444';
    if (percent >= 70) return '#f59e0b';
    if (percent >= 50) return '#eab308';
    return '#10b981';
  };

  return (
    <div className={`rate-monitor ${visible ? 'visible' : 'hidden'}`}>
      <div className="rate-monitor__header">
        <span className="rate-monitor__title">📊 API Gemini</span>
        <button 
          className="rate-monitor__toggle"
          onClick={() => setVisible(!visible)}
          title={visible ? 'Minimizar' : 'Expandir'}
        >
          {visible ? '−' : '+'}
        </button>
      </div>

      {visible && (
        <div className="rate-monitor__content">
          {/* Último minuto */}
          <div className="rate-monitor__item">
            <div className="rate-monitor__label">
              <span>⏱️ Último minuto</span>
              <span className="rate-monitor__value">
                {stats.ultimo_minuto.requisicoes}/{stats.ultimo_minuto.limite} (restam {stats.ultimo_minuto.restante})
              </span>
            </div>
            <div className="rate-monitor__bar">
              <div 
                className="rate-monitor__bar-fill"
                style={{ 
                  width: `${minutePercent}%`,
                  backgroundColor: getColor(minutePercent)
                }}
              />
            </div>
          </div>

          {/* Hoje */}
          <div className="rate-monitor__item">
            <div className="rate-monitor__label">
              <span>📅 Hoje</span>
              <span className="rate-monitor__value">
                {stats.hoje.requisicoes}/{stats.hoje.limite} (restam {stats.hoje.restante})
              </span>
            </div>
            <div className="rate-monitor__bar">
              <div 
                className="rate-monitor__bar-fill"
                style={{ 
                  width: `${dayPercent}%`,
                  backgroundColor: getColor(dayPercent)
                }}
              />
            </div>
            <div className="rate-monitor__percent">{stats.hoje.uso}</div>
          </div>

          {/* Alerta se crítico */}
          {dayPercent >= 70 && (
            <div className="rate-monitor__alert">
              {dayPercent >= 90 ? '🚨 CRÍTICO! Próximo do limite diário!' : '⚠️ Alto uso hoje'}
            </div>
          )}

          {/* Bloqueado */}
          {stats.bloqueado.includes('SIM') && (
            <div className="rate-monitor__alert" style={{ backgroundColor: '#dc2626' }}>
              🛑 BLOQUEADO - Limite diário atingido!
            </div>
          )}

          {/* Total */}
          <div className="rate-monitor__total">
            📊 Total desde início: {stats.total_desde_inicio} requisições
          </div>
          
          {/* Info Free Tier */}
          <div className="rate-monitor__info">
            🛡️ Free Tier: 15/min, 1500/dia (usando 13/min, 1200/dia com margem)
          </div>
        </div>
      )}
    </div>
  );
}

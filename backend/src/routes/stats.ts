import { Router, Request, Response } from 'express';
import { geminiRateLimiter } from '../utils/rateLimiter';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const stats = geminiRateLimiter.getStats();
  
  // Calcula quanto falta para os limites
  const restanteMinuto = stats.maxPerMinute - stats.currentMinute;
  const restanteDia = stats.maxPerDay - stats.currentDay;
  
  res.json({
    message: 'Estatísticas de uso da API Gemini (Free Tier)',
    stats: {
      ultimo_minuto: {
        requisicoes: stats.currentMinute,
        limite: stats.maxPerMinute,
        restante: restanteMinuto,
        uso: `${stats.percentageMinute}%`,
        status: stats.percentageMinute >= 80 ? '⚠️ ALTO' : stats.percentageMinute >= 50 ? '⚡ MODERADO' : '✅ NORMAL'
      },
      hoje: {
        requisicoes: stats.currentDay,
        limite: stats.maxPerDay,
        restante: restanteDia,
        uso: `${stats.percentageDay}%`,
        status: stats.percentageDay >= 90 ? '🚨 CRÍTICO' : stats.percentageDay >= 70 ? '⚠️ ALTO' : stats.percentageDay >= 50 ? '⚡ MODERADO' : '✅ NORMAL'
      },
      total_desde_inicio: stats.total,
      bloqueado: stats.blocked ? '🚨 SIM - Limite diário atingido!' : '✅ NÃO'
    },
    limites_free_tier: {
      por_minuto: '15 requisições (usando 13 com margem)',
      por_dia: '1500 requisições (usando 1200 com margem)',
      aviso: 'O sistema bloqueia automaticamente ao atingir os limites configurados'
    }
  });
});

export default router;

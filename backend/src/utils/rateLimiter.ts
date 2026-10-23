/**
 * Rate Limiter para Gemini API com persistência
 * 
 * - Limita requisições por minuto e por dia
 * - Persiste dados em disco com debounce (não bloqueia event loop)
 * - Reinicia contagem diária automaticamente à meia-noite
 * - Salva estado ao encerrar o processo para não perder dados
 */
import fs from 'fs';
import path from 'path';

const MAX_REQUESTS_PER_MINUTE = 13;
const MAX_REQUESTS_PER_DAY = 1200;
const WINDOW_MS = 60_000;
const DAY_MS = 86_400_000;
const PERSIST_FILE = path.join(__dirname, '../../data/rate-limiter.json');
const SAVE_DEBOUNCE_MS = 2000;

interface RateLimiterData {
  requests: number[];
  dailyRequests: number[];
  totalRequests: number;
  blocked: boolean;
}

class RateLimiter {
  private requests: number[] = [];
  private dailyRequests: number[] = [];
  private totalRequests = 0;
  private blocked = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadFromFile();

    // Salva ao encerrar o processo (graceful shutdown)
    const cleanup = () => this.saveToFileSync();
    process.on('exit', cleanup);
    process.on('SIGINT', () => { cleanup(); process.exit(0); });
    process.on('SIGTERM', () => { cleanup(); process.exit(0); });
  }

  private loadFromFile(): void {
    try {
      if (fs.existsSync(PERSIST_FILE)) {
        const data: RateLimiterData = JSON.parse(fs.readFileSync(PERSIST_FILE, 'utf-8'));
        const now = Date.now();
        this.requests = data.requests.filter(t => now - t < WINDOW_MS);
        this.dailyRequests = data.dailyRequests.filter(t => now - t < DAY_MS);
        this.totalRequests = data.totalRequests || 0;
        // Desbloqueia se as requisições diárias já expiraram
        this.blocked = data.blocked && this.dailyRequests.length >= MAX_REQUESTS_PER_DAY;
        console.log(`[rate-limiter] 📂 Carregado: ${this.dailyRequests.length} req hoje, ${this.totalRequests} total`);
      }
    } catch (err) {
      console.error('[rate-limiter] ⚠️  Erro ao carregar:', err);
    }
  }

  private scheduleSave(): void {
    if (this.saveTimer) return; // Já agendado
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveToFileSync();
    }, SAVE_DEBOUNCE_MS);
  }

  private saveToFileSync(): void {
    try {
      const dir = path.dirname(PERSIST_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const data: RateLimiterData = {
        requests: this.requests,
        dailyRequests: this.dailyRequests,
        totalRequests: this.totalRequests,
        blocked: this.blocked
      };
      fs.writeFileSync(PERSIST_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('[rate-limiter] ⚠️  Erro ao salvar:', err);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < WINDOW_MS);
    this.dailyRequests = this.dailyRequests.filter(time => now - time < DAY_MS);
    // Auto-desbloqueia quando o dia virar
    if (this.blocked && this.dailyRequests.length < MAX_REQUESTS_PER_DAY) {
      this.blocked = false;
      console.log('[rate-limiter] ✅ Desbloqueado — novo dia, contagem zerada.');
    }
  }

  async waitIfNeeded(): Promise<void> {
    this.cleanup();

    // KILL SWITCH: Se bloqueado, não permite mais requisições
    if (this.blocked) {
      throw new Error('❌ RATE LIMITER BLOQUEADO: Limite diário atingido. Aguarde 24h ou reinicie o servidor.');
    }

    // KILL SWITCH: Bloqueia se atingir limite diário
    if (this.dailyRequests.length >= MAX_REQUESTS_PER_DAY) {
      this.blocked = true;
      this.scheduleSave();
      console.error(`\n🚨🚨🚨 RATE LIMITER BLOQUEADO 🚨🚨🚨`);
      console.error(`Limite diário atingido: ${this.dailyRequests.length}/${MAX_REQUESTS_PER_DAY}`);
      throw new Error('❌ Limite diário de requisições atingido!');
    }
    
    // Alertas de proximidade do limite
    if (this.dailyRequests.length >= MAX_REQUESTS_PER_DAY * 0.9) {
      console.error(`\n🚨 ALERTA CRÍTICO: ${this.dailyRequests.length}/${MAX_REQUESTS_PER_DAY} requisições hoje (90%)\n`);
    } else if (this.dailyRequests.length >= MAX_REQUESTS_PER_DAY * 0.7) {
      console.warn(`\n⚠️  ALERTA: ${this.dailyRequests.length}/${MAX_REQUESTS_PER_DAY} requisições hoje (70%)\n`);
    }
    
    // Se estamos no limite por minuto, aguarda
    if (this.requests.length >= MAX_REQUESTS_PER_MINUTE) {
      const oldestRequest = this.requests[0];
      const waitTime = WINDOW_MS - (Date.now() - oldestRequest) + 100;
      
      console.log(`[rate-limiter] ⏳ Aguardando ${Math.ceil(waitTime / 1000)}s (${this.requests.length}/${MAX_REQUESTS_PER_MINUTE} req/min)`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.cleanup();
    }
    
    // Registra a requisição
    const now = Date.now();
    this.requests.push(now);
    this.dailyRequests.push(now);
    this.totalRequests++;
    this.scheduleSave(); // Debounce — salva no máximo 1x a cada 2s
    
    const pctMin = Math.round((this.requests.length / MAX_REQUESTS_PER_MINUTE) * 100);
    const pctDay = Math.round((this.dailyRequests.length / MAX_REQUESTS_PER_DAY) * 100);
    console.log(`[rate-limiter] 📊 Req #${this.totalRequests} | Min: ${this.requests.length}/${MAX_REQUESTS_PER_MINUTE} (${pctMin}%) | Dia: ${this.dailyRequests.length}/${MAX_REQUESTS_PER_DAY} (${pctDay}%)`);
  }

  getStats() {
    this.cleanup();
    
    return {
      currentMinute: this.requests.length,
      maxPerMinute: MAX_REQUESTS_PER_MINUTE,
      currentDay: this.dailyRequests.length,
      maxPerDay: MAX_REQUESTS_PER_DAY,
      remaining: MAX_REQUESTS_PER_DAY - this.dailyRequests.length,
      total: this.totalRequests,
      percentageMinute: Math.round((this.requests.length / MAX_REQUESTS_PER_MINUTE) * 100),
      percentageDay: Math.round((this.dailyRequests.length / MAX_REQUESTS_PER_DAY) * 100),
      blocked: this.blocked
    };
  }
}

export const geminiRateLimiter = new RateLimiter();

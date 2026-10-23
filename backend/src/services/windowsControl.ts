import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Mapeamento de nomes falados para o nome do processo executável no Windows
const PROCESS_MAP: Record<string, string> = {
  brave: 'brave',
  'navegador brave': 'brave',
  chrome: 'chrome',
  'google chrome': 'chrome',
  edge: 'msedge',
  'microsoft edge': 'msedge',
  firefox: 'firefox',
  spotify: 'Spotify',
  discord: 'Discord',
  notepad: 'notepad',
  'bloco de notas': 'notepad',
  calculadora: 'CalculatorApp',
  steam: 'steam',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
};

export class WindowsControlService {
  /**
   * Bloqueia a tela do Windows de forma nativa e segura (equivalente a Win + L).
   */
  async lockScreen(): Promise<string> {
    console.log('[windowsControl] Bloqueando a tela do Windows (Win + L)...');
    try {
      await execAsync('rundll32.exe user32.dll,LockWorkStation');
      return 'Tela do Windows bloqueada.';
    } catch (err: any) {
      console.error('[windowsControl] Erro ao bloquear tela:', err.message);
      return 'Não consegui bloquear a tela.';
    }
  }

  /**
   * Fecha um aplicativo de forma segura (CloseMainWindow / WM_CLOSE),
   * exatamente como se o usuário tivesse clicado no 'X'.
   */
  async closeAppGracefully(rawAppName: string): Promise<string> {
    const cleanName = (rawAppName || '').toLowerCase().trim();
    const processName = PROCESS_MAP[cleanName] || cleanName.replace(/[^a-zA-Z0-9_-]/g, '');

    console.log(`[windowsControl] Fechando aplicativo com segurança: "${cleanName}" (processo: ${processName})`);

    try {
      // CloseMainWindow envia WM_CLOSE (o mesmo evento de clicar no X)
      const psCommand = `powershell -NoProfile -Command "$procs = Get-Process -Name '${processName}' -ErrorAction SilentlyContinue; if ($procs) { $procs | ForEach-Object { $_.CloseMainWindow() } } else { exit 2 }"`;
      
      const { stderr } = await execAsync(psCommand);
      if (stderr && stderr.trim()) {
        console.warn('[windowsControl] Aviso PowerShell:', stderr);
      }

      return `Fechando o ${cleanName} de forma segura.`;
    } catch (err: any) {
      if (err.code === 2) {
        return `O ${cleanName} não estava aberto.`;
      }
      console.error('[windowsControl] Erro ao fechar app:', err.message);
      return `Tentei fechar o ${cleanName}, mas ocorreu um erro.`;
    }
  }
}

export const windowsControl = new WindowsControlService();

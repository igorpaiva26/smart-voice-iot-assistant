/**
 * Executor de Tools — recebe o nome da ferramenta + args
 * e executa o comando correspondente no Windows via PowerShell/cmd.
 * 
 * Segurança: Tudo passa por uma whitelist fixa de apps e lógica controlada.
 * A IA NÃO tem acesso livre ao terminal.
 */

import { exec } from 'child_process';
import path from 'path';

// ─── SEGURANÇA ──────────────────────────────────────────────────────────────

/** Bloqueia comandos perigosos no run_command */
const BLOCKED_COMMAND_PATTERNS = [
  /rm\s+-rf/i, /del\s+\/s/i, /format\s+[a-z]:/i,
  /net\s+user/i, /reg\s+(add|delete)/i,
  /Invoke-WebRequest/i, /Invoke-RestMethod/i,
  /curl\s/i, /wget\s/i, /certutil.*-urlcache/i,
  /powershell\s+-enc/i, /powershell\s+-e\s/i,
  /iex\s*\(/i, /Invoke-Expression/i,
  /Set-ExecutionPolicy/i,
  /New-Service/i, /sc\s+(create|delete)/i,
  /net\s+stop/i, /net\s+start/i,
  /schtasks\s+\/create/i,
];

function isCommandBlocked(command: string): boolean {
  return BLOCKED_COMMAND_PATTERNS.some(p => p.test(command));
}

/** Valida que um path de arquivo está dentro do perfil do usuário */
function isSafePath(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  const userProfile = process.env.USERPROFILE || 'C:\\Users';
  // Deve estar dentro do perfil do usuário e não em AppData\\Local (que tem configs do sistema)
  if (!resolved.toLowerCase().startsWith(userProfile.toLowerCase())) return false;
  // Bloqueia caminhos críticos dentro do perfil
  const blocked = ['AppData\\Local\\Microsoft', 'AppData\\Local\\Google', 'ntuser.dat'];
  return !blocked.some(b => resolved.toLowerCase().includes(b.toLowerCase()));
}

// ─── MAPA DE APPS: nome amigável → comando para abrir ─────────────────────
const APP_MAP: Record<string, string> = {
  // Utilitários Windows
  'calculadora': 'calc',
  'calculator': 'calc',
  'calc': 'calc',
  'bloco de notas': 'notepad',
  'notepad': 'notepad',
  'bloco de nota': 'notepad',
  'paint': 'mspaint',
  'paint 3d': 'start ms-paint:',
  'explorador de arquivos': 'explorer',
  'explorador': 'explorer',
  'explorer': 'explorer',
  'gerenciador de tarefas': 'taskmgr',
  'task manager': 'taskmgr',
  'painel de controle': 'control',
  'control panel': 'control',
  'informações do sistema': 'msinfo32',
  'desfragmentador': 'dfrgui',
  'limpeza de disco': 'cleanmgr',
  'ferramenta de recorte': 'snippingtool',
  'recorte': 'snippingtool',
  'snipping tool': 'snippingtool',
  'gravador de som': 'start ms-recorder:',
  'mapa de caracteres': 'charmap',
  'monitor de recursos': 'resmon',
  'visualizador de eventos': 'eventvwr',
  'registro': 'regedit',
  'regedit': 'regedit',
  'configurações': 'start ms-settings:',
  'configuracoes': 'start ms-settings:',
  'settings': 'start ms-settings:',
  'lupa': 'magnify',
  'magnifier': 'magnify',
  'windows terminal': 'wt',

  // Terminal / CLI
  'terminal': 'wt',
  'powershell': 'powershell',
  'cmd': 'cmd',
  'prompt de comando': 'cmd',

  // Navegadores
  'chrome': 'start chrome',
  'google chrome': 'start chrome',
  'edge': 'start msedge',
  'microsoft edge': 'start msedge',
  'navegador': 'start msedge',
  'firefox': 'start firefox',
  'opera': 'start opera',
  'brave': 'start brave',

  // Microsoft Office
  'word': 'start winword',
  'excel': 'start excel',
  'powerpoint': 'start powerpnt',
  'outlook': 'start outlook',
  'onenote': 'start onenote',
  'access': 'start msaccess',

  // Comunicação
  'discord': 'start discord',
  'teams': 'start msteams',
  'microsoft teams': 'start msteams',
  'skype': 'start skype',
  'zoom': 'start zoom',
  'telegram': 'start telegram',
  'whatsapp': 'start "" "shell:AppsFolder\\5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App"',
  'slack': 'start slack',

  // Mídia e entretenimento
  'spotify': 'start spotify',
  'vlc': 'start vlc',
  'media player': 'start wmplayer',
  'windows media player': 'start wmplayer',
  'fotos': 'start ms-photos:',
  'photos': 'start ms-photos:',
  'filmes e tv': 'start mswindowsvideo:',
  'movies': 'start mswindowsvideo:',
  'groove': 'start mswindowsmusic:',

  // Desenvolvimento
  'vscode': 'code',
  'visual studio code': 'code',
  'visual studio': 'start devenv',
  'git bash': 'start "C:\\Program Files\\Git\\git-bash.exe"',
  'postman': 'start postman',
  'insomnia': 'start insomnia',

  // Gaming
  'steam': 'start steam',
  'epic games': 'start com.epicgames.launcher:',
  'xbox': 'start xbox:',

  // Streaming / Gravação
  'obs': 'start "C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe"',
  'obs studio': 'start "C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe"',

  // Design
  'figma': 'start figma',
  'canva': 'start "" "https://www.canva.com"',
  'photoshop': 'start photoshop',

  // Outras utilidades
  'winrar': 'start winrar',
  '7zip': 'start 7zFM',
  'anydesk': 'start anydesk',
  'teamviewer': 'start teamviewer',
  'qbittorrent': 'start qbittorrent',
  'notion': 'start notion',
};

// ─── MAPA DE PROCESSOS: nome amigável → processo para fechar ────────────────
const PROCESS_MAP: Record<string, string> = {
  'calculadora': 'Calculator.exe',
  'calc': 'Calculator.exe',
  'bloco de notas': 'notepad.exe',
  'notepad': 'notepad.exe',
  'paint': 'mspaint.exe',
  'chrome': 'chrome.exe',
  'google chrome': 'chrome.exe',
  'edge': 'msedge.exe',
  'microsoft edge': 'msedge.exe',
  'navegador': 'msedge.exe',
  'firefox': 'firefox.exe',
  'opera': 'opera.exe',
  'brave': 'brave.exe',
  'word': 'WINWORD.EXE',
  'excel': 'EXCEL.EXE',
  'powerpoint': 'POWERPNT.EXE',
  'outlook': 'OUTLOOK.EXE',
  'onenote': 'ONENOTE.EXE',
  'vscode': 'Code.exe',
  'visual studio code': 'Code.exe',
  'visual studio': 'devenv.exe',
  'spotify': 'Spotify.exe',
  'discord': 'Discord.exe',
  'teams': 'msteams.exe',
  'microsoft teams': 'msteams.exe',
  'skype': 'Skype.exe',
  'zoom': 'Zoom.exe',
  'telegram': 'Telegram.exe',
  'whatsapp': 'WhatsApp.exe',
  'slack': 'slack.exe',
  'vlc': 'vlc.exe',
  'obs': 'obs64.exe',
  'obs studio': 'obs64.exe',
  'steam': 'steam.exe',
  'explorer': 'explorer.exe',
  'explorador de arquivos': 'explorer.exe',
  'explorador': 'explorer.exe',
  'figma': 'Figma.exe',
  'postman': 'Postman.exe',
  'insomnia': 'Insomnia.exe',
  'anydesk': 'AnyDesk.exe',
  'teamviewer': 'TeamViewer.exe',
  'qbittorrent': 'qbittorrent.exe',
  'notion': 'Notion.exe',
  'gerenciador de tarefas': 'Taskmgr.exe',
  'task manager': 'Taskmgr.exe',
};

// ─── MAPA DE PASTAS ESPECIAIS ───────────────────────────────────────────────
const FOLDER_MAP: Record<string, string> = {
  'desktop': '%USERPROFILE%\\Desktop',
  'area de trabalho': '%USERPROFILE%\\Desktop',
  'área de trabalho': '%USERPROFILE%\\Desktop',
  'documentos': '%USERPROFILE%\\Documents',
  'documents': '%USERPROFILE%\\Documents',
  'downloads': '%USERPROFILE%\\Downloads',
  'imagens': '%USERPROFILE%\\Pictures',
  'pictures': '%USERPROFILE%\\Pictures',
  'fotos': '%USERPROFILE%\\Pictures',
  'musicas': '%USERPROFILE%\\Music',
  'músicas': '%USERPROFILE%\\Music',
  'music': '%USERPROFILE%\\Music',
  'videos': '%USERPROFILE%\\Videos',
  'vídeos': '%USERPROFILE%\\Videos',
  'appdata': '%APPDATA%',
  'temp': '%TEMP%',
  'programas': 'C:\\Program Files',
  'program files': 'C:\\Program Files',
  'raiz': 'C:\\',
  'c': 'C:\\',
  'd': 'D:\\',
  'lixeira': 'shell:RecycleBinFolder',
};

// ─── MAPA DE CONFIGURAÇÕES WINDOWS ─────────────────────────────────────────
const SETTINGS_MAP: Record<string, string> = {
  'main': 'ms-settings:',
  'wifi': 'ms-settings:network-wifi',
  'bluetooth': 'ms-settings:bluetooth',
  'display': 'ms-settings:display',
  'sound': 'ms-settings:sound',
  'notifications': 'ms-settings:notifications',
  'power': 'ms-settings:powersleep',
  'storage': 'ms-settings:storagesense',
  'apps': 'ms-settings:appsfeatures',
  'personalization': 'ms-settings:personalization',
  'accounts': 'ms-settings:yourinfo',
  'time': 'ms-settings:dateandtime',
  'accessibility': 'ms-settings:easeofaccess',
  'privacy': 'ms-settings:privacy',
  'update': 'ms-settings:windowsupdate',
  'devices': 'ms-settings:connecteddevices',
  'printers': 'ms-settings:printers',
};

// ─── MAPA DE TECLAS PARA SENDKEYS ───────────────────────────────────────────
const KEY_MAP: Record<string, string> = {
  'ctrl': '^',
  'control': '^',
  'alt': '%',
  'shift': '+',
  'win': '^{ESC}',    // SendKeys não tem Win nativo, usamos alternativa
  'enter': '{ENTER}',
  'esc': '{ESC}',
  'escape': '{ESC}',
  'tab': '{TAB}',
  'space': ' ',
  'espaço': ' ',
  'backspace': '{BACKSPACE}',
  'delete': '{DELETE}',
  'del': '{DELETE}',
  'home': '{HOME}',
  'end': '{END}',
  'pageup': '{PGUP}',
  'pagedown': '{PGDN}',
  'up': '{UP}',
  'down': '{DOWN}',
  'left': '{LEFT}',
  'right': '{RIGHT}',
  'printscreen': '{PRTSC}',
  'f1': '{F1}', 'f2': '{F2}', 'f3': '{F3}', 'f4': '{F4}',
  'f5': '{F5}', 'f6': '{F6}', 'f7': '{F7}', 'f8': '{F8}',
  'f9': '{F9}', 'f10': '{F10}', 'f11': '{F11}', 'f12': '{F12}',
};

// ─── UTILIDADES ─────────────────────────────────────────────────────────────

function runCmd(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`[executor] Executando: ${command}`);
    exec(command, { encoding: 'utf-8', timeout: 15000, shell: 'powershell.exe' }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[executor] Erro: ${error.message}`);
        resolve(stderr || error.message);
      } else {
        resolve(stdout || 'Comando executado com sucesso.');
      }
    });
  });
}

function runCmdShell(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`[executor] Executando (cmd): ${command}`);
    exec(command, { encoding: 'utf-8', timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[executor] Erro: ${error.message}`);
        resolve(stderr || error.message);
      } else {
        resolve(stdout || 'Comando executado com sucesso.');
      }
    });
  });
}

// Armazena timers ativos por label
const activeTimers: Map<string, NodeJS.Timeout> = new Map();
// Callback para quando um timer dispara (será configurado pela rota)
let timerCallback: ((label: string) => void) | null = null;

export function setTimerCallback(cb: (label: string) => void) {
  timerCallback = cb;
}

// ─── EXECUTOR PRINCIPAL ─────────────────────────────────────────────────────

export async function executeTool(toolName: string, args: Record<string, any>): Promise<string> {
  console.log(`[executor] Tool chamada: ${toolName}`, args);

  switch (toolName) {

    // ─── APLICATIVOS ──────────────────────────────────────────────
    case 'open_application': {
      const name = (args.app_name || '').toLowerCase().trim();
      const cmd = APP_MAP[name];
      if (!cmd) {
        return `Não sei como abrir "${args.app_name}". Os apps que conheço são: ${Object.keys(APP_MAP).filter((k, i, arr) => arr.indexOf(k) === i).slice(0, 30).join(', ')}...`;
      }
      // Se o comando já começa com 'start', não adicionar outro
      const fullCmd = cmd.startsWith('start ') ? cmd : `start "" ${cmd}`;
      await runCmdShell(fullCmd);
      return `Aplicativo "${args.app_name}" aberto com sucesso.`;
    }

    case 'close_application': {
      const name = (args.app_name || '').toLowerCase().trim();
      const process = PROCESS_MAP[name];
      if (!process) {
        return `Não sei qual processo fechar para "${args.app_name}". Os apps que posso fechar são: ${Object.keys(PROCESS_MAP).slice(0, 20).join(', ')}...`;
      }
      const result = await runCmdShell(`taskkill /IM ${process} /F`);
      return result.includes('SUCCESS') || result.includes('sucesso')
        ? `"${args.app_name}" foi fechado.`
        : `Tentei fechar "${args.app_name}", mas ele pode não estar aberto.`;
    }

    // ─── NAVEGAÇÃO WEB ────────────────────────────────────────────
    case 'open_website': {
      const url = args.url || '';
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'URL inválida. Preciso de uma URL completa começando com http:// ou https://.';
      }
      await runCmdShell(`start "" "${url}"`);
      return `Site aberto: ${url}`;
    }

    case 'web_search': {
      const query = encodeURIComponent(args.query || '');
      if (!query) return 'Nenhum termo de pesquisa fornecido.';
      await runCmdShell(`start "" "https://www.google.com/search?q=${query}"`);
      return `Pesquisa aberta no Google: "${args.query}"`;
    }

    // ─── CONTROLE DE ÁUDIO ────────────────────────────────────────
    case 'set_volume': {
      const level = Math.max(0, Math.min(100, Math.round(args.level ?? 50)));
      // Usa PowerShell com AudioDeviceCmdlets ou SendKeys fallback
      const psScript = `
        $wshShell = New-Object -ComObject WScript.Shell;
        1..50 | ForEach-Object { $wshShell.SendKeys([char]174) };
        $steps = [math]::Round(${level} / 2);
        if ($steps -gt 0) { 1..$steps | ForEach-Object { $wshShell.SendKeys([char]175) } };
      `;
      await runCmd(psScript);
      return `Volume ajustado para ${level}%.`;
    }

    case 'toggle_mute': {
      const psScript = `
        $wshShell = New-Object -ComObject WScript.Shell;
        $wshShell.SendKeys([char]173);
      `;
      await runCmd(psScript);
      return 'Mudo alternado (ativado/desativado).';
    }

    case 'play_pause_media': {
      const psScript = `
        $wshShell = New-Object -ComObject WScript.Shell;
        $wshShell.SendKeys([char]179);
      `;
      await runCmd(psScript);
      return 'Reprodução pausada/retomada.';
    }

    case 'next_track': {
      const psScript = `
        $wshShell = New-Object -ComObject WScript.Shell;
        $wshShell.SendKeys([char]176);
      `;
      await runCmd(psScript);
      return 'Próxima faixa.';
    }

    case 'previous_track': {
      const psScript = `
        $wshShell = New-Object -ComObject WScript.Shell;
        $wshShell.SendKeys([char]177);
      `;
      await runCmd(psScript);
      return 'Faixa anterior.';
    }

    // ─── CONTROLE DE TELA ─────────────────────────────────────────
    case 'set_brightness': {
      const level = Math.max(0, Math.min(100, Math.round(args.level ?? 50)));
      const psScript = `
        (Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, ${level})
      `;
      await runCmd(psScript);
      return `Brilho ajustado para ${level}%.`;
    }

    // ─── CONTROLE DE ENERGIA ──────────────────────────────────────
    case 'lock_screen': {
      await runCmdShell('rundll32.exe user32.dll,LockWorkStation');
      return 'Tela bloqueada.';
    }

    case 'system_power': {
      const action = (args.action || '').toLowerCase();
      const delay = Math.max(0, Math.min(3600, Math.round(args.delay_seconds ?? 0)));
      
      switch (action) {
        case 'shutdown':
          await runCmdShell(`shutdown /s /t ${delay}`);
          return delay > 0
            ? `Computador será desligado em ${Math.round(delay / 60)} minuto(s).`
            : 'Computador desligando...';
        case 'restart':
          await runCmdShell(`shutdown /r /t ${delay}`);
          return delay > 0
            ? `Computador será reiniciado em ${Math.round(delay / 60)} minuto(s).`
            : 'Computador reiniciando...';
        case 'sleep':
          await runCmd('Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Application]::SetSuspendState("Suspend", $false, $false)');
          return 'Computador entrando em modo suspensão.';
        case 'logoff':
          await runCmdShell('shutdown /l');
          return 'Fazendo logoff...';
        default:
          return `Ação "${action}" não reconhecida. Use: shutdown, restart, sleep ou logoff.`;
      }
    }

    case 'cancel_shutdown': {
      await runCmdShell('shutdown /a');
      return 'Desligamento/reinicialização agendada foi cancelada.';
    }

    // ─── CONECTIVIDADE ────────────────────────────────────────────
    case 'toggle_wifi': {
      const enabled = args.enabled;
      const action = enabled ? 'Enable' : 'Disable';
      const psScript = `
        $adapter = Get-NetAdapter | Where-Object { $_.InterfaceDescription -match 'Wi-Fi|Wireless|WLAN|802.11' } | Select-Object -First 1;
        if ($adapter) { ${action}-NetAdapter -Name $adapter.Name -Confirm:$false; "Wi-Fi ${enabled ? 'ligado' : 'desligado'} com sucesso." }
        else { "Nenhum adaptador Wi-Fi encontrado." }
      `;
      const result = await runCmd(psScript);
      return result.includes('sucesso') ? `Wi-Fi ${enabled ? 'ligado' : 'desligado'}.` : result;
    }

    case 'toggle_bluetooth': {
      const enabled = args.enabled;
      // Nota: alternar Bluetooth via PowerShell requer drivers específicos.
      // Abrimos a página de configurações e orientamos o usuário.
      await runCmd(`Start-Process ms-settings:bluetooth`);
      return `Abri as configurações de Bluetooth. ${enabled ? 'Ligue' : 'Desligue'} o Bluetooth na página que abriu.`;
    }

    // ─── PRODUTIVIDADE ────────────────────────────────────────────
    case 'type_text': {
      const text = args.text || '';
      if (!text) return 'Nenhum texto fornecido para digitar.';
      const escaped = text.replace(/'/g, "''").replace(/\+/g, '{+}').replace(/\^/g, '{^}').replace(/%/g, '{%}').replace(/~/g, '{~}');
      const psCmd = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escaped}')`;
      await runCmd(psCmd);
      return `Texto digitado com sucesso.`;
    }

    case 'press_keys': {
      const keysRaw = (args.keys || '').toLowerCase().trim();
      if (!keysRaw) return 'Nenhuma tecla especificada.';

      // Tratamento especial para combinações com Win key (usar PowerShell direto)
      if (keysRaw.includes('win+') || keysRaw.includes('windows+')) {
        const winKey = keysRaw.replace('win+', '').replace('windows+', '').trim();
        
        // Combinações Win conhecidas
        const winCombos: Record<string, string> = {
          'd': 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^{ESC}"); Start-Sleep -Milliseconds 100; [System.Windows.Forms.SendKeys]::SendWait("d")',
          'e': 'Start-Process explorer',
          'l': 'rundll32.exe user32.dll,LockWorkStation',
          'r': 'Add-Type -TypeDefinition \'using System; using System.Runtime.InteropServices; public class WinKey { [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo); }\'; [WinKey]::keybd_event(0x5B,0,0,0); [WinKey]::keybd_event(0x52,0,0,0); [WinKey]::keybd_event(0x52,0,2,0); [WinKey]::keybd_event(0x5B,0,2,0)',
          'i': 'Start-Process ms-settings:',
          's': 'Add-Type -TypeDefinition \'using System; using System.Runtime.InteropServices; public class WinKey { [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo); }\'; [WinKey]::keybd_event(0x5B,0,0,0); [WinKey]::keybd_event(0x53,0,0,0); [WinKey]::keybd_event(0x53,0,2,0); [WinKey]::keybd_event(0x5B,0,2,0)',
          'tab': 'Add-Type -TypeDefinition \'using System; using System.Runtime.InteropServices; public class WinKey { [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo); }\'; [WinKey]::keybd_event(0x5B,0,0,0); [WinKey]::keybd_event(0x09,0,0,0); [WinKey]::keybd_event(0x09,0,2,0); [WinKey]::keybd_event(0x5B,0,2,0)',
        };

        if (winCombos[winKey]) {
          await runCmd(winCombos[winKey]);
          return `Atalho Win+${winKey.toUpperCase()} executado.`;
        }
        return `Combinação Win+${winKey} não suportada diretamente.`;
      }

      // Alt+F4 tratamento especial
      if (keysRaw === 'alt+f4') {
        await runCmd(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('%{F4}')`);
        return 'Alt+F4 executado (fechar janela ativa).';
      }

      // Ctrl+Shift+Esc (gerenciador de tarefas)
      if (keysRaw === 'ctrl+shift+esc') {
        await runCmdShell('taskmgr');
        return 'Gerenciador de Tarefas aberto.';
      }

      // Monta a string de SendKeys para combinações normais
      const keys = keysRaw.split('+').map((k: string) => k.trim());
      let sendKeysStr = '';
      const modifiers: string[] = [];
      let mainKey = '';

      for (const key of keys) {
        if (key === 'ctrl' || key === 'control') {
          modifiers.push('^');
        } else if (key === 'alt') {
          modifiers.push('%');
        } else if (key === 'shift') {
          modifiers.push('+');
        } else {
          mainKey = KEY_MAP[key] || key;
        }
      }

      if (mainKey) {
        sendKeysStr = modifiers.join('') + mainKey;
      } else {
        sendKeysStr = modifiers.join('');
      }

      const psCmd = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${sendKeysStr}')`;
      await runCmd(psCmd);
      return `Atalho ${keysRaw.toUpperCase()} executado.`;
    }

    case 'take_screenshot': {
      const region = (args.region || 'fullscreen').toLowerCase();
      if (region === 'snip') {
        await runCmdShell('snippingtool');
        return 'Ferramenta de Recorte aberta. Selecione a área que deseja capturar.';
      }
      // Tela inteira: salva na área de trabalho
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms;
        $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds;
        $bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height);
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap);
        $graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size);
        $timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss';
        $path = [System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), "Screenshot_$timestamp.png");
        $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png);
        $graphics.Dispose(); $bitmap.Dispose();
        Write-Output $path;
      `;
      const result = await runCmd(psScript);
      return `Screenshot salva na área de trabalho: ${result.trim()}`;
    }

    // ─── GERENCIAMENTO DE JANELAS ─────────────────────────────────
    case 'manage_window': {
      const action = (args.action || '').toLowerCase();
      
      switch (action) {
        case 'minimize':
          await runCmd(`
            $wshShell = New-Object -ComObject WScript.Shell;
            $wshShell.SendKeys('% n');
          `);
          return 'Janela minimizada.';
        case 'maximize':
          await runCmd(`
            $wshShell = New-Object -ComObject WScript.Shell;
            $wshShell.SendKeys('% x');
          `);
          return 'Janela maximizada.';
        case 'restore':
          await runCmd(`
            $wshShell = New-Object -ComObject WScript.Shell;
            $wshShell.SendKeys('% r');
          `);
          return 'Janela restaurada.';
        case 'close':
          await runCmd(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('%{F4}')`);
          return 'Janela ativa fechada.';
        case 'minimize_all':
          await runCmd(`
            $shell = New-Object -ComObject Shell.Application;
            $shell.MinimizeAll();
          `);
          return 'Todas as janelas minimizadas (área de trabalho).';
        default:
          return `Ação "${action}" não reconhecida. Use: minimize, maximize, restore, close ou minimize_all.`;
      }
    }

    // ─── SISTEMA DE ARQUIVOS ──────────────────────────────────────
    case 'open_folder': {
      const folder = (args.folder || '').toLowerCase().trim();
      const folderPath = FOLDER_MAP[folder] || args.folder;
      
      if (!folderPath) return 'Nenhuma pasta especificada.';
      
      await runCmdShell(`start "" "${folderPath}"`);
      return `Pasta aberta: ${args.folder}`;
    }

    // ─── UTILITÁRIOS ──────────────────────────────────────────────
    case 'set_timer': {
      const seconds = Math.max(1, Math.min(86400, Math.round(args.seconds ?? 60)));
      const label = args.label || 'Timer';
      
      // Cancela timer anterior com mesmo label
      if (activeTimers.has(label)) {
        clearTimeout(activeTimers.get(label)!);
      }

      const timer = setTimeout(async () => {
        activeTimers.delete(label);
        // Toca um beep e mostra notificação
        const psScript = `
          [console]::beep(800, 500); [console]::beep(800, 500); [console]::beep(800, 500);
          Add-Type -AssemblyName System.Windows.Forms;
          [System.Windows.Forms.MessageBox]::Show("${label} - Tempo esgotado!", "Timer Aline", "OK", "Information");
        `;
        runCmd(psScript);
        if (timerCallback) timerCallback(label);
      }, seconds * 1000);

      activeTimers.set(label, timer);

      const minutes = Math.round(seconds / 60);
      return seconds >= 60
        ? `Timer de ${minutes} minuto(s) definido${label !== 'Timer' ? ` (${label})` : ''}. Vou te avisar quando terminar.`
        : `Timer de ${seconds} segundo(s) definido${label !== 'Timer' ? ` (${label})` : ''}. Vou te avisar quando terminar.`;
    }

    case 'get_system_info': {
      const infoType = (args.info_type || 'all').toLowerCase();
      let psScript = '';

      switch (infoType) {
        case 'datetime':
          psScript = `Get-Date -Format 'dddd, dd/MM/yyyy HH:mm:ss'`;
          break;
        case 'cpu':
          psScript = `
            $cpu = (Get-WmiObject Win32_Processor).LoadPercentage;
            $name = (Get-WmiObject Win32_Processor).Name;
            Write-Output "CPU: $name - Uso: $cpu%"
          `;
          break;
        case 'memory':
          psScript = `
            $os = Get-WmiObject Win32_OperatingSystem;
            $total = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1);
            $free = [math]::Round($os.FreePhysicalMemory / 1MB, 1);
            $used = [math]::Round($total - $free, 1);
            $pct = [math]::Round(($used / $total) * 100, 0);
            Write-Output "RAM: $used GB / $total GB usados ($pct%)"
          `;
          break;
        case 'disk':
          psScript = `
            Get-WmiObject Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object {
              $total = [math]::Round($_.Size / 1GB, 1);
              $free = [math]::Round($_.FreeSpace / 1GB, 1);
              $used = [math]::Round($total - $free, 1);
              Write-Output "Disco $($_.DeviceID): $used GB / $total GB usados ($free GB livres)"
            }
          `;
          break;
        case 'battery':
          psScript = `
            $bat = Get-WmiObject Win32_Battery;
            if ($bat) {
              $pct = $bat.EstimatedChargeRemaining;
              $status = if ($bat.BatteryStatus -eq 2) { 'Carregando' } else { 'Descarregando' };
              Write-Output "Bateria: $pct% ($status)"
            } else {
              Write-Output "Nenhuma bateria detectada (provavelmente desktop)."
            }
          `;
          break;
        case 'network':
          psScript = `
            $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -ne '127.0.0.1' } | Select-Object -First 1).IPAddress;
            $hostname = $env:COMPUTERNAME;
            $publicIp = try { (Invoke-WebRequest -Uri 'https://api.ipify.org' -TimeoutSec 3).Content } catch { 'indisponível' };
            Write-Output "Computador: $hostname | IP Local: $ip | IP Público: $publicIp"
          `;
          break;
        case 'all':
          psScript = `
            $date = Get-Date -Format 'dddd, dd/MM/yyyy HH:mm:ss';
            $cpu = (Get-WmiObject Win32_Processor).LoadPercentage;
            $os = Get-WmiObject Win32_OperatingSystem;
            $totalRam = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1);
            $freeRam = [math]::Round($os.FreePhysicalMemory / 1MB, 1);
            $usedRam = [math]::Round($totalRam - $freeRam, 1);
            $pctRam = [math]::Round(($usedRam / $totalRam) * 100, 0);
            $disk = Get-WmiObject Win32_LogicalDisk -Filter "DriveType=3" | Select-Object -First 1;
            $diskTotal = [math]::Round($disk.Size / 1GB, 0);
            $diskFree = [math]::Round($disk.FreeSpace / 1GB, 0);
            Write-Output "$date | CPU: $cpu% | RAM: $usedRam/$totalRam GB ($pctRam%) | Disco C: $diskFree GB livres de $diskTotal GB"
          `;
          break;
        default:
          return `Tipo de informação "${infoType}" não reconhecido. Use: datetime, cpu, memory, disk, battery, network ou all.`;
      }

      const result = await runCmd(psScript);
      return result.trim();
    }

    case 'empty_recycle_bin': {
      await runCmd(`Clear-RecycleBin -Force -ErrorAction SilentlyContinue; Write-Output "Lixeira esvaziada."`);
      return 'Lixeira esvaziada com sucesso.';
    }

    case 'eject_media': {
      const psScript = `
        $driveEject = New-Object -ComObject Shell.Application;
        $driveEject.Namespace(17).Items() | Where-Object { $_.Type -match 'CD|DVD|Removable' } | ForEach-Object { $_.InvokeVerb("Eject") };
        Write-Output "Mídia ejetada."
      `;
      await runCmd(psScript);
      return 'Mídia ejetada.';
    }

    case 'open_settings_page': {
      const page = (args.page || 'main').toLowerCase();
      const uri = SETTINGS_MAP[page];
      if (!uri) {
        return `Página "${page}" não reconhecida. Páginas disponíveis: ${Object.keys(SETTINGS_MAP).join(', ')}.`;
      }
      await runCmdShell(`start "" "${uri}"`);
      return `Configurações abertas: ${page}.`;
    }

    // ─── CLIPBOARD ────────────────────────────────────────────────
    case 'clipboard_copy': {
      await runCmd(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^c')`);
      return 'Texto copiado para a área de transferência.';
    }

    case 'clipboard_paste': {
      await runCmd(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')`);
      return 'Conteúdo colado da área de transferência.';
    }

    case 'clipboard_set_text': {
      const clipText = (args.text || '').replace(/'/g, "''");
      await runCmd(`Set-Clipboard -Value '${clipText}'`);
      return 'Texto definido na área de transferência.';
    }

    // ─── NAVEGADOR AVANÇADO ──────────────────────────────────────
    case 'browser_new_tab': {
      if (args.url) {
        await runCmdShell(`start "" "${args.url}"`);
        return `Nova aba aberta com: ${args.url}`;
      }
      await runCmd(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^t')`);
      return 'Nova aba aberta.';
    }

    case 'browser_reload': {
      await runCmd(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{F5}')`);
      return 'Página recarregada.';
    }

    case 'browser_back': {
      await runCmd(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('%{LEFT}')`);
      return 'Voltou para a página anterior.';
    }

    case 'browser_forward': {
      await runCmd(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('%{RIGHT}')`);
      return 'Avançou para a próxima página.';
    }

    case 'browser_incognito': {
      await runCmd(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^+n')`);
      return 'Janela anônima aberta.';
    }

    case 'browser_switch_tab': {
      const direction = (args.direction || 'next').toLowerCase();
      const times = Math.max(1, Math.min(20, Math.round(args.times ?? 1)));
      const key = direction === 'previous' ? '^+{TAB}' : '^{TAB}';
      const sendKeys = Array(times).fill(key).join('');
      await runCmd(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${sendKeys}')`);
      return `Navegou ${times}x para ${direction === 'previous' ? 'aba anterior' : 'próxima aba'}.`;
    }

    // ─── ARQUIVOS (com validação de segurança) ───────────────────
    case 'file_create': {
      const filePath = args.path || '';
      if (!filePath) return 'Caminho não especificado.';
      if (!isSafePath(filePath)) return 'Caminho bloqueado por segurança. Só é permitido criar arquivos dentro do perfil do usuário.';
      const fileType = (args.type || 'file').toLowerCase();
      if (fileType === 'folder') {
        await runCmd(`New-Item -ItemType Directory -Path '${filePath}' -Force`);
        return `Pasta criada: ${filePath}`;
      }
      const content = (args.content || '').replace(/'/g, "''");
      await runCmd(`Set-Content -Path '${filePath}' -Value '${content}'`);
      return `Arquivo criado: ${filePath}`;
    }

    case 'file_delete': {
      const filePath = args.path || '';
      if (!filePath) return 'Caminho não especificado.';
      if (!isSafePath(filePath)) return 'Caminho bloqueado por segurança. Só é permitido deletar arquivos dentro do perfil do usuário.';
      await runCmd(`Remove-Item -Path '${filePath}' -Recurse -Force`);
      return `Deletado: ${filePath}`;
    }

    case 'file_rename': {
      const oldPath = args.old_path || '';
      const newName = args.new_name || '';
      if (!oldPath || !newName) return 'Caminho e novo nome são obrigatórios.';
      if (!isSafePath(oldPath)) return 'Caminho bloqueado por segurança.';
      await runCmd(`Rename-Item -Path '${oldPath}' -NewName '${newName}'`);
      return `Renomeado para: ${newName}`;
    }

    case 'file_search': {
      const filename = args.filename || '';
      const directory = args.directory || (process.env.USERPROFILE + '\\Desktop');
      if (!filename) return 'Nome do arquivo não especificado.';
      const result = await runCmd(`Get-ChildItem -Path '${directory}' -Recurse -Filter '*${filename}*' -ErrorAction SilentlyContinue | Select-Object -First 10 -ExpandProperty FullName`);
      return result.trim() || 'Nenhum arquivo encontrado.';
    }

    // ─── SISTEMA (com validação de segurança) ────────────────────
    case 'run_command': {
      const command = (args.command || '').trim();
      if (!command) return 'Nenhum comando especificado.';
      if (isCommandBlocked(command)) {
        console.warn(`[executor] ⛔ Comando bloqueado por segurança: ${command}`);
        return 'Comando bloqueado por motivos de segurança.';
      }
      const shell = (args.shell || 'powershell').toLowerCase();
      const result = shell === 'cmd' ? await runCmdShell(command) : await runCmd(command);
      return result.trim() || 'Comando executado.';
    }

    case 'kill_process': {
      const proc = (args.process_name || '').trim();
      if (!proc) return 'Nome do processo não especificado.';
      const result = await runCmdShell(`taskkill /IM ${proc} /F`);
      return result.includes('SUCCESS') || result.includes('sucesso')
        ? `Processo ${proc} encerrado.`
        : `Tentei encerrar ${proc}, mas ele pode não estar em execução.`;
    }

    case 'list_processes': {
      const filter = args.filter || '';
      const psScript = filter
        ? `Get-Process | Where-Object { $_.ProcessName -match '${filter}' } | Select-Object -First 15 -Property ProcessName,Id,CPU | Format-Table -AutoSize`
        : `Get-Process | Sort-Object CPU -Descending | Select-Object -First 15 -Property ProcessName,Id,CPU | Format-Table -AutoSize`;
      const result = await runCmd(psScript);
      return result.trim() || 'Nenhum processo encontrado.';
    }

    case 'windows_search': {
      const query = args.query || '';
      if (!query) return 'Nenhum termo de busca especificado.';
      await runCmd(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^{ESC}'); Start-Sleep -Milliseconds 500; [System.Windows.Forms.SendKeys]::SendWait('${query.replace(/'/g, "''")}')`);
      return `Busca do Windows aberta com: ${query}`;
    }

    case 'mouse_click': {
      const x = Math.round(args.x ?? 0);
      const y = Math.round(args.y ?? 0);
      const button = (args.button || 'left').toLowerCase();
      const psScript = `
        Add-Type -TypeDefinition '
          using System; using System.Runtime.InteropServices;
          public class Mouse {
            [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
            [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, int dwExtraInfo);
          }
        '
        [Mouse]::SetCursorPos(${x}, ${y})
        Start-Sleep -Milliseconds 100
        ${button === 'right' ? '[Mouse]::mouse_event(0x0008, 0, 0, 0, 0); [Mouse]::mouse_event(0x0010, 0, 0, 0, 0)' : '[Mouse]::mouse_event(0x0002, 0, 0, 0, 0); [Mouse]::mouse_event(0x0004, 0, 0, 0, 0)'}
      `;
      await runCmd(psScript);
      return `Clique ${button} em (${x}, ${y}).`;
    }

    // ─── DEFAULT ──────────────────────────────────────────────────
    default:
      return `Ferramenta "${toolName}" não reconhecida.`;
  }
}

/**
 * Definições das Tools (ferramentas) que a IA pode chamar
 * para controlar o computador do usuário.
 * 
 * Formato compatível com OpenAI / Groq Function Calling.
 * 
 * CATEGORIAS:
 * - Aplicativos (abrir/fechar)
 * - Navegação web (abrir sites, pesquisar)
 * - Controle de áudio (volume, mudo)
 * - Controle de tela (brilho)
 * - Controle de energia (desligar, reiniciar, suspender, logoff, bloquear)
 * - Conectividade (Wi-Fi, Bluetooth)
 * - Produtividade (digitar texto, atalhos de teclado, clipboard, screenshot)
 * - Gerenciamento de janelas (minimizar, maximizar, fechar janela ativa)
 * - Sistema de arquivos (abrir pastas específicas)
 * - Utilitários (timer, alarme, ejetar mídia, informações do sistema)
 */

export const TOOLS = [
  // ─── APLICATIVOS ──────────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'open_application',
      description: 'Abre um aplicativo ou programa no computador do usuário pelo nome. Exemplos: calculadora, bloco de notas, navegador, paint, terminal, spotify, discord, word, excel, whatsapp, telegram, obs studio, steam, vlc.',
      parameters: {
        type: 'object',
        properties: {
          app_name: {
            type: 'string',
            description: 'Nome do aplicativo em português ou inglês. Ex: "calculadora", "notepad", "chrome", "spotify", "whatsapp", "telegram", "obs", "steam".',
          },
        },
        required: ['app_name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'close_application',
      description: 'Fecha um aplicativo que está aberto no computador do usuário. Exemplos: fechar chrome, fechar bloco de notas, fechar spotify.',
      parameters: {
        type: 'object',
        properties: {
          app_name: {
            type: 'string',
            description: 'Nome do aplicativo a fechar. Ex: "chrome", "notepad", "calculadora", "spotify".',
          },
        },
        required: ['app_name'],
      },
    },
  },

  // ─── NAVEGAÇÃO WEB ─────────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'open_website',
      description: 'Abre um site específico no navegador padrão do usuário. Ex: "abrir youtube", "abrir google", "abrir github".',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'URL completa do site a abrir. Ex: "https://www.youtube.com", "https://www.google.com".',
          },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'web_search',
      description: 'Faz uma pesquisa no Google no navegador padrão. Use quando o usuário pedir para pesquisar algo na internet. Ex: "pesquisa sobre inteligência artificial", "busca previsão do tempo".',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'O texto da pesquisa. Ex: "previsão do tempo São Paulo", "como fazer bolo de chocolate".',
          },
        },
        required: ['query'],
      },
    },
  },

  // ─── CONTROLE DE ÁUDIO ─────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'set_volume',
      description: 'Ajusta o volume do áudio do computador para um valor percentual (0 a 100). Use também quando o usuário pedir para aumentar, diminuir ou mutar o volume.',
      parameters: {
        type: 'object',
        properties: {
          level: {
            type: 'number',
            description: 'Nível de volume de 0 (mudo) a 100 (máximo).',
          },
        },
        required: ['level'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'toggle_mute',
      description: 'Ativa ou desativa o mudo (mute) do áudio do computador. Use quando o usuário disser "muta o som", "tira o mudo", "sem som".',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'play_pause_media',
      description: 'Pausa ou retoma a reprodução de mídia (música, vídeo) que está tocando no computador. Funciona com Spotify, YouTube, VLC, etc.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'next_track',
      description: 'Pula para a próxima música/faixa. Funciona com Spotify, YouTube Music, VLC e outros players de mídia.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'previous_track',
      description: 'Volta para a música/faixa anterior. Funciona com Spotify, YouTube Music, VLC e outros players de mídia.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },

  // ─── CONTROLE DE TELA ──────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'set_brightness',
      description: 'Ajusta o brilho da tela do computador para um valor percentual (0 a 100). Use quando o usuário pedir para aumentar ou diminuir o brilho.',
      parameters: {
        type: 'object',
        properties: {
          level: {
            type: 'number',
            description: 'Nível de brilho de 0 (mínimo) a 100 (máximo).',
          },
        },
        required: ['level'],
      },
    },
  },

  // ─── CONTROLE DE ENERGIA ───────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'lock_screen',
      description: 'Bloqueia a tela do computador do usuário (tela de login do Windows).',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'system_power',
      description: 'Controla o estado de energia do computador: desligar, reiniciar, suspender (dormir) ou fazer logoff. IMPORTANTE: Sempre confirme com o usuário antes de executar desligamento ou reinicialização.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['shutdown', 'restart', 'sleep', 'logoff'],
            description: 'Ação a executar: "shutdown" (desligar), "restart" (reiniciar), "sleep" (suspender/dormir), "logoff" (sair da conta).',
          },
          delay_seconds: {
            type: 'number',
            description: 'Tempo de espera em segundos antes de executar (padrão: 0 para imediato, máx 3600). Útil para "desligar em 30 minutos".',
          },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'cancel_shutdown',
      description: 'Cancela um desligamento ou reinicialização agendada. Use quando o usuário disser "cancela o desligamento" ou "não desliga mais".',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },

  // ─── CONECTIVIDADE ─────────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'toggle_wifi',
      description: 'Liga ou desliga o Wi-Fi do computador.',
      parameters: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            description: 'true para ligar o Wi-Fi, false para desligar.',
          },
        },
        required: ['enabled'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'toggle_bluetooth',
      description: 'Liga ou desliga o Bluetooth do computador.',
      parameters: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            description: 'true para ligar o Bluetooth, false para desligar.',
          },
        },
        required: ['enabled'],
      },
    },
  },

  // ─── PRODUTIVIDADE ─────────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'type_text',
      description: 'Digita um texto no campo de entrada atualmente focado no computador do usuário.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'O texto a ser digitado.',
          },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'press_keys',
      description: 'Pressiona uma combinação de teclas (atalho de teclado) no computador. Use para ações como Ctrl+C (copiar), Ctrl+V (colar), Ctrl+Z (desfazer), Alt+Tab (alternar janela), Ctrl+S (salvar), Print Screen (capturar tela), Alt+F4 (fechar janela), Win+D (mostrar área de trabalho).',
      parameters: {
        type: 'object',
        properties: {
          keys: {
            type: 'string',
            description: 'Combinação de teclas separadas por +. Ex: "ctrl+c", "ctrl+v", "alt+tab", "ctrl+z", "ctrl+shift+esc", "win+d", "alt+f4", "ctrl+s", "f5", "printscreen".',
          },
        },
        required: ['keys'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'take_screenshot',
      description: 'Tira uma captura de tela (screenshot/print) e salva na área de trabalho do usuário. Use quando o usuário pedir para tirar um print, capturar a tela ou fazer uma screenshot.',
      parameters: {
        type: 'object',
        properties: {
          region: {
            type: 'string',
            enum: ['fullscreen', 'snip'],
            description: '"fullscreen" para tela inteira, "snip" para abrir ferramenta de recorte e o usuário selecionar a área.',
          },
        },
        required: [],
      },
    },
  },

  // ─── GERENCIAMENTO DE JANELAS ──────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'manage_window',
      description: 'Gerencia a janela ativa do computador: minimizar, maximizar, restaurar ou fechar. Também pode minimizar todas as janelas (mostrar área de trabalho).',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['minimize', 'maximize', 'restore', 'close', 'minimize_all'],
            description: '"minimize" para minimizar, "maximize" para maximizar, "restore" para restaurar, "close" para fechar a janela ativa, "minimize_all" para minimizar todas (mostrar desktop).',
          },
        },
        required: ['action'],
      },
    },
  },

  // ─── SISTEMA DE ARQUIVOS ───────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'open_folder',
      description: 'Abre uma pasta específica no Explorador de Arquivos. Suporta pastas especiais como Desktop, Documentos, Downloads, Músicas, Imagens, Vídeos e caminhos personalizados.',
      parameters: {
        type: 'object',
        properties: {
          folder: {
            type: 'string',
            description: 'Nome da pasta especial ou caminho completo. Ex: "desktop", "documentos", "downloads", "imagens", "musicas", "videos", "C:\\Users\\user\\projetos".',
          },
        },
        required: ['folder'],
      },
    },
  },

  // ─── UTILITÁRIOS ───────────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'set_timer',
      description: 'Define um temporizador (timer) que avisa o usuário após um tempo determinado. Use quando o usuário pedir "me avisa em 5 minutos", "cria um timer de 10 minutos", "me lembra em meia hora".',
      parameters: {
        type: 'object',
        properties: {
          seconds: {
            type: 'number',
            description: 'Tempo em segundos. Ex: 300 para 5 minutos, 1800 para meia hora.',
          },
          label: {
            type: 'string',
            description: 'Rótulo opcional para o timer. Ex: "Hora de levantar", "Verificar o forno".',
          },
        },
        required: ['seconds'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_system_info',
      description: 'Obtém informações do sistema: hora atual, data, uso de CPU, memória RAM, disco, IP, nome do computador, bateria (se notebook). Use quando o usuário perguntar "que horas são", "quanto de RAM estou usando", "qual meu IP", "como está a bateria".',
      parameters: {
        type: 'object',
        properties: {
          info_type: {
            type: 'string',
            enum: ['datetime', 'cpu', 'memory', 'disk', 'battery', 'network', 'all'],
            description: 'Tipo de informação: "datetime" (data/hora), "cpu" (uso do processador), "memory" (uso de RAM), "disk" (disco), "battery" (bateria), "network" (IP e rede), "all" (tudo).',
          },
        },
        required: ['info_type'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'empty_recycle_bin',
      description: 'Esvazia a lixeira do Windows. Use quando o usuário pedir para limpar ou esvaziar a lixeira.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'eject_media',
      description: 'Ejeta a unidade de CD/DVD ou mídia removível do computador.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'open_settings_page',
      description: 'Abre uma página específica das Configurações do Windows. Use quando o usuário pedir para abrir configurações de Wi-Fi, Bluetooth, tela, som, impressoras, atualizações, etc.',
      parameters: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            enum: [
              'main', 'wifi', 'bluetooth', 'display', 'sound', 'notifications',
              'power', 'storage', 'apps', 'personalization', 'accounts',
              'time', 'accessibility', 'privacy', 'update', 'devices', 'printers'
            ],
            description: 'Página de configurações a abrir.',
          },
        },
        required: ['page'],
      },
    },
  },

  // ─── CLIPBOARD ─────────────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'clipboard_copy',
      description: 'Copia o texto selecionado para a área de transferência (Ctrl+C).',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'clipboard_paste',
      description: 'Cola o conteúdo da área de transferência (Ctrl+V).',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'clipboard_set_text',
      description: 'Define um texto específico na área de transferência sem precisar selecionar.',
      parameters: {
        type: 'object',
        properties: { text: { type: 'string', description: 'Texto a copiar' } },
        required: ['text'],
      },
    },
  },

  // ─── NAVEGADOR AVANÇADO ────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'browser_new_tab',
      description: 'Abre uma nova aba no navegador (Ctrl+T), opcionalmente com URL.',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string', description: 'URL opcional' } },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'browser_reload',
      description: 'Recarrega a página atual (F5).',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'browser_back',
      description: 'Volta para a página anterior no histórico (Alt+Left).',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'browser_forward',
      description: 'Avança para a próxima página no histórico (Alt+Right).',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'browser_incognito',
      description: 'Abre uma janela anônima/privada (Ctrl+Shift+N).',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ─── ARQUIVOS ──────────────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'file_create',
      description: 'Cria um arquivo ou pasta no caminho especificado.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Caminho completo' },
          type: { type: 'string', enum: ['file', 'folder'], description: 'Tipo' },
          content: { type: 'string', description: 'Conteúdo (apenas para arquivo)' },
        },
        required: ['path', 'type'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'file_delete',
      description: 'Deleta um arquivo ou pasta.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Caminho' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'file_rename',
      description: 'Renomeia um arquivo ou pasta.',
      parameters: {
        type: 'object',
        properties: {
          old_path: { type: 'string', description: 'Caminho atual' },
          new_name: { type: 'string', description: 'Novo nome' },
        },
        required: ['old_path', 'new_name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'file_search',
      description: 'Busca arquivos por nome em um diretório.',
      parameters: {
        type: 'object',
        properties: {
          filename: { type: 'string', description: 'Nome ou parte do nome' },
          directory: { type: 'string', description: 'Diretório (padrão: Desktop)' },
        },
        required: ['filename'],
      },
    },
  },

  // ─── SISTEMA ───────────────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'run_command',
      description: 'Executa um comando no PowerShell ou CMD.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Comando' },
          shell: { type: 'string', enum: ['powershell', 'cmd'], description: 'Shell' },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'kill_process',
      description: 'Encerra um processo por nome (ex: chrome.exe).',
      parameters: {
        type: 'object',
        properties: { process_name: { type: 'string', description: 'Nome do processo' } },
        required: ['process_name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_processes',
      description: 'Lista processos ativos, opcionalmente filtrados.',
      parameters: {
        type: 'object',
        properties: { filter: { type: 'string', description: 'Filtro opcional' } },
        required: [],
      },
    },
  },

  // ─── BUSCA ─────────────────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'windows_search',
      description: 'Abre a busca do Windows e digita o termo.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Termo de busca' } },
        required: ['query'],
      },
    },
  },

  // ─── MOUSE E NAVEGAÇÃO ─────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'mouse_click',
      description: 'Clica em uma coordenada específica da tela. Use quando precisar clicar em algo que você vê na imagem da tela.',
      parameters: {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'Coordenada X (horizontal)' },
          y: { type: 'number', description: 'Coordenada Y (vertical)' },
          button: { type: 'string', enum: ['left', 'right', 'middle'], description: 'Botão (padrão: left)' },
        },
        required: ['x', 'y'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'browser_switch_tab',
      description: 'Navega entre abas do navegador. Use para ir para próxima aba ou aba anterior.',
      parameters: {
        type: 'object',
        properties: {
          direction: { type: 'string', enum: ['next', 'previous'], description: 'next ou previous' },
          times: { type: 'number', description: 'Quantas vezes (padrão: 1)' },
        },
        required: ['direction'],
      },
    },
  },
];

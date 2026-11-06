# 🎙️ Smart Voice IoT Assistant (Tuya / Smart Life Cloud)

![NodeJS](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Tuya IoT](https://img.shields.io/badge/IoT-Tuya%20%7C%20Smart%20Life-FF6600)
![Groq](https://img.shields.io/badge/Groq-Whisper%20STT%20%2B%20LLM-F55036)
![ElevenLabs](https://img.shields.io/badge/ElevenLabs-Neural%20TTS-black)

Assistente de voz inteligente estilo Alexa, desenvolvido para **automação residencial e controle por voz de dispositivos IoT físicos reais** conectados ao ecossistema **Smart Life / Tuya Cloud** (tomadas inteligentes, interruptores, ar condicionado, iluminação e eletrodomésticos).

O projeto combina **reconhecimento de fala de altíssima velocidade (Groq Whisper)**, **compreensão de linguagem natural via LLM** para classificação de intenções, **síntese vocal humana ultrarrealista (ElevenLabs)** e **integração direta via OpenAPI com a nuvem da Tuya**, permitindo controlar a casa inteira por comandos de voz fluidos e naturais.

---

## 🌟 Principais Recursos e Diferenciais

- 🔌 **Controle de Hardware IoT Real (Tuya / Smart Life):**
  - Acionamento e controle de estado (Ligar / Desligar / Toggle) de tomadas inteligentes e relés em tempo real.
  - Suporte a múltiplos canais (`switch_1`, `switch_2`, etc.).
  - Descoberta automática de aparelhos vinculados à conta Tuya do usuário (`/api/devices/tuya/discover`).
- ⚡ **Inferência em Milissegundos (Groq Cloud):**
  - Transcrição de áudio via **Whisper Large v3 Turbo** com sensibilidade a sotaques e termos em português.
  - Classificação de intenção e extração de parâmetros via LLM de resposta rápida.
- 🔊 **Voz Humana Expressiva (ElevenLabs):**
  - Respostas vocais naturais em português brasileiro, eliminando aquela sensação robótica de assistentes convencionais.
- 🔮 **Interface Visual Futurista (React + Vite):**
  - Esfera animada com estados visuais dinâmicos (ouvindo, processando, falando e ocioso).
  - Medidor de nível de áudio do microfone (RMS) em tempo real.
  - Painel de gerenciamento para testar e cadastrar apelidos e palavras-chave de voz para cada dispositivo.
- 🚀 **Execução em 1 Clique no Windows:** Scripts automatizados (`iniciar.bat` e `parar.bat`) para subir frontend e backend simultaneamente.

---

## 🏗️ Arquitetura de Ponta a Ponta

```mermaid
flowchart TD
    User([🗣️ Comando de Voz: "Desliga a tomada do ar"]) --> Mic[🎤 Frontend React + Medidor RMS]
    Mic --> STT[⚡ Groq Whisper: Transcrição Instantânea]
    STT --> LLM[🧠 Groq LLM: Extração de Intenção & Dispositivo]
    
    LLM --> Action{Dispositivo Identificado?}
    
    Action -- Sim --> Tuya[☁️ Tuya Cloud OpenAPI]
    Tuya --> Socket["🔌 Dispositivo Físico Real<br/>(Tomada Inteligente Smart Life)"]
    Socket -.-> Status[Status Atualizado: OFF]
    
    Status --> TTS[🔊 ElevenLabs TTS: Síntese de Confirmação]
    TTS --> VoiceOut([🎧 "Pronto! Tomada desligada com sucesso."])
```

---

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologia | Detalhes |
|---|---|---|
| **Frontend** | React 18, Vite, TypeScript | Interface minimalista com esfera interativa e Web Audio API |
| **Backend API** | Node.js, Express, TypeScript | Gerenciador de dispositivos, orquestrador de IA e cliente Tuya |
| **Nuvem IoT** | Tuya OpenAPI / Smart Life | Comunicação direta com a nuvem de dispositivos conectados |
| **Speech-to-Text** | Groq (Whisper Large v3 Turbo) | Transcrição de fala para texto ultrarrápida |
| **Inteligência e Raciocínio** | Groq LLM (`qwen/qwen3.8-27b`) | Compreensão de comandos informais e extração de parâmetros |
| **Text-to-Speech** | ElevenLabs Multilingual v2 | Voz natural com sotaque brasileiro e entonação humana |

---

## 📂 Estrutura do Projeto

```text
smart-voice-iot-assistant/
├── backend/                  # Servidor Express com API e integrações
│   ├── src/
│   │   ├── routes/
│   │   │   ├── devices.ts    # Gestão de dispositivos IoT e descoberta Tuya
│   │   │   ├── command.ts    # Processamento e execução de comandos de voz
│   │   │   ├── audio.ts      # Recepção e processamento de streams de áudio
│   │   │   └── chat.ts       # Diálogo e conversação geral
│   │   ├── services/
│   │   │   ├── tuya.ts       # Cliente de autenticação e chamadas na Tuya OpenAPI
│   │   │   ├── deviceManager.ts # Mapeamento e persistência de aliases/palavras-chave
│   │   │   └── elevenlabs.ts # Síntese de voz
│   │   └── server.ts         # Inicialização do servidor backend (porta 3001)
│   └── package.json
├── frontend/                 # Aplicação React com UI animada (porta 5173)
├── iniciar.bat               # Script Windows para inicialização em lote
├── parar.bat                 # Script Windows para finalização dos processos
└── README.md                 # Documentação do projeto
```

---

## ⚙️ Como Configurar e Executar

### Pré-requisitos
- [Node.js 18+](https://nodejs.org/) instalado
- Contas e chaves de API:
  - **Tuya IoT Platform:** [iot.tuya.com](https://iot.tuya.com) (ou Tuya Cloud Developer) com projeto Cloud vinculado ao seu app Smart Life.
  - **Groq Console (Gratuito):** [console.groq.com](https://console.groq.com)
  - **ElevenLabs:** [elevenlabs.io](https://elevenlabs.io)

---

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/igorpaiva26/smart-voice-iot-assistant.git
   cd smart-voice-iot-assistant
   ```

2. **Configure o arquivo de ambiente (`.env`):**
   No diretório `backend/`, crie seu `.env` a partir do exemplo:
   ```bash
   cd backend
   cp .env.example .env
   ```
   Preencha os valores:
   ```env
   PORT=3001
   CORS_ORIGIN=http://localhost:5173

   # Groq (LLM + Whisper)
   GROQ_API_KEY=sua_chave_groq_aqui
   GROQ_MODEL=qwen/qwen3.8-27b
   GROQ_STT_MODEL=whisper-large-v3-turbo

   # ElevenLabs
   ELEVENLABS_API_KEY=sua_chave_elevenlabs_aqui
   ELEVENLABS_VOICE_ID=cgSgspJ2msm6clMCkdW9

   # Tuya Cloud IoT
   TUYA_API_KEY=sua_chave_tuya_aqui
   TUYA_BASE_URL=https://openapi.tuyaus.com
   TUYA_DEFAULT_DEVICE_ID=seu_device_id_padrao
   ```

3. **Instale as dependências:**
   ```bash
   # Backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

4. **Inicie o Assistente (Windows):**
   Volte para a raiz e execute:
   ```cmd
   iniciar.bat
   ```
   O navegador abrirá automaticamente em **[http://localhost:5173](http://localhost:5173)** pronto para ouvir sua voz!

---

## 🗣️ Exemplos de Comandos em Linguagem Natural

O assistente compreende variações naturais sem exigir frases robóticas fixas:
- *"Liga a tomada do ar condicionado"*
- *"Desliga o ventilador do quarto"*
- *"Apaga a luz da sala de estar"*
- *"Como está o status dos aparelhos agora?"*

---

## 👤 Autor

Desenvolvido por **[Igor Paiva](https://github.com/igorpaiva26)**.  
*Projeto de automação residencial unindo Inteligência Artificial de ponta (Groq, Whisper, ElevenLabs) com Internet das Coisas (IoT / Tuya Cloud).*

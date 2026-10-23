# 🎙️ Aline - Smart Life Voice Assistant

Assistente de voz inteligente, minimalista e focada em casa inteligente (estilo Amazon Alexa), integrada diretamente ao ecossistema **Smart Life / Tuya** para controle de dispositivos físicos em tempo real por comando de voz.

---

## 🌟 Principais Recursos

- 🔮 **Interface Minimalista:** Esfera animada com feedback visual em tempo real para fala, escuta e processamento.
- ⚡ **LLM & STT Ultrarrápido:** Alimentado por **Groq** (`qwen/qwen3.8-27b` para raciocínio e `whisper-large-v3-turbo` para transcrição).
- 🔊 **Voz Humana Natural:** Síntese de voz com entonação brasileira via **ElevenLabs** (Voz Jessica).
- 🔌 **Controle Real de Casa Inteligente:** Integração direta com a API da **Tuya / Smart Life** para ligar, desligar e ajustar equipamentos físicos (ar condicionado, tomadas, lâmpadas, etc.).
- 🚀 **Inicialização em 1 Clique:** Scripts automatizados (`iniciar.bat` e `parar.bat`) para Windows.

---

## 🛠️ Arquitetura

```
[ Usuário (Voz) ]
       │
       ▼
[ Frontend (React + Vite) ]  ──►  Medidor de Volume RMS + Web Speech / Whisper
       │
       ▼
[ Backend (Express + TS) ]   ──►  Groq LLM (Classificação de Intenção)
       │                     ──►  ElevenLabs (TTS)
       ▼
[ Tuya OpenAPI ]
       │
       ▼
[ Dispositivos Físicos Smart Life ] (Tomadas, Luzes, Ar Condicionado)
```

---

## 🚀 Como Executar

### 1. Pré-requisitos
- Node.js 18+ instalado
- Chaves de API:
  - Groq (gratuita): [console.groq.com](https://console.groq.com)
  - ElevenLabs: [elevenlabs.io](https://elevenlabs.io)
  - Tuya AI / Smart Life: [tuya.ai](https://tuya.ai)

### 2. Configuração
Copie o arquivo de exemplo no backend:
```bash
cd backend
cp .env.example .env
```
Preencha suas chaves no `.env`.

### 3. Iniciar (Windows)
Basta dar dois cliques no arquivo:
```bash
iniciar.bat
```
Para parar os serviços:
```bash
parar.bat
```

---

## 🗣️ Exemplos de Comandos Suportados

- *"Aline, liga o ar condicionado"*
- *"Aline, desliga a tomada do ar"*
- *"Aline, desliga a luz do quarto"*
- *"Aline, liga o ventilador"*
- *"Coloca o ar condicionado em 20 graus"*

---

## 📄 Licença
Distribuído sob licença MIT.

# Guia do Assistente de Voz

## Visão Geral

O assistente de voz do IconsAI permite interações naturais em português brasileiro através de comandos de voz. Este documento detalha o funcionamento e configuração do sistema de voz.

---

## Componentes do Sistema de Voz

### 1. VoicePlayer (`src/core/services/VoiceService/VoicePlayer.ts`)

Gerenciador de reprodução de áudio com suporte a:

- **Safari/iOS warmup** - Desbloqueio de áudio em dispositivos Apple
- **Análise de frequência** - Dados para visualização do espectro
- **Karaoke TTS** - Word timestamps para sincronização

```typescript
// Métodos principais
warmup(): void                    // Desbloqueia áudio (Safari)
play(audioUrl: string): Promise   // Reproduz áudio
fetchKaraokeTTS(text, chatType, voice): Promise<KaraokeTTSResult>
getAudioElement(): HTMLAudioElement | null
getFrequencyData(): number[]
stop(): void
```

### 2. VoiceRecorder (`src/core/services/VoiceService/VoiceRecorder.ts`)

Gerenciador de gravação de áudio:

```typescript
// Métodos principais
start(): Promise<void>            // Inicia gravação
stop(): Promise<RecordingResult>  // Para e retorna base64
cancel(): void                    // Cancela gravação
getFrequencyData(): number[]      // Dados para visualização
```

### 3. useVoiceAssistant (`src/hooks/useVoiceAssistant.ts`)

Hook principal que orquestra todo o fluxo:

```typescript
const {
  buttonState,      // 'idle' | 'greeting' | 'ready' | 'recording' | 'processing' | 'speaking'
  messages,         // Array de ChatMessage
  frequencyData,    // number[] para visualização
  frequencySource,  // 'user' | 'robot' | 'none'
  error,            // Mensagem de erro
  isInitialized,    // Boolean
  initialize,       // () => void
  handleButtonClick,// () => void
  forceReset,       // () => void
  getAudioElement,  // () => HTMLAudioElement | null
} = useVoiceAssistant({ welcomeMessage, voice });
```

### 4. useKaraokeSync (`src/hooks/useKaraokeSync.ts`)

Hook para sincronização karaokê:

```typescript
const {
  currentWordIndex, // Índice da palavra atual
  currentTime,      // Tempo atual em segundos
  isPlaying,        // Boolean
  progress,         // 0-1
} = useKaraokeSync({
  words,            // WordTiming[]
  getAudioElement,  // Getter do elemento de áudio
  enabled,          // Boolean
  simulatePlayback, // Boolean - modo sem áudio real
});
```

---

## Tipos de Dados

### WordTiming

```typescript
interface WordTiming {
  word: string;   // A palavra
  start: number;  // Tempo inicial em segundos
  end: number;    // Tempo final em segundos
}
```

### ChatMessage

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
  words?: WordTiming[];
  duration?: number;
}
```

### VoiceButtonState

```typescript
type VoiceButtonState =
  | 'idle'       // Aguardando início
  | 'greeting'   // Reproduzindo boas-vindas
  | 'ready'      // Pronto para gravar
  | 'recording'  // Gravando
  | 'processing' // Processando
  | 'speaking';  // Reproduzindo resposta
```

---

## Configuração de Voz

### Vozes Disponíveis (OpenAI TTS)

| Voz | Características |
|-----|-----------------|
| `nova` | Feminina, neutra, versátil |
| `shimmer` | Feminina, expressiva |
| `echo` | Masculina, profunda |
| `onyx` | Masculina, autoritária |
| `fable` | Neutra, narrativa |
| `alloy` | Neutra, robótica |

### Humanização de Voz

Parâmetros configuráveis no dashboard:

```typescript
interface VoiceHumanization {
  warmth: number;        // 0-100: Tom emocional
  enthusiasm: number;    // 0-100: Energia
  pace: number;          // 0-100: Ritmo
  expressiveness: number;// 0-100: Variação melódica
  formality: number;     // 0-100: Formalidade
  speed: number;         // 0.5-2.0: Velocidade
}
```

---

## Fluxo de Interação

### 1. Inicialização

```
App monta → useEffect chama initialize()
  │
  └─► VoicePlayer criado
  └─► VoiceRecorder criado
  └─► Callbacks configurados
  └─► isInitialized = true
```

### 2. Boas-vindas (Greeting)

```
Usuário clica botão (idle)
  │
  └─► warmup() - desbloqueia áudio
  └─► transitionTo('greeting')
  └─► fetchKaraokeTTS(welcomeMessage)
  │     └─► Retorna: { audioUrl, words, duration }
  └─► addMessage('assistant', text, { words })
  └─► play(audioUrl)
  │     └─► frequencyData atualiza (60fps)
  │     └─► KaraokeText sincroniza
  └─► onEnded → transitionTo('ready')
```

### 3. Gravação

```
Usuário clica botão (ready)
  │
  └─► transitionTo('recording')
  └─► recorder.start()
  │     └─► frequencyData do microfone
  │
Usuário clica botão (recording)
  │
  └─► recorder.stop()
  └─► transitionTo('processing')
```

### 4. Processamento

```
processing
  │
  └─► voice-to-text (Whisper)
  │     └─► { text, words, duration }
  └─► addMessage('user', text, { words })
  │     └─► KaraokeText simula sync
  │
  └─► chat-router (LLM)
  │     └─► resposta texto
  │
  └─► transitionTo('speaking')
  └─► fetchKaraokeTTS(resposta)
  └─► addMessage('assistant', resposta, { words })
  └─► play(audioUrl)
  │     └─► KaraokeText sincroniza
  └─► onEnded → transitionTo('ready')
```

---

## Compatibilidade Safari/iOS

### Problema

Safari e iOS requerem interação do usuário para reproduzir áudio. O AudioContext começa em estado "suspended".

### Solução: Warmup

```typescript
warmup(): void {
  // 1. Criar/resumir AudioContext
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  // 2. Tocar oscilador silencioso
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  gain.gain.value = 0.001; // Praticamente inaudível
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.01);
}
```

### Atributos HTML necessários

```typescript
audioElement.setAttribute('playsinline', 'true');
audioElement.setAttribute('webkit-playsinline', 'true');
```

---

## Visualização de Frequência

### VoiceAnalyzer Component

Exibe o espectro de áudio em tempo real:

```typescript
<VoiceAnalyzer
  frequencyData={frequencyData}  // number[]
  isActive={frequencySource !== 'none'}
  source={frequencySource}       // 'user' | 'robot'
/>
```

### Obtenção dos dados

```typescript
// Web Audio API
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;
const dataArray = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteFrequencyData(dataArray);
// dataArray contém valores 0-255 para cada banda de frequência
```

---

## Troubleshooting

### Áudio não toca no Safari

1. Verificar se `warmup()` foi chamado no contexto de gesto do usuário
2. Verificar atributos `playsinline`
3. Verificar se AudioContext não está em estado "closed"

### Karaokê não sincroniza

1. Verificar se `words` está presente na mensagem
2. Verificar se `getAudioElement()` retorna elemento válido
3. Verificar logs: `[KaraokeSync] Starting audio sync loop`

### Transcrição vazia

1. Verificar se microfone está permitido
2. Verificar formato de áudio (webm/mp4)
3. Verificar tamanho do áudio (não muito curto)

### Erro de CORS

Edge functions devem retornar headers corretos:
```typescript
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

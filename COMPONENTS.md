# 📚 Catálogo de Componentes Reutilizáveis - KnowYOU

> Documentação de todos os componentes UI reutilizáveis do sistema KnowYOU PWA

---

## 🎵 Componentes de Áudio e Voz

### 1. **PlayButton**
**Localização:** `/src/components/pwa/voice/PlayButton.tsx`

**Descrição:** Botão de play/pause para controlar reprodução de áudio

**Props:**
```typescript
interface PlayButtonProps {
  isPlaying: boolean;      // Se o áudio está tocando
  isLoading?: boolean;     // Se está carregando
  onClick: () => void;     // Callback ao clicar
  size?: number;           // Tamanho do botão (padrão: 64px)
  disabled?: boolean;      // Desabilitar botão
}
```

**Exemplo de Uso:**
```tsx
import { PlayButton } from "@/components/pwa/voice/PlayButton";

<PlayButton
  isPlaying={isPlaying}
  isLoading={isLoading}
  onClick={handlePlayPause}
  size={80}
/>
```

**Manutenção:**
- Animações definidas em Framer Motion
- Ícones de Lucide React (Play/Pause)
- Cores: primárias do tema (Tailwind)

---

### 2. **ToggleMicrophoneButton**
**Localização:** `/src/components/pwa/voice/ToggleMicrophoneButton.tsx`

**Descrição:** Botão para controlar gravação de áudio (microfone)

**Props:**
```typescript
interface ToggleMicrophoneButtonProps {
  isRecording: boolean;         // Se está gravando
  onToggleRecording: () => void; // Callback ao alternar gravação
  disabled?: boolean;            // Desabilitar botão
  size?: number;                 // Tamanho (padrão: 72px)
}
```

**Exemplo de Uso:**
```tsx
import { ToggleMicrophoneButton } from "@/components/pwa/voice/ToggleMicrophoneButton";

<ToggleMicrophoneButton
  isRecording={isRecording}
  onToggleRecording={handleToggleRecording}
  disabled={isProcessing}
/>
```

**Manutenção:**
- Animação de pulso quando gravando (Framer Motion)
- Efeito de brilho ao gravar
- Ícone: Mic/MicOff (Lucide React)

---

### 3. **SpectrumAnalyzer**
**Localização:** `/src/components/pwa/voice/SpectrumAnalyzer.tsx`

**Descrição:** Visualizador de frequência de áudio (barras animadas)

**Props:**
```typescript
interface SpectrumAnalyzerProps {
  frequencyData: number[];  // Array de frequências (0-255)
  barCount?: number;        // Número de barras (padrão: 32)
  height?: number;          // Altura em pixels (padrão: 100)
  color?: string;           // Cor das barras (padrão: primary)
  isActive?: boolean;       // Se está ativo/animando
}
```

**Exemplo de Uso:**
```tsx
import { SpectrumAnalyzer } from "@/components/pwa/voice/SpectrumAnalyzer";

<SpectrumAnalyzer
  frequencyData={frequencyData}
  barCount={40}
  height={120}
  isActive={isPlaying}
/>
```

**Manutenção:**
- Usa Web Audio API para capturar frequências
- Animações em Canvas ou SVG
- Sincroniza com AudioContext do navegador

---

### 4. **VoiceSpectrum**
**Localização:** `/src/components/pwa/VoiceSpectrum.tsx`

**Descrição:** Visualização de voz/áudio com ondas sonoras

**Props:**
```typescript
interface VoiceSpectrumProps {
  isActive: boolean;     // Se está ativo
  message?: string;      // Mensagem a exibir
  color?: string;        // Cor principal
}
```

**Exemplo de Uso:**
```tsx
import { VoiceSpectrum } from "@/components/pwa/VoiceSpectrum";

<VoiceSpectrum
  isActive={true}
  message="Ouvindo..."
/>
```

**Manutenção:**
- Animação de ondas com Framer Motion
- Usado em telas de loading/processamento
- Efeito visual de pulso sincronizado

---

## 📜 Componentes de Histórico

### 5. **HistoryScreen**
**Localização:** `/src/components/pwa/voice/HistoryScreen.tsx`

**Descrição:** Tela de histórico de conversas

**Props:**
```typescript
interface HistoryScreenProps {
  onClose: () => void;           // Callback ao fechar
  moduleId?: ModuleId;           // ID do módulo atual
  deviceId?: string;             // ID do dispositivo
}
```

**Exemplo de Uso:**
```tsx
import { HistoryScreen } from "@/components/pwa/voice/HistoryScreen";

<HistoryScreen
  onClose={() => setShowHistory(false)}
  moduleId="health"
  deviceId={sessionId}
/>
```

**Manutenção:**
- Integrado com `useHistoryStore` (Zustand)
- Lista de conversas com scroll virtual
- Botões de ação: deletar, copiar, compartilhar

---

## 🎨 Componentes de Layout

### 6. **MobileFrame**
**Localização:** `/src/components/pwa/MobileFrame.tsx`

**Descrição:** Container que simula um iPhone para visualização desktop

**Props:**
```typescript
interface MobileFrameProps {
  children: React.ReactNode;  // Conteúdo do PWA
}
```

**Exemplo de Uso:**
```tsx
import { MobileFrame } from "@/components/pwa/MobileFrame";

<MobileFrame>
  <YourPWAContent />
</MobileFrame>
```

**Características:**
- Formato iPhone 14 Pro Max (375x812)
- Dynamic Island animada
- Botões laterais (volume, power)
- Fundo com padrão de grid
- Sombras e bordas realistas

**Manutenção:**
- Dimensões fixas: 375x812px (área útil)
- Animação de entrada (scale + fade)
- Status bar fake no topo

---

### 7. **SplashScreen**
**Localização:** `/src/components/pwa/voice/SplashScreen.tsx`

**Descrição:** Tela inicial animada do PWA

**Props:**
```typescript
interface SplashScreenProps {
  onComplete: () => void;     // Callback ao finalizar
  duration?: number;          // Duração em ms (padrão: 3000)
  embedded?: boolean;         // Se está embedado
}
```

**Exemplo de Uso:**
```tsx
import { SplashScreen } from "@/components/pwa/voice/SplashScreen";

<SplashScreen
  onComplete={() => setAppState("idle")}
  duration={3000}
/>
```

**Manutenção:**
- Logo animado com fade in/out
- Texto de boas-vindas
- Transição suave para app
- Configurável via `useConfigPWA`

---

## 🔐 Componentes de Autenticação

### 8. **PWAAuthGate**
**Localização:** `/src/components/gates/PWAAuthGate.tsx`

**Descrição:** Gate de autenticação para PWA Principal

**Props:**
```typescript
interface PWAAuthGateProps {
  children: ReactNode | ((data: {
    userPhone: string;
    pwaAccess: string[]
  }) => ReactNode);
}
```

**Exemplo de Uso:**
```tsx
import { PWAAuthGate } from "@/components/gates/PWAAuthGate";

<PWAAuthGate>
  {({ userPhone, pwaAccess }) => (
    <YourApp phone={userPhone} />
  )}
</PWAAuthGate>
```

**Fluxo:**
1. Verifica modo demo → bypass
2. Verifica phone no localStorage
3. Envia código via SMS/WhatsApp
4. Valida código
5. Libera acesso

---

### 9. **PWACityAuthGate**
**Localização:** `/src/components/gates/PWACityAuthGate.tsx`

**Descrição:** Gate de autenticação para PWA City

**Similar ao PWAAuthGate, mas:**
- Sistema independente
- Tabela `pwacity_*` no banco
- Sem vínculo com PWA Principal

---

### 10. **PWAHealthAuthGate**
**Localização:** `/src/components/gates/PWAHealthAuthGate.tsx`

**Descrição:** Gate de autenticação para PWA Health

**Similar aos anteriores:**
- Sistema independente
- Tabela `pwahealth_*` no banco
- Focado em triagem médica

---

## 🖥️ Componentes de Device Detection

### 11. **DeviceGate**
**Localização:** `/src/components/gates/DeviceGate.tsx`

**Descrição:** Gate que controla acesso por tipo de dispositivo

**Props:**
```typescript
interface DeviceGateProps {
  children: ReactNode;
  allowMobile?: boolean;      // Permitir mobile (padrão: true)
  allowDesktop?: boolean;     // Permitir desktop (padrão: true)
  allowTablet?: boolean;      // Permitir tablet (padrão: true)
  mobileShowChat?: boolean;   // Redirecionar mobile para chat
}
```

**Exemplo de Uso:**
```tsx
import { DeviceGate } from "@/components/gates/DeviceGate";

<DeviceGate allowDesktop={false}>
  <MobileOnlyContent />
</DeviceGate>
```

**Manutenção:**
- Integrado com toggle `allow_desktop_access`
- Bypass em modo demo
- Detecta iOS automaticamente

---

## 🎭 Componentes de UI Geral

### 12. **Badge (Shadcn)**
**Localização:** `/src/components/ui/badge.tsx`

**Descrição:** Badge/etiqueta reutilizável

**Variantes:**
- `default` - Azul primário
- `secondary` - Cinza
- `destructive` - Vermelho
- `outline` - Transparente com borda

**Exemplo de Uso:**
```tsx
import { Badge } from "@/components/ui/badge";

<Badge variant="default">Novo</Badge>
<Badge variant="outline">Demo Mode</Badge>
```

---

### 13. **Button (Shadcn)**
**Localização:** `/src/components/ui/button.tsx`

**Variantes:**
- `default` - Sólido primário
- `destructive` - Vermelho
- `outline` - Transparente com borda
- `secondary` - Cinza
- `ghost` - Sem fundo
- `link` - Estilo de link

**Tamanhos:**
- `default` - Médio
- `sm` - Pequeno
- `lg` - Grande
- `icon` - Quadrado (para ícones)

---

### 14. **Card (Shadcn)**
**Localização:** `/src/components/ui/card.tsx`

**Componentes:**
- `Card` - Container principal
- `CardHeader` - Cabeçalho
- `CardTitle` - Título
- `CardDescription` - Descrição
- `CardContent` - Conteúdo
- `CardFooter` - Rodapé

**Exemplo de Uso:**
```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>
    Conteúdo aqui
  </CardContent>
</Card>
```

---

## 🎤 Hooks Customizados

### 15. **useTextToSpeech**
**Localização:** `/src/hooks/useTextToSpeech.ts`

**Descrição:** Hook para converter texto em fala

**Retorno:**
```typescript
{
  speak: (text: string, module?: ModuleId, options?: SpeakOptions) => Promise<void>;
  stop: () => void;
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;  // 0-100
}
```

**Exemplo de Uso:**
```tsx
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

const { speak, stop, isPlaying } = useTextToSpeech();

// Falar texto
await speak("Olá, como posso ajudar?", "health");

// Parar
stop();
```

---

### 16. **useAudioManager**
**Localização:** `/src/stores/audioManagerStore.ts`

**Descrição:** Store Zustand para gerenciar áudio global

**Estado:**
```typescript
{
  isPlaying: boolean;
  currentAudioUrl: string | null;
  play: (url: string) => void;
  pause: () => void;
  stopAllAndCleanup: () => void;
  getFrequencyData: () => number[];
}
```

---

### 17. **useHistoryStore**
**Localização:** `/src/stores/historyStore.ts`

**Descrição:** Store Zustand para histórico de conversas

**Estado:**
```typescript
{
  messages: Record<ModuleId, Message[]>;
  addMessage: (moduleId: ModuleId, message: Message) => void;
  clearHistory: (moduleId: ModuleId) => void;
  initialize: (phone: string) => void;
}
```

---

### 18. **useDemoMode**
**Localização:** `/src/hooks/useDemoMode.ts`

**Descrição:** Hook para detectar modo demonstração

**Retorno:**
```typescript
{
  isDemoMode: boolean;
  demoType: "clean" | "seeded" | null;
}
```

**Exemplo de Uso:**
```tsx
import { useDemoMode } from "@/hooks/useDemoMode";

const { isDemoMode, demoType } = useDemoMode();

if (isDemoMode) {
  // Lógica de demo
}
```

---

### 19. **useDeviceDetection**
**Localização:** `/src/hooks/useDeviceDetection.ts`

**Descrição:** Hook para detectar tipo de dispositivo

**Retorno:**
```typescript
{
  isMobile: boolean;
  isDesktop: boolean;
  isTablet: boolean;
  isIOS: boolean;
  isAndroid: boolean;
}
```

---

### 20. **useConfigPWA**
**Localização:** `/src/hooks/useConfigPWA.ts`

**Descrição:** Hook para gerenciar configurações do PWA

**Retorno:**
```typescript
{
  config: PWAConfig;
  isLoading: boolean;
  isSaving: boolean;
  updateConfig: (key: string, value: any) => void;
  saveConfig: () => Promise<void>;
  resetToDefaults: () => void;
}
```

**Configurações disponíveis:**
- `welcomeText` - Texto de boas-vindas
- `ttsVoice` - Voz TTS selecionada
- `voiceSpeed` - Velocidade da voz
- `voiceStability` - Estabilidade
- `voiceSimilarity` - Fidelidade
- `voiceStyle` - Exagero de estilo
- `voiceSpeakerBoost` - Amplificação
- `micTimeoutSeconds` - Timeout do microfone
- `enableCountdown` - Mostrar contagem regressiva
- `splashDurationMs` - Duração do splash

---

## 📦 Stores Zustand

### 21. **pwaVoiceStore**
**Localização:** `/src/stores/pwaVoiceStore.ts`

**Descrição:** Estado global do PWA de voz

**Estado:**
```typescript
{
  appState: "splash" | "idle" | "welcome" | "listening";
  activeModule: ModuleId | null;
  playerState: PlayerState;
  isAuthenticated: boolean;
  userPhone: string | null;
  setAppState: (state) => void;
  setActiveModule: (module) => void;
  setAuthenticated: (status, phone) => void;
}
```

---

### 22. **demoStore**
**Localização:** `/src/stores/demoStore.ts`

**Descrição:** Estado do modo demonstração

**Estado:**
```typescript
{
  isDemoMode: boolean;
  demoType: "clean" | "seeded" | null;
  demoUser: { name, phone, sessionId };
  seededConversations: {
    pwa: Conversation[];
    pwacity: Message[];
    pwahealth: Message[];
  };
  initializeDemo: (type) => void;
  clearDemo: () => void;
}
```

---

## 🎬 Componentes de Módulos

### 23. **HomeContainer**
**Localização:** `/src/components/pwa/containers/HomeContainer.tsx`

**Descrição:** Tela inicial com seleção de módulos

---

### 24. **HealthModuleContainer**
**Localização:** `/src/components/pwa/containers/HealthModuleContainer.tsx`

**Descrição:** Módulo de saúde/triagem médica

---

### 25. **IdeasModuleContainer**
**Localização:** `/src/components/pwa/containers/IdeasModuleContainer.tsx`

**Descrição:** Módulo de ideias/brainstorming

---

### 26. **WorldModuleContainer**
**Localização:** `/src/components/pwa/containers/WorldModuleContainer.tsx`

**Descrição:** Módulo de notícias/mundo

---

### 27. **HelpModuleContainer**
**Localização:** `/src/components/pwa/containers/HelpModuleContainer.tsx`

**Descrição:** Módulo de ajuda geral

---

## 🔧 Como Fazer Manutenção

### Alterando Cores
```typescript
// Editar: tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: { ... },      // Cor principal
        secondary: { ... },    // Cor secundária
        // ...
      }
    }
  }
}
```

### Alterando Animações
```tsx
// Usar Framer Motion
import { motion } from "framer-motion";

<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>
  Conteúdo
</motion.div>
```

### Alterando Ícones
```tsx
// Usar Lucide React
import { Play, Mic, Heart } from "lucide-react";

<Play className="w-6 h-6" />
```

### Criando Novo Componente Reutilizável

1. **Criar arquivo:**
```bash
src/components/shared/MyComponent.tsx
```

2. **Template:**
```tsx
import React from "react";

interface MyComponentProps {
  // Props aqui
}

export const MyComponent: React.FC<MyComponentProps> = ({ ...props }) => {
  return (
    <div>
      {/* Componente aqui */}
    </div>
  );
};
```

3. **Exportar:**
```tsx
// src/components/shared/index.ts
export { MyComponent } from "./MyComponent";
```

4. **Usar:**
```tsx
import { MyComponent } from "@/components/shared";

<MyComponent />
```

---

## 📊 Resumo de Localização

| Componente | Localização | Tipo |
|-----------|-------------|------|
| PlayButton | `/src/components/pwa/voice/` | UI |
| ToggleMicrophoneButton | `/src/components/pwa/voice/` | UI |
| SpectrumAnalyzer | `/src/components/pwa/voice/` | UI |
| VoiceSpectrum | `/src/components/pwa/` | UI |
| HistoryScreen | `/src/components/pwa/voice/` | Screen |
| MobileFrame | `/src/components/pwa/` | Layout |
| SplashScreen | `/src/components/pwa/voice/` | Screen |
| PWAAuthGate | `/src/components/gates/` | Logic |
| DeviceGate | `/src/components/gates/` | Logic |
| useTextToSpeech | `/src/hooks/` | Hook |
| useAudioManager | `/src/stores/` | Store |
| useHistoryStore | `/src/stores/` | Store |
| useDemoMode | `/src/hooks/` | Hook |
| useDeviceDetection | `/src/hooks/` | Hook |
| useConfigPWA | `/src/hooks/` | Hook |

---

## 🚀 Próximos Passos

Para uma documentação interativa, recomendo instalar **Storybook**:

```bash
npx storybook@latest init
```

Benefícios:
- ✅ Visualizar componentes isoladamente
- ✅ Testar diferentes props/estados
- ✅ Documentação automática
- ✅ Catálogo visual navegável
- ✅ Testes de acessibilidade

---

**Versão:** 1.0.0
**Data:** 2026-01-17
**Autor:** Claude Code

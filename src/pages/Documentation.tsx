import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Download, Loader2, Menu, Sun, Moon, Database,
  Server, Code, ArrowLeft, Maximize2, Table as TableIcon, GitBranch, Lock,
  Search, FileCode, Globe, History, Shield, Palette, Play, Square,
  Upload, Send, Mic, ImagePlus, RefreshCw, Trash2, Edit2, Save,
  Check, CheckCircle2, XCircle, Clock, MessageCircle, MessageSquare,
  Mail, Youtube, Music, Image, BarChart3, Brain, Languages,
  LogOut, Tags, ArrowRight, ArrowUp, ChevronDown, ChevronLeft,
  ChevronRight, X, Home, Baby, Users, GraduationCap, Rocket,
  Bot, Sparkles, Lightbulb, Crown, Cat, Snowflake, Skull
} from 'lucide-react';
import { MermaidDiagram } from '@/components/MermaidDiagram';
import { MermaidZoomModal } from '@/components/MermaidZoomModal';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

// Sections data structure
const sections = [
  { id: 'menu-principal', title: '🏠 Menu Principal', icon: FileText },
  { id: 'database', title: '🗄️ Database', icon: Database },
  { id: 'backend', title: '⚡ Backend', icon: Server },
  { id: 'frontend', title: '🖥️ Frontend', icon: Code },
  { id: 'ui-reference', title: '🎨 Referência UI', icon: Palette },
  { id: 'changelog', title: '📋 Changelog', icon: History },
];

// Icons reference data
const ICONS_DATA = [
  // Navegação
  { name: 'ArrowLeft', component: ArrowLeft, description: 'Voltar à página anterior', category: 'Navegação' },
  { name: 'ArrowRight', component: ArrowRight, description: 'Avançar, continuar, próximo', category: 'Navegação' },
  { name: 'ArrowUp', component: ArrowUp, description: 'Voltar ao topo da página', category: 'Navegação' },
  { name: 'ChevronDown', component: ChevronDown, description: 'Expandir conteúdo colapsável', category: 'Navegação' },
  { name: 'ChevronLeft', component: ChevronLeft, description: 'Navegação anterior em carrossel', category: 'Navegação' },
  { name: 'ChevronRight', component: ChevronRight, description: 'Navegação próxima em carrossel', category: 'Navegação' },
  { name: 'Menu', component: Menu, description: 'Abrir menu mobile hamburger', category: 'Navegação' },
  { name: 'X', component: X, description: 'Fechar modal/drawer/painel', category: 'Navegação' },
  { name: 'Home', component: Home, description: 'Ir para página inicial', category: 'Navegação' },
  // Ação
  { name: 'Play', component: Play, description: 'Iniciar reprodução de áudio', category: 'Ação' },
  { name: 'Square', component: Square, description: 'Parar reprodução de áudio', category: 'Ação' },
  { name: 'Download', component: Download, description: 'Baixar arquivo/áudio', category: 'Ação' },
  { name: 'Upload', component: Upload, description: 'Enviar arquivo (drag & drop)', category: 'Ação' },
  { name: 'Send', component: Send, description: 'Enviar mensagem no chat', category: 'Ação' },
  { name: 'Mic', component: Mic, description: 'Ativar gravação de voz', category: 'Ação' },
  { name: 'ImagePlus', component: ImagePlus, description: 'Gerar imagem (modo draw)', category: 'Ação' },
  { name: 'Search', component: Search, description: 'Buscar/filtrar conteúdo', category: 'Ação' },
  { name: 'RefreshCw', component: RefreshCw, description: 'Reprocessar documento', category: 'Ação' },
  { name: 'Trash2', component: Trash2, description: 'Excluir item', category: 'Ação' },
  { name: 'Edit2', component: Edit2, description: 'Editar conteúdo', category: 'Ação' },
  { name: 'Save', component: Save, description: 'Salvar alterações', category: 'Ação' },
  // Status
  { name: 'Loader2', component: Loader2, description: 'Indicador de carregamento', category: 'Status' },
  { name: 'Check', component: Check, description: 'Confirmação/seleção', category: 'Status' },
  { name: 'CheckCircle2', component: CheckCircle2, description: 'Documento processado com sucesso', category: 'Status' },
  { name: 'XCircle', component: XCircle, description: 'Erro/falha no processamento', category: 'Status' },
  { name: 'Clock', component: Clock, description: 'Pendente/aguardando', category: 'Status' },
  // Comunicação
  { name: 'MessageCircle', component: MessageCircle, description: 'Botão flutuante de chat', category: 'Comunicação' },
  { name: 'MessageSquare', component: MessageSquare, description: 'Configuração de chat', category: 'Comunicação' },
  { name: 'Mail', component: Mail, description: 'Configuração de email', category: 'Comunicação' },
  // Mídia
  { name: 'Youtube', component: Youtube, description: 'Cache de vídeos YouTube', category: 'Mídia' },
  { name: 'Music', component: Music, description: 'Embed de podcast Spotify', category: 'Mídia' },
  { name: 'Image', component: Image, description: 'Cache de imagens geradas', category: 'Mídia' },
  // Data
  { name: 'BarChart3', component: BarChart3, description: 'Métricas e analytics', category: 'Data' },
  { name: 'Database', component: Database, description: 'Métricas RAG/banco de dados', category: 'Data' },
  { name: 'FileText', component: FileText, description: 'Documento/tooltip', category: 'Data' },
  // Sistema
  { name: 'Brain', component: Brain, description: 'Acesso ao painel admin', category: 'Sistema' },
  { name: 'Languages', component: Languages, description: 'Seletor de idioma', category: 'Sistema' },
  { name: 'Sun', component: Sun, description: 'Tema claro', category: 'Sistema' },
  { name: 'Moon', component: Moon, description: 'Tema escuro', category: 'Sistema' },
  { name: 'Lock', component: Lock, description: 'Autenticação admin', category: 'Sistema' },
  { name: 'LogOut', component: LogOut, description: 'Sair do sistema', category: 'Sistema' },
  { name: 'GitBranch', component: GitBranch, description: 'Controle de versão', category: 'Sistema' },
  { name: 'Tags', component: Tags, description: 'Gerenciamento de tags', category: 'Sistema' },
  // Temático (AI History)
  { name: 'Clock', component: Clock, description: 'Era: O Sonho (Antes 1950)', category: 'Temático' },
  { name: 'Baby', component: Baby, description: 'Era: Nascimento (Anos 50)', category: 'Temático' },
  { name: 'Users', component: Users, description: 'Era: Infância (Anos 60-80)', category: 'Temático' },
  { name: 'GraduationCap', component: GraduationCap, description: 'Era: Fase Adulta (90s-2000s)', category: 'Temático' },
  { name: 'Rocket', component: Rocket, description: 'Era: Revolução Generativa', category: 'Temático' },
  { name: 'Bot', component: Bot, description: 'Marcos de IA (chatbots, Siri)', category: 'Temático' },
  { name: 'Sparkles', component: Sparkles, description: 'Momentos históricos', category: 'Temático' },
  { name: 'Lightbulb', component: Lightbulb, description: 'Insights/descobertas', category: 'Temático' },
  { name: 'Crown', component: Crown, description: 'Vitórias (Deep Blue, AlphaGo)', category: 'Temático' },
  { name: 'Cat', component: Cat, description: 'Deep Learning YouTube', category: 'Temático' },
  { name: 'Palette', component: Palette, description: 'Era ChatGPT/Gemini criativa', category: 'Temático' },
  { name: 'Snowflake', component: Snowflake, description: 'Inverno da IA', category: 'Temático' },
  { name: 'Skull', component: Skull, description: 'Exterminador do Futuro', category: 'Temático' },
];

// Animations reference data
const ANIMATIONS_DATA = [
  { className: 'animate-accordion-down', description: 'Expandir conteúdo collapsible suavemente', category: 'Transição' },
  { className: 'animate-accordion-up', description: 'Colapsar conteúdo suavemente', category: 'Transição' },
  { className: 'animate-fade-in', description: 'Entrada suave com deslocamento Y', category: 'Entrada' },
  { className: 'animate-scale-in', description: 'Escala de entrada (0.95 → 1)', category: 'Entrada' },
  { className: 'animate-slide-in-right', description: 'Deslizar da direita para esquerda', category: 'Entrada' },
  { className: 'animate-float', description: 'Flutuação contínua (6s loop)', category: 'Ênfase' },
  { className: 'animate-pulse-slow', description: 'Pulsação lenta (4s) para destaque', category: 'Ênfase' },
  { className: 'animate-pulse', description: 'Pulsação padrão para indicadores', category: 'Ênfase' },
  { className: 'animate-ping', description: 'Ondas expansivas (botão chat)', category: 'Ênfase' },
  { className: 'animate-spin', description: 'Rotação para loaders', category: 'Status' },
  { className: 'suggestions-slider', description: 'Slide lateral de sugestões (10s)', category: 'Transição' },
  { className: 'language-transition', description: 'Transição de idioma (fade + Y)', category: 'Transição' },
  { className: 'hover:scale-110 transition-transform', description: 'Escala hover em botões', category: 'Interação' },
  { className: 'transition-all duration-300', description: 'Transição suave universal', category: 'Transição' },
];

// Search result interface for full-text search
interface SearchResult {
  id: string;
  section: string;
  sectionTitle: string;
  matchedText: string;
  highlightedText: string;
  elementId?: string;
  type: 'title' | 'content' | 'table' | 'code';
}

// Comprehensive documentation content for full-text search
const documentationContent = {
  database: {
    title: 'Database',
    sections: [
      {
        id: 'pgvector-extension',
        title: 'Extensão pgvector',
        content: 'Busca semântica via embeddings VECTOR(1536) utilizando cosine distance. Integração com OpenAI text-embedding-3-small para geração de embeddings vetoriais. Permite queries de similaridade semântica em documentos processados pelo sistema RAG.'
      },
      {
        id: 'documents-table',
        title: 'Tabela documents',
        content: 'Armazena PDFs processados pelo sistema RAG. Campos principais: id UUID, filename texto nome arquivo, target_chat enum health study general, original_text texto completo extraído, ai_summary resumo gerado por IA, implementation_status enum ready needs_review incomplete, status enum pending processing completed failed, total_chunks número de fragmentos, total_words contagem palavras, readability_score pontuação legibilidade, is_readable boolean validação leitura, error_message texto erros processamento, created_at timestamp criação, updated_at timestamp atualização'
      },
      {
        id: 'document-chunks-table',
        title: 'Tabela document_chunks',
        content: 'Fragmentos vetorizados de documentos. Campos: id UUID, document_id referência documents, chunk_index número sequencial fragmento, content texto fragmento 1500 palavras, word_count contagem palavras, embedding VECTOR(1536) vetor OpenAI, metadata JSONB informações adicionais, created_at timestamp. Indexado por embedding usando HNSW para busca rápida. Utilizado pela função search_documents para recuperação RAG via pgvector cosine distance.'
      },
      {
        id: 'document-tags-table',
        title: 'Tabela document_tags',
        content: 'Sistema hierárquico de categorização. Campos: id UUID, document_id referência, tag_name texto categoria, tag_type enum parent child, parent_tag_id referência hierarquia, confidence NUMERIC decimal 0-1 confiança IA, source enum AI admin manual automated, created_at timestamp. Tags parent são categorias amplas 3-5 por documento, tags child são tópicos específicos 5-10 por parent. Sugestões dinâmicas chat baseadas nestas tags.'
      },
      {
        id: 'conversation-history-table',
        title: 'Tabela conversation_history',
        content: 'Histórico completo conversas chat. Campos: id UUID, session_id identificador sessão, title texto auto-gerado, messages JSONB array objetos mensagem, chat_type enum study health diferenciação assistentes, sentiment_score NUMERIC análise sentimento, sentiment_label enum positive negative neutral, created_at timestamp, updated_at timestamp. RLS permite CRUD completo usuários próprias conversas. Indexado por session_id created_at para queries otimizadas.'
      },
      {
        id: 'chat-analytics-table',
        title: 'Tabela chat_analytics',
        content: 'Métricas interação usuário. Campos: id UUID, session_id string, user_name texto opcional, message_count integer contador mensagens, audio_plays integer reproduções áudio, topics array tópicos discutidos, started_at timestamp início, last_interaction timestamp última ação. Dashboard admin visualiza métricas tempo real. RLS protege contra acesso público dados sensíveis.'
      },
      {
        id: 'admin-settings-table',
        title: 'Tabela admin_settings',
        content: 'Configurações sistema. Campos: id UUID, chat_audio_enabled boolean ativa áudio, auto_play_audio boolean reprodução automática, alert_enabled boolean alertas sentimento, alert_threshold NUMERIC limite ativação, alert_email texto destino notificações, gmail_api_configured boolean status integração, gmail_notification_email texto conta Gmail, created_at timestamp, updated_at timestamp. Apenas administradores autenticados acesso via RLS.'
      },
      {
        id: 'rls-policies',
        title: 'Row Level Security Políticas',
        content: 'Todas tabelas críticas protegidas RLS. admin_settings chat_analytics somente admin autenticado. conversation_history CRUD completo usuários próprias conversas. documents document_chunks document_tags leitura pública inserção restrita admin. Políticas verificam auth.uid() role via has_role função. Previne exposição dados sensíveis emails nomes usuários implementação_status documentos.'
      }
    ]
  },
  backend: {
    title: 'Backend',
    sections: [
      {
        id: 'process-bulk-document-function',
        title: 'Edge Function process-bulk-document',
        content: 'POST endpoint verify_jwt false. Recebe array documents_data com full_text pre-extraído frontend pdfjs-dist. Validação mínimo 100 caracteres sanitização Unicode previne surrogate errors. Chunking 750 palavras overlap 50 palavras. Embeddings OpenAI text-embedding-3-small. Auto-categorização LLM google/gemini-2.5-flash classifica HEALTH STUDY GENERAL. Metadata unificada single LLM call gera parent/child tags 150-300 palavras summary implementation_status ready needs_review incomplete. Background processing waitUntil resposta 202 Accepted. Salva documents document_chunks document_tags tables.'
      },
      {
        id: 'chat-function',
        title: 'Edge Function chat',
        content: 'POST streaming SSE verify_jwt false. Chat saúde Hospital Moinhos Vento. Recebe messages array query string session_id. Invoca search-documents com query embeddings retrieval. Context RAG prepended system prompt. Lovable AI Gateway google/gemini-2.5-pro streaming response. TextEncoder SSE format data: json. Sentiment analysis real-time. Salva conversation_history chat_type health. Rate limiting previne abuse. Scope restrito healthcare topics reject non-health queries.'
      },
      {
        id: 'chat-study-function',
        title: 'Edge Function chat-study',
        content: 'POST streaming SSE verify_jwt false. Assistente estudo KnowRISK ACC KnowYOU navegação site. Recebe messages query session_id. RAG retrieval search-documents target_chat study. System prompt empresa-específico framework ACC landing page sections. Lovable AI google/gemini-2.5-flash streaming. Salva conversation_history chat_type study. Scope limitado company content AI KnowRISK. Suggestions dinâmicas document tags rotation 10 segundos.'
      },
      {
        id: 'search-documents-function',
        title: 'Edge Function search-documents',
        content: 'POST verify_jwt false. Busca semântica pgvector cosine distance. Recebe query_text string target_chat_filter optional. Gera embedding OpenAI text-embedding-3-small query. Invoca search_documents PostgreSQL function VECTOR similarity. Retorna top 5 chunks mais similares com content metadata document_id similarity score. Match_threshold 0.7 default. Usado por chat e chat-study RAG context retrieval. Performance otimizada HNSW index embeddings column.'
      },
      {
        id: 'text-to-speech-function',
        title: 'Edge Function text-to-speech',
        content: 'POST verify_jwt false. Texto para áudio ElevenLabs API Fernando Arbache voice ID. Recebe text string validation máximo 5000 caracteres previne abuse. Streaming áudio MP3 response. Rate limiting protege credit exhaustion. Usado tooltip audio chat messages AI History Digital Exclusion audio controls. Web Audio API frontend true streaming 200-500ms latency. Cached audio_url database tooltip_contents section_audio tables persistent URLs Supabase Storage evita blob expiration.'
      },
      {
        id: 'voice-to-text-function',
        title: 'Edge Function voice-to-text',
        content: 'POST verify_jwt false. Transcrição áudio OpenAI Whisper API. Recebe audio base64 ou Blob format. Fallback browser Web Speech API fails. Suporte Português Brasil language. Retorna transcribed_text string. Usado chat voice messages microphone button immediate transcription auto-populate input field seamless voice-to-text experience. Rate limiting previne abuse API quotas.'
      },
      {
        id: 'generate-image-function',
        title: 'Edge Function generate-image',
        content: 'POST verify_jwt false. Geração imagem Lovable AI google/gemini-3-pro-image-preview. Recebe prompt validation health keywords only saúde médico hospital paciente tratamento diagnóstico anatomia coração cérebro medicina cirurgia enfermagem farmácia medicamento doença terapia exame consulta clínica bem-estar nutrição fisioterapia saúde mental. Rejeita non-health prompts 400 error. Base64 image response. Usado chat draw mode button healthcare images only. Caching generated_images table section-specific keys reduce API credit consumption 402 fallback SVG placeholders.'
      },
      {
        id: 'generate-history-image-function',
        title: 'Edge Function generate-history-image',
        content: 'POST verify_jwt false. Imagens AI History modal eras. Recebe era_id prompt. Lovable AI google/gemini-3-pro-image-preview contextual era-specific imagery HAL 9000 red eye Kubrick Deep Blue chess Adulthood ChatGPT interface Generative. Caching database history-{eraId} format. Upsert unique index section_id prevents duplicates. Base64 response. Eliminates regeneration repeat visits improved performance quota efficiency.'
      },
      {
        id: 'send-email-function',
        title: 'Edge Function send-email',
        content: 'POST verify_jwt false. Email notifications Resend API. Domain verification knowrisk.io required production suporte@knowrisk.io sender. Recebe to subject html text. Professional enterprise capability replaces Gmail API. Rate limiting spam prevention. Usado sentiment alerts admin notifications critical events. Requires Resend secret key configured.'
      },
      {
        id: 'sentiment-alert-function',
        title: 'Edge Function sentiment-alert',
        content: 'POST verify_jwt false. Monitora sentiment negativo conversas. Threshold configurável admin_settings alert_threshold. Recebe session_id sentiment_score sentiment_label. Compara threshold ativa send-email notification alert_email destination. Critical user satisfaction tracking intervention triggers. Background processing waitUntil. Integrado chat chat-study real-time sentiment analysis.'
      }
    ]
  },
  frontend: {
    title: 'Frontend',
    sections: [
      {
        id: 'documents-tab-component',
        title: 'Componente DocumentsTab',
        content: 'Admin panel gestão RAG documents. Drag-drop upload mandatory target_chat selection study health. Sortable table Name Status Target Chat Date Categories AI-suggested tags badges. Detail panel AI summary hierarchical tag structure text preview metrics pages words chunks. Download original PDF button. Bulk actions reprocess delete change destination. Failed documents error details. Readability indicator readable unreadable AI assessment. Reprocessar button clears data resets status reinvokes process-bulk-document.'
      },
      {
        id: 'chat-knowyou-component',
        title: 'Componente ChatKnowYOU',
        content: 'Chat saúde Hospital Moinhos modal interface. KnowRisk circular logo header. Input layout Textarea Mic Send Draw horizontal. Draw button image generation health-only scope. 3D relief aesthetic baixo relevo input/output alto relevo frame. Audio controls Play Stop Download every message progress bar MM:SS. Voice transcription immediate microphone activation. Suggestions rotation 30 health questions 10 segundos. Image generation mode placeholder switch health topics validation. Session tracking chat_type health conversation_history. RAG integration search-documents context retrieval. Sentiment real-time header indicators.'
      },
      {
        id: 'chat-study-component',
        title: 'Componente ChatStudy',
        content: 'Assistente estudo KnowRISK modal. Logo header unified interface. Scope company-specific KnowRISK KnowYOU ACC landing page navigation. Draw mode AI KnowRISK content only. 3D relief design consistent. Audio controls universal implementation. Voice immediate transcription. Suggestions company topics O que é KnowRisk Como funciona ACC Quais seções site Era Generativa. Session chat_type study. RAG documents KnowRISK ACC retrieval. Educational purpose help users understand offerings locate sections.'
      },
      {
        id: 'ai-history-panel-component',
        title: 'Componente AIHistoryPanel',
        content: 'Modal educacional timeline evolução IA. Desktop draggable panel vertical timeline scrollable. Mobile fullscreen drawer horizontal swipe Embla Carousel. Four eras Symbolic 1950-1970 Turing Dartmouth, AI Winters 1970-1990 Expert Systems, Machine Learning 1990-2015 Deep Blue Watson AlphaGo, Generative 2017-Today Transformer ChatGPT Gemini Claude backend to frontend shift. Audio controls top narration combined eras Play Stop Download progress bar. Synchronized scrolling timestamps map eras audio playback auto-scroll timeline desktop carousel mobile immersive. Era jump buttons direct navigation icon bar desktop tappable dots mobile audio seek timestamp. Contextual images generate-history-image era-specific HAL 9000 chess game ChatGPT interface strengthen text-image relationship. Audio cleanup stopAllAudio multiple mechanisms useEffect event listeners handleClose backdrop prevent background playback after close critical requirement.'
      },
      {
        id: 'floating-chat-button-component',
        title: 'Componente FloatingChatButton',
        content: 'Fixed bottom-right corner pulsating green dot indicator. Gradient styling from-primary via-secondary to-accent glow effects. Animated tooltip Fale com KnowYOU. Opens ChatStudy modal primary gateway interactive chat. Prominent visual affordances user interaction. Position conflicts resolved ScrollToTopButton bottom-left prevents z-index overlap.'
      },
      {
        id: 'digital-exclusion-section-component',
        title: 'Componente DigitalExclusionSection',
        content: 'Collapsible landing page section between MediaCarousel Bom Prompt. H1 5,74 bilhões above trigger de pessoas ainda não conseguem acessar internet Saiba mais desafio. Radix Collapsible animated chevron. Expanded content audio controls top progress bar text global inequality AI literacy gaps Nano Banana image midway narrative paragraphs barriers solutions. Audio cached database section_audio prevent regeneration TTS Fernando Arbache. Smooth animations consistent design aesthetic. Critical education section digital divide healthcare AI access.'
      },
      {
        id: 'media-carousel-component',
        title: 'Componente MediaCarousel',
        content: 'Side-by-side horizontal layout Spotify podcast embed YouTube video carousel. Balanced two-column presentation positioned below KnowYOU chat section. YouTube API optimization hardcoded channelId @KnowRISKio playlistItems endpoint 1 unit vs search 100 units. Database caching youtube_videos_cache 6-hour TTL localStorage quota_exceeded 24-hour. Quota consumption 200 units to 1 unit enables 10000 requests daily vs 50 previous. Reduces API exhaustion improves reliability.'
      },
      {
        id: 'admin-panel-components',
        title: 'Painel Admin Componentes',
        content: 'AdminSidebar navigation tabs Dashboard Analytics Conversations Documents Tooltips Gmail YouTube Cache Image Cache RAG Metrics Chat Config. DashboardTab overview metrics cards. AnalyticsTab charts visualizations. ConversationsTab filtering chat_type study health sentiment analysis. DocumentsTab RAG management upload reprocess. TooltipsTab DraggablePreviewPanel editor content audio generation. GmailTab API integration configuration. YouTubeCacheTab preload management. ImageCacheTab Nano Banana generated images. RagMetricsTab summary cards charts document status chunk count success rate distribution. ChatConfigTab audio settings sentiment alerts thresholds.'
      },
      {
        id: 'hooks-custom',
        title: 'Custom Hooks',
        content: 'useAdminSettings fetch admin_settings table real-time updates. useChatAnalytics track metrics session message audio topics timestamps. useChatKnowYOU health chat logic RAG image generation suggestions sentiment. useChatStudy company chat RAG document retrieval scoped content. useTooltipContent fetch tooltip_contents audio generation caching. useYouTubeAutoPreload automatic video refresh configuration management. use-mobile responsive breakpoint detection. use-toast notification system feedback user actions.'
      },
      {
        id: 'internationalization-system',
        title: 'Sistema i18n react-i18next',
        content: 'Complete translation system three languages Portuguese pt English en French fr. i18n/config.ts initialization localStorage persistence. Translation files pt.json en.json fr.json comprehensive coverage all 8 landing page sections Digital Exclusion AI History 5 eras both chat assistants UI strings placeholders suggestions messages audio controls footer. All components useTranslation hook t functions Index HeroSection TuringLegacy DigitalExclusionSection AIHistoryPanel ChatKnowYOU ChatStudy FloatingChatButton AudioControls. Language selector header Languages icon Lucide PT EN FR flag emojis dropdown checkmark selected. Desktop navigation between links admin mobile menu bottom section. Integrated existing localStorage preference.'
      }
    ]
  },
  'ui-reference': {
    title: 'Referência UI',
    sections: [
      {
        id: 'icons-library',
        title: 'Biblioteca de Ícones',
        content: 'Lucide React icons biblioteca completa 70+ ícones. Categorias Navegação ArrowLeft ArrowRight ArrowUp ChevronDown Menu X Home, Ação Play Square Download Upload Send Mic ImagePlus Search RefreshCw Trash2 Edit2 Save, Status Loader2 Check CheckCircle2 XCircle Clock, Comunicação MessageCircle MessageSquare Mail, Mídia Youtube Music Image, Data BarChart3 Database FileText, Sistema Brain Languages Sun Moon Lock LogOut GitBranch Tags, Temático Baby Users GraduationCap Rocket Bot Sparkles Lightbulb Crown Cat Palette Snowflake Skull. Import direto import { IconName } from lucide-react. Cada ícone aceita props size color strokeWidth className. Renderização inline SVG tree-shakeable apenas ícones usados bundle final. Documentação completa lucide.dev guia uso personalização estilos.'
      },
      {
        id: 'animations-library',
        title: 'Efeitos de Animação',
        content: 'Tailwind CSS animações customizadas. Transição animate-accordion-down accordion-up expand collapse 0.2s ease-out, animate-fade-in entrada opacity translateY 0.3s, animate-slide-in-right deslizar 100% 0 0.3s. Entrada animate-scale-in escala 0.95 1 opacity 0 1. Ênfase animate-float flutuação contínua 6s loop, animate-pulse-slow 4s destaque, animate-pulse padrão 2s, animate-ping ondas expansivas chat button. Status animate-spin rotação loaders. Transição suggestions-slider slide 10s sugestões chat, language-transition fade Y idioma. Interação hover:scale-110 transition-transform botões. Universal transition-all duration-300 smooth. Configuração tailwind.config.ts keyframes animation classes. Usage className="animate-fade-in" ou compose hover-scale utility classes. Suporte cubic-bezier easing customizado delay stagger effects.'
      }
    ]
  }
};

// Full-text search function
const performFullTextSearch = (query: string): SearchResult[] => {
  if (!query.trim() || query.length < 2) return [];
  
  const results: SearchResult[] = [];
  const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 1);
  
  Object.entries(documentationContent).forEach(([sectionKey, section]) => {
    section.sections.forEach((item) => {
      const fullText = `${item.title} ${item.content}`.toLowerCase();
      
      const matches = searchTerms.filter(term => fullText.includes(term));
      
      if (matches.length > 0) {
        // Find first match position
        const firstMatchIndex = fullText.indexOf(matches[0]);
        const contextStart = Math.max(0, firstMatchIndex - 40);
        const contextEnd = Math.min(item.content.length, firstMatchIndex + 100);
        const contextText = item.content.substring(contextStart, contextEnd);
        
        // Highlight matches
        let highlightedText = contextText;
        searchTerms.forEach(term => {
          const regex = new RegExp(`(${term})`, 'gi');
          highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-300 dark:bg-yellow-600 px-1 rounded font-semibold">$1</mark>');
        });
        
        results.push({
          id: item.id,
          section: sectionKey,
          sectionTitle: section.title,
          matchedText: `${contextStart > 0 ? '...' : ''}${contextText}${contextEnd < item.content.length ? '...' : ''}`,
          highlightedText: `${contextStart > 0 ? '...' : ''}${highlightedText}${contextEnd < item.content.length ? '...' : ''}`,
          elementId: item.id,
          type: 'content'
        });
      }
    });
  });
  
  return results.slice(0, 10); // Limit to top 10 results
};

const Documentation = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isExporting, setIsExporting] = useState(false);
  const [activeSection, setActiveSection] = useState('menu-principal');
  const [readProgress, setReadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('docs-theme');
    return saved !== 'light';
  });
  const [zoomModal, setZoomModal] = useState<{
    open: boolean;
    chart: string;
    id: string;
    title: string;
  }>({
    open: false,
    chart: '',
    id: '',
    title: '',
  });

  // Fetch changelog versions
  const { data: versions } = useQuery({
    queryKey: ["documentation-versions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentation_versions")
        .select("*")
        .order("release_date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Persist theme preference
  useEffect(() => {
    localStorage.setItem('docs-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Toggle theme
  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Open zoom modal
  const openZoomModal = (chart: string, id: string, title: string) => {
    setZoomModal({ open: true, chart, id, title });
  };

  // Handle full-text search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    const results = performFullTextSearch(query);
    setSearchResults(results);
  };

  // Smooth scroll to section with highlight
  const scrollToSection = (id: string, highlightElement = false) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', `#${id}`);
      
      if (highlightElement) {
        element.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'transition-all', 'duration-300');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'transition-all', 'duration-300');
        }, 3000);
      }
    }
  };

  // Progress bar
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrolled = window.scrollY;
      setReadProgress((scrolled / documentHeight) * 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // IntersectionObserver for active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // URL hash navigation
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setTimeout(() => scrollToSection(hash), 100);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('docs-search-input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
      
      // Escape to clear search
      if (e.key === 'Escape') {
        setSearchQuery('');
        setSearchResults([]);
      }
      
      // Enter to navigate to first result
      if (e.key === 'Enter' && searchResults.length > 0 && document.activeElement?.id === 'docs-search-input') {
        e.preventDefault();
        const firstResult = searchResults[0];
        scrollToSection(firstResult.section, true);
        if (firstResult.elementId) {
          setTimeout(() => {
            const element = document.getElementById(firstResult.elementId || '');
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'transition-all', 'duration-300');
              setTimeout(() => {
                element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'transition-all', 'duration-300');
              }, 3000);
            }
          }, 500);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchResults]);

  const exportToPDF = async () => {
    setIsExporting(true);
    
    const element = document.getElementById('documentation-content');
    if (!element) {
      setIsExporting(false);
      return;
    }
    
    const container = document.querySelector('.docs-page');
    const wasLight = container?.classList.contains('docs-light');
    
    if (!wasLight) {
      container?.classList.add('docs-light');
      await new Promise(r => setTimeout(r, 100));
    }
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      let heightLeft = imgHeight * ratio;
      let position = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight * ratio;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio);
        heightLeft -= pdfHeight;
      }

      pdf.save('KnowRisk-Documentacao-Tecnica.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      if (!wasLight) {
        container?.classList.remove('docs-light');
      }
      setIsExporting(false);
    }
  };

  const exportToMarkdown = () => {
    const markdown = `# Documentação Técnica KnowRisk\n\n## 🗄️ Database\n\n### Extensões\n- **pgvector**: Busca semântica via embeddings\n\n### Tabelas\n| Tabela | Descrição |\n|--------|-----------|\n| documents | PDFs processados pelo RAG |\n| document_chunks | Chunks vetorizados |\n\n## ⚡ Backend\n\n### Edge Functions\n\n#### process-bulk-document\n- **Método**: POST\n- **JWT**: verify_jwt = false\n\n*Documentação completa gerada em ${new Date().toLocaleDateString()}*`;
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'KnowRisk-Documentacao.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToHTML = () => {
    const element = document.getElementById('documentation-content');
    if (!element) return;
    
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentação Técnica KnowRisk</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { color: #8B5CF6; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #8B5CF6; color: white; }
  </style>
</head>
<body>
  ${element.innerHTML}
</body>
</html>`;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'KnowRisk-Documentacao.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const data = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      database: {
        extensions: [{ name: "pgvector", type: "VECTOR(1536)" }],
        tables: ["documents", "document_chunks", "document_tags"],
      },
      backend: {
        edgeFunctions: ["process-bulk-document", "chat", "chat-study", "search-documents"],
      },
      frontend: {
        components: ["DocumentsTab", "ChatKnowYOU", "AIHistoryPanel"],
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'KnowRisk-Documentacao.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Backend flow diagram
  const backendFlowDiagram = `flowchart TD
    subgraph Frontend["🖥️ Frontend"]
        U[Usuário] --> PDF[Upload PDF]
        U --> Chat[Chat Interface]
    end
    
    subgraph EdgeFunctions["⚡ Edge Functions"]
        PDF --> PBD[process-bulk-document]
        PBD --> VAL[Validação]
        PBD --> CLASS[Auto-Categorização LLM]
        PBD --> CHUNK[Chunking 750w]
        PBD --> EMB[Embeddings OpenAI]
        
        Chat --> CHATFN[chat / chat-study]
        CHATFN --> RAG[search-documents]
        RAG --> DB[(PostgreSQL + pgvector)]
        CHATFN --> AI[Lovable AI Gateway]
    end
    
    subgraph Outputs["📤 Outputs"]
        AI --> Stream[SSE Streaming]
        Stream --> U
    end
    
    style Frontend fill:#8B5CF6,color:#fff
    style EdgeFunctions fill:#10B981,color:#fff
    style Outputs fill:#3B82F6,color:#fff`;

  // Sidebar navigation component
  const SidebarNav = () => (
    <aside className="fixed left-8 top-24 w-64 h-[calc(100vh-12rem)] overflow-y-auto space-y-1 pr-4">
      <div className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Navegação
      </div>
      
      {/* Search Bar */}
      <div className="mb-3 pb-3 border-b border-border">
        <div className="relative">
          <Input
            id="docs-search-input"
            type="text"
            placeholder="Buscar em toda documentação... (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full text-sm pr-8"
          />
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        
        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2 max-h-80 overflow-y-auto border rounded-lg p-2 bg-background/50 backdrop-blur-sm">
            <div className="text-xs text-muted-foreground mb-2 px-1 flex items-center justify-between">
              <span>{searchResults.length} resultado(s) encontrado(s)</span>
              <kbd className="px-2 py-0.5 text-xs bg-muted rounded border">ESC</kbd>
            </div>
            
            {searchResults.map((result, idx) => (
              <button
                key={`${result.id}-${idx}`}
                onClick={() => {
                  scrollToSection(result.section, true);
                  if (result.elementId) {
                    setTimeout(() => {
                      const element = document.getElementById(result.elementId || '');
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        element.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'transition-all', 'duration-300');
                        setTimeout(() => {
                          element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'transition-all', 'duration-300');
                        }, 3000);
                      }
                    }, 500);
                  }
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="w-full text-left p-3 rounded-lg hover:bg-muted/50 border border-border/50 hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">{result.sectionTitle}</Badge>
                  <Search className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p 
                  className="text-xs text-muted-foreground line-clamp-3 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: result.highlightedText }}
                />
              </button>
            ))}
          </div>
        )}
        
        {searchQuery && searchResults.length === 0 && (
          <div className="mt-3 p-3 rounded-lg border border-border/50 text-xs text-muted-foreground text-center">
            Nenhum resultado encontrado para "{searchQuery}"
          </div>
        )}
      </div>

      {/* Admin Link */}
      <div className="mb-3 pb-3 border-b border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/admin')}
          className="w-full gap-2 no-print"
        >
          <Shield className="h-4 w-4" />
          Voltar ao Admin
        </Button>
      </div>
      
      <div className="mb-3 pb-3 border-b border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          className="w-full gap-2 no-print"
        >
          {isDarkMode ? (
            <>
              <Sun className="h-4 w-4" />
              Modo Claro
            </>
          ) : (
            <>
              <Moon className="h-4 w-4" />
              Modo Escuro
            </>
          )}
        </Button>
      </div>
      
      <nav className="space-y-1">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2",
                activeSection === section.id
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{section.title}</span>
            </button>
          );
        })}
      </nav>
      
      {/* Export Dropdown */}
      <div className="mt-6 pt-4 border-t border-border space-y-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              disabled={isExporting}
              size="sm"
              className="w-full gap-2 no-print"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Exportar
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={exportToPDF}>
              <FileText className="mr-2 h-4 w-4" />
              <span>PDF</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToMarkdown}>
              <FileCode className="mr-2 h-4 w-4" />
              <span>Markdown</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToHTML}>
              <Globe className="mr-2 h-4 w-4" />
              <span>HTML</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToJSON}>
              <Code className="mr-2 h-4 w-4" />
              <span>JSON</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );

  // Mobile dropdown navigation
  const MobileNav = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg no-print">
          <Menu className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <DropdownMenuItem
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={activeSection === section.id ? "bg-primary/10" : ""}
            >
              <Icon className="mr-2 h-4 w-4" />
              <span>{section.title}</span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuItem onClick={toggleTheme}>
          {isDarkMode ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
          <span>{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF} disabled={isExporting}>
          {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          <span>{isExporting ? 'Gerando...' : 'Exportar PDF'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Back to index button
  const BackToIndex = () => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => scrollToSection('menu-principal')}
      className="gap-2 mb-6"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar ao Menu Principal
    </Button>
  );

  return (
    <div className={cn("docs-page min-h-screen transition-colors", isDarkMode ? "bg-background text-foreground" : "docs-light bg-white text-gray-900")}>
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-muted z-50 no-print">
        <div 
          className="h-full bg-gradient-to-r from-primary via-secondary to-accent transition-all duration-300"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      {/* Sidebar Navigation (Desktop) */}
      {!isMobile && <SidebarNav />}

      {/* Mobile Navigation */}
      {isMobile && <MobileNav />}

      {/* Main Content */}
      <main className={cn("mx-auto px-6 py-12", isMobile ? "max-w-4xl" : "ml-80 mr-8 max-w-5xl")}>
        <div id="documentation-content" className="space-y-12">
          
          {/* ===== MENU PRINCIPAL ===== */}
          <section id="menu-principal" className="scroll-mt-20">
            <Card className="p-8 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border-2">
              <div className="text-center space-y-6">
                <FileText className="h-20 w-20 mx-auto text-primary" />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Documentação Técnica
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Sistema RAG com Auto-Categorização LLM, Processamento em Lote e Chat Multimodal
                </p>
                <div className="flex flex-wrap justify-center gap-4 pt-6">
                  <Button onClick={() => scrollToSection('database')} size="lg" className="gap-2">
                    <Database className="h-5 w-5" />
                    Database
                  </Button>
                  <Button onClick={() => scrollToSection('backend')} size="lg" variant="secondary" className="gap-2">
                    <Server className="h-5 w-5" />
                    Backend
                  </Button>
                  <Button onClick={() => scrollToSection('frontend')} size="lg" variant="outline" className="gap-2">
                    <Code className="h-5 w-5" />
                    Frontend
                  </Button>
                </div>
              </div>
            </Card>
          </section>

          {/* ===== DATABASE ===== */}
          <section id="database" className="scroll-mt-20 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <Database className="h-8 w-8 text-primary" />
                🗄️ Database
              </h2>
            </div>

            <BackToIndex />

            {/* Extensões */}
            <Card className="p-6">
              <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <GitBranch className="h-6 w-6 text-secondary" />
                Extensões
              </h3>
              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-bold text-lg">pgvector</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                    <li><strong>Propósito:</strong> Busca semântica via embeddings</li>
                    <li><strong>Tipo:</strong> VECTOR(1536)</li>
                    <li><strong>Operador:</strong> <code className="bg-muted px-2 py-1 rounded">&lt;=&gt;</code> (cosine distance)</li>
                    <li><strong>Uso:</strong> Armazena embeddings gerados pela OpenAI text-embedding-3-small</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Tabelas */}
            <Card className="p-6">
              <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Table className="h-6 w-6 text-secondary" />
                Tabelas Principais
              </h3>
              
              {/* documents */}
              <div className="space-y-6">
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-bold text-lg mb-3">documents</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Armazena PDFs processados pelo sistema RAG com metadados enriquecidos por LLM.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Coluna</th>
                          <th className="text-left p-2">Tipo</th>
                          <th className="text-left p-2">Descrição</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr><td className="p-2 font-mono">id</td><td className="p-2">UUID</td><td className="p-2">Identificador único</td></tr>
                        <tr><td className="p-2 font-mono">filename</td><td className="p-2">TEXT</td><td className="p-2">Nome do arquivo PDF</td></tr>
                        <tr><td className="p-2 font-mono">target_chat</td><td className="p-2">TEXT</td><td className="p-2">health/study/general (auto-classificado)</td></tr>
                        <tr><td className="p-2 font-mono">ai_summary</td><td className="p-2">TEXT</td><td className="p-2">Resumo LLM (150-300 palavras)</td></tr>
                        <tr><td className="p-2 font-mono">implementation_status</td><td className="p-2">TEXT</td><td className="p-2">ready/needs_review/incomplete</td></tr>
                        <tr><td className="p-2 font-mono">status</td><td className="p-2">TEXT</td><td className="p-2">pending/processing/completed/failed</td></tr>
                        <tr><td className="p-2 font-mono">total_chunks</td><td className="p-2">INTEGER</td><td className="p-2">Quantidade de chunks criados</td></tr>
                        <tr><td className="p-2 font-mono">is_readable</td><td className="p-2">BOOLEAN</td><td className="p-2">Validação de legibilidade</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 p-3 bg-background rounded border">
                    <p className="text-sm font-semibold mb-2">Foreign Keys:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <code>document_chunks.document_id</code> → <code>documents.id</code></li>
                      <li>• <code>document_tags.document_id</code> → <code>documents.id</code></li>
                    </ul>
                  </div>
                </div>

                {/* document_chunks */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-bold text-lg mb-3">document_chunks</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Chunks vetorizados com embeddings para busca semântica.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Coluna</th>
                          <th className="text-left p-2">Tipo</th>
                          <th className="text-left p-2">Descrição</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr><td className="p-2 font-mono">id</td><td className="p-2">UUID</td><td className="p-2">Identificador único</td></tr>
                        <tr><td className="p-2 font-mono">document_id</td><td className="p-2">UUID</td><td className="p-2">FK para documents</td></tr>
                        <tr><td className="p-2 font-mono">content</td><td className="p-2">TEXT</td><td className="p-2">Texto do chunk (750 palavras)</td></tr>
                        <tr><td className="p-2 font-mono">embedding</td><td className="p-2">VECTOR(1536)</td><td className="p-2">Vetor para busca semântica</td></tr>
                        <tr><td className="p-2 font-mono">chunk_index</td><td className="p-2">INTEGER</td><td className="p-2">Ordem no documento</td></tr>
                        <tr><td className="p-2 font-mono">word_count</td><td className="p-2">INTEGER</td><td className="p-2">Contagem de palavras</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* document_tags */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-bold text-lg mb-3">document_tags</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tags hierárquicas (parent/child) geradas por LLM.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Coluna</th>
                          <th className="text-left p-2">Tipo</th>
                          <th className="text-left p-2">Descrição</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr><td className="p-2 font-mono">id</td><td className="p-2">UUID</td><td className="p-2">Identificador único</td></tr>
                        <tr><td className="p-2 font-mono">document_id</td><td className="p-2">UUID</td><td className="p-2">FK para documents</td></tr>
                        <tr><td className="p-2 font-mono">tag_name</td><td className="p-2">TEXT</td><td className="p-2">Nome da tag</td></tr>
                        <tr><td className="p-2 font-mono">tag_type</td><td className="p-2">TEXT</td><td className="p-2">parent/child</td></tr>
                        <tr><td className="p-2 font-mono">parent_tag_id</td><td className="p-2">UUID</td><td className="p-2">FK para parent tag</td></tr>
                        <tr><td className="p-2 font-mono">confidence</td><td className="p-2">NUMERIC(3,2)</td><td className="p-2">Score 0.0-1.0</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Outras tabelas resumidas */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-bold text-lg mb-3">Outras Tabelas</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• <strong>conversation_history:</strong> Histórico de conversas com chat_type (study/health)</li>
                    <li>• <strong>chat_analytics:</strong> Métricas de uso (message_count, audio_plays, topics)</li>
                    <li>• <strong>admin_settings:</strong> Configurações do painel admin</li>
                    <li>• <strong>tooltip_contents:</strong> Conteúdo tooltips com áudio TTS</li>
                    <li>• <strong>generated_images:</strong> Cache de imagens geradas (Nano Banana)</li>
                    <li>• <strong>user_roles:</strong> RBAC com role 'admin'</li>
                    <li>• <strong>credits_usage:</strong> Log de consumo de créditos API</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* RLS Policies */}
            <Card className="p-6">
              <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Lock className="h-6 w-6 text-secondary" />
                Políticas RLS (Row Level Security)
              </h3>
              <div className="space-y-4">
                <div className="border-l-4 border-destructive pl-4">
                  <h4 className="font-bold">admin_settings</h4>
                  <ul className="list-disc list-inside text-muted-foreground text-sm mt-2">
                    <li>SELECT/UPDATE: Apenas admins autenticados</li>
                    <li>Protege gmail_notification_email de acesso público</li>
                  </ul>
                </div>
                <div className="border-l-4 border-destructive pl-4">
                  <h4 className="font-bold">documents</h4>
                  <ul className="list-disc list-inside text-muted-foreground text-sm mt-2">
                    <li>INSERT/UPDATE: Sistema pode inserir (verify_jwt = false)</li>
                    <li>SELECT/DELETE: Apenas admins</li>
                  </ul>
                </div>
                <div className="border-l-4 border-warning pl-4">
                  <h4 className="font-bold">conversation_history</h4>
                  <ul className="list-disc list-inside text-muted-foreground text-sm mt-2">
                    <li>ALL: Acesso público para INSERT/SELECT/UPDATE/DELETE</li>
                    <li>Permite salvar conversas sem autenticação</li>
                  </ul>
                </div>
              </div>
            </Card>
          </section>

          {/* ===== BACKEND ===== */}
          <section id="backend" className="scroll-mt-20 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <Server className="h-8 w-8 text-primary" />
                ⚡ Backend
              </h2>
            </div>

            <BackToIndex />

            {/* Diagrama de Fluxo Principal */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-semibold">Diagrama de Fluxo Principal</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openZoomModal(backendFlowDiagram, 'backend-flow', 'Fluxo Backend Completo')}
                  className="gap-2"
                >
                  <Maximize2 className="h-4 w-4" />
                  Ampliar
                </Button>
              </div>
              <div className="cursor-pointer" onClick={() => openZoomModal(backendFlowDiagram, 'backend-flow', 'Fluxo Backend Completo')}>
                <MermaidDiagram 
                  chart={backendFlowDiagram} 
                  id="backend-flow-diagram" 
                  theme={isDarkMode ? 'dark' : 'light'} 
                />
              </div>
            </Card>

            {/* Edge Functions */}
            <Card className="p-6">
              <h3 className="text-2xl font-semibold mb-6">Edge Functions (16 funções)</h3>
              
              <div className="space-y-8">
                {/* process-bulk-document */}
                <div className="border rounded-lg p-5 bg-muted/30">
                  <h4 className="text-xl font-bold mb-4 text-primary">process-bulk-document</h4>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Caminho</p>
                      <code className="text-xs bg-background p-2 rounded block mt-1">supabase/functions/process-bulk-document/index.ts</code>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Método / JWT</p>
                      <p className="text-sm mt-1"><code className="bg-background px-2 py-1 rounded">POST</code> <code className="bg-background px-2 py-1 rounded ml-2">verify_jwt = false</code></p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold mb-2">Input JSON:</p>
                      <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`{
  "documents_data": [
    {
      "document_id": "uuid",
      "full_text": "texto extraído do PDF",
      "title": "nome_arquivo.pdf"
    }
  ]
}`}
                      </pre>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Output JSON (Success):</p>
                      <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`{
  "success": true,
  "results": [
    { "document_id": "uuid", "status": "completed" }
  ]
}`}
                      </pre>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Códigos de Status:</p>
                      <table className="w-full text-xs border rounded">
                        <tbody className="divide-y">
                          <tr><td className="p-2 font-mono">200</td><td className="p-2">Sucesso</td></tr>
                          <tr><td className="p-2 font-mono">400</td><td className="p-2">Texto inválido (&lt; 100 chars ou ratio &lt; 80%)</td></tr>
                          <tr><td className="p-2 font-mono">500</td><td className="p-2">Erro interno</td></tr>
                        </tbody>
                      </table>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Fluxo Interno:</p>
                      <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                        <li>Validação de sanidade do texto</li>
                        <li>Auto-categorização via LLM (HEALTH/STUDY/GENERAL)</li>
                        <li>Geração de metadados (tags, resumo, implementation_status)</li>
                        <li>Chunking (750 palavras, 180 overlap)</li>
                        <li>Embeddings via OpenAI text-embedding-3-small</li>
                        <li>Persistência em document_chunks</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* chat / chat-study */}
                <div className="border rounded-lg p-5 bg-muted/30">
                  <h4 className="text-xl font-bold mb-4 text-primary">chat / chat-study</h4>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Caminhos</p>
                      <code className="text-xs bg-background p-2 rounded block mt-1">supabase/functions/chat/index.ts</code>
                      <code className="text-xs bg-background p-2 rounded block mt-1">supabase/functions/chat-study/index.ts</code>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Método / JWT</p>
                      <p className="text-sm mt-1"><code className="bg-background px-2 py-1 rounded">POST</code> <code className="bg-background px-2 py-1 rounded ml-2">verify_jwt = false</code></p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold mb-2">Input JSON:</p>
                      <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`{
  "messages": [
    { "role": "user", "content": "pergunta do usuário" }
  ],
  "session_id": "chat_2025-01-01_123456"
}`}
                      </pre>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Output:</p>
                      <p className="text-xs text-muted-foreground">SSE Streaming (text/event-stream)</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Fluxo Interno:</p>
                      <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                        <li>Busca RAG via search-documents (contexto relevante)</li>
                        <li>Monta prompt com contexto + mensagens</li>
                        <li>Streaming via Lovable AI Gateway (google/gemini-2.5-flash)</li>
                        <li>Análise de sentimento ao final</li>
                        <li>Salva conversa em conversation_history</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* search-documents */}
                <div className="border rounded-lg p-5 bg-muted/30">
                  <h4 className="text-xl font-bold mb-4 text-primary">search-documents</h4>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Caminho</p>
                      <code className="text-xs bg-background p-2 rounded block mt-1">supabase/functions/search-documents/index.ts</code>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Método / JWT</p>
                      <p className="text-sm mt-1"><code className="bg-background px-2 py-1 rounded">POST</code> <code className="bg-background px-2 py-1 rounded ml-2">verify_jwt = false</code></p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold mb-2">Input JSON:</p>
                      <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`{
  "query": "pergunta do usuário",
  "targetChat": "health",
  "matchThreshold": 0.7,
  "matchCount": 5
}`}
                      </pre>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Output JSON:</p>
                      <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`{
  "results": [
    {
      "chunk_id": "uuid",
      "content": "texto do chunk",
      "similarity": 0.85
    }
  ]
}`}
                      </pre>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Fluxo Interno:</p>
                      <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                        <li>Gera embedding da query via OpenAI</li>
                        <li>Busca no PostgreSQL usando cosine distance (pgvector)</li>
                        <li>Filtra por target_chat e similarity threshold</li>
                        <li>Retorna top N chunks mais similares</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Outras Edge Functions (resumidas) */}
                <div className="border rounded-lg p-5 bg-muted/30">
                  <h4 className="text-xl font-bold mb-4">Outras Edge Functions</h4>
                  <div className="grid gap-4">
                    <div className="border-l-4 border-primary pl-4">
                      <p className="font-semibold text-sm">text-to-speech</p>
                      <p className="text-xs text-muted-foreground">TTS ElevenLabs (Fernando Arbache voice), streaming Web Audio API</p>
                    </div>
                    <div className="border-l-4 border-primary pl-4">
                      <p className="font-semibold text-sm">voice-to-text</p>
                      <p className="text-xs text-muted-foreground">STT OpenAI Whisper, suporte PT-BR</p>
                    </div>
                    <div className="border-l-4 border-secondary pl-4">
                      <p className="font-semibold text-sm">generate-image</p>
                      <p className="text-xs text-muted-foreground">Geração imagens saúde via google/gemini-3-pro-image-preview</p>
                    </div>
                    <div className="border-l-4 border-secondary pl-4">
                      <p className="font-semibold text-sm">generate-history-image</p>
                      <p className="text-xs text-muted-foreground">Imagens timeline IA (AI History modal)</p>
                    </div>
                    <div className="border-l-4 border-secondary pl-4">
                      <p className="font-semibold text-sm">generate-section-image</p>
                      <p className="text-xs text-muted-foreground">Imagens seções landing page</p>
                    </div>
                    <div className="border-l-4 border-accent pl-4">
                      <p className="font-semibold text-sm">analyze-sentiment</p>
                      <p className="text-xs text-muted-foreground">Análise sentimento via Lovable AI</p>
                    </div>
                    <div className="border-l-4 border-accent pl-4">
                      <p className="font-semibold text-sm">sentiment-alert</p>
                      <p className="text-xs text-muted-foreground">Alertas email para conversas negativas</p>
                    </div>
                    <div className="border-l-4 border-warning pl-4">
                      <p className="font-semibold text-sm">send-email</p>
                      <p className="text-xs text-muted-foreground">Emails via Resend API</p>
                    </div>
                    <div className="border-l-4 border-warning pl-4">
                      <p className="font-semibold text-sm">youtube-videos</p>
                      <p className="text-xs text-muted-foreground">Cache YouTube API, otimização quota (hardcoded channelId)</p>
                    </div>
                    <div className="border-l-4 border-muted pl-4">
                      <p className="font-semibold text-sm">process-document-with-text</p>
                      <p className="text-xs text-muted-foreground">Processamento individual (legado, substituído por process-bulk-document)</p>
                    </div>
                    <div className="border-l-4 border-muted pl-4">
                      <p className="font-semibold text-sm">suggest-document-tags</p>
                      <p className="text-xs text-muted-foreground">Sugestão tags via LLM (agora integrado em process-bulk-document)</p>
                    </div>
                    <div className="border-l-4 border-muted pl-4">
                      <p className="font-semibold text-sm">generate-document-summary</p>
                      <p className="text-xs text-muted-foreground">Resumo via LLM (agora integrado em process-bulk-document)</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* ===== FRONTEND ===== */}
          <section id="frontend" className="scroll-mt-20 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <Code className="h-8 w-8 text-primary" />
                🖥️ Frontend
              </h2>
            </div>

            <BackToIndex />

            {/* Dependências */}
            <Card className="p-6">
              <h3 className="text-2xl font-semibold mb-4">Dependências Core</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Pacote</th>
                      <th className="text-left p-2">Versão</th>
                      <th className="text-left p-2">Uso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-2 font-mono">pdfjs-dist</td>
                      <td className="p-2">^5.4.449</td>
                      <td className="p-2">Extração texto PDF no cliente</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono">mermaid</td>
                      <td className="p-2">^11.12.1</td>
                      <td className="p-2">Diagramas de fluxo</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono">react-i18next</td>
                      <td className="p-2">^16.3.5</td>
                      <td className="p-2">Internacionalização PT/EN/FR</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono">@tanstack/react-query</td>
                      <td className="p-2">^5.83.0</td>
                      <td className="p-2">Cache e fetching assíncrono</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono">lucide-react</td>
                      <td className="p-2">^0.462.0</td>
                      <td className="p-2">Biblioteca de ícones</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono">@supabase/supabase-js</td>
                      <td className="p-2">^2.84.0</td>
                      <td className="p-2">Cliente Supabase/Lovable Cloud</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Componentes */}
            <Card className="p-6">
              <h3 className="text-2xl font-semibold mb-6">Componentes Principais</h3>
              
              <div className="space-y-6">
                {/* DocumentsTab.tsx */}
                <div className="border rounded-lg p-5 bg-muted/30">
                  <h4 className="text-xl font-bold mb-3 text-primary">DocumentsTab.tsx</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    <strong>Caminho:</strong> <code>src/components/admin/DocumentsTab.tsx</code>
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold mb-2">Descrição:</p>
                      <p className="text-sm text-muted-foreground">
                        Tab de gerenciamento de documentos RAG no painel admin. Permite upload múltiplo de PDFs, 
                        processamento em lote com auto-categorização LLM, e visualização de documentos com status.
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Dependências:</p>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        <li><code>pdfjs-dist</code> - Extração de texto</li>
                        <li><code>@tanstack/react-query</code> - Cache e mutations</li>
                        <li><code>@supabase/supabase-js</code> - Chamadas backend</li>
                      </ul>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Ações Principais:</p>
                      <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                        <li><strong>Upload múltiplo de PDFs:</strong> Aceita arquivos <code>.pdf</code> via drag-and-drop ou file input</li>
                        <li><strong>Extração de texto:</strong> Usa <code>pdfjsLib.getDocument()</code> para extrair texto página por página</li>
                        <li><strong>Criação de registros:</strong> Insere documentos com status "pending" e <code>target_chat: "general"</code></li>
                        <li><strong>Processamento em lote:</strong> Invoca <code>process-bulk-document</code> edge function</li>
                        <li><strong>Auto-categorização:</strong> LLM classifica automaticamente (HEALTH/STUDY/GENERAL)</li>
                        <li><strong>Visualização:</strong> Tabela com status, target_chat, implementation_status, resumo AI, tags</li>
                      </ol>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Lógica Principal:</p>
                      <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`// Extração de texto PDF
const extractTextFromPDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map((item: any) => item.str).join(' ');
  }
  return fullText;
};

// Processamento bulk
await supabase.functions.invoke("process-bulk-document", {
  body: { documents_data }
});`}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* ChatKnowYOU.tsx / ChatStudy.tsx */}
                <div className="border rounded-lg p-5 bg-muted/30">
                  <h4 className="text-xl font-bold mb-3 text-primary">ChatKnowYOU.tsx / ChatStudy.tsx</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    <strong>Caminhos:</strong> 
                    <code className="block mt-1">src/components/ChatKnowYOU.tsx</code>
                    <code className="block mt-1">src/components/ChatStudy.tsx</code>
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold mb-2">Descrição:</p>
                      <p className="text-sm text-muted-foreground">
                        Componentes de chat interativo com RAG. ChatKnowYOU focado em saúde (Hospital Moinhos), 
                        ChatStudy focado em conteúdo KnowRISK/KnowYOU. Ambos incluem geração de imagens, 
                        áudio TTS/STT, e análise de sentimento.
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Funcionalidades:</p>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        <li>Streaming SSE de respostas via edge functions</li>
                        <li>Modo de geração de imagens (botão "Desenhar")</li>
                        <li>Controles de áudio (Play, Stop, Download) com progresso</li>
                        <li>Gravação de voz com transcrição automática (Whisper)</li>
                        <li>Sugestões contextuais dinâmicas (baseadas em tags de documentos)</li>
                        <li>Histórico de conversas persistente (localStorage + DB)</li>
                        <li>Análise de sentimento em tempo real</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Outros componentes resumidos */}
                <div className="border rounded-lg p-5 bg-muted/30">
                  <h4 className="text-xl font-bold mb-4">Outros Componentes</h4>
                  <div className="grid gap-3">
                    <div className="border-l-4 border-primary pl-4">
                      <p className="font-semibold text-sm">AIHistoryPanel.tsx</p>
                      <p className="text-xs text-muted-foreground">Modal timeline evolução IA com 5 eras, áudio sincronizado, navegação jump</p>
                    </div>
                    <div className="border-l-4 border-primary pl-4">
                      <p className="font-semibold text-sm">DraggablePreviewPanel.tsx</p>
                      <p className="text-xs text-muted-foreground">Painel arrastável para tooltips com áudio TTS e carrosséis de imagens</p>
                    </div>
                    <div className="border-l-4 border-secondary pl-4">
                      <p className="font-semibold text-sm">Header.tsx</p>
                      <p className="text-xs text-muted-foreground">Navegação fixa com seletor de idiomas (PT/EN/FR), scroll progress, tema claro/escuro</p>
                    </div>
                    <div className="border-l-4 border-secondary pl-4">
                      <p className="font-semibold text-sm">MediaCarousel.tsx</p>
                      <p className="text-xs text-muted-foreground">Carrossel lado a lado: Spotify podcast + YouTube videos</p>
                    </div>
                    <div className="border-l-4 border-accent pl-4">
                      <p className="font-semibold text-sm">MermaidDiagram.tsx</p>
                      <p className="text-xs text-muted-foreground">Renderização de diagramas Mermaid com tema adaptativo</p>
                    </div>
                    <div className="border-l-4 border-accent pl-4">
                      <p className="font-semibold text-sm">MermaidZoomModal.tsx</p>
                      <p className="text-xs text-muted-foreground">Modal fullscreen com zoom (+ / - / Reset) e pan para diagramas</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Hooks */}
            <Card className="p-6">
              <h3 className="text-2xl font-semibold mb-4">Hooks Customizados</h3>
              <div className="space-y-3">
                <div className="border-l-4 border-primary pl-4">
                  <p className="font-semibold text-sm">useChatKnowYOU.ts</p>
                  <p className="text-xs text-muted-foreground">Lógica chat saúde: streaming, histórico, geração imagem, análise sentimento</p>
                </div>
                <div className="border-l-4 border-primary pl-4">
                  <p className="font-semibold text-sm">useChatStudy.ts</p>
                  <p className="text-xs text-muted-foreground">Lógica chat estudos: RAG KnowRISK/KnowYOU, sugestões dinâmicas</p>
                </div>
                <div className="border-l-4 border-secondary pl-4">
                  <p className="font-semibold text-sm">useAdminSettings.ts</p>
                  <p className="text-xs text-muted-foreground">Gerenciamento configurações admin (audio, alerts, Gmail API)</p>
                </div>
                <div className="border-l-4 border-secondary pl-4">
                  <p className="font-semibold text-sm">useChatAnalytics.ts</p>
                  <p className="text-xs text-muted-foreground">Tracking métricas: message_count, audio_plays, topics</p>
                </div>
                <div className="border-l-4 border-accent pl-4">
                  <p className="font-semibold text-sm">useTooltipContent.ts</p>
                  <p className="text-xs text-muted-foreground">Fetch conteúdo tooltips com cache e validação</p>
                </div>
              </div>
            </Card>
          </section>

          {/* ===== UI REFERENCE ===== */}
          <section id="ui-reference" className="scroll-mt-20 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <Palette className="h-8 w-8 text-primary" />
                🎨 Referência UI
              </h2>
            </div>

            {/* Icons Library */}
            <Card className="p-6 space-y-4">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Image className="h-6 w-6 text-secondary" />
                  📦 Biblioteca de Ícones (Lucide React)
                </h3>
                <p className="text-muted-foreground">
                  Biblioteca completa de 70+ ícones usados na interface. Todos os ícones são renderizados como componentes React inline SVG tree-shakeable.
                </p>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Visualização</TableHead>
                      <TableHead className="min-w-[180px]">Nome Técnico</TableHead>
                      <TableHead>Descrição/Uso</TableHead>
                      <TableHead className="w-32">Categoria</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ICONS_DATA.map((iconData, index) => {
                      const IconComponent = iconData.component;
                      return (
                        <TableRow key={`${iconData.name}-${index}`}>
                          <TableCell>
                            <div className="flex items-center justify-center">
                              <IconComponent className="h-5 w-5 text-primary" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">{iconData.name}</code>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {iconData.description}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{iconData.category}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold mb-2">Como usar:</h4>
                <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`import { ArrowLeft, Play, Download } from 'lucide-react';

// Uso básico
<ArrowLeft className="h-5 w-5" />

// Com props customizadas
<Play size={24} color="red" strokeWidth={2} />

// Com classes Tailwind
<Download className="h-6 w-6 text-primary hover:text-primary/80" />`}
                </pre>
              </div>
            </Card>

            {/* Animations Library */}
            <Card className="p-6 space-y-4">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-accent animate-pulse" />
                  🎭 Efeitos de Animação
                </h3>
                <p className="text-muted-foreground">
                  Animações customizadas configuradas em <code>tailwind.config.ts</code>. Todas as animações usam timing functions suaves e são otimizadas para performance.
                </p>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Preview</TableHead>
                      <TableHead className="min-w-[200px]">Nome Técnico</TableHead>
                      <TableHead>Descrição/Uso</TableHead>
                      <TableHead className="w-32">Categoria</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ANIMATIONS_DATA.map((animData, index) => (
                      <TableRow key={`${animData.className}-${index}`}>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <div 
                              className={cn(
                                "w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded",
                                animData.className
                              )}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded whitespace-nowrap">
                            {animData.className}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {animData.description}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{animData.category}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold mb-2">Como usar:</h4>
                <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`// Aplicar diretamente no className
<div className="animate-fade-in">Conteúdo</div>

// Combinar múltiplas classes
<button className="animate-pulse hover:scale-110 transition-transform">
  Clique aqui
</button>

// Com delays customizados
<div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
  Aparece depois
</div>

// Animações infinitas
<div className="animate-float">
  Flutuando...
</div>`}
                </pre>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold mb-2">Configuração (tailwind.config.ts):</h4>
                <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`// Em tailwind.config.ts
theme: {
  extend: {
    keyframes: {
      "fade-in": {
        "0%": { opacity: "0", transform: "translateY(10px)" },
        "100%": { opacity: "1", transform: "translateY(0)" }
      },
      "float": {
        "0%, 100%": { transform: "translateY(0)" },
        "50%": { transform: "translateY(-10px)" }
      }
    },
    animation: {
      "fade-in": "fade-in 0.3s ease-out",
      "float": "float 6s ease-in-out infinite"
    }
  }
}`}
                </pre>
              </div>
            </Card>
          </section>

          {/* ===== CHANGELOG ===== */}
          <section id="changelog" className="scroll-mt-20 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <History className="h-8 w-8 text-primary" />
                📋 Changelog
              </h2>
            </div>

            <BackToIndex />

            <Card className="p-6">
              <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <History className="h-6 w-6 text-secondary" />
                Histórico de Versões
              </h3>
              
              {versions && versions.length > 0 ? (
                <div className="space-y-6">
                  {versions.map((version) => (
                    <div key={version.id} className="border-l-4 border-primary pl-6 pb-6">
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="text-xl font-bold">Versão {version.version}</h4>
                        <Badge variant="outline">
                          {new Date(version.release_date).toLocaleDateString('pt-BR')}
                        </Badge>
                        {version.author && (
                          <Badge variant="secondary">{version.author}</Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {(version.changes as any[]).map((change: any, idx: number) => {
                          const typeColors = {
                            added: 'bg-green-500/10 text-green-500 border-green-500',
                            changed: 'bg-yellow-500/10 text-yellow-500 border-yellow-500',
                            fixed: 'bg-blue-500/10 text-blue-500 border-blue-500',
                            removed: 'bg-red-500/10 text-red-500 border-red-500',
                          };
                          
                          const typeLabels = {
                            added: 'Adicionado',
                            changed: 'Modificado',
                            fixed: 'Corrigido',
                            removed: 'Removido',
                          };
                          
                          return (
                            <div key={idx} className="flex items-start gap-3">
                              <Badge 
                                variant="outline" 
                                className={cn("mt-0.5", typeColors[change.type as keyof typeof typeColors])}
                              >
                                {typeLabels[change.type as keyof typeof typeLabels]}
                              </Badge>
                              <div className="flex-1">
                                <span className="text-xs text-muted-foreground uppercase font-semibold">
                                  {change.component}
                                </span>
                                <p className="text-sm">{change.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p>Carregando histórico...</p>
                </div>
              )}
            </Card>
          </section>
        </div>
      </main>

      {/* Zoom Modal */}
      <MermaidZoomModal
        chart={zoomModal.chart}
        id={zoomModal.id}
        title={zoomModal.title}
        open={zoomModal.open}
        onOpenChange={(open) => setZoomModal({ ...zoomModal, open })}
        theme={isDarkMode ? 'dark' : 'light'}
      />
    </div>
  );
};

export default Documentation;

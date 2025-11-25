import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from './use-toast';

interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptText = result[0].transcript;

          if (result.isFinal) {
            final += transcriptText + ' ';
          } else {
            interim += transcriptText;
          }
        }

        if (final) {
          setTranscript(prev => prev + final);
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        let errorMessage = 'Erro no reconhecimento de voz';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'Nenhuma fala detectada. Tente novamente.';
            break;
          case 'audio-capture':
            errorMessage = 'Microfone não detectado ou sem permissão.';
            break;
          case 'not-allowed':
            errorMessage = 'Permissão de microfone negada.';
            break;
          case 'network':
            errorMessage = 'Erro de rede. Verifique sua conexão.';
            break;
        }

        toast({
          title: 'Erro',
          description: errorMessage,
          variant: 'destructive',
        });

        setIsListening(false);
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      console.warn('Speech Recognition API not supported');
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      toast({
        title: 'Não suportado',
        description: 'Seu navegador não suporta reconhecimento de voz.',
        variant: 'destructive',
      });
      return;
    }

    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setInterimTranscript('');
      
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível iniciar o reconhecimento de voz.',
          variant: 'destructive',
        });
      }
    }
  }, [isSupported, isListening, toast]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  };
};

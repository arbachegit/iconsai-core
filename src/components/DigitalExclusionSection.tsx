import { useState, useEffect, useRef } from "react";
import { ChevronDown, Play, Square, Download } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AudioStreamPlayer } from "@/lib/audio-player";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const DigitalExclusionSection = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioPlayerRef = useRef<AudioStreamPlayer | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchAudio();
  }, []);

  const fetchAudio = async () => {
    try {
      const { data, error } = await supabase
        .from('section_audio')
        .select('audio_url')
        .eq('section_id', 'digital-exclusion')
        .single();

      if (error) throw error;
      if (data?.audio_url) {
        setAudioUrl(data.audio_url);
      }
    } catch (error) {
      console.error('Error fetching audio:', error);
    }
  };

  const handlePlayAudio = async () => {
    if (!audioUrl) {
      toast.error(t('audio.notAvailable'));
      return;
    }

    if (isPlaying) {
      audioElementRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    try {
      if (!audioElementRef.current) {
        const audio = new Audio(audioUrl);
        audioElementRef.current = audio;
        
        audio.addEventListener('loadedmetadata', () => {
          setDuration(audio.duration);
        });
        
        audio.addEventListener('timeupdate', () => {
          setCurrentTime(audio.currentTime);
        });
        
        audio.addEventListener('ended', () => {
          setIsPlaying(false);
          setCurrentTime(0);
        });
      }
      
      await audioElementRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      toast.error(t('audio.playError'));
    }
  };

  const handleStopAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const handleDownloadAudio = () => {
    if (audioUrl) {
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = 'exclusao-digital.mp3';
      link.click();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <section className="py-8 relative">
      <div className="container mx-auto px-4">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-primary/20 rounded-lg p-8 shadow-lg">
              <div className="text-center space-y-4">
                <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  {t('digitalExclusion.title')}
                </h1>
                <h1 className="text-2xl md:text-3xl font-semibold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mt-4">
                  {t('digitalExclusion.subtitle')}
                </h1>
                
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="relative group bg-primary/30 border-2 border-primary hover:bg-primary/50 hover:border-primary hover:shadow-lg hover:shadow-primary/40 transition-all duration-300"
                  >
                    <span className="mr-2 font-semibold">{t('digitalExclusion.expandText')}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    
                    {/* Bolinha verde pulsante - lado direito superior externo */}
                    <div className="absolute -top-1 -right-1 z-20">
                      <div className="relative">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
                        <div className="absolute inset-0 rounded-full bg-green-400 animate-ping" />
                      </div>
                    </div>
                  </Button>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent className="mt-8 space-y-6 animate-accordion-down">
                {/* Audio Controls */}
                {audioUrl && (
                  <div className="border-t border-primary/20 pt-6 space-y-4">
                    <div className="flex items-center gap-2 justify-center flex-wrap">
                      <Button
                        size="sm"
                        onClick={handlePlayAudio}
                        variant="outline"
                        className="gap-2"
                      >
                        <Play className="h-4 w-4" />
                        {isPlaying ? t('audio.pause') : t('audio.play')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleStopAudio}
                        variant="outline"
                        className="gap-2"
                      >
                        <Square className="h-4 w-4" />
                        {t('audio.stop')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleDownloadAudio}
                        variant="outline"
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        {t('audio.download')}
                      </Button>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-primary to-secondary h-full transition-all duration-200"
                          style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Content Text */}
                <div className="prose prose-invert max-w-none space-y-4 text-muted-foreground">
                  <p>
                    {t('digitalExclusion.content1')}
                  </p>

                  <div className="my-8 flex justify-center">
                    <div className="w-full max-w-md aspect-square rounded-lg bg-gradient-subtle flex items-center justify-center border border-primary/20">
                      <div className="w-32 h-32 rounded-full bg-gradient-primary opacity-20 animate-pulse-slow" />
                    </div>
                  </div>

                  <p>
                    {t('digitalExclusion.content2')}
                  </p>

                  <p>
                    {t('digitalExclusion.content3')}
                  </p>
                </div>
              </CollapsibleContent>
            </div>
          </div>
        </Collapsible>
      </div>
    </section>
  );
};

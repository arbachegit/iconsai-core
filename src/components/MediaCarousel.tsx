import { Music } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const FEATURED_PODCASTS = [
  { 
    id: 1, 
    episodeId: "2lORJJJIGECuG57sxtbmTx", 
    title: "T1E1 SAÚDE O Custo do Silêncio",
    subtitle: "Foco em Justificativa Financeira e Simulação"
  },
  { 
    id: 2, 
    episodeId: "7FbQynx7mlyn98zylx5dNg", 
    title: "T1E2 O Algoritmo da Dignidade",
    subtitle: "Foco em Tecnologia e Impacto Social"
  },
  { 
    id: 3, 
    episodeId: "0lHencLq7GVTeAihuY18JS", 
    title: "T1E3 Prevendo o Futuro",
    subtitle: "Foco em Gestão de Risco e Tomada de Decisão"
  },
];

export const MediaCarousel = () => {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1DB954]/10 rounded-lg">
            <Music className="w-6 h-6 text-[#1DB954]" />
          </div>
          <h3 className="text-2xl font-bold">Podcasts em Destaque</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURED_PODCASTS.map((podcast) => (
            <Card key={podcast.id} className="bg-card/50 border-primary/10">
              <CardContent className="p-4">
                <iframe
                  src={`https://open.spotify.com/embed/episode/${podcast.episodeId}?utm_source=generator&theme=0`}
                  width="100%"
                  height="152"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-lg"
                />
                <div className="mt-4 text-center space-y-1">
                  <h4 className="font-bold text-lg text-foreground">
                    {podcast.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {podcast.subtitle}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

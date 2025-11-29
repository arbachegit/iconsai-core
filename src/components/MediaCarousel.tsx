import { Music } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const MediaCarousel = () => {

  return (
    <div className="space-y-8">
      {/* Spotify Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1DB954]/10 rounded-lg">
            <Music className="w-6 h-6 text-[#1DB954]" />
          </div>
          <h3 className="text-2xl font-bold">Podcast no Spotify</h3>
        </div>
        <Card className="bg-card/50 border-primary/10">
          <CardContent className="p-6">
            <iframe
              src="https://open.spotify.com/embed/show/7jlF9GoUTnUngBVi5Xrw0r?utm_source=generator&theme=0"
              width="100%"
              height="352"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-lg"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

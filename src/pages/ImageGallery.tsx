import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, Calendar, Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GeneratedImage {
  id: string;
  image_url: string;
  prompt_key: string;
  section_id: string;
  created_at: string;
}

const ImageGallery = () => {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchPrompt, setSearchPrompt] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchImages();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchPrompt, startDate, endDate, images]);

  const fetchImages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("generated_images")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setImages(data || []);
    } catch (error) {
      console.error("Erro ao carregar imagens:", error);
      toast.error("Erro ao carregar galeria de imagens");
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...images];

    // Filter by prompt
    if (searchPrompt) {
      filtered = filtered.filter((img) =>
        img.prompt_key.toLowerCase().includes(searchPrompt.toLowerCase()) ||
        img.section_id.toLowerCase().includes(searchPrompt.toLowerCase())
      );
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(
        (img) => new Date(img.created_at) >= new Date(startDate)
      );
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      filtered = filtered.filter(
        (img) => new Date(img.created_at) <= endDateTime
      );
    }

    setFilteredImages(filtered);
  };

  const clearFilters = () => {
    setSearchPrompt("");
    setStartDate("");
    setEndDate("");
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Download iniciado!");
    } catch (error) {
      console.error("Erro ao fazer download:", error);
      toast.error("Erro ao fazer download da imagem");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">Galeria de Imagens Geradas</h1>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Buscar por Prompt/Seção
              </label>
              <Input
                placeholder="Digite para buscar..."
                value={searchPrompt}
                onChange={(e) => setSearchPrompt(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data Inicial
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data Final
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-muted-foreground">
              {filteredImages.length} de {images.length} imagens
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : filteredImages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground text-lg">
              Nenhuma imagem encontrada
            </p>
            {(searchPrompt || startDate || endDate) && (
              <Button
                variant="link"
                onClick={clearFilters}
                className="mt-2"
              >
                Limpar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredImages.map((image) => (
            <Card key={image.id} className="overflow-hidden group">
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img
                  src={image.image_url}
                  alt={image.prompt_key}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <div className="flex gap-2 w-full">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        downloadImage(
                          image.image_url,
                          `${image.section_id}-${image.prompt_key}.png`
                        )
                      }
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => window.open(image.image_url, "_blank")}
                      className="flex-1"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir
                    </Button>
                  </div>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-2 line-clamp-1">
                  {image.section_id}
                </h3>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {image.prompt_key}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(image.created_at), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageGallery;

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const TestImageGeneration = () => {
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const testPrompts = [
    "Abstract futuristic technology with purple and blue gradients, neural networks, data flowing, no text",
    "Modern healthcare facility with AI integration, bright and clean, futuristic, no text",
    "Digital transformation concept, split between old and new technology, purple tones, no text",
    "Global connectivity network, people connected by digital threads, world map background, no text",
    "Hospital of the future with robotic surgery, clean medical environment, blue lighting, no text"
  ];

  const handleGenerate = async (promptText: string) => {
    if (!promptText.trim()) {
      toast.error("Por favor, insira um prompt");
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt: promptText }
      });

      if (error) {
        console.error("Erro ao gerar imagem:", error);
        toast.error(error.message || "Erro ao gerar imagem");
        return;
      }

      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        toast.success("Imagem gerada com sucesso!");
      } else {
        toast.error("Nenhuma imagem foi retornada");
      }
    } catch (error) {
      console.error("Erro ao gerar imagem:", error);
      toast.error("Erro ao gerar imagem");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Teste de Geração de Imagens</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Prompt Personalizado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Descreva a imagem que você quer gerar..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <Button
              onClick={() => handleGenerate(prompt)}
              disabled={isGenerating || !prompt.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                "Gerar Imagem"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Tests Section */}
        <Card>
          <CardHeader>
            <CardTitle>Prompts de Teste Rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {testPrompts.map((testPrompt, index) => (
              <Button
                key={index}
                variant="outline"
                onClick={() => {
                  setPrompt(testPrompt);
                  handleGenerate(testPrompt);
                }}
                disabled={isGenerating}
                className="w-full text-left justify-start h-auto py-3 px-4"
              >
                <span className="text-sm line-clamp-2">{testPrompt}</span>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Generated Image Display */}
      {(generatedImage || isGenerating) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Imagem Gerada</CardTitle>
          </CardHeader>
          <CardContent>
            {isGenerating ? (
              <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                  <p className="text-muted-foreground">Gerando imagem...</p>
                  <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos</p>
                </div>
              </div>
            ) : generatedImage ? (
              <div className="space-y-4">
                <img
                  src={generatedImage}
                  alt="Imagem gerada"
                  className="w-full h-auto rounded-lg border shadow-lg"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = generatedImage;
                      link.download = `generated-image-${Date.now()}.png`;
                      link.click();
                    }}
                  >
                    Download Imagem
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedImage);
                      toast.success("URL copiada!");
                    }}
                  >
                    Copiar URL
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TestImageGeneration;

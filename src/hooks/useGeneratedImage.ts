import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useGeneratedImage = (prompt: string, cacheKey: string) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar se já temos a imagem em cache no localStorage
    const cachedImage = localStorage.getItem(`generated-image-${cacheKey}`);
    if (cachedImage) {
      setImageUrl(cachedImage);
      return;
    }

    // Gerar nova imagem
    const generateImage = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: funcError } = await supabase.functions.invoke(
          "generate-image",
          {
            body: { prompt },
          }
        );

        if (funcError) throw funcError;

        if (data?.imageUrl) {
          setImageUrl(data.imageUrl);
          // Cachear a imagem no localStorage
          localStorage.setItem(`generated-image-${cacheKey}`, data.imageUrl);
        } else {
          throw new Error("Nenhuma URL de imagem retornada");
        }
      } catch (err) {
        console.error("Erro ao gerar imagem:", err);
        setError(err instanceof Error ? err.message : "Erro ao gerar imagem");
      } finally {
        setIsLoading(false);
      }
    };

    generateImage();
  }, [prompt, cacheKey]);

  return { imageUrl, isLoading, error };
};

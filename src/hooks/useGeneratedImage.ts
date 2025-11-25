import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useGeneratedImage = (prompt: string, cacheKey: string) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async (retryCount = 0): Promise<boolean> => {
    const MAX_RETRIES = 3;
    
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
        localStorage.setItem(`generated-image-${cacheKey}`, data.imageUrl);
        return true;
      } else {
        throw new Error("Nenhuma URL de imagem retornada");
      }
    } catch (err) {
      console.error(`Erro ao gerar imagem (tentativa ${retryCount + 1}/${MAX_RETRIES}):`, err);
      
      // Retry com backoff exponencial
      if (retryCount < MAX_RETRIES - 1) {
        const delayMs = 1000 * (retryCount + 1); // 1s, 2s, 3s
        console.log(`Tentando novamente em ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return generateImage(retryCount + 1);
      }
      
      // Falha após todas as tentativas
      setError(err instanceof Error ? err.message : "Erro ao gerar imagem");
      return false;
    }
  };

  useEffect(() => {
    // Verificar se já temos a imagem em cache no localStorage
    const cachedImage = localStorage.getItem(`generated-image-${cacheKey}`);
    if (cachedImage) {
      setImageUrl(cachedImage);
      return;
    }

    // Gerar nova imagem com retry automático
    const startGeneration = async () => {
      setIsLoading(true);
      setError(null);
      await generateImage();
      setIsLoading(false);
    };

    startGeneration();
  }, [prompt, cacheKey]);

  const retry = () => {
    setIsLoading(true);
    setError(null);
    generateImage().finally(() => setIsLoading(false));
  };

  return { imageUrl, isLoading, error, retry };
};

import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, ImageOff, RefreshCw } from "lucide-react";
import { useGeneratedImage } from "@/hooks/useGeneratedImage";

const DigitalExclusionSection = () => {
  const [isOpen, setIsOpen] = useState(false);

  const { imageUrl, isLoading, error, retry } = useGeneratedImage(
    "Abstract visualization of global digital divide, showing 5.74 billion people disconnected from AI technology, split world with connected bright side and disconnected dark side, language barriers represented as walls, cognitive gaps as bridges broken, purple and blue color palette, futuristic, no text",
    "digital-exclusion-section"
  );

  return (
    <div className="relative py-16 px-4">
      <div className="container mx-auto max-w-4xl">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          {/* Título Impactante */}
          <div className="text-center space-y-6 mb-8">
            <div className="space-y-2">
              <h2 className="text-6xl md:text-7xl lg:text-8xl font-bold text-gradient animate-fade-in">
                5,74 bilhões
              </h2>
              <p className="text-2xl md:text-3xl text-foreground/90 animate-fade-in">
                de pessoas ainda não conseguem
              </p>
              <p className="text-2xl md:text-3xl text-foreground/90 animate-fade-in">
                acessar a internet
              </p>
            </div>

            {/* Botão de Expandir/Colapsar */}
            <CollapsibleTrigger asChild>
              <Button 
                variant="outline" 
                className="gap-2 border-primary/30 hover:bg-primary/10 transition-all"
              >
                {isOpen ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Recolher
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Saiba mais sobre esse desafio
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>

          {/* Conteúdo Expansível */}
          <CollapsibleContent className="animate-accordion-down">
            <div className="space-y-8 text-lg leading-relaxed">
              {/* Bloco 1: Introdução */}
              <div className="space-y-4">
                <p>
                  Se a internet já exclui hoje bilhões de pessoas, a "internet conversacional" baseada em prompts corre o risco de ampliar ainda mais essa distância. Estimando uma população mundial em torno de 8 bilhões de pessoas e considerando que o uso avançado de IA exige competências cognitivas e linguísticas que a maioria não domina, é razoável supor que algo em torno de 5,74 bilhões de pessoas – mais de 70% da humanidade – não conseguirá utilizar plenamente essa nova camada da internet, mesmo estando conectada.
                </p>
                <p>
                  Embora cerca de 6 bilhões de pessoas já estejam online, o que corresponde a aproximadamente 75% da população mundial, boa parte delas possui apenas habilidades digitais básicas, como navegação, uso de redes sociais e mensageiros. Competências mais sofisticadas – como estruturar pedidos complexos, analisar respostas críticas ou criar conteúdo – ainda são minoritárias. Em outras palavras, a infraestrutura técnica se expandiu, mas o "letramento cognitivo para IA" não acompanhou no mesmo ritmo. Escrever um prompt eficaz exige clareza de objetivo, capacidade de abstração, organização do raciocínio e vocabulário mínimo; isso representa uma barreira cognitiva real para grande parte da população global.
                </p>
              </div>

              {/* Imagem Nano Banana */}
              <div className="my-12 relative">
                {isLoading ? (
                  <div className="aspect-video rounded-lg bg-muted animate-pulse flex items-center justify-center">
                    <p className="text-muted-foreground">Gerando visualização...</p>
                  </div>
                ) : imageUrl ? (
                  <div className="relative rounded-lg overflow-hidden shadow-2xl border border-primary/20">
                    <img 
                      src={imageUrl} 
                      alt="Visualização da divisão digital global"
                      className="w-full h-auto"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent pointer-events-none" />
                  </div>
                ) : error ? (
                  <div className="aspect-video rounded-lg bg-muted/50 border border-muted flex flex-col items-center justify-center gap-4 p-8">
                    <ImageOff className="w-16 h-16 text-muted-foreground/50" />
                    <div className="text-center space-y-2">
                      <p className="text-muted-foreground">Imagem indisponível</p>
                      <p className="text-sm text-muted-foreground/70">Não foi possível gerar a visualização</p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={retry}
                      className="gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Tentar novamente
                    </Button>
                  </div>
                ) : null}
              </div>

              {/* Bloco 2: Barreira Linguístico-Cultural */}
              <div className="space-y-4">
                <p>
                  Há ainda uma barreira linguístico-cultural. A maioria dos grandes modelos de linguagem foi treinada com forte predominância de inglês e, em seguida, em alguns idiomas de alta disponibilidade de dados, como chinês e algumas línguas europeias (incluindo o francês). Estudos recentes mostram que muitos LLMs têm mais de 90% de seus dados de treino em inglês ou em combinações onde o inglês é a língua dominante, com apenas uma fração pequena dedicada a outros idiomas. Isso significa que, mesmo quando a interface aceita qualquer idioma, a "mente estatística" do modelo pensa majoritariamente em inglês e depois "volta" traduzindo.
                </p>
                <p>
                  Esse processo tem consequências diretas para gírias, dialetos, expressões regionais e idiossincrasias locais. A IA tende a normalizar o texto para um registro coloquial neutro, frequentemente eliminando nuances culturais, humor local, ironia ou formas de respeito típicas de cada comunidade linguística. Em países com grande diversidade interna – como os da América Latina, África e Ásia – isso implica que milhões de pessoas podem se sentir "mal traduzidas" ou pouco compreendidas pela IA, mesmo quando falam o idioma oficial do país. Além disso, cerca de 88% dos idiomas do mundo permanecem sub-representados na internet, o que faz com que mais de 1 bilhão de pessoas não consiga sequer usar sua própria língua de forma plena no ambiente digital, quanto mais em sistemas avançados de IA.
                </p>
              </div>

              {/* Bloco 3: Conclusão */}
              <div className="space-y-4 pb-4">
                <p>
                  O resultado é um duplo bloqueio: de um lado, incapacidade cognitiva de formular prompts estruturados para interagir com sistemas sofisticados; de outro, modelos treinados em poucos idiomas dominantes, que não captam bem as formas reais de falar de grande parte da população. Se nada for feito para reduzir essas barreiras – com interfaces mais naturais, suporte robusto a idiomas locais e estratégias de inclusão cognitiva e educacional – a IA generativa corre o risco de se tornar uma tecnologia usada de forma plena por uma minoria, enquanto bilhões permanecem à margem de uma nova fase da internet que, em teoria, deveria ser para todos.
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

export default DigitalExclusionSection;

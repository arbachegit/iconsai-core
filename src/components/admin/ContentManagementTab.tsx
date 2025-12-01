import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { FileText, History, Layout } from "lucide-react";

export const ContentManagementTab = () => {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  // Timeline events structure
  const timelineEvents = [
    { id: "history-talos", title: "Talos (c. 3000 a.C.)", date: "c. 3000 a.C." },
    { id: "history-telegraph", title: "Telegrafia e Cartões (1790-1890)", date: "1790-1890" },
    { id: "history-turing-machine", title: "Máquina de Turing (1936)", date: "1936" },
    { id: "history-enigma", title: "Enigma - Código Quebrado (1940-45)", date: "1940-45" },
    { id: "history-turing-test", title: "Teste de Turing (1950)", date: "1950" },
    { id: "history-arpanet", title: "ARPANET (1969)", date: "1969" },
    { id: "history-tcpip", title: "TCP/IP (1974)", date: "1974" },
    { id: "history-www", title: "World Wide Web (1989)", date: "1989" },
    { id: "history-web2", title: "Web 2.0 / Redes Sociais (2004)", date: "2004" },
    { id: "history-watson", title: "IBM Watson (2011)", date: "2011" },
    { id: "history-openai", title: "Fundação da OpenAI (2015)", date: "2015" },
    { id: "history-gpt3", title: "GPT-3 (2020)", date: "2020" },
    { id: "history-chatgpt", title: "ChatGPT (2022)", date: "2022" },
    { id: "history-current", title: "Era Atual (Web 3.0/Veo/LLMs)", date: "2024+" },
  ];

  // Landing page sections
  const landingSections = [
    { id: "software", title: "A Era do Software", subtitle: "A Primeira Revolução" },
    { id: "internet", title: "A Revolução da Internet", subtitle: "A era da conectividade" },
    { id: "tech-sem-proposito", title: "Tecnologias Sem Propósito Claro", subtitle: "O Hype Tecnológico" },
    { id: "kubrick", title: "A Visão de Kubrick em 1969", subtitle: "A Profecia de Kubrick" },
    { id: "watson", title: "IBM Watson e a Era Cognitiva", subtitle: "Watson: A Era da Cognição" },
    { id: "ia-nova-era", title: "A Nova Era da IA Generativa", subtitle: "A Nova Era da IA" },
    { id: "digital-exclusion", title: "Saiba mais sobre esse desafio", subtitle: "5,74 bilhões" },
    { id: "bom-prompt", title: "A Arte do Prompt Eficaz", subtitle: "A Arte do Bom Prompt" },
  ];

  return (
    <div className="space-y-6">
      <AdminTitleWithInfo 
        title="Mídia e Conteúdo"
        level="h1"
        tooltipText="Clique para saber mais sobre o gerenciamento de conteúdo"
        infoContent={
          <>
            <p>Gerencie todo o conteúdo textual e imagens do aplicativo.</p>
            <p className="mt-2">Edite seções, regenere imagens com base no conteúdo e organize a estrutura informacional do site.</p>
          </>
        }
      />

      {/* Conteúdo Principal - Sections */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-primary" />
            <CardTitle>Seções do Landing Page</CardTitle>
          </div>
          <CardDescription>
            Gerencie o conteúdo das 8 seções principais do site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {landingSections.map((section) => (
              <div
                key={section.id}
                className="p-4 border rounded-lg hover:bg-accent/5 transition-colors cursor-pointer"
                onClick={() => setSelectedSection(section.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{section.title}</h4>
                    <p className="text-sm text-muted-foreground">{section.subtitle}</p>
                  </div>
                  <Badge variant="outline">1 imagem</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Explorar História da IA - Collapsible Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle>Explorar História da IA</CardTitle>
          </div>
          <CardDescription>
            Gerencie as 14 sub-seções da timeline de evolução da IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="timeline">
              <AccordionTrigger className="text-base font-medium">
                <div className="flex items-center gap-2">
                  <span>14 Eventos da Timeline</span>
                  <Badge variant="secondary">14 imagens</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 mt-2">
                  {timelineEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-3 border rounded-lg hover:bg-accent/5 transition-colors cursor-pointer"
                      onClick={() => setSelectedSection(event.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-sm">{event.title}</h5>
                          <p className="text-xs text-muted-foreground">{event.date}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">1 imagem</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Placeholder for future content editor */}
      {selectedSection && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle>Editor de Conteúdo</CardTitle>
            <CardDescription>
              Editando seção: <Badge>{selectedSection}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Editor de conteúdo será implementado na próxima fase.
              Aqui você poderá editar texto, visualizar imagens e regenerar com base no conteúdo editado.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
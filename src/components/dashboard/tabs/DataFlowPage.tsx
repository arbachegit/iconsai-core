import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Boxes, Globe, Phone, ShoppingBag, Bot, Building2 } from "lucide-react";
import DataFlowDiagram from "@/components/DataFlowDiagram";

type SubTabType = "architecture" | "new-domain" | "talk-app" | "retail-system" | "autocontrol" | "gov-system";

const subTabs: { id: SubTabType; label: string; icon: React.ElementType }[] = [
  { id: "architecture", label: "Architecture", icon: Boxes },
  { id: "new-domain", label: "New Domain", icon: Globe },
  { id: "talk-app", label: "Talk APP", icon: Phone },
  { id: "retail-system", label: "Retail System", icon: ShoppingBag },
  { id: "autocontrol", label: "AutoControl", icon: Bot },
  { id: "gov-system", label: "Gov System Icons AI", icon: Building2 },
];

const PlaceholderContent = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center">
    <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
      {title}
    </h1>
    <p className="text-muted-foreground">Coming soon...</p>
  </div>
);

const DataFlowPage = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>("gov-system");

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">DataFlow</h1>
        <p className="text-muted-foreground">System architecture and data flow visualization</p>
      </div>

      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as SubTabType)} className="w-full">
        <TabsList className="w-full justify-start gap-1 bg-muted/50 p-1 rounded-lg mb-6 flex-wrap h-auto">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md transition-all"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="architecture" className="mt-0">
          <PlaceholderContent title="Architecture" />
        </TabsContent>

        <TabsContent value="new-domain" className="mt-0">
          <PlaceholderContent title="New Domain" />
        </TabsContent>

        <TabsContent value="talk-app" className="mt-0">
          <PlaceholderContent title="Talk APP" />
        </TabsContent>

        <TabsContent value="retail-system" className="mt-0">
          <PlaceholderContent title="Retail System" />
        </TabsContent>

        <TabsContent value="autocontrol" className="mt-0">
          <PlaceholderContent title="AutoControl" />
        </TabsContent>

        <TabsContent value="gov-system" className="mt-0">
          <DataFlowDiagram />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataFlowPage;

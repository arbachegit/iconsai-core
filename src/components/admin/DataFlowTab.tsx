import React from "react";
import DataFlowDiagram from "@/components/DataFlowDiagram";

export const DataFlowTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <DataFlowDiagram />
    </div>
  );
};

export default DataFlowTab;

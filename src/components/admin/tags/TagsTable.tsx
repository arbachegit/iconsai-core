import React, { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown, Plus, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, HelpCircle } from "lucide-react";

interface Tag {
  id: string;
  tag_name: string;
  tag_type: string;
  confidence: number | null;
  source: string | null;
  document_id: string;
  parent_tag_id: string | null;
  created_at: string;
  target_chat?: string | null;
  synonyms?: string[] | null;
}

interface TagsTableProps {
  paginatedParentTags: Tag[];
  childTagsMap: Record<string, Tag[]>;
  expandedParents: Set<string>;
  sortColumn: "tag_name" | "confidence" | "target_chat";
  sortDirection: "asc" | "desc";
  searchTagName: string;
  onToggleExpanded: (parentId: string) => void;
  onSort: (column: "tag_name" | "confidence" | "target_chat") => void;
  onCreateChild: (parentId: string) => void;
  onEdit: (tag: Tag) => void;
  onDelete: (ids: string[], tagName: string) => void;
}

export const TagsTable = memo(({
  paginatedParentTags,
  childTagsMap,
  expandedParents,
  sortColumn,
  sortDirection,
  searchTagName,
  onToggleExpanded,
  onSort,
  onCreateChild,
  onEdit,
  onDelete,
}: TagsTableProps) => {
  const renderSortIcon = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      return sortDirection === "asc" ? (
        <ArrowUp className="h-4 w-4" />
      ) : (
        <ArrowDown className="h-4 w-4" />
      );
    }
    return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
  };

  if (paginatedParentTags.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Nenhuma tag encontrada
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => onSort("tag_name")}
                className="flex items-center gap-1 -ml-4 hover:bg-transparent"
              >
                Nome da Tag
                {renderSortIcon("tag_name")}
              </Button>
            </TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => onSort("target_chat")}
                className="flex items-center gap-1 -ml-4 hover:bg-transparent"
              >
                Chat
                {renderSortIcon("target_chat")}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => onSort("confidence")}
                className="flex items-center gap-1 -ml-4 hover:bg-transparent"
              >
                Confiança
                {renderSortIcon("confidence")}
              </Button>
            </TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedParentTags.map((parent) => (
            <React.Fragment key={parent.id}>
              <TableRow className="group">
                <TableCell>
                  {childTagsMap[parent.id]?.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleExpanded(parent.id)}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          expandedParents.has(parent.id) ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  )}
                </TableCell>
                <TableCell className="font-medium">{parent.tag_name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {parent.tag_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={parent.source === "ai" ? "secondary" : "default"} className="text-xs">
                    {parent.source}
                  </Badge>
                </TableCell>
                <TableCell>
                  {parent.target_chat && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        parent.target_chat === "health" 
                          ? "border-emerald-500/50 text-emerald-400" 
                          : "border-blue-500/50 text-blue-400"
                      }`}
                    >
                      {parent.target_chat === "health" ? "Saúde" : "Estudo"}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              (parent.confidence || 0) >= 0.7 
                                ? "border-green-500/50 text-green-400" 
                                : (parent.confidence || 0) >= 0.5 
                                  ? "border-yellow-500/50 text-yellow-400"
                                  : "border-red-500/50 text-red-400"
                            }`}
                          >
                            {Math.round((parent.confidence || 0) * 100)}%
                          </Badge>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[300px]">
                        <p className="font-semibold">Grau de Confiança</p>
                        <p className="text-sm">Representa a certeza da IA ao classificar este documento.</p>
                        <ul className="text-sm mt-1 list-disc pl-4">
                          <li className="text-green-400">≥70%: Incluída nos scope_topics</li>
                          <li className="text-yellow-400">50-69%: Relevância média</li>
                          <li className="text-red-400">&lt;50%: Baixa relevância</li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCreateChild(parent.id)}
                      className="h-7 w-7 p-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(parent)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete([parent.id], parent.tag_name)}
                      className="h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              {/* Child Tags Rows */}
              {expandedParents.has(parent.id) && childTagsMap[parent.id]?.map((child) => {
                const searchLower = searchTagName.toLowerCase().trim();
                const childMatchesSearch = searchLower && child.tag_name.toLowerCase().includes(searchLower);
                
                return (
                  <TableRow 
                    key={child.id} 
                    className={`group ${childMatchesSearch ? 'bg-yellow-500/20 border-l-2 border-yellow-400' : 'bg-muted/30'}`}
                  >
                    <TableCell></TableCell>
                    <TableCell className="pl-8 text-sm">
                      <span className={childMatchesSearch ? 'text-yellow-300 font-medium' : 'text-muted-foreground'}>
                        ↳ {child.tag_name}
                        {childMatchesSearch && (
                          <Badge variant="outline" className="ml-2 text-xs bg-yellow-500/20 text-yellow-300 border-yellow-500/50">
                            match
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {child.tag_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={child.source === "ai" ? "secondary" : "default"} className="text-xs">
                        {child.source}
                      </Badge>
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          (child.confidence || 0) >= 0.7 
                            ? "border-green-500/50 text-green-400" 
                            : (child.confidence || 0) >= 0.5 
                              ? "border-yellow-500/50 text-yellow-400"
                              : "border-red-500/50 text-red-400"
                        }`}
                      >
                        {Math.round((child.confidence || 0) * 100)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(child)}
                          className="h-7 w-7 p-0"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete([child.id], child.tag_name)}
                          className="h-7 w-7 p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

TagsTable.displayName = "TagsTable";

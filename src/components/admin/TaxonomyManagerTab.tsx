import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Tags, 
  Loader2,
  TreeDeciduous,
  Filter,
  X
} from 'lucide-react';
import {
  useTaxonomyData,
  TaxonomyNode,
  TaxonomyFormData,
  TaxonomyTree,
  TaxonomyDetailsPanel,
  TaxonomyFormModal,
  TaxonomyDeleteModal,
} from './taxonomy-manager';
import { useDebounce } from '@/hooks/useDebounce';

export default function TaxonomyManagerTab() {
  const {
    tree,
    items,
    isLoading,
    createTag,
    updateTag,
    deleteTag,
    isCreating,
    isUpdating,
    isDeleting,
  } = useTaxonomyData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedNode, setSelectedNode] = useState<TaxonomyNode | null>(null);
  const [editingNode, setEditingNode] = useState<TaxonomyNode | null>(null);
  const [deletingNode, setDeletingNode] = useState<TaxonomyNode | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Stats
  const totalTags = items.length;
  const level1Count = items.filter(t => t.level === 1).length;
  const pendingCount = items.filter(t => t.status === 'pending').length;

  const handleCreateTag = async (data: TaxonomyFormData) => {
    await createTag(data);
  };

  const handleUpdateTag = async (data: TaxonomyFormData) => {
    if (!editingNode) return;
    await updateTag({ id: editingNode.id, data });
    setEditingNode(null);
  };

  const handleDeleteTag = async () => {
    if (!deletingNode) return;
    await deleteTag(deletingNode.id);
    if (selectedNode?.id === deletingNode.id) {
      setSelectedNode(null);
    }
    setDeletingNode(null);
  };

  const handleUpdateSynonyms = async (id: string, synonyms: string[]) => {
    await updateTag({ id, data: { synonyms } });
  };

  const handleUpdateKeywords = async (id: string, keywords: string[]) => {
    await updateTag({ id, data: { keywords } });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TreeDeciduous className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Gestor de Taxonomia</h2>
            <p className="text-sm text-muted-foreground">
              Gerencie a hierarquia global de tags
            </p>
          </div>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Tag
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Tags</p>
                <p className="text-2xl font-bold">{totalTags}</p>
              </div>
              <Tags className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Domínios (Nível 1)</p>
                <p className="text-2xl font-bold">{level1Count}</p>
              </div>
              <TreeDeciduous className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
              {pendingCount > 0 ? (
                <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  Revisar
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  OK
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tree Panel */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base">Hierarquia</CardTitle>
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="approved">Ativos</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="deprecated">Obsoletos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <TaxonomyTree
                nodes={tree}
                selectedId={selectedNode?.id || null}
                onSelect={setSelectedNode}
                searchQuery={debouncedSearch}
                statusFilter={statusFilter}
              />
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Details Panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[500px]">
              <TaxonomyDetailsPanel
                node={selectedNode}
                onEdit={(node) => {
                  setEditingNode(node);
                  setIsFormOpen(true);
                }}
                onDelete={setDeletingNode}
                onUpdateSynonyms={handleUpdateSynonyms}
                onUpdateKeywords={handleUpdateKeywords}
                isUpdating={isUpdating}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Modal */}
      <TaxonomyFormModal
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingNode(null);
        }}
        onSubmit={editingNode ? handleUpdateTag : handleCreateTag}
        editingNode={editingNode}
        allNodes={tree}
        isSubmitting={isCreating || isUpdating}
      />

      {/* Delete Modal */}
      <TaxonomyDeleteModal
        open={!!deletingNode}
        onClose={() => setDeletingNode(null)}
        onConfirm={handleDeleteTag}
        node={deletingNode}
        isDeleting={isDeleting}
      />
    </div>
  );
}

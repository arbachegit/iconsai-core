import { useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Loader2, Tag, FileText } from 'lucide-react';
import { TaxonomyNode } from './useTaxonomyData';

interface TaxonomyDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  node: TaxonomyNode | null;
  isDeleting?: boolean;
}

export function TaxonomyDeleteModal({
  open,
  onClose,
  onConfirm,
  node,
  isDeleting,
}: TaxonomyDeleteModalProps) {
  // Count all descendants
  const descendantCount = useMemo(() => {
    if (!node) return 0;
    const count = (n: TaxonomyNode): number => 
      n.children.length + n.children.reduce((acc, c) => acc + count(c), 0);
    return count(node);
  }, [node]);

  // Count all documents in subtree
  const totalDocuments = useMemo(() => {
    if (!node) return 0;
    const count = (n: TaxonomyNode): number => 
      n.documentCount + n.children.reduce((acc, c) => acc + count(c), 0);
    return count(node);
  }, [node]);

  const hasDescendants = descendantCount > 0;
  const hasDocuments = totalDocuments > 0;
  const hasDependencies = hasDescendants || hasDocuments;

  if (!node) return null;

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Excluir Tag
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Você está prestes a excluir a tag <strong>"{node.name}"</strong> ({node.code}).
              </p>

              {hasDependencies && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-2">
                  <p className="font-medium text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Atenção: Esta tag possui dependências
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {hasDescendants && (
                      <Badge variant="outline" className="gap-1">
                        <Tag className="h-3 w-3" />
                        {descendantCount} tag{descendantCount > 1 ? 's' : ''} filha{descendantCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {hasDocuments && (
                      <Badge variant="outline" className="gap-1">
                        <FileText className="h-3 w-3" />
                        {totalDocuments} documento{totalDocuments > 1 ? 's' : ''} vinculado{totalDocuments > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {hasDescendants 
                      ? 'As tags filhas também serão excluídas. Os documentos vinculados perderão suas associações.'
                      : 'Os documentos perderão suas associações com esta tag.'
                    }
                  </p>
                </div>
              )}

              <p className="text-sm">
                Esta ação não pode ser desfeita.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={async (e) => {
              e.preventDefault();
              await onConfirm();
              onClose();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

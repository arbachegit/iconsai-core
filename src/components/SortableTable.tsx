import { useState, useMemo, useCallback } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortConfig {
  column: number;
  direction: 'asc' | 'desc';
}

interface SortableTableProps {
  headers: string[];
  rows: string[][];
  className?: string;
}

export function SortableTable({ headers, rows, className }: SortableTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const handleSort = useCallback((columnIndex: number) => {
    setSortConfig(prev => {
      if (prev?.column === columnIndex) {
        // Toggle direction
        return prev.direction === 'asc' 
          ? { column: columnIndex, direction: 'desc' }
          : null; // Remove sort on third click
      }
      return { column: columnIndex, direction: 'asc' };
    });
  }, []);

  const sortedRows = useMemo(() => {
    if (!sortConfig) return rows;

    return [...rows].sort((a, b) => {
      const aVal = a[sortConfig.column] || '';
      const bVal = b[sortConfig.column] || '';

      // Try numeric sort first
      const aNum = parseFloat(aVal.replace(/[^0-9.-]/g, ''));
      const bNum = parseFloat(bVal.replace(/[^0-9.-]/g, ''));

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // Fallback to string sort
      const comparison = aVal.localeCompare(bVal, 'pt-BR', { sensitivity: 'base' });
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [rows, sortConfig]);

  const getSortIcon = (columnIndex: number) => {
    if (sortConfig?.column !== columnIndex) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
      : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  };

  return (
    <div className={cn("overflow-x-auto my-2", className)}>
      <table className="w-full border-collapse border border-border text-xs">
        <thead className="bg-muted/50">
          <tr className="border-b border-border">
            {headers.map((header, idx) => (
              <th
                key={idx}
                className="border border-border px-2 py-1 text-left font-semibold cursor-pointer hover:bg-muted transition-colors"
                onClick={() => handleSort(idx)}
              >
                <div className="flex items-center justify-between">
                  <span>{header}</span>
                  {getSortIcon(idx)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-b border-border">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="border border-border px-2 py-1">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {sortConfig && (
        <p className="text-[10px] text-muted-foreground mt-1">
          Ordenado por: {headers[sortConfig.column]} ({sortConfig.direction === 'asc' ? '↑' : '↓'})
        </p>
      )}
    </div>
  );
}

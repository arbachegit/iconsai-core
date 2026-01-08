import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { AutocompleteItem } from '@/types/pwa-conversations';
import { X, Search } from 'lucide-react';

interface TaxonomyAutocompleteProps {
  value: string[];
  onChange: (value: string[]) => void;
  suggestions: AutocompleteItem[];
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export const TaxonomyAutocomplete = ({ 
  value, 
  onChange, 
  suggestions, 
  onSearch, 
  placeholder = 'Buscar taxonomia...', 
  className 
}: TaxonomyAutocompleteProps) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setInputValue(query);
    onSearch(query);
    setIsOpen(true);
  };

  const handleSelect = (item: AutocompleteItem) => {
    if (!value.includes(item.value)) {
      onChange([...value, item.value]);
    }
    setInputValue('');
    setIsOpen(false);
  };

  const handleRemove = (itemToRemove: string) => {
    onChange(value.filter(v => v !== itemToRemove));
  };

  return (
    <div className="relative">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {value.map(item => (
            <Badge key={item} variant="secondary" className="text-xs">
              {item}
              <button 
                onClick={() => handleRemove(item)} 
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={placeholder}
          className={`pl-8 ${className}`}
        />
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map(item => (
            <button
              key={item.value}
              onClick={() => handleSelect(item)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span className="text-muted-foreground ml-2">({item.count})</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

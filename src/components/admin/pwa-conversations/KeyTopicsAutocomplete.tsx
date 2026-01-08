import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { AutocompleteItem } from '@/types/pwa-conversations';
import { X, Search, User, Globe2, Building2 } from 'lucide-react';

interface KeyTopicsAutocompleteProps {
  value: string[];
  onChange: (value: string[]) => void;
  suggestions: AutocompleteItem[];
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

const CATEGORY_ICONS = {
  person: User,
  country: Globe2,
  organization: Building2,
};

const CATEGORY_COLORS = {
  person: 'bg-blue-500/20 text-blue-700',
  country: 'bg-green-500/20 text-green-700',
  organization: 'bg-purple-500/20 text-purple-700',
};

export const KeyTopicsAutocomplete = ({ 
  value, 
  onChange, 
  suggestions, 
  onSearch, 
  placeholder = 'Buscar temas...', 
  className 
}: KeyTopicsAutocompleteProps) => {
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
          {suggestions.map(item => {
            const category = item.category as keyof typeof CATEGORY_ICONS;
            const Icon = category ? CATEGORY_ICONS[category] : null;
            const colorClass = category ? CATEGORY_COLORS[category] : '';
            
            return (
              <button
                key={item.value}
                onClick={() => handleSelect(item)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
              >
                {Icon && (
                  <span className={`p-1 rounded ${colorClass}`}>
                    <Icon className="w-3 h-3" />
                  </span>
                )}
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className="text-muted-foreground ml-auto">({item.count})</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

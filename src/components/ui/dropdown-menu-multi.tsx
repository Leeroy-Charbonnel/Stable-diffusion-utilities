import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { Badge } from './badge';
import { Input } from './input';
import { Button } from './button';
import { createPortal } from 'react-dom';

export interface DropDownOption {
  label: string;
  value: string;
}

interface SearchableMultiSelectProps {
  options: DropDownOption[];
  values: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  onChange: (options: DropDownOption[]) => void;
  className?: string;
  dropdownClassName?: string;
  triggerClassName?: string;
  optionClassName?: string;
}

export const SearchableMultiSelect = ({
  options = [],
  values = [],
  placeholder = 'Select items...',
  searchPlaceholder = 'Search...',
  onChange,
  className = '',
  dropdownClassName = '',
  triggerClassName = '',
  optionClassName = ''
}: SearchableMultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<DropDownOption[]>([]);
  const [searchValue, setSearchValue] = useState<string>('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textTruncateSize = 20;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle escape key to close dropdown
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    const valuesArray = Array.isArray(values) ? values : [];
    const optionsArray = Array.isArray(options) ? options : [];

    setSelected(valuesArray.map(value => {
      const option = optionsArray.find(option => option.value === value);
      return option || { label: value, value };
    }));
  }, [values, options]);

  // Focus input and reset search value when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // Reset search filter when opening
      setSearchValue('');
      setHighlightedIndex(0);

      // Focus the input element
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  }, [isOpen]);

  // Ensure options is always treated as an array and filter properly
  const optionsArray = Array.isArray(options) ? options : [];
  const filteredOptions = optionsArray.filter(option =>
    option?.label?.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleSelect = (option: DropDownOption) => {
    let updatedSelection;
    if (selected.some(item => item.value === option.value)) {
      updatedSelection = selected.filter(item => item.value !== option.value);
    } else {
      updatedSelection = [...selected, option];
    }
    setSelected(updatedSelection);
    onChange(updatedSelection);
  };

  const removeItem = (option: DropDownOption, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedSelection = selected.filter(item => item.value !== option.value);
    setSelected(updatedSelection);
    onChange(updatedSelection);
  };

  // Handle arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    // Prevent default behavior for arrow keys to avoid scrolling the page
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
    }

    if (e.key === 'ArrowDown') {
      setHighlightedIndex((prevIndex) =>
        prevIndex >= filteredOptions.length - 1 ? 0 : prevIndex + 1
      );
    } else if (e.key === 'ArrowUp') {
      setHighlightedIndex((prevIndex) =>
        prevIndex <= 0 ? filteredOptions.length - 1 : prevIndex - 1
      );
    } else if (e.key === 'Enter' && filteredOptions[highlightedIndex]) {
      handleSelect(filteredOptions[highlightedIndex]);
    }
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div
        ref={triggerRef}
        className={`flex items-center justify-between w-full h-full ${triggerClassName}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1">
          {selected.length === 0 ? (
            <span className="">{placeholder}</span>
          ) : (
            selected.map(item => (
              <Badge
                key={item.value}
                variant="outline"
                className="flex items-center gap-2 m-0"
              >
                {item.label.length > textTruncateSize ? `${item.label.slice(0, textTruncateSize)}...` : item.label}
                <Button variant={'ghost'} className="cursor-pointer h-4 w-4 !m-0 !p-0 z-10" onClick={e => removeItem(item, e)}>
                  <X className='text-xs' />
                </Button>
              </Badge>
            ))
          )}
        </div>
        <ChevronDown className="w-5 h-5" />
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={`absolute top-full left-0 z-50 bg-secondary rounded-md shadow-lg w-full ${dropdownClassName}`}
          onKeyDown={handleKeyDown}
        >
          <div className="border-b">
            <Input
              ref={inputRef}
              type="text"
              className="w-full border-0 !bg-transparent !ring-0"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  className={`w-full flex items-center justify-between p-3 cursor-pointer ${highlightedIndex === index ? 'bg-accent' : ''
                    } ${selected.some(item => item.value === option.value) ? '' : ''} ${optionClassName}`}
                  onClick={() => handleSelect(option)}
                >
                  <span className='truncate'>{option.label}</span>
                  {selected.some(item => item.value === option.value) && (
                    <Check className="min-w-5 h-5" />
                  )}
                </div>
              ))
            ) : (
              <div className="p-3 text-center">No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
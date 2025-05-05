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
}

export const SearchableMultiSelect = ({
  options: options = [],
  values: values = [],
  placeholder = 'Select items...',
  searchPlaceholder = 'Search...',
  onChange
}: SearchableMultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<DropDownOption[]>([]);
  const [searchValue, setSearchValue] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

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

  useEffect(() => {
    setSelected(values.map(value => {
      const option = options.find(option => option.value === value);
      return option || { label: value, value };
    }));
  }, [values, options]);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchValue.toLowerCase())
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
    console.log('removeItem ' + option.value);
    e.stopPropagation();
    setSelected(selected.filter(item => item.value !== option.value));
    onChange(selected.filter(item => item.value !== option.value));

    console.log(selected.filter(item => item.value !== option.value));
  };

  return (
    <div className="relative w-full h-full">
      <div
        ref={triggerRef}
        className="flex items-center justify-between w-full h-full"
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

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-50 bg-secondary rounded-md shadow-lg"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          <div className="border-b">
            <Input type="text" className="w-full border-0 !bg-transparent !ring-0"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div
                  key={option.value}
                  className={`w-full flex items-center justify-between p-3 cursor-pointer ${selected.some(item => item.value === option.value) ? '' : ''}`}
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
        </div>,
        document.body
      )}
    </div>
  );
};
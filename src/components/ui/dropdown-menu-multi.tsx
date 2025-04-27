import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { Badge } from './badge';
import { Input } from './input';

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

  const textTruncateSize = 20;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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


  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleSelect = (option: DropDownOption) => {
    //Fixed: Only add the option if it's not already selected, otherwise remove it
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
    setSelected(selected.filter(item => item.value !== option.value));
    onChange(selected.filter(item => item.value !== option.value));
  };

  return (
    <div className="relative w-full h-full" ref={dropdownRef}>
      <button
        type="button"
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
                className="flex items-center gap-2 z-30 m-0"
              >
                {item.label.length > textTruncateSize ? `${item.label.slice(0, textTruncateSize)}...` : item.label}
                <X
                  className="cursor-pointer"
                  onClick={e => removeItem(item, e)}
                />
              </Badge>
            ))
          )}
        </div>
        <ChevronDown className="w-5 h-5 " />
      </button>

      {isOpen && (
        <div className="absolute z-20 bg-secondary w-full mt-0 rounded-md shadow-lg">
          <div className="border-b">
            <Input type="text" className="w-full border-0 !bg-transparent !ring-0"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}></Input>
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div
                  key={option.value}
                  className={`w-full flex items-center justify-between p-3 cursor-pointer 
                    ${selected.some(item => item.value === option.value) ? '' : ''}
                  `}
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
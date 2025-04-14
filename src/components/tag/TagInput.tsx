// src/components/tag/TagInput.tsx
import React, { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

interface TagInputProps {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  placeholder?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onAddTag,
  onRemoveTag,
  placeholder = 'Add tags...'
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue.trim());
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      //Remove the last tag when backspace is pressed in an empty input
      onRemoveTag(tags[tags.length - 1]);
    }
  };

  const addTag = (tag: string) => {
    //Normalize tag by trimming and converting to lowercase
    const normalizedTag = tag.trim().toLowerCase();
    
    //Only add if the tag is not empty and doesn't already exist
    if (normalizedTag && !tags.includes(normalizedTag)) {
      onAddTag(normalizedTag);
      setInputValue('');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5 min-h-6">
        {tags.map(tag => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onRemoveTag(tag)}
            >
              <X size={14} />
              <span className="sr-only">Remove {tag}</span>
            </button>
          </Badge>
        ))}
      </div>
      
      <div className="relative">
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pr-10"
        />
        {inputValue.trim() && (
          <button
            type="button"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => addTag(inputValue)}
          >
            <Plus size={16} />
            <span className="sr-only">Add tag</span>
          </button>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Press Enter to add a tag, Backspace to remove the last tag
      </p>
    </div>
  );
};
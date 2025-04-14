// src/components/tag/TagList.tsx
import React from 'react';
import { X } from 'lucide-react';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

interface TagListProps {
  tags: string[];
  selectedTags: string[];
  onTagSelect: (tag: string) => void;
  onTagDeselect: (tag: string) => void;
}

export const TagList: React.FC<TagListProps> = ({
  tags,
  selectedTags,
  onTagSelect,
  onTagDeselect
}) => {
  //Sort tags alphabetically
  const sortedTags = [...tags].sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 min-h-9">
        {selectedTags.length > 0 ? (
          selectedTags.map(tag => (
            <Badge key={tag} variant="default" className="gap-1">
              {tag}
              <button
                type="button"
                className="text-primary-foreground opacity-70 hover:opacity-100 transition-opacity"
                onClick={() => onTagDeselect(tag)}
              >
                <X size={14} />
                <span className="sr-only">Remove {tag}</span>
              </button>
            </Badge>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No tags selected</p>
        )}
      </div>
      
      <div className="border rounded-md">
        <ScrollArea className="h-60 w-full">
          {sortedTags.length > 0 ? (
            <div className="p-2 grid grid-cols-2 gap-1 sm:grid-cols-3">
              {sortedTags.map(tag => (
                <Badge 
                  key={tag} 
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer justify-center"
                  onClick={() => selectedTags.includes(tag) ? onTagDeselect(tag) : onTagSelect(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              No tags available
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Folder, Sliders, Tag, Settings } from 'lucide-react';

interface FilterPanelProps {
  availableTags: string[];
  selectedTags: string[];
  toggleTagFilter: (tag: string) => void;
  
  availableModels: string[];
  selectedModels: string[];
  toggleModelFilter: (model: string) => void;
  
  availableLoras: string[];
  selectedLoras: string[];
  toggleLoraFilter: (lora: string) => void;
  
  availableFolders: string[];
  onFolderSelect: (folder: string) => void;
  
  clearAllFilters: () => void;
}

export function FilterPanel({
  availableTags,
  selectedTags,
  toggleTagFilter,
  
  availableModels,
  selectedModels,
  toggleModelFilter,
  
  availableLoras,
  selectedLoras,
  toggleLoraFilter,
  
  availableFolders,
  onFolderSelect,
  
  clearAllFilters
}: FilterPanelProps) {
  const hasActiveFilters = selectedTags.length > 0 || selectedModels.length > 0 || selectedLoras.length > 0;
  
  return (
    <Card className="p-4">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-lg flex items-center">
          <Sliders className="h-4 w-4 mr-2" />
          Filter Options
        </CardTitle>
      </CardHeader>
      
      {/* Tags Filter */}
      <div className="space-y-3">
        <div>
          <h3 className="font-medium text-sm flex items-center mb-2">
            <Tag className="h-4 w-4 mr-2" />
            Filter by Tags
          </h3>
          {availableTags.length > 0 ? (
            <ScrollArea className="h-48">
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTagFilter(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground py-2">No tags available</p>
          )}
        </div>
        
        {/* Model Filter */}
        <div>
          <h3 className="font-medium text-sm flex items-center mb-2">
            <Settings className="h-4 w-4 mr-2" />
            Filter by Model
          </h3>
          {availableModels.length > 0 ? (
            <ScrollArea className="h-32">
              <div className="flex flex-wrap gap-1.5">
                {availableModels.map((model) => (
                  <Badge
                    key={model}
                    variant={selectedModels.includes(model) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleModelFilter(model)}
                  >
                    {model.length > 20 ? model.substring(0, 18) + "..." : model}
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground py-2">No models available</p>
          )}
        </div>
        
        {/* LoRA Filter */}
        <div>
          <h3 className="font-medium text-sm flex items-center mb-2">
            <Settings className="h-4 w-4 mr-2" />
            Filter by LoRA
          </h3>
          {availableLoras.length > 0 ? (
            <ScrollArea className="h-32">
              <div className="flex flex-wrap gap-1.5">
                {availableLoras.map((lora) => (
                  <Badge
                    key={lora}
                    variant={selectedLoras.includes(lora) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleLoraFilter(lora)}
                  >
                    {lora}
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground py-2">No LoRAs available</p>
          )}
        </div>
        
        {/* Folder Filter */}
        <div>
          <h3 className="font-medium text-sm flex items-center mb-2">
            <Folder className="h-4 w-4 mr-2" />
            Folders
          </h3>
          <ScrollArea className="h-32">
            <div className="space-y-1">
              {availableFolders.map((folder) => (
                <div 
                  key={folder}
                  className="text-sm py-1.5 px-2 rounded hover:bg-accent cursor-pointer flex items-center"
                  onClick={() => onFolderSelect(folder)}
                >
                  <Folder className="h-3 w-3 mr-2" />
                  {folder}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        
        {/* Filter Actions */}
        {hasActiveFilters && (
          <div className="pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={clearAllFilters}
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
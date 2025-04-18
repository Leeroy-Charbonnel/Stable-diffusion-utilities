import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Folder, Sliders, Tag, Settings } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface FilterPanelProps {
  availableTags: string[];
  availableModels: string[];
  availableLoras: string[];
  availableFolders: string[];

  selectedTags: string[];
  selectedModels: string[];
  selectedLoras: string[];
  selectedFolders?: string[];

  toggleTagFilter: (tag: string) => void;
  toggleModelFilter: (model: string) => void;
  toggleLoraFilter: (lora: string) => void;
  onFolderSelect: (folder: string) => void;

  clearAllFilters: () => void;
}

export function FilterPanel({
  availableTags,
  availableModels,
  availableLoras,
  availableFolders,

  selectedTags,
  selectedModels,
  selectedLoras,
  selectedFolders = [],

  toggleTagFilter,
  toggleModelFilter,
  toggleLoraFilter,
  onFolderSelect,

  clearAllFilters
}: FilterPanelProps) {
  const hasActiveFilters = selectedTags.length > 0 || selectedModels.length > 0 || selectedLoras.length > 0 || selectedFolders.length > 0;

  return (
    <Card className="p-4">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-lg flex items-center">
          <Sliders className="h-4 w-4 mr-2" />
          Filter Options
        </CardTitle>
      </CardHeader>

      {/* Tags Filter */}
      <div className="flex flex-col gap-5">
        <div>
          <h3 className="font-medium text-sm flex items-center mb-2">
            <Tag className="h-4 w-4 mr-2" />
            Filter by Tags
          </h3>
          {availableTags.length > 0 ? (
            <ScrollArea className="">
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

        <Separator />

        {/* Model Filter */}
        <div>
          <h3 className="font-medium text-sm flex items-center mb-2">
            <Settings className="h-4 w-4 mr-2" />
            Filter by Model
          </h3>
          {availableModels.length > 0 ? (
            <ScrollArea className="">
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
        <Separator />

        {/* LoRA Filter */}
        <div>
          <h3 className="font-medium text-sm flex items-center mb-2">
            <Settings className="h-4 w-4 mr-2" />
            Filter by LoRA
          </h3>
          {availableLoras.length > 0 ? (
            <ScrollArea className="">
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
        <Separator />

        {/* Folder Filter */}
        <div>
          <h3 className="font-medium text-sm flex items-center mb-2">
            <Folder className="h-4 w-4 mr-2" />
            Filter by Folder
          </h3>
          <ScrollArea className="">
            <div className="flex flex-wrap gap-1.5">
              {availableFolders.map((folder) => (
                <Badge
                  key={folder}
                  variant={selectedFolders.includes(folder) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => onFolderSelect(folder)}
                >
                  {folder}
                </Badge>
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
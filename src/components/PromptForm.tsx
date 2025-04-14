// src/components/PromptForm.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { XIcon, Plus, Check, ChevronsUpDown, Copy, Trash2 } from 'lucide-react';
import { Prompt } from '@/types';
import { cn } from "@/lib/utils";
import { usePromptContext } from '@/contexts/PromptContextProvider';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

type PromptFormProps = {
  prompt?: Prompt;
  onSubmit: (prompt: Prompt) => void;
  onCancel: () => void;
  availableSamplers?: string[];
};

export function PromptForm({ prompt, onSubmit, onCancel, availableSamplers = [] }: PromptFormProps) {
  const { copyPromptText, copyNegativePrompt, copyTags } = usePromptContext();
  const [formData, setFormData] = useState<Omit<Prompt, 'id'>>({
    text: prompt?.text || '',
    negativePrompt: prompt?.negativePrompt || '',
    seed: prompt?.seed,
    steps: prompt?.steps || 20,
    sampler: prompt?.sampler || 'Euler a',
    width: prompt?.width || 512,
    height: prompt?.height || 512,
    runCount: prompt?.runCount || 1,
    tags: prompt?.tags || [],
  });
  
  const [tagInput, setTagInput] = useState('');
  const [samplerOpen, setSamplerOpen] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    //Convert numeric fields
    if (['seed', 'steps', 'width', 'height', 'runCount'].includes(name)) {
      const numValue = value === '' ? undefined : parseInt(value, 10);
      setFormData((prev) => ({ ...prev, [name]: numValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectSampler = (value: string) => {
    setFormData((prev) => ({ ...prev, sampler: value }));
    setSamplerOpen(false);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addTagsFromString(tagInput.trim());
    }
  };

  const addTagsFromString = (input: string) => {
    // Split the input by spaces and process each word as a tag
    const words = input.split(/\s+/).filter(word => word.trim() !== '');
    
    if (words.length > 0) {
      const uniqueTags = words.filter(tag => !formData.tags.includes(tag));
      
      if (uniqueTags.length > 0) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, ...uniqueTags]
        }));
      }
    }
    
    setTagInput('');
  };

  const handleRemoveTag = (tag: string, e: React.MouseEvent) => {
    // Stop propagation to prevent other handlers from being triggered
    e.stopPropagation();
    
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleRemoveAllTags = () => {
    setFormData((prev) => ({
      ...prev,
      tags: []
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: prompt?.id || crypto.randomUUID(),
      ...formData,
    });
  };

  // Ensure we have a formatted list of samplers for the combobox
  const samplerOptions = availableSamplers.map(sampler => ({
    value: sampler,
    label: sampler
  }));

  // If no samplers are available, provide a default list
  const defaultSamplers = [
    { value: 'Euler a', label: 'Euler a' },
    { value: 'Euler', label: 'Euler' },
    { value: 'DPM++ 2M Karras', label: 'DPM++ 2M Karras' },
    { value: 'DPM++ SDE Karras', label: 'DPM++ SDE Karras' },
    { value: 'DPM++ 2M SDE Karras', label: 'DPM++ 2M SDE Karras' },
    { value: 'DDIM', label: 'DDIM' },
    { value: 'LMS', label: 'LMS' },
  ];

  const samplers = samplerOptions.length > 0 ? samplerOptions : defaultSamplers;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3">
        <div>
          <Label htmlFor="text" className="text-xs mb-1">Prompt</Label>
          <ContextMenu>
            <ContextMenuTrigger>
              <Textarea
                id="text"
                name="text"
                value={formData.text}
                onChange={handleChange}
                required
                placeholder="Enter prompt text..."
                className="min-h-20 text-sm cursor-context-menu"
              />
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => copyPromptText(formData.text)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Prompt Text
              </ContextMenuItem>
              <ContextMenuItem 
                onClick={() => {
                  navigator.clipboard.writeText(formData.text);
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy to Clipboard
              </ContextMenuItem>
              <ContextMenuItem 
                onClick={() => setFormData(prev => ({ ...prev, text: '' }))}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Text
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>

        <div>
          <Label htmlFor="negativePrompt" className="text-xs mb-1">Negative Prompt</Label>
          <ContextMenu>
            <ContextMenuTrigger>
              <Textarea
                id="negativePrompt"
                name="negativePrompt"
                value={formData.negativePrompt}
                onChange={handleChange}
                placeholder="Enter negative prompt text... (optional)"
                className="min-h-16 text-sm cursor-context-menu"
              />
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => copyNegativePrompt(formData.negativePrompt || '')}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Negative Prompt
              </ContextMenuItem>
              <ContextMenuItem 
                onClick={() => {
                  navigator.clipboard.writeText(formData.negativePrompt || '');
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy to Clipboard
              </ContextMenuItem>
              <ContextMenuItem 
                onClick={() => setFormData(prev => ({ ...prev, negativePrompt: '' }))}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Text
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="sampler" className="text-xs mb-1">Sampler</Label>
          <Popover open={samplerOpen} onOpenChange={setSamplerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={samplerOpen}
                className="w-full h-8 text-xs justify-between"
              >
                {formData.sampler
                  ? samplers.find((s) => s.value === formData.sampler)?.label || formData.sampler
                  : "Select sampler..."}
                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Search sampler..." className="h-8" />
                <CommandList>
                  <CommandEmpty>No sampler found.</CommandEmpty>
                  <CommandGroup>
                    {samplers.map((sampler) => (
                      <CommandItem
                        key={sampler.value}
                        value={sampler.value}
                        onSelect={handleSelectSampler}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.sampler === sampler.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {sampler.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label htmlFor="seed" className="text-xs mb-1">Seed</Label>
          <Input
            id="seed"
            name="seed"
            type="number"
            value={formData.seed !== undefined ? formData.seed : ''}
            onChange={handleChange}
            placeholder="Random"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="steps" className="text-xs mb-1">Steps</Label>
          <Input
            id="steps"
            name="steps"
            type="number"
            value={formData.steps}
            onChange={handleChange}
            required
            min={1}
            max={150}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="width" className="text-xs mb-1">Width</Label>
          <Input
            id="width"
            name="width"
            type="number"
            value={formData.width}
            onChange={handleChange}
            required
            step={8}
            min={64}
            max={2048}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="height" className="text-xs mb-1">Height</Label>
          <Input
            id="height"
            name="height"
            type="number"
            value={formData.height}
            onChange={handleChange}
            required
            step={8}
            min={64}
            max={2048}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="runCount" className="text-xs mb-1">Run Count</Label>
          <Input
            id="runCount"
            name="runCount"
            type="number"
            value={formData.runCount}
            onChange={handleChange}
            required
            min={1}
            max={100}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center">
          <Label htmlFor="tags" className="text-xs">Tags (separate by space)</Label>
          {formData.tags.length > 0 && (
            <Button 
              type="button" 
              size="sm" 
              variant="ghost" 
              className="h-6 text-xs px-2 text-muted-foreground"
              onClick={handleRemoveAllTags}
            >
              Clear all
            </Button>
          )}
        </div>
        <div className="flex gap-2 mb-2 mt-1">
          <Input
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Type words to add as tags"
            className="h-8 text-sm"
          />
          <Button
            type="button"
            onClick={() => addTagsFromString(tagInput.trim())}
            disabled={!tagInput.trim()}
            size="sm"
            className="h-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ContextMenu>
          <ContextMenuTrigger>
            <div className="flex flex-wrap gap-1 mt-1 min-h-8 cursor-context-menu">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1 text-xs py-0">
                  {tag}
                  <button 
                    type="button" 
                    className="ml-1 h-3 w-3 rounded-full inline-flex items-center justify-center"
                    onClick={(e) => handleRemoveTag(tag, e)}
                    aria-label={`Remove ${tag} tag`}
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {formData.tags.length === 0 && (
                <div className="text-xs text-muted-foreground p-1">No tags added yet</div>
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => copyTags(formData.tags)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy All Tags
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={handleRemoveAllTags} 
              className="text-destructive"
              disabled={formData.tags.length === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove All Tags
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      <div className="flex justify-end space-x-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} size="sm">
          Cancel
        </Button>
        <Button type="submit" size="sm">
          {prompt ? 'Update' : 'Add'}
        </Button>
      </div>
    </form>
  );
}
import React, { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Image as ImageIcon, 
  XIcon, 
  Download, 
  Copy, 
  Plus, 
  TerminalSquare, 
  Repeat 
} from 'lucide-react';
import { GeneratedImage } from '@/types';

interface ImageDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedImage: GeneratedImage | null;
  imageData: string | null;
  onCreatePrompt: () => void;
  onReRunImage: (image: GeneratedImage) => void;
  onDownload: () => void;
  onAddTag: (tag: string) => Promise<void>;
  onRemoveTag: (tag: string) => Promise<void>;
  getImageFolder: (image: GeneratedImage) => string;
}

export function ImageDetailsDialog({
  open, 
  onOpenChange,
  selectedImage,
  imageData,
  onCreatePrompt,
  onReRunImage,
  onDownload,
  onAddTag,
  onRemoveTag,
  getImageFolder
}: ImageDetailsDialogProps) {
  const [tagInput, setTagInput] = useState('');
  const [promptCopied, setPromptCopied] = useState(false);

  const handleCopyPrompt = () => {
    if (!selectedImage) return;

    navigator.clipboard.writeText(selectedImage.prompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  const handleAddTag = async () => {
    if (!tagInput.trim()) return;
    await onAddTag(tagInput);
    setTagInput('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Image Details</DialogTitle>
        </DialogHeader>

        {selectedImage && (
          <div className="grid md:grid-cols-2 gap-4 flex-1 overflow-hidden">
            <div className="relative aspect-square mx-auto max-h-[50vh] overflow-hidden">
              {imageData ? (
                <img
                  src={imageData}
                  alt={selectedImage.prompt}
                  className="object-contain w-full h-full"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-muted">
                  <ImageIcon className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>

            <ScrollArea className="h-[50vh]">
              <div className="space-y-4 p-1">
                <div className="flex justify-between">
                  <h3 className="text-sm font-medium mb-1">Prompt</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyPrompt}
                    className="h-6 px-2"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    {promptCopied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <p className="text-sm">{selectedImage.prompt}</p>

                {selectedImage.negativePrompt && (
                  <div>
                    <h3 className="text-sm font-medium mb-1">Negative Prompt</h3>
                    <p className="text-sm">{selectedImage.negativePrompt}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <h3 className="text-xs font-medium">Seed</h3>
                    <p className="text-sm">{selectedImage.seed ?? 'Random'}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-medium">Steps</h3>
                    <p className="text-sm">{selectedImage.steps}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-medium">Sampler</h3>
                    <p className="text-sm">{selectedImage.sampler}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-medium">Size</h3>
                    <p className="text-sm">{selectedImage.width}×{selectedImage.height}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-medium">Created</h3>
                    <p className="text-sm">
                      {new Date(selectedImage.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-medium">Folder</h3>
                    <p className="text-sm">
                      {getImageFolder(selectedImage)}
                    </p>
                  </div>
                  {selectedImage.model && (
                    <div className="col-span-2">
                      <h3 className="text-xs font-medium">Model</h3>
                      <p className="text-sm">{selectedImage.model}</p>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedImage.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <XIcon
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => onRemoveTag(tag)}
                        />
                      </Badge>
                    ))}
                    {selectedImage.tags.length === 0 && (
                      <p className="text-sm text-muted-foreground">No tags</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add a tag"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddTag}
                      disabled={!tagInput.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCreatePrompt}
          >
            <TerminalSquare className="h-4 w-4 mr-2" />
            Create Prompt
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (selectedImage) {
                onReRunImage(selectedImage);
                onOpenChange(false);
              }
            }}
          >
            <Repeat className="h-4 w-4 mr-2" />
            Re-run Image
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
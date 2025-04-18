import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Image as ImageIcon, XIcon, Download, Copy, TerminalSquare, Repeat, Folder, Hash, Settings2, CheckIcon } from 'lucide-react';
import { ImageMetadata } from '@/types';

interface ImageDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedImage: ImageMetadata | null;
  imageData: string | null;
  onCreatePrompt: () => void;
  onReRunImage: (image: ImageMetadata) => void;
  onDownload: () => void;
  onAddTag: (tag: string) => Promise<void>;
  onRemoveTag: (tag: string) => Promise<void>;
  getImageFolder: (image: ImageMetadata) => string;
}

export function ImageDetailsDialog({
  open,
  onOpenChange,
  selectedImage,
  imageData,
  onCreatePrompt,
  onReRunImage,
  onDownload,
  getImageFolder
}: ImageDetailsDialogProps) {
  const [promptCopied, setPromptCopied] = useState(false);
  const [negativePromptCopied, setNegativePromptCopied] = useState(false);

  const handleCopyPrompt = () => {
    if (!selectedImage) return;

    navigator.clipboard.writeText(selectedImage.prompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  const handleCopyNegativePrompt = () => {
    if (!selectedImage?.negativePrompt) return;

    navigator.clipboard.writeText(selectedImage.negativePrompt);
    setNegativePromptCopied(true);
    setTimeout(() => setNegativePromptCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ImageIcon className="h-5 w-5" />
            Image Details
          </DialogTitle>
        </DialogHeader>

        {selectedImage && (
          <div className="grid md:grid-cols-2 gap-6 flex-1 overflow-hidden">
            {/* Image Preview Section */}
            <div className="flex flex-col gap-4">
              <div className="relative bg-black/5 dark:bg-black/20 rounded-lg p-2 flex items-center justify-center overflow-hidden">
                {imageData ? (
                  <img
                    src={imageData}
                    alt={selectedImage.prompt}
                    className="object-contain max-h-[60vh] rounded shadow-md"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-64 bg-muted rounded-md">
                    <ImageIcon className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Quick Info Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/40 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span>Dimensions</span>
                  </div>
                  <p className="text-lg font-semibold">{selectedImage.width} × {selectedImage.height}</p>
                </div>
                <div className="bg-muted/40 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <span>Folder</span>
                  </div>
                  <p className="text-lg font-semibold">{getImageFolder(selectedImage)}</p>
                </div>
              </div>
            </div>

            {/* Image Details Section */}
            <ScrollArea className="h-[65vh] pr-4">
              <div className="space-y-6">
                {/* Prompt Section */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-md font-semibold flex items-center gap-2">
                      <TerminalSquare className="h-4 w-4" />
                      Prompt
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPrompt}
                      className="h-8"
                    >
                      {promptCopied ? (
                        <>
                          <CheckIcon className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 mr-1.5" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <p className="text-sm whitespace-pre-line">{selectedImage.prompt}</p>
                  </div>
                </div>

                {/* Negative Prompt Section */}
                {selectedImage.negativePrompt && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="text-md font-semibold flex items-center gap-2">
                        <XIcon className="h-4 w-4" />
                        Negative Prompt
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyNegativePrompt}
                        className="h-8"
                      >
                        {negativePromptCopied ? (
                          <>
                            <CheckIcon className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 mr-1.5" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <p className="text-sm whitespace-pre-line">{selectedImage.negativePrompt}</p>
                    </div>
                  </div>
                )}

                {/* Generation Parameters */}
                <div className="space-y-3">
                  <h3 className="text-md font-semibold flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Generation Parameters
                  </h3>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground">Seed</h4>
                      <p className="text-sm font-medium">{selectedImage.seed ?? 'Random'}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground">Steps</h4>
                      <p className="text-sm font-medium">{selectedImage.steps}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground">Sampler</h4>
                      <p className="text-sm font-medium">{selectedImage.sampler}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground">Created</h4>
                      <p className="text-sm font-medium">
                        {new Date(selectedImage.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {selectedImage.model && (
                      <div className="col-span-2">
                        <h4 className="text-xs font-medium text-muted-foreground">Model</h4>
                        <p className="text-sm font-medium">{selectedImage.model}</p>
                      </div>
                    )}

                    {/* LoRAs (if any) */}
                    {selectedImage.loras && selectedImage.loras.length > 0 && (
                      <div className="col-span-2 mt-2">
                        <h4 className="text-xs font-medium text-muted-foreground mb-1">LoRAs</h4>
                        <div className="space-y-1">
                          {selectedImage.loras.map(lora => (
                            <div key={lora.name} className="flex justify-between items-center bg-muted/30 px-3 py-2 rounded">
                              <span className="text-sm">{lora.name}</span>
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {lora.weight.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags Section - READ ONLY, NO EDITING ALLOWED */}
                <div className="space-y-3">
                  <h3 className="text-md font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-tag"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" /><path d="M7 7h.01" /></svg>
                    Tags
                  </h3>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedImage.tags.length > 0 ? (
                      selectedImage.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="px-3 py-1.5 text-sm">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No tags</p>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}

        <Separator className="my-2" />

        <DialogFooter className="gap-2 flex-wrap sm:justify-between">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={onCreatePrompt}
              className="flex items-center"
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
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={onDownload} variant="default">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
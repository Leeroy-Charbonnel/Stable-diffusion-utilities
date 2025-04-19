import { useEffect } from 'react';
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
import { Image as ImageIcon, XIcon, Download, TerminalSquare, Repeat, Folder, Hash, Settings2, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageMetadata } from '@/types';


interface ImageDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: ImageMetadata;
  imageUrl: string | null;
  onCreatePrompt: () => void;
  onReRunImage: (image: ImageMetadata) => void;
  onDownload: () => void;
  onAddTag: (tag: string) => Promise<void>;
  onRemoveTag: (tag: string) => Promise<void>;
  getImageFolder: (image: ImageMetadata) => string;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

export function ImageDetailsDialog({
  open,
  onOpenChange,
  image,
  imageUrl,
  onCreatePrompt,
  onReRunImage,
  onDownload,
  getImageFolder,
  onNavigate
}: ImageDetailsDialogProps) {

  //Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'ArrowLeft' && onNavigate) {
        onNavigate('prev');
      } else if (e.key === 'ArrowRight' && onNavigate) {
        onNavigate('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onNavigate]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ImageIcon className="h-5 w-5" />Image Details</DialogTitle>
        </DialogHeader>


        <div className="grid md:grid-cols-2 gap-6 flex-1 overflow-hidden">
          {/* Image Preview Section */}
          <div className="flex flex-col gap-4 relative">
            <div className="relative bg-black/5 dark:bg-black/20 rounded-lg p-2 flex items-center justify-center overflow-hidden h-[60vh]">

              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={image.prompt}
                  className="object-contain max-h-full max-w-full rounded shadow-md"
                />
              )}



              {/* Navigation Arrows */}
              {onNavigate && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-background/80 h-10 w-10 rounded-full shadow-md hover:bg-background"
                    onClick={() => onNavigate('prev')}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-background/80 h-10 w-10 rounded-full shadow-md hover:bg-background"
                    onClick={() => onNavigate('next')}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}
            </div>

            {/* Quick Info Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/40 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span>Dimensions</span>
                </div>
                <p className="text-lg font-semibold">{image.width} × {image.height}</p>
              </div>
              <div className="bg-muted/40 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  <span>Folder</span>
                </div>
                <p className="text-lg font-semibold">{getImageFolder(image)}</p>
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
                </div>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <p className="text-sm whitespace-pre-line">{image.prompt}</p>
                </div>
              </div>

              {/* Negative Prompt Section */}
              {image.negativePrompt && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-md font-semibold flex items-center gap-2">
                      <XIcon className="h-4 w-4" />
                      Negative Prompt
                    </h3>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <p className="text-sm whitespace-pre-line">{image.negativePrompt}</p>
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
                    <p className="text-sm font-medium">{image.seed ?? 'Random'}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground">Steps</h4>
                    <p className="text-sm font-medium">{image.steps}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground">Sampler</h4>
                    <p className="text-sm font-medium">{image.sampler}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground">Created</h4>
                    <p className="text-sm font-medium">
                      {new Date(image.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {image.model && (
                    <div className="col-span-2">
                      <h4 className="text-xs font-medium text-muted-foreground">Model</h4>
                      <p className="text-sm font-medium">{image.model}</p>
                    </div>
                  )}

                  {/* LoRAs (if any) */}
                  {image.loras && image.loras.length > 0 && (
                    <div className="col-span-2 mt-2">
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">LoRAs</h4>
                      <div className="space-y-1">
                        {image.loras.map(lora => (
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
                  {image.tags.length > 0 ? (
                    image.tags.map((tag) => (
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
                if (image) {
                  onReRunImage(image);
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
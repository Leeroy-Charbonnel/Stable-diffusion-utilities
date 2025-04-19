import { useEffect, useState } from 'react';
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
import { Image as ImageIcon, XIcon, Download, TerminalSquare, Folder, Hash, Settings2, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageMetadata } from '@/types';


interface ImageDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: ImageMetadata;
  imageUrl: string | null;
  onCreatePrompt: (image: ImageMetadata) => void;
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
  onDownload,
  getImageFolder,
  onNavigate,
  onAddTag,
  onRemoveTag
}: ImageDetailsDialogProps) {
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
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onNavigate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="dark text-foreground !max-w-none flex flex-col p-0 gap-0 overflow-hidden w-[90vw] h-[90vh] max-w-[1600px] max-h-[900px] relative inset-0 translate-x-0 translate-y-0"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          transition: "none"
        }}
      >
        {/* Background blur effect using the image itself */}
        {imageUrl && (
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(60px) brightness(0.4)',
              transform: 'scale(1.2)', // Prevent blur edges from showing
              opacity: 0.7
            }}
          />
        )}
        <div className="absolute inset-0 z-0 bg-black/50" /> {/* Additional overlay for better contrast */}
        <DialogHeader className="px-4 py-2 border-b bg-black/30 backdrop-blur-md z-10 relative">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ImageIcon className="h-4 w-4" />Image Details</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden relative z-10">
          {/* Image Preview Section - Modified to ensure square aspect ratio */}
          <div className="relative bg-black/10 aspect-square h-full flex-shrink-0 backdrop-blur-sm flex items-center justify-center">
            {/* Tags overlay on top of image */}
            <div className="absolute top-3 left-0 right-0 z-10 px-4">
              <div className="flex flex-wrap gap-2 justify-center">
                {image.tags.length > 0 ? (
                  image.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="px-2 py-1 text-xs bg-black/60 backdrop-blur-md border border-white/10">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="px-2 py-1 text-xs bg-black/60 backdrop-blur-md">
                    No tags
                  </Badge>
                )}
              </div>
            </div>

            {/* Square image container */}
            <div className="relative w-full h-full">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={image.prompt}
                  className="object-cover w-full h-full"
                />
              )}
            </div>

            {/* Navigation Arrows */}
            {onNavigate && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 h-10 w-10 rounded-full shadow-md hover:bg-black/70 backdrop-blur-sm z-10"
                  onClick={() => onNavigate('prev')}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 h-10 w-10 rounded-full shadow-md hover:bg-black/70 backdrop-blur-sm z-10"
                  onClick={() => onNavigate('next')}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>

          {/* Image Details Section - adjusted width with auto layout */}
          <div className="border-l border-white/10 bg-black/40 backdrop-blur-md w-[420px] flex-shrink-0 overflow-hidden relative z-10">
            <ScrollArea className="h-full px-4 py-3 overflow-y-auto">
              <div className="space-y-4 pr-2">
                {/* Quick Info Cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black/30 p-2 rounded-lg">
                    <div className="flex items-center gap-1 text-xs font-medium mb-1">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      <span>Dimensions</span>
                    </div>
                    <p className="text-sm font-semibold">{image.width} × {image.height}</p>
                  </div>
                  <div className="bg-black/30 p-2 rounded-lg">
                    <div className="flex items-center gap-1 text-xs font-medium mb-1">
                      <Folder className="h-3 w-3 text-muted-foreground" />
                      <span>Folder</span>
                    </div>
                    <p className="text-sm font-semibold truncate">{getImageFolder(image)}</p>
                  </div>
                </div>

                {/* Prompt Section */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold flex items-center gap-1">
                      <TerminalSquare className="h-3 w-3" />
                      Prompt
                    </h3>
                  </div>
                  <div className="bg-black/20 p-2 rounded-lg">
                    <p className="text-xs whitespace-pre-line">{image.prompt}</p>
                  </div>
                </div>

                {/* Negative Prompt Section */}
                {image.negativePrompt && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-semibold flex items-center gap-1">
                        <XIcon className="h-3 w-3" />
                        Negative Prompt
                      </h3>
                    </div>
                    <div className="bg-black/20 p-2 rounded-lg">
                      <p className="text-xs whitespace-pre-line">{image.negativePrompt}</p>
                    </div>
                  </div>
                )}

                {/* Generation Parameters */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-1">
                    <Settings2 className="h-3 w-3" />
                    Generation Parameters
                  </h3>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground">Seed</h4>
                      <p className="font-medium">{image.seed ?? 'Random'}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground">Steps</h4>
                      <p className="font-medium">{image.steps}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground">Sampler</h4>
                      <p className="font-medium">{image.sampler}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground">Created</h4>
                      <p className="font-medium">
                        {new Date(image.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {image.model && (
                      <div className="col-span-2">
                        <h4 className="text-xs font-medium text-muted-foreground">Model</h4>
                        <p className="font-medium">{image.model}</p>
                      </div>
                    )}

                    {/* LoRAs (if any) */}
                    {image.loras && image.loras.length > 0 && (
                      <div className="col-span-2 mt-1">
                        <h4 className="text-xs font-medium text-muted-foreground mb-1">LoRAs</h4>
                        <div className="space-y-1">
                          {image.loras.map(lora => (
                            <div key={lora.name} className="flex justify-between items-center bg-black/30 px-2 py-1 rounded text-xs">
                              <span className="truncate mr-1">{lora.name}</span>
                              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full whitespace-nowrap">
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
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-tag"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" /><path d="M7 7h.01" /></svg>
                    Tags (displayed on image)
                  </h3>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {image.tags.length > 0 ? (
                      image.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="px-2 py-1 text-xs">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No tags</p>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2 p-3 border-t border-white/10 bg-black/50 backdrop-blur-md relative z-10">
          <div className="flex gap-2 flex-wrap sm:justify-between w-full">
            <Button
              variant="outline"
              onClick={() => onCreatePrompt(image)}
              className="flex items-center"
              size="sm"
            >
              <TerminalSquare className="h-4 w-4 mr-2" />
              Create Prompt
            </Button>

            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
                Close
              </Button>
              <Button onClick={onDownload} variant="default" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
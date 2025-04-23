import { useEffect, useState, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image as ImageIcon, XIcon, Download, TerminalSquare, Folder, Hash, Settings2, ChevronLeft, ChevronRight, Trash2, FolderClosed } from 'lucide-react';
import { ImageMetadata } from '@/types';
import { getImageFromPath } from '@/services/apiFS';

interface ImageDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: ImageMetadata;
  imageUrl: string | null;
  onCreatePrompt: (image: ImageMetadata) => void;
  onDownload: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  onDeleteClick: (image: ImageMetadata) => void;
  onMoveToFolder: (imageId: string, folder: string) => void;
  availableFolders: string[];
}

export function ImageDetailsDialog({
  open,
  onOpenChange,
  image,
  imageUrl,
  onCreatePrompt,
  onDownload,
  onNavigate,
  onDeleteClick,
  onMoveToFolder,
  availableFolders
}: ImageDetailsDialogProps) {
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [targetFolder, setTargetFolder] = useState<string>(image.folder);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(imageUrl);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setTargetFolder(image.folder);
  }, [image]);

  useEffect(() => {
    //If we already have an image URL from props, use it
    if (imageUrl) {
      setLocalImageUrl(imageUrl);
      return;
    }

    //Otherwise load from path if available
    const loadImage = async () => {
      if (!image?.path) return;

      setIsLoading(true);
      try {
        const imageUrl = await getImageFromPath(image.path);
        if (imageUrl) {
          setLocalImageUrl(imageUrl);
        }
      } catch (error) {
        console.error('Error loading image:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (open && image) {
      loadImage();
    }

    return () => {
      //Clean up blob URL when component unmounts
      if (localImageUrl && localImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(localImageUrl);
      }
    };
  }, [image, open, imageUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'ArrowLeft' && onNavigate) {
        onNavigate('prev');
      } else if (e.key === 'ArrowRight' && onNavigate) {
        onNavigate('next');
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onNavigate, onOpenChange]);

  useEffect(() => {
    //Prevent body scrolling when dialog is open
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleMoveToFolder = async () => {
    await onMoveToFolder(image.id, targetFolder);
    setMoveDialogOpen(false);
  };

  const handleDeleteImage = () => {
    onDeleteClick(image);
    onOpenChange(false);
  };

  //Don't render anything if dialog is closed
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      >
        <div
          ref={dialogRef}
          className="flex flex-col fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[1200px] h-[90vh] z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Background blur effect */}
          {localImageUrl && (
            <div
              className="absolute inset-0 z-0"
              style={{
                backgroundImage: `url(${localImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(60px) brightness(0.4)',
                transform: 'scale(1.2)', // Prevent blur edges from showing
                opacity: 0.7
              }}
            />
          )}
          <div className="absolute inset-0 z-0 bg-black/50" /> {/* Additional overlay */}

          {/* Header */}
          <div className="px-4 py-2 border-b bg-black/30 backdrop-blur-md z-10 relative flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-medium flex-1">
              <ImageIcon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{image.name || 'Untitled Image'}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              <XIcon className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-1 overflow-hidden relative z-10 h-full">
            {/* Image Preview Section */}
            <div className="relative bg-black/10 h-full flex-1 backdrop-blur-sm flex items-center justify-center">
              {isLoading ? (
                <div className="flex items-center justify-center w-full h-full">
                  <div className="h-12 w-12 rounded-full border-2 border-primary/50 border-t-primary animate-spin" />
                </div>
              ) : localImageUrl ? (
                <img
                  src={localImageUrl}
                  alt={image.prompt}
                  className="object-contain w-full h-full"
                  loading="lazy"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-16 w-16 mb-2 opacity-50" />
                  <p>Image not available</p>
                </div>
              )}

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

            {/* Image Details Section - Fixed width sidebar */}
            <div className="border-l border-white/10 bg-black/40 backdrop-blur-md w-[320px] flex-shrink-0 flex flex-col h-full">
              <ScrollArea className="flex-1 px-4 py-3">
                <div className="space-y-4 pr-2">
                  {/* Action Buttons */}
                  <div className="flex gap-2 mb-4">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setMoveDialogOpen(true)}>
                      <FolderClosed className="h-4 w-4 mr-2" />
                      Move to Folder
                    </Button>
                    <Button variant="destructive" size="sm" className="flex-1" onClick={handleDeleteImage}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Image
                    </Button>
                  </div>

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
                      <p className="text-sm font-semibold truncate">{image.folder}</p>
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
                                <span className="text-xs bg-primary/10 text-primary-foreground px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                  {lora.weight.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tags Section */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Tags</h3>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {image.tags && image.tags.length > 0 ? (
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

              {/* Footer */}
              <div className="p-3 border-t border-white/10 bg-black/50 backdrop-blur-md">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => onCreatePrompt(image)}
                    className="w-full"
                    size="sm"
                  >
                    <TerminalSquare className="h-4 w-4 mr-1" />
                    Create Prompt
                  </Button>
                  <Button
                    onClick={onDownload}
                    variant="default"
                    size="sm"
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Move to Folder Dialog */}
      <AlertDialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Image to Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Select a destination folder for this image.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Select value={targetFolder} onValueChange={setTargetFolder}>
              <SelectTrigger>
                <SelectValue placeholder="Select a folder" />
              </SelectTrigger>
              <SelectContent>
                {availableFolders.map(folder => (
                  <SelectItem key={folder} value={folder}>
                    {folder}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMoveToFolder}>
              Move Image
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
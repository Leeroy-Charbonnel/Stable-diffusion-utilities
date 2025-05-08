import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Image as ImageIcon, XIcon, Download, TerminalSquare, Folder, Hash, Settings2, ChevronLeft, ChevronRight, Trash2, FolderClosed, CheckSquare } from 'lucide-react';
import { ImageMetadata } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Checkbox } from '../ui/checkbox';

interface ImageDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: ImageMetadata;
  imageUrl: string | null;
  isSelected: boolean;
  toggleSelection: (imageId: string) => void;
  onCreatePrompt: (image: ImageMetadata) => void;
  onDownload: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onDeleteClick: (image: ImageMetadata) => void;
  onMoveToFolder: (imageId: string, folder: string) => void;
  availableFolders: string[];
}

export function ImageDetailsDialog({
  open,
  onOpenChange,
  image,
  imageUrl,
  isSelected,
  toggleSelection,
  onCreatePrompt,
  onDownload,
  onNavigate,
  onDeleteClick,
  onMoveToFolder,
  availableFolders
}: ImageDetailsDialogProps) {

  const dialogRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(imageUrl);

  //Zoom and pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  //Reference for animation frame
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalImageUrl(imageUrl);
    setScale(1);
    setPosition({ x: 0, y: 0 });

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [image.path, image.folder, open, imageUrl]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'ArrowLeft' && onNavigate) {
        onNavigate('prev');
      } else if (e.key === 'ArrowRight' && onNavigate) {
        onNavigate('next');
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      } else if (e.key === 'Delete') {
        handleDeleteImage();
      } else if (e.key === 'm') {
        setMoveDialogOpen(true);
      } else if (e.code === 'Space') {
        toggleSelection(image.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [open, onNavigate, onOpenChange]);

  const handleDeleteImage = () => {
    onDeleteClick(image);
  };

  const handleMoveImage = (folder: string) => {
    image.folder = folder;
    onMoveToFolder(image.id, folder);
    setMoveDialogOpen(false);
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(1, Math.min(5, scale + delta));

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      setScale(newScale);
      animationFrameRef.current = null;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        setPosition({ x: newX, y: newY });
        animationFrameRef.current = null;
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const handleDoubleClick = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      animationFrameRef.current = null;
    });
  };

  if (!open) return null;

  return (
    <>
      <div className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm`} onClick={() => onOpenChange(false)}>
        <div ref={dialogRef} className={`absolute flex flex-col top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2/3 h-[98vh] z-50 overflow-hidden`} onClick={(e) => e.stopPropagation()} >
          {/* Background blur effect */}

          {localImageUrl && (
            <div
              className="absolute inset-0 z-0"
              style={{
                background:"var(--background)",
                backgroundImage: `url(${localImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(60px) brightness(0.4)', transform: 'scale(1.2)', opacity: 1
              }}
            />
          )}

          {/* Header */}
          <div className="px-4 py-2 border-b bg-background backdrop-blur-md z-10 relative flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-medium flex-1">
              <ImageIcon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{image.promptData.name || 'Untitled Image'}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              <XIcon className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-1 overflow-hidden relative z-10 h-full">
            {/* Image Preview Section */}
            <div
              className="relative bg-black/10 h-full flex-1 backdrop-blur-sm flex items-center justify-center overflow-hidden"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onDoubleClick={handleDoubleClick}
              ref={imageContainerRef}
              style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            >

              <Checkbox
                checked={isSelected}
                className="border-1 border-neutral-500 rounded-none !bg-background/50 absolute top-3 left-3 z-10"
                onClick={(e) => { e.stopPropagation(); toggleSelection(image.id); }}
              />

              {!localImageUrl ? (
                <div className="flex items-center justify-center w-full h-full">
                  <div className="h-12 w-12 border-2 rounded-full border-primary/50 border-t-primary animate-spin" />
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={localImageUrl}
                    className={`object-contain max-w-full max-h-full select-none`}
                    loading="lazy"
                    draggable={false}
                    style={{
                      transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                      transformOrigin: 'center',
                    }}
                  />
                </div>
              )}


              {/* Navigation Arrows */}
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-background h-10 w-10 cursor-pointer z-10"
                  onClick={() => onNavigate('prev')}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-background h-10 w-10 cursor-pointer z-10"
                  onClick={() => onNavigate('next')}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>

              {/* Zoom indicator */}
              {scale > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-background/80 text-xs px-2 py-1 rounded-full">
                  {Math.round(scale * 100)}%
                </div>
              )}
            </div>

            {/* Image Details Section - Fixed width sidebar */}
            <div className="border-l bg-background  w-[320px] flex-shrink-0 flex flex-col h-full">
              <ScrollArea className="flex-1 px-4 py-3 h-0">
                <div className="space-y-4 pr-2">
                  {/* Action Buttons */}
                  <div className="flex gap-2 mb-4">


                    <Popover open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1">
                          <FolderClosed className="h-4 w-4 mr-2" />
                          Move to Folder
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-52" align="end">
                        <div className="space-y-2">
                          <div className="space-y-1 max-h-52 overflow-y-auto">
                            {availableFolders.map(folder => (
                              <div
                                key={folder}
                                className={`text-sm px-2 py-1.5 rounded cursor-pointer flex items-center ${image.folder === folder
                                  ? 'bg-accent text-accent-foreground'
                                  : 'hover:bg-accent hover:text-accent-foreground'
                                  }`}
                                onClick={() => {
                                  if (image.folder !== folder) { handleMoveImage(folder) }
                                }}
                              >
                                {image.folder === folder && <CheckSquare className="mr-2 h-4 w-4" />}
                                {folder}
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>



                    <Button variant="destructive" size="sm" className="flex-1" onClick={handleDeleteImage}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Image
                    </Button>
                  </div>

                  {/* Quick Info Cards */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2">
                      <div className="flex items-center gap-1 text-xs font-medium mb-1">
                        <Hash className="h-3 w-3 text-muted-foreground" />
                        <span>Dimensions</span>
                      </div>
                      <p className="text-sm font-semibold">{image.promptData.width} × {image.promptData.height}</p>
                    </div>
                    <div className="p-2">
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
                        <TerminalSquare className="h-3 w-3" />Prompt
                      </h3>
                    </div>
                    <div className="p-2">
                      <p className="text-xs whitespace-pre-line">{image.promptData.text}</p>
                    </div>
                  </div>

                  {/* Negative Prompt Section */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-semibold flex items-center gap-1">
                        <XIcon className="h-3 w-3" />Negative Prompt
                      </h3>
                    </div>
                    <div className="p-2">
                      <p className="text-xs whitespace-pre-line">{image.promptData.negativePrompt}</p>
                    </div>
                  </div>

                  {/* Generation Parameters */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-1">
                      <Settings2 className="h-3 w-3" />
                      Generation Parameters
                    </h3>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground">Seed</h4>
                        <p className="font-medium">{image.promptData.seed ?? 'Random'}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground">Steps</h4>
                        <p className="font-medium">{image.promptData.steps}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground">Sampler</h4>
                        <p className="font-medium">{image.promptData.sampler}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground">Created</h4>
                        <p className="font-medium">
                          {new Date(image.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground">CFG Scale</h4>
                        <p className="font-medium">
                          {image.promptData.cfgScale}
                        </p>
                      </div>

                      <div className="col-span-2">
                        <h4 className="text-xs font-medium text-muted-foreground">Model</h4>
                        <p className="font-medium">{image.promptData.model}</p>
                      </div>

                      {/* Loras */}
                      {image.promptData.loras.length > 0 && (
                        <div className="col-span-2 mt-1">
                          <h4 className="text-xs font-medium text-muted-foreground mb-1">LoRAs</h4>
                          <div className="space-y-1">
                            {image.promptData.loras.map(lora => (
                              <div key={lora.name} className="flex justify-between items-center text-xs">
                                <span className="truncate mr-1">{lora.name}</span>
                                <span className="text-xs bg-primary/10 text-primary-foreground px-1.5 py-0.5 whitespace-nowrap">
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
                      {image.promptData.tags && image.promptData.tags.length > 0 ? (
                        image.promptData.tags.map((tag) => (
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
              <div className="p-3 border-t bg-background">
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
      </div >
    </>
  );
}
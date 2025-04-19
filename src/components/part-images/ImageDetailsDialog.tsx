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
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image as ImageIcon, XIcon, Download, TerminalSquare, Folder, Hash, Settings2, ChevronLeft, ChevronRight, Trash2, FolderClosed, Tag, Plus, Edit, Check } from 'lucide-react';
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
  onDeleteClick: (image: ImageMetadata) => void;
  onMoveToFolder: (imageId: string, folder: string) => void;
  availableFolders: string[];
  onUpdateName?: (imageId: string, name: string) => Promise<void>;
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
  onRemoveTag,
  onDeleteClick,
  onMoveToFolder,
  availableFolders,
  onUpdateName
}: ImageDetailsDialogProps) {
  const [newTag, setNewTag] = useState('');
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [targetFolder, setTargetFolder] = useState<string>(getImageFolder(image));
  const dialogRef = useRef<HTMLDivElement>(null);

  //Name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(image.name || '');

  useEffect(() => {
    //Reset name value when image changes
    if (image) {
      setNameValue(image.name || '');
    }
  }, [image]);

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

  const handleAddTag = async () => {
    if (newTag.trim()) {
      await onAddTag(newTag.trim());
      setNewTag('');
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleMoveToFolder = async () => {
    await onMoveToFolder(image.id, targetFolder);
    setMoveDialogOpen(false);
  };

  const handleDeleteImage = () => {
    onDeleteClick(image);
    onOpenChange(false);
  };

  const handleSaveName = async () => {
    if (nameValue.trim() && onUpdateName) {
      await onUpdateName(image.id, nameValue.trim());
      setIsEditingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setNameValue(image.name || '');
    }
  };

  //Don't render anything if the dialog is closed
  if (!open) return null;

  return (
    <>
      {/* Custom dialog without animations */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      >
        <div
          ref={dialogRef}
          className="dark text-foreground flex flex-col p-0 gap-0 overflow-hidden w-[90vw] h-[90vh] max-w-[1600px] max-h-[900px] fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          onClick={(e) => e.stopPropagation()}
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

          {/* Header */}
          <div className="px-4 py-2 border-b bg-black/30 backdrop-blur-md z-10 relative flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-medium">
              <ImageIcon className="h-4 w-4" />
              Image Details
            </div>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              <XIcon className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-1 overflow-hidden relative z-10">
            {/* Image Preview Section */}
            <div className="relative bg-black/10 aspect-square h-full flex-shrink-0 backdrop-blur-sm flex items-center justify-center">
              {/* Image name at the top */}
              <div className="absolute top-4 left-0 right-0 z-10 px-4">
                <div className="bg-black/60 backdrop-blur-md rounded-md p-2 max-w-lg mx-auto">
                  {isEditingName ? (
                    <div className="flex gap-2 items-center">
                      <Input
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        onKeyDown={handleNameKeyDown}
                        className="h-8 text-sm"
                        placeholder="Enter image name..."
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSaveName}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <h2 className="text-lg font-semibold text-center text-white truncate">
                        {image.name || 'Untitled Image'}
                      </h2>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditingName(true)}
                        className="h-6 w-6 p-0 text-white/70 hover:text-white"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Square image container */}
              <div className="relative w-full h-full">
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt={image.prompt}
                    className="object-contain w-full h-full"
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

            {/* Image Details Section - Fixed to fill available height */}
            <div className="border-l border-white/10 bg-black/40 backdrop-blur-md w-[420px] flex-shrink-0 flex flex-col h-full">
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

                  {/* Tags Section - With editing capability */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Tags
                    </h3>

                    {/* Add tag input */}
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        placeholder="Add new tag..."
                        className="h-8 text-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={handleAddTag}
                        disabled={!newTag.trim()}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2">
                      {image.tags.length > 0 ? (
                        image.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="px-2 py-1 text-xs flex items-center gap-1">
                            {tag}
                            <button
                              onClick={() => onRemoveTag(tag)}
                              className="ml-1 hover:text-destructive rounded-full"
                            >
                              <XIcon className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No tags added yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>

              {/* Footer stays at bottom of the detail section */}
              <div className="p-3 border-t border-white/10 bg-black/50 backdrop-blur-md">
                <Button
                  variant="outline"
                  onClick={() => onCreatePrompt(image)}
                  className="flex items-center w-full"
                  size="sm"
                >
                  <TerminalSquare className="h-4 w-4 mr-2" />
                  Create Prompt
                </Button>
                <Button
                  onClick={onDownload}
                  variant="default"
                  size="sm"
                  className="w-full mt-2"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
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
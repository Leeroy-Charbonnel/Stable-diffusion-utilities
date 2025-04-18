import React from 'react';
import { Card, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Folder, CheckSquare, Image as ImageIcon, Trash2, InfoIcon, Pencil } from 'lucide-react';
import { ImageMetadata } from '@/types';
import { getImageUrl } from '@/services/fileSystemApi';

interface ImageCardProps {
  image: ImageMetadata;
  isSelected: boolean;
  toggleSelection: (imageId: string) => void;
  onImageClick: (image: ImageMetadata) => void;
  onMoveToFolder: (imageId: string, folder: string) => void;
  onCreatePrompt: () => void;
  onDeleteClick: (image: ImageMetadata) => void;
  onReRunClick: (image: ImageMetadata) => void;
  availableFolders: string[];
  onContextMenu: (e: React.MouseEvent, imageId: string) => void;
}

export function ImageCard({
  image,
  isSelected,
  toggleSelection,
  onImageClick,
  onMoveToFolder,
  onCreatePrompt,
  onDeleteClick,
  availableFolders,
  onContextMenu,
}: ImageCardProps) {
  const imageFolder = image.folder;
  const imageUrl = getImageUrl(image.id);

  //Format the creation date nicely
  const formattedDate = new Date(image.createdAt).toLocaleDateString();

  return (
    <Card
      key={image.id}
      className={`overflow-hidden group relative ${isSelected ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-accent-foreground/20'}`}
      onContextMenu={(e) => onContextMenu(e, image.id)}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <Checkbox
          checked={isSelected}
          className="h-5 w-5 bg-background/80 rounded-sm shadow-md border-0 transition-all"
          onClick={(e) => {
            e.stopPropagation();
            toggleSelection(image.id);
          }}
        />
      </div>

      {/* Quick Actions */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-background/80 rounded-full hover:bg-background shadow-md">
              <Folder className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="end">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Move to folder</h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {availableFolders.map(folder => (
                  <div
                    key={folder}
                    className={`text-sm px-2 py-1.5 rounded cursor-pointer flex items-center ${imageFolder === folder
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                      }`}
                    onClick={() => {
                      if (imageFolder !== folder) {
                        onMoveToFolder(image.id, folder);
                      }
                    }}
                  >
                    {imageFolder === folder && <CheckSquare className="mr-2 h-4 w-4" />}
                    {folder}
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Image Preview */}
      <div className="relative aspect-square overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={image.prompt}
            className="object-cover w-full h-full cursor-pointer transition-transform duration-300 group-hover:scale-105"
            onClick={() => onImageClick(image)}
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center bg-muted cursor-pointer"
            onClick={() => onImageClick(image)}
          >
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => onImageClick(image)} className="h-8"><InfoIcon className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="secondary" onClick={onCreatePrompt} className="h-8"><Pencil className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="destructive" onClick={() => onDeleteClick(image)} className="h-8"><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>

          {/* Display Size */}
          <div className="absolute bottom-2 left-2 text-xs text-white/80 bg-black/50 px-2 py-1 rounded">
            {image.width}×{image.height}
          </div>

          {/* Display Date */}
          <div className="absolute bottom-2 right-2 text-xs text-white/80 bg-black/50 px-2 py-1 rounded">
            {formattedDate}
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <CardFooter className="flex flex-col items-start p-3">
        <div className="flex justify-between w-full items-start mb-2">
          <p className="text-sm line-clamp-2 font-medium leading-tight">
            {image.prompt.length > 80
              ? image.prompt.substring(0, 80) + "..."
              : image.prompt}
          </p>
        </div>

        <div className="flex justify-between w-full">
          {/* Folder Badge */}
          {imageFolder !== 'default' && (
            <Badge variant="outline" className="rounded-full">
              <Folder className="h-3 w-3 mr-1" />{imageFolder}
            </Badge>
          )}

          <div className="flex-1" />

          {/* Tags */}
          {image.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 justify-end">
              {image.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs rounded-full px-2">
                  {tag}
                </Badge>
              ))}
              {image.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs rounded-full px-2">
                  +{image.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
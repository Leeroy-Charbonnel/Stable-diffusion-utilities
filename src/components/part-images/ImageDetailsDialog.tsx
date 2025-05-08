// src/components/part-images/ImageDetailsDialog.tsx
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { XIcon, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageMetadata } from '@/types';

interface ImageDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: ImageMetadata;
  imageUrl: string | null;
  onDownload: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}

export function ImageDetailsDialog({
  open,
  onOpenChange,
  image,
  imageUrl,
  onDownload,
  onNavigate,
}: ImageDetailsDialogProps) {

  const dialogRef = useRef<HTMLDivElement>(null);
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
              <span className="truncate">{image.id}</span>
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
          </div>

          {/* Footer */}
          <div className="p-3 border-t bg-background">
            <div className="grid grid-cols-1 gap-2">
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
    </>
  );
}
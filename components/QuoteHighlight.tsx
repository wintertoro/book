'use client';

import { useState, useRef, useEffect } from 'react';

interface QuoteHighlightProps {
  imageUrl: string;
  onSelect: (boundingBox: { x: number; y: number; width: number; height: number }, imageFile: File) => void;
  isProcessing?: boolean;
}

export default function QuoteHighlight({ imageUrl, onSelect, isProcessing }: QuoteHighlightProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [selection, setSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    // Load image file for OCR
    fetch(imageUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'page.jpg', { type: 'image/jpeg' });
        setImageFile(file);
      })
      .catch(console.error);
  }, [imageUrl]);

  const getRelativeCoordinates = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isProcessing) return;
    const pos = getRelativeCoordinates(e.clientX, e.clientY);
    setIsSelecting(true);
    setStartPos(pos);
    setCurrentPos(pos);
    setSelection(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !startPos) return;
    const pos = getRelativeCoordinates(e.clientX, e.clientY);
    setCurrentPos(pos);
  };

  const handleMouseUp = () => {
    if (!isSelecting || !startPos || !currentPos) return;
    
    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    if (width > 10 && height > 10 && imageFile) {
      const boundingBox = { x, y, width, height };
      setSelection(boundingBox);
      onSelect(boundingBox, imageFile);
    }

    setIsSelecting(false);
    setStartPos(null);
    setCurrentPos(null);
  };

  const getSelectionStyle = () => {
    if (!startPos || !currentPos) return null;

    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    return {
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  };

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        className="relative border-2 border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isSelecting ? 'crosshair' : 'default' }}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Page"
          className="w-full h-auto block"
          draggable={false}
        />
        
        {isSelecting && getSelectionStyle() && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none z-10"
            style={getSelectionStyle()}
          />
        )}

        {selection && !isSelecting && (
          <div
            className="absolute border-2 border-green-500 bg-green-500/20 pointer-events-none z-10"
            style={{
              left: `${selection.x}px`,
              top: `${selection.y}px`,
              width: `${selection.width}px`,
              height: `${selection.height}px`,
            }}
          />
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-20">
            <div className="bg-white dark:bg-black px-4 py-2 rounded-lg shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Extracting quote...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {!isProcessing && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          Click and drag to select a quote on the page
        </p>
      )}
    </div>
  );
}


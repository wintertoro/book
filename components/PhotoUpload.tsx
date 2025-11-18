'use client';

import { useState, useRef } from 'react';

interface PhotoUploadProps {
  onUpload: (file: File) => Promise<void>;
  isProcessing: boolean;
}

export default function PhotoUpload({ onUpload, isProcessing }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = (file: File) => {
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    // Upload file
    onUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFile(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const triggerCameraInput = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        className="border border-dashed border-gray-200 p-12 text-center cursor-pointer hover:border-gray-300 transition-colors bg-transparent"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={triggerFileInput}
      >
        {preview ? (
          <div className="space-y-6">
            <img
              src={preview}
              alt="Preview"
              className="max-h-64 mx-auto"
            />
            {isProcessing && (
              <div className="space-y-3">
                <div className="text-xs font-light text-gray-500 text-center">
                  Processing...
                </div>
                <div className="w-full max-w-xs mx-auto bg-gray-100 h-px">
                  <div className="bg-gray-400 h-px animate-pulse" style={{ width: '100%' }}></div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-light text-gray-600">
                Drag and drop an image or click to select
              </p>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-6 flex gap-3 justify-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isProcessing}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isProcessing}
        />
        
        <button
          onClick={triggerFileInput}
          disabled={isProcessing}
          className="px-4 py-1.5 text-xs font-light text-gray-600 hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-gray-200 hover:border-gray-300"
        >
          Choose File
        </button>
        
        <button
          onClick={triggerCameraInput}
          disabled={isProcessing}
          className="px-4 py-1.5 text-xs font-light text-gray-600 hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-gray-200 hover:border-gray-300"
        >
          Camera
        </button>
        
        {preview && !isProcessing && (
          <button
            onClick={() => setPreview(null)}
            className="px-4 py-1.5 text-xs font-light text-gray-400 hover:text-gray-600 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}


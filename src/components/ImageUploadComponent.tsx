import React, { useState, useRef } from 'react';
import { ImageUploadService } from '../utils/imageUpload';
import { Upload, Link, X, Check, AlertCircle } from 'lucide-react';

interface ImageUploadComponentProps {
  onImageUploaded: (url: string) => void;
  currentImageUrl?: string;
  placeholder?: string;
  className?: string;
}

export const ImageUploadComponent: React.FC<ImageUploadComponentProps> = ({
  onImageUploaded,
  currentImageUrl,
  placeholder = "Upload image or enter URL",
  className = ""
}) => {
  const [uploading, setUploading] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const imageUrl = await ImageUploadService.uploadImage(file);
      onImageUploaded(imageUrl);
      setShowUrlInput(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUrlSubmit = async () => {
    if (!manualUrl.trim()) return;

    setUploading(true);
    setError('');

    try {
      if (ImageUploadService.isValidImageUrl(manualUrl)) {
        onImageUploaded(manualUrl);
        setManualUrl('');
        setShowUrlInput(false);
      } else {
        throw new Error('Please enter a valid image URL');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Invalid URL');
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    onImageUploaded('');
    setManualUrl('');
    setShowUrlInput(false);
    setError('');
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Current Image Preview */}
      {currentImageUrl && (
        <div className="relative inline-block">
          <img 
            src={currentImageUrl} 
            alt="Preview" 
            className="h-20 w-20 rounded-lg object-cover border-2 border-gray-300 shadow-md"
            onError={(e) => {
              console.error('Failed to load image:', currentImageUrl);
              setError('Failed to load image');
            }}
          />
          <button
            onClick={clearImage}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Upload Controls */}
      <div className="flex space-x-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          <Upload className="h-4 w-4" />
          <span>{uploading ? 'Uploading...' : 'Upload'}</span>
        </button>

        <button
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200"
        >
          <Link className="h-4 w-4" />
          <span>URL</span>
        </button>
      </div>

      {/* Manual URL Input */}
      {showUrlInput && (
        <div className="space-y-2">
          <div className="flex space-x-2">
            <input
              type="url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleUrlSubmit}
              disabled={uploading || !manualUrl.trim()}
              className="flex items-center space-x-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Check className="h-4 w-4" />
              <span>Add</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-2 rounded-lg border border-red-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="flex items-center space-x-2 text-blue-600 text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Processing image...</span>
        </div>
      )}
    </div>
  );
};
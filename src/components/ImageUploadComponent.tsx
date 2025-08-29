import React, { useState, useRef } from 'react';
import { ImageUploadService } from '../utils/imageUpload';
import { PexelsService } from '../utils/pexelsService';
import { Upload, Link, X, Check, AlertCircle, Search, Image } from 'lucide-react';

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
  const [showPexelsSearch, setShowPexelsSearch] = useState(false);
  const [pexelsQuery, setPexelsQuery] = useState('');
  const [pexelsResults, setPexelsResults] = useState<any[]>([]);
  const [searchingPexels, setSearchingPexels] = useState(false);
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
    setPexelsQuery('');
    setPexelsResults([]);
    setShowUrlInput(false);
    setShowPexelsSearch(false);
    setError('');
  };

  const searchPexels = async () => {
    if (!pexelsQuery.trim()) return;
    
    setSearchingPexels(true);
    setError('');
    
    try {
      const photos = await PexelsService.searchPhotos(pexelsQuery, 12);
      setPexelsResults(photos);
    } catch (error) {
      setError('Failed to search Pexels. Please try again.');
      console.error('Pexels search error:', error);
    } finally {
      setSearchingPexels(false);
    }
  };

  const selectPexelsImage = (photo: any) => {
    const imageUrl = PexelsService.getOptimizedImageUrl(photo, 'medium');
    onImageUploaded(imageUrl);
    setShowPexelsSearch(false);
    setPexelsQuery('');
    setPexelsResults([]);
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

        <button
          onClick={() => setShowPexelsSearch(!showPexelsSearch)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200"
        >
          <Search className="h-4 w-4" />
          <span>Pexels</span>
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

      {/* Pexels Search */}
      {showPexelsSearch && (
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={pexelsQuery}
              onChange={(e) => setPexelsQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchPexels()}
              placeholder="Search for images (e.g., cricket, sports, team)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={searchPexels}
              disabled={searchingPexels || !pexelsQuery.trim()}
              className="flex items-center space-x-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Search className="h-4 w-4" />
              <span>{searchingPexels ? 'Searching...' : 'Search'}</span>
            </button>
          </div>
          
          {/* Pexels Results */}
          {pexelsResults.length > 0 && (
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {pexelsResults.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => selectPexelsImage(photo)}
                  className="relative group overflow-hidden rounded-lg hover:scale-105 transition-transform duration-200"
                >
                  <img
                    src={PexelsService.getOptimizedImageUrl(photo, 'small')}
                    alt={photo.alt || 'Pexels photo'}
                    className="w-full h-20 object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                    <Check className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {searchingPexels && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <span className="ml-2 text-gray-600">Searching Pexels...</span>
            </div>
          )}
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
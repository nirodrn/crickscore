export class PexelsService {
  private static readonly API_KEY = '6302dddd94fad3bb7467e1cfb12d5218';
  private static readonly BASE_URL = 'https://api.pexels.com/v1';

  static async searchPhotos(query: string, perPage: number = 15, page: number = 1) {
    try {
      const response = await fetch(
        `${this.BASE_URL}/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`,
        {
          headers: {
            'Authorization': this.API_KEY
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.photos || [];
    } catch (error) {
      console.error('Failed to search Pexels photos:', error);
      throw error;
    }
  }

  static async getCuratedPhotos(perPage: number = 15, page: number = 1) {
    try {
      const response = await fetch(
        `${this.BASE_URL}/curated?per_page=${perPage}&page=${page}`,
        {
          headers: {
            'Authorization': this.API_KEY
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.photos || [];
    } catch (error) {
      console.error('Failed to get curated Pexels photos:', error);
      throw error;
    }
  }

  static async getPhotoById(photoId: number) {
    try {
      const response = await fetch(
        `${this.BASE_URL}/photos/${photoId}`,
        {
          headers: {
            'Authorization': this.API_KEY
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get Pexels photo by ID:', error);
      throw error;
    }
  }

  static async searchVideos(query: string, perPage: number = 15, page: number = 1) {
    try {
      const response = await fetch(
        `${this.BASE_URL.replace('/v1', '')}/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`,
        {
          headers: {
            'Authorization': this.API_KEY
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.videos || [];
    } catch (error) {
      console.error('Failed to search Pexels videos:', error);
      throw error;
    }
  }

  static getOptimizedImageUrl(photo: any, size: 'small' | 'medium' | 'large' = 'medium'): string {
    if (!photo || !photo.src) return '';
    
    switch (size) {
      case 'small':
        return photo.src.small || photo.src.medium || photo.src.original;
      case 'large':
        return photo.src.large || photo.src.original;
      default:
        return photo.src.medium || photo.src.original;
    }
  }
}
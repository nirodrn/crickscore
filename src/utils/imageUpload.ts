export class ImageUploadService {
  private static readonly IMGBB_API_KEY = '629d88e8b9403c8427f628956694e907';
  private static readonly IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

  static async uploadImage(file: File): Promise<string> {
    try {
      // Validate file first
      this.validateImageFile(file);

      const formData = new FormData();
      formData.append('key', this.IMGBB_API_KEY);
      formData.append('image', file);
      formData.append('name', file.name);

      const response = await fetch(this.IMGBB_UPLOAD_URL, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.data.url;
      } else {
        throw new Error('Upload failed: ' + (data.error?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async uploadImageFromBase64(base64Data: string, filename: string = 'image'): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('key', this.IMGBB_API_KEY);
      formData.append('image', base64Data);
      formData.append('name', filename);

      const response = await fetch(this.IMGBB_UPLOAD_URL, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.data.url;
      } else {
        throw new Error('Upload failed: ' + (data.error?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async uploadImageFromUrl(imageUrl: string, filename?: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('key', this.IMGBB_API_KEY);
      formData.append('image', imageUrl);
      if (filename) {
        formData.append('name', filename);
      }

      const response = await fetch(this.IMGBB_UPLOAD_URL, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.data.url;
      } else {
        throw new Error('Upload failed: ' + (data.error?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static validateImageFile(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 32 * 1024 * 1024; // 32MB as per ImgBB limit

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload JPG, PNG, GIF, or WebP images.');
    }

    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 32MB.');
    }

    return true;
  }

  static isValidImageUrl(url: string): boolean {
    try {
      new URL(url);
      return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    } catch {
      return false;
    }
  }
}
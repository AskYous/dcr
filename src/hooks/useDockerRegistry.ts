import { useCallback, useEffect, useState } from 'react';
import { RegistryApiError, registryService } from '../services/registryService';
import { DockerCredentials, DockerImage } from '../types';

export const useDockerRegistry = (
  credentials: DockerCredentials,
  authenticated: boolean
) => {
  const [images, setImages] = useState<DockerImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    if (!authenticated || !credentials.registryUrl) {
      return;
    }

    setIsLoadingImages(true);
    setImagesError(null);

    try {
      const fetchedImages = await registryService.fetchAllImages();
      setImages(fetchedImages);
    } catch (err) {
      console.error("Error fetching images:", err);
      let errorMessage = 'Failed to fetch images';

      if (err instanceof RegistryApiError) {
        errorMessage = `API Error (${err.status}): ${err.message}`;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setImagesError(errorMessage);
    } finally {
      setIsLoadingImages(false);
    }
  }, [authenticated, credentials.registryUrl]);

  // Fetch images on mount if authenticated
  useEffect(() => {
    if (authenticated) {
      fetchImages();
    }
  }, [authenticated, fetchImages]);

  return {
    images,
    isLoadingImages,
    imagesError,
    refreshImages: fetchImages
  };
}; 
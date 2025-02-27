import { useCallback, useEffect, useRef, useState } from 'react';
import { RegistryApiError, registryService } from '../services/registryService';
import { DockerCredentials, DockerImage } from '../types';

export const useDockerRegistry = (
  credentials: DockerCredentials,
  authenticated: boolean
) => {
  const [images, setImages] = useState<DockerImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);

  // Ref for abort controller
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchImages = useCallback(async () => {
    if (!authenticated || !credentials.registryUrl) {
      return;
    }

    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create a new abort controller for this request
    abortControllerRef.current = new AbortController();

    setIsLoadingImages(true);
    setImagesError(null);

    try {
      const fetchedImages = await registryService.fetchAllImages(
        abortControllerRef.current.signal
      );
      setImages(fetchedImages);
    } catch (err) {
      // Don't set error state for aborted requests
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('Fetch images aborted');
        return;
      }

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

    // Cleanup function to abort requests when component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [authenticated, fetchImages]);

  return {
    images,
    isLoadingImages,
    imagesError,
    refreshImages: fetchImages
  };
}; 
import { useCallback, useEffect, useState } from 'react';
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
      // Use the proxy URL
      const apiUrl = '/api';

      // Fetch catalog of images without explicit auth header
      // Let the browser handle the auth
      const catalogResponse = await fetch(`${apiUrl}/v2/_catalog`);

      if (!catalogResponse.ok) {
        throw new Error(`Failed to fetch images: ${catalogResponse.statusText} (${catalogResponse.status})`);
      }

      const catalogData = await catalogResponse.json();
      const imageList: DockerImage[] = [];

      // Fetch tags for each image
      const repositories = catalogData.repositories || [];
      console.log(`Found ${repositories.length} repositories`);

      for (const imageName of repositories) {
        try {
          const tagsResponse = await fetch(`${apiUrl}/v2/${imageName}/tags/list`);

          if (tagsResponse.ok) {
            const tagsData = await tagsResponse.json();
            imageList.push({
              name: imageName,
              tags: tagsData.tags || []
            });
          } else {
            console.warn(`Failed to fetch tags for ${imageName}: ${tagsResponse.status} ${tagsResponse.statusText}`);
          }
        } catch (err) {
          console.error(`Error fetching tags for ${imageName}:`, err);
        }
      }

      setImages(imageList);

      if (imageList.length === 0 && repositories.length > 0) {
        setImagesError("Found repositories but couldn't retrieve any tags. Check console for details.");
      }
    } catch (err) {
      console.error("Error fetching images:", err);
      const errorMessage = err instanceof Error
        ? err.message
        : 'Failed to fetch images';
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
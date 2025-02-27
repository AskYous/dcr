import { ChangeEvent, FormEvent, useCallback, useState } from 'react';
import { DockerCredentials } from '../types';

export const useAuth = () => {
  const [credentials, setCredentials] = useState<DockerCredentials>(() => {
    const savedRegistry = localStorage.getItem('dockerRegistry');
    return {
      registryUrl: savedRegistry || '',
      // We don't need to store username/password anymore as browser handles auth
      username: '',
      password: ''
    };
  });

  const [authenticated, setAuthenticated] = useState(() => {
    return localStorage.getItem('authenticated') === 'true';
  });

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleLogin = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      // Validate URL format
      new URL(credentials.registryUrl);

      // We'll just store the registry URL and let the browser handle auth
      localStorage.setItem('dockerRegistry', credentials.registryUrl);
      localStorage.setItem('authenticated', 'true');
      setAuthenticated(true);
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : 'Invalid registry URL';
      setAuthError(errorMessage);
      setAuthenticated(false);
      localStorage.removeItem('authenticated');
    } finally {
      setIsAuthenticating(false);
    }
  }, [credentials]);

  const handleLogout = useCallback(() => {
    setAuthenticated(false);
    localStorage.removeItem('authenticated');
  }, []);

  return {
    credentials,
    authenticated,
    isAuthenticating,
    authError,
    handleInputChange,
    handleLogin,
    handleLogout
  };
}; 
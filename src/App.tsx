import './App.css';
import { AuthForm } from './components/AuthForm';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { ImageList } from './components/ImageList';
import { useAuth } from './hooks/useAuth';
import { useDockerRegistry } from './hooks/useDockerRegistry';
import { registryService } from './services/registryService';

const App = () => {
  const {
    credentials,
    authenticated,
    isAuthenticating,
    authError,
    handleLogin,
    handleLogout,
    handleInputChange
  } = useAuth();

  const {
    images,
    isLoadingImages,
    imagesError,
    refreshImages
  } = useDockerRegistry(credentials, authenticated);

  const handleRefresh = () => {
    // Clear cache and refresh images
    registryService.clearCache();
    refreshImages();
  };

  return (
    <ErrorBoundary>
      <div className="docker-registry-app">
        <Header
          authenticated={authenticated}
          onLogout={handleLogout}
          onRefresh={handleRefresh}
          isLoading={isLoadingImages}
        />

        <main className="app-content">
          {!authenticated ? (
            <AuthForm
              credentials={credentials}
              isLoading={isAuthenticating}
              error={authError}
              onInputChange={handleInputChange}
              onSubmit={handleLogin}
            />
          ) : (
            <ImageList
              images={images}
              isLoading={isLoadingImages}
              error={imagesError}
              registryUrl={credentials.registryUrl}
            />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;

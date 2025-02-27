import { useState } from 'react';
import './App.css';
import { AuthForm } from './components/AuthForm';
import { DebugPanel } from './components/DebugPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { ImageList } from './components/ImageList';
import { useAuth } from './hooks/useAuth';
import { useDockerRegistry } from './hooks/useDockerRegistry';

const App = () => {
  const [showDebug, setShowDebug] = useState(false);

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

  return (
    <ErrorBoundary>
      <div className="docker-registry-app">
        <Header
          authenticated={authenticated}
          onLogout={handleLogout}
          onRefresh={refreshImages}
          isLoading={isLoadingImages}
          onToggleDebug={() => setShowDebug(!showDebug)}
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

        {authenticated && showDebug && (
          <DebugPanel registryUrl={credentials.registryUrl} onClose={() => setShowDebug(false)} />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;

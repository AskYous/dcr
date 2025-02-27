import './App.css';
import { AuthForm } from './components/AuthForm';
import { DebugPanel } from './components/DebugPanel';
import { ImageList } from './components/ImageList';
import { useAuth } from './hooks/useAuth';
import { useDockerRegistry } from './hooks/useDockerRegistry';

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

  return (
    <div className="docker-registry-app">
      <h1>Docker Registry Explorer</h1>

      {!authenticated ? (
        <AuthForm
          credentials={credentials}
          isLoading={isAuthenticating}
          error={authError}
          onInputChange={handleInputChange}
          onSubmit={handleLogin}
        />
      ) : (
        <div className="registry-content">
          <div className="header-actions">
            <button
              onClick={refreshImages}
              disabled={isLoadingImages}
              className="action-button refresh"
            >
              {isLoadingImages ? "Refreshing..." : "Refresh Images"}
            </button>
            <button
              onClick={handleLogout}
              className="action-button logout"
            >
              Logout
            </button>
          </div>

          <ImageList
            images={images}
            isLoading={isLoadingImages}
            error={imagesError}
          />

          {authenticated && (
            <DebugPanel registryUrl={credentials.registryUrl} />
          )}
        </div>
      )}
    </div>
  );
};

export default App;

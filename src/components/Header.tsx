import { FC } from 'react';

interface HeaderProps {
  authenticated: boolean;
  isLoading: boolean;
  onLogout: () => void;
  onRefresh: () => void;
}

export const Header: FC<HeaderProps> = ({
  authenticated,
  isLoading,
  onLogout,
  onRefresh
}) => {
  return (
    <header className="app-header">
      <h1>Docker Registry Explorer</h1>

      {authenticated && (
        <div className="header-actions">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="action-button refresh"
            aria-label="Refresh images and clear cache"
            title="Refresh images and clear cache"
          >
            {isLoading ? "Refreshing..." : "Refresh & Clear Cache"}
          </button>

          <button
            onClick={onLogout}
            className="action-button logout"
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}; 
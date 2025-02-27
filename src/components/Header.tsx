import { FC } from 'react';

interface HeaderProps {
  authenticated: boolean;
  isLoading: boolean;
  onLogout: () => void;
  onRefresh: () => void;
  onToggleDebug: () => void;
}

export const Header: FC<HeaderProps> = ({
  authenticated,
  isLoading,
  onLogout,
  onRefresh,
  onToggleDebug
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
            aria-label="Refresh images"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>

          <button
            onClick={onToggleDebug}
            className="action-button debug"
            aria-label="Toggle debug panel"
          >
            Debug
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
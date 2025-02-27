import { FC } from 'react';

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: FC<ErrorStateProps> = ({ title, message, onRetry }) => {
  return (
    <div className="error-container" role="alert">
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry && (
        <button className="action-button retry-button" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}; 
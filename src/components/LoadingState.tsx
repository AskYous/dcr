import { FC } from 'react';

interface LoadingStateProps {
  message: string;
  size?: 'small' | 'medium' | 'large';
}

export const LoadingState: FC<LoadingStateProps> = ({
  message,
  size = 'medium'
}) => {
  return (
    <div
      className={`loading-container ${size}`}
      aria-live="polite"
      role="status"
    >
      <div className="loading-spinner"></div>
      <p>{message}</p>
    </div>
  );
}; 
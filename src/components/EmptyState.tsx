import { FC } from 'react';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: string;
}

export const EmptyState: FC<EmptyStateProps> = ({ title, message, icon }) => {
  return (
    <div className="empty-state" role="status">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}; 
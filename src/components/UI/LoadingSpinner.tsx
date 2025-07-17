import React from 'react';

interface LoadingSpinnerProps {
  size?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'h-8 w-8',
  className = ''
}) => {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-4 border-gray-300 border-t-blue-500 ${size}`}
      />
    </div>
  );
};

export default LoadingSpinner;

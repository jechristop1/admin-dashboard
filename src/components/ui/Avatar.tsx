import React from 'react';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  role?: 'user' | 'assistant';
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  fallback,
  size = 'md',
  className = '',
  role = 'assistant',
}) => {
  const sizeStyles = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };
  
  const roleStyles = {
    user: 'bg-[#5E6973] text-white',
    assistant: 'bg-[#0A2463] text-white',
  };
  
  const getFallbackText = () => {
    if (fallback) return fallback.substring(0, 2).toUpperCase();
    return alt.substring(0, 2).toUpperCase();
  };
  
  return (
    <div 
      className={`
        ${sizeStyles[size]} 
        ${roleStyles[role]} 
        rounded-full flex items-center justify-center overflow-hidden
        ${className}
      `}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span className="font-medium">{getFallbackText()}</span>
      )}
    </div>
  );
};

export default Avatar;
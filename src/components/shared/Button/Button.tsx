import React from 'react';
import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'icon' | 'remove';
  /** Button size */
  size?: 'xsmall' | 'small' | 'medium' | 'large';
  /** Whether button is in a loading state */
  isLoading?: boolean;
  /** Loading text to display */
  loadingText?: string;
  /** The button content */
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  loadingText = 'Loading...',
  disabled,
  className,
  children,
  ...props
}) => {
  const variantClass = `btn-${variant}`;
  const sizeClass = size !== 'medium' ? `btn-${size}` : '';
  const baseClass = variant === 'icon' || variant === 'remove' ? 'btn-icon' : 'btn';
  const allClasses = `${baseClass} ${variantClass} ${sizeClass} ${className || ''}`.trim();

  return (
    <button
      className={allClasses}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? loadingText : children}
    </button>
  );
};

export default Button;

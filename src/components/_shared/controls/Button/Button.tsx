import React, { useState, useCallback, useRef, useEffect } from 'react';
import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'utility' | 'icon' | 'remove';
  /** Button size */
  size?: 'xsmall' | 'small' | 'medium' | 'large';
  /** Whether button is in a loading state */
  isLoading?: boolean;
  /** Loading text to display */
  loadingText?: string;
  /** Text shown briefly after a successful action; auto-resets after 2 s */
  successText?: string;
  /** The button content */
  children: React.ReactNode;
}

const BUTTON_SIZE_STYLES: Record<NonNullable<ButtonProps['size']>, React.CSSProperties> = {
  xsmall: {
    padding: '0.3rem 0.6rem',
    fontSize: '0.75rem',
    borderRadius: '0.25rem',
  },
  small: {
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
  },
  medium: {},
  large: {
    padding: '1rem 2rem',
    fontSize: '1.05rem',
  },
};

const ICON_BUTTON_SIZE_STYLES: Record<NonNullable<ButtonProps['size']>, React.CSSProperties> = {
  xsmall: {
    padding: '0.3rem',
    fontSize: '0.75rem',
    borderRadius: '0.25rem',
  },
  small: {
    padding: '0.5rem',
    fontSize: '0.85rem',
  },
  medium: {
    padding: '0.5rem',
    fontSize: '1.2rem',
  },
  large: {
    padding: '1rem',
    fontSize: '1.05rem',
  },
};

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  loadingText = 'Loading...',
  successText,
  disabled,
  className,
  style,
  children,
  onClick,
  ...props
}) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [lockedWidth, setLockedWidth] = useState<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const successTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (successText) {
        const currentWidth = buttonRef.current?.offsetWidth;
        if (currentWidth) {
          setLockedWidth(currentWidth);
        }

        setShowSuccess(true);
        if (successTimerRef.current !== null) {
          window.clearTimeout(successTimerRef.current);
        }
        successTimerRef.current = window.setTimeout(() => {
          setShowSuccess(false);
          setLockedWidth(null);
          successTimerRef.current = null;
        }, 2000);
      }
      onClick?.(e);
    },
    [onClick, successText],
  );

  const variantClass = `btn-${variant}`;
  const sizeClass = size !== 'medium' ? `btn-${size}` : '';
  const iconModifierClass = variant === 'icon' || variant === 'remove' ? 'btn-icon' : '';
  const isIconButton = variant === 'icon' || variant === 'remove';
  const allClasses = `btn ${iconModifierClass} ${variantClass} ${sizeClass} ${className || ''}`.trim();

  let label: React.ReactNode = children;
  if (isLoading) label = loadingText;
  else if (showSuccess && successText) label = successText;

  const mergedStyle: React.CSSProperties = {
    ...(isIconButton ? ICON_BUTTON_SIZE_STYLES[size] : BUTTON_SIZE_STYLES[size]),
    ...style,
    ...(lockedWidth ? { width: `${lockedWidth}px` } : {}),
  };

  return (
    <button
      ref={buttonRef}
      className={allClasses}
      disabled={disabled || isLoading}
      onClick={handleClick}
      style={mergedStyle}
      {...props}
    >
      {label}
    </button>
  );
};

export default Button;

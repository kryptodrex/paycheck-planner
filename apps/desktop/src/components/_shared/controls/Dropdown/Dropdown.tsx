import React from 'react';
import './Dropdown.css';

interface DropdownProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  containerClassName?: string;
}

const Dropdown = React.forwardRef<HTMLSelectElement, DropdownProps>(
  ({ className, containerClassName, children, disabled, ...props }, ref) => {
    const wrapperClassName = `shared-dropdown ${disabled ? 'is-disabled' : ''} ${containerClassName || ''}`.trim();
    const dropdownClassName = `shared-dropdown-control ${className || ''}`.trim();

    return (
      <div className={wrapperClassName}>
        <select ref={ref} className={dropdownClassName} disabled={disabled} {...props}>
          {children}
        </select>
        <span className="shared-dropdown-caret" aria-hidden="true" />
      </div>
    );
  },
);

Dropdown.displayName = 'Dropdown';

export default Dropdown;

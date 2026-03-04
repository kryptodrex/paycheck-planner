import React from 'react';
import './FormGroup.css';

interface FormGroupProps {
  /** Label text */
  label?: string;
  /** Small helper text */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Whether field is required */
  required?: boolean;
  /** The form field(s) */
  children: React.ReactNode;
}

const FormGroup: React.FC<FormGroupProps> = ({
  label,
  helperText,
  error,
  required,
  children,
}) => {
  return (
    <div className="form-group">
      {label && (
        <label>
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      {children}
      {error && <small className="error">{error}</small>}
      {helperText && !error && <small className="helper-text">{helperText}</small>}
    </div>
  );
};

export default FormGroup;

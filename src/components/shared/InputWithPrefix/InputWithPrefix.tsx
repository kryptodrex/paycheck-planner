import React from 'react';
import './InputWithPrefix.css';

interface InputWithPrefixProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** The prefix text or symbol */
  prefix: string;
}

const InputWithPrefix: React.FC<InputWithPrefixProps> = ({
  prefix,
  className,
  ...props
}) => {
  return (
    <div className="input-with-prefix">
      <span className="prefix">{prefix}</span>
      <input
        className={className}
        {...props}
      />
    </div>
  );
};

export default InputWithPrefix;

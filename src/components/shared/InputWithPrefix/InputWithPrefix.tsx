import React from 'react';
import './InputWithPrefix.css';

interface InputWithPrefixProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** The prefix text or symbol */
  prefix?: string;
  /** The suffix text or symbol */
  suffix?: string;
}

const InputWithPrefix: React.FC<InputWithPrefixProps> = ({
  prefix,
  suffix,
  className,
  ...props
}) => {
  return (
    <div className="input-with-prefix">
      {prefix && <span className="prefix">{prefix}</span>}
      <input
        className={className}
        {...props}
      />
      {suffix && <span className="suffix">{suffix}</span>}
    </div>
  );
};

export default InputWithPrefix;

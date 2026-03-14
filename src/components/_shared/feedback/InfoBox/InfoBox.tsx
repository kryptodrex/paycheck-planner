import React from 'react';
import './InfoBox.css';

interface InfoBoxProps {
  children: React.ReactNode;
  className?: string;
}

const InfoBox: React.FC<InfoBoxProps> = ({ children, className = '' }) => {
  return (
    <div className={`info-box ${className}`.trim()}>
      {children}
    </div>
  );
};

export default InfoBox;

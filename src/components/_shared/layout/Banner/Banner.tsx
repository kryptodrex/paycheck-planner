import type { ReactNode } from 'react';
import './Banner.css';

interface BannerProps {
  label: ReactNode;
  value: ReactNode;
}

const Banner: React.FC<BannerProps> = ({ label, value }) => {
  return (
    <div className="banner" role="status" aria-live="polite">
      <span className="banner-label">{label}</span>
      <span className="banner-value">{value}</span>
    </div>
  );
};

export default Banner;
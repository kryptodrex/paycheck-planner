import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import InfoBox from './InfoBox';

describe('InfoBox', () => {
  it('renders children', () => {
    render(<InfoBox>Important details here</InfoBox>);
    expect(screen.getByText('Important details here')).toBeInTheDocument();
  });

  it('applies base info-box class', () => {
    const { container } = render(<InfoBox>content</InfoBox>);
    expect(container.firstChild).toHaveClass('info-box');
  });

  it('merges additional className', () => {
    const { container } = render(<InfoBox className="my-class">content</InfoBox>);
    expect(container.firstChild).toHaveClass('info-box', 'my-class');
  });

  it('renders with empty className gracefully', () => {
    const { container } = render(<InfoBox className="">content</InfoBox>);
    expect(container.firstChild).toHaveClass('info-box');
  });

  it('renders React node children', () => {
    render(
      <InfoBox>
        <p>Paragraph inside</p>
      </InfoBox>,
    );
    expect(screen.getByText('Paragraph inside').tagName).toBe('P');
  });
});

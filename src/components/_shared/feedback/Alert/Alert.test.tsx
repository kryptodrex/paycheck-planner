import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Alert from './Alert';

describe('Alert', () => {
  it('renders children', () => {
    render(<Alert>Something went wrong</Alert>);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('defaults to info variant', () => {
    const { container } = render(<Alert>Info</Alert>);
    expect(container.firstChild).toHaveClass('alert-info');
    expect(container.querySelector('.alert-label')).toHaveTextContent('Info');
  });

  it.each([
    ['error', 'alert-error'],
    ['warning', 'alert-warning'],
    ['success', 'alert-success'],
    ['info', 'alert-info'],
  ] as const)('applies %s variant class', (type, expectedClass) => {
    const { container } = render(<Alert type={type}>message</Alert>);
    expect(container.firstChild).toHaveClass(expectedClass);
  });

  it('merges additional className', () => {
    const { container } = render(<Alert className="custom-class">msg</Alert>);
    expect(container.firstChild).toHaveClass('alert', 'custom-class');
  });

  it('renders React node children', () => {
    render(
      <Alert type="warning">
        <strong>Bold warning</strong>
      </Alert>,
    );
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Bold warning').tagName).toBe('STRONG');
  });

  it.each([
    ['error', 'Error'],
    ['warning', 'Warning'],
    ['success', 'Success'],
    ['info', 'Info'],
  ] as const)('renders a visible %s severity label', (type, label) => {
    render(<Alert type={type}>message</Alert>);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('is not interactive', () => {
    const { container } = render(<Alert>message</Alert>);
    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
  });

  it('uses a div element', () => {
    const { container } = render(<Alert>message</Alert>);
    expect(container.firstChild?.nodeName).toBe('DIV');
  });
});

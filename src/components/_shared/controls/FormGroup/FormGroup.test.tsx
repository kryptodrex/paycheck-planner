import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import FormGroup from './FormGroup';

describe('FormGroup', () => {
  it('renders children', () => {
    render(
      <FormGroup>
        <input type="text" placeholder="Name" />
      </FormGroup>,
    );
    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
  });

  it('renders label text', () => {
    render(<FormGroup label="Email"><input /></FormGroup>);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('shows required asterisk when required is set', () => {
    render(<FormGroup label="Name" required><input /></FormGroup>);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('does not render label when label prop is omitted', () => {
    const { container } = render(<FormGroup><input /></FormGroup>);
    expect(container.querySelector('label')).toBeNull();
  });

  it('displays error message', () => {
    render(<FormGroup error="This field is required"><input /></FormGroup>);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('displays warning when no error is present', () => {
    render(<FormGroup warning="Value seems low"><input /></FormGroup>);
    expect(screen.getByText('Value seems low')).toBeInTheDocument();
  });

  it('error takes priority over warning', () => {
    render(<FormGroup error="Required" warning="Seems low"><input /></FormGroup>);
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.queryByText('Seems low')).toBeNull();
  });

  it('displays helper text when no error and no warning', () => {
    render(<FormGroup helperText="Enter your full name"><input /></FormGroup>);
    expect(screen.getByText('Enter your full name')).toBeInTheDocument();
  });

  it('hides helper text when error is present', () => {
    render(<FormGroup error="Required" helperText="Enter name"><input /></FormGroup>);
    expect(screen.queryByText('Enter name')).toBeNull();
  });

  it('error message has "error" class', () => {
    render(<FormGroup error="Bad input"><input /></FormGroup>);
    expect(screen.getByText('Bad input')).toHaveClass('error');
  });

  it('warning message has "warning" class', () => {
    render(<FormGroup warning="Watch out"><input /></FormGroup>);
    expect(screen.getByText('Watch out')).toHaveClass('warning');
  });

  it('helper text has "helper-text" class', () => {
    render(<FormGroup helperText="Hint"><input /></FormGroup>);
    expect(screen.getByText('Hint')).toHaveClass('helper-text');
  });

  it('does not show required asterisk when required is not set', () => {
    render(<FormGroup label="Name"><input /></FormGroup>);
    expect(screen.queryByText('*')).toBeNull();
  });
});

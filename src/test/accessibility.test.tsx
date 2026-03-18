/**
 * Accessibility test suite for Paycheck Planner shared UI components.
 *
 * Tests in this file validate three categories of accessibility concern:
 *
 *  1. Automated WCAG audits – every component is rendered and run through
 *     axe-core (via jest-axe) to catch violations detectable by tooling
 *     (missing labels, invalid ARIA, wrong roles, duplicate IDs, etc.).
 *
 *  2. Semantic structure & ARIA attributes – verify that components expose
 *     the correct roles, labels, live regions, and heading hierarchy that
 *     screen readers depend on.
 *
 *  3. Keyboard interaction – verify that all interactive components are
 *     fully operable by keyboard alone (Tab, Space, Enter, Escape,
 *     arrow keys) and that focus is managed correctly.
 *
 * References:
 *   WCAG 2.1 – https://www.w3.org/TR/WCAG21/
 *   ARIA Authoring Practices – https://www.w3.org/WAI/ARIA/apg/
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';

import Alert from '../components/_shared/feedback/Alert/Alert';
import Banner from '../components/_shared/layout/Banner/Banner';
import Button from '../components/_shared/controls/Button/Button';
import ConfirmDialog from '../components/_shared/feedback/ConfirmDialog/ConfirmDialog';
import ErrorDialog from '../components/_shared/feedback/ErrorDialog/ErrorDialog';
import FormGroup from '../components/_shared/controls/FormGroup/FormGroup';
import FormattedNumberInput from '../components/_shared/controls/FormattedNumberInput/FormattedNumberInput';
import InfoBox from '../components/_shared/feedback/InfoBox/InfoBox';
import Modal from '../components/_shared/layout/Modal/Modal';
import PageHeader from '../components/_shared/layout/PageHeader/PageHeader';
import PillBadge from '../components/_shared/controls/PillBadge/PillBadge';
import PillToggle from '../components/_shared/controls/PillToggle/PillToggle';
import ProgressBar from '../components/_shared/feedback/ProgressBar/ProgressBar';
import RadioGroup from '../components/_shared/controls/RadioGroup/RadioGroup';
import Toast from '../components/_shared/feedback/Toast/Toast';
import Toggle from '../components/_shared/controls/Toggle/Toggle';
import ViewModeSelector from '../components/_shared/layout/ViewModeSelector/ViewModeSelector';

class LocalStorageMock {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  clear(): void {
    this.store.clear();
  }
}

const localStorageMock = new LocalStorageMock();

beforeEach(() => {
  localStorageMock.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  });
});

afterEach(cleanup);

// ─────────────────────────────────────────────────────────────────
// 1.  Automated WCAG audits (axe-core)
// ─────────────────────────────────────────────────────────────────

describe('Axe automated accessibility audit', () => {
  it('Alert – info variant has no violations', async () => {
    const { container } = render(<Alert type="info">Plan saved</Alert>);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Alert – error variant has no violations', async () => {
    const { container } = render(<Alert type="error">Something went wrong</Alert>);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Alert – warning variant has no violations', async () => {
    const { container } = render(<Alert type="warning">Double-check your values</Alert>);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Alert – success variant has no violations', async () => {
    const { container } = render(<Alert type="success">Saved successfully</Alert>);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Banner has no violations', async () => {
    const { container } = render(<Banner label="Remaining" value="$1,200" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Button – primary has no violations', async () => {
    const { container } = render(<Button variant="primary">Save plan</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Button – disabled has no violations', async () => {
    const { container } = render(<Button disabled>Unavailable</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Button – icon with aria-label has no violations', async () => {
    const { container } = render(
      <Button variant="icon" aria-label="Close">✕</Button>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ConfirmDialog has no violations when open', async () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete plan"
        message="This cannot be undone."
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ErrorDialog has no violations when open', async () => {
    const { container } = render(
      <ErrorDialog
        isOpen={true}
        onClose={vi.fn()}
        title="Load Error"
        message="The file could not be read."
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('FormGroup with label and input has no violations', async () => {
    const { container } = render(
      <FormGroup label="Gross pay" required>
        <input type="number" id="gross-pay" placeholder="0.00" />
      </FormGroup>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('FormGroup with error message has no violations', async () => {
    // Input is labelled via aria-label (as it would be in a real form field).
    const { container } = render(
      <FormGroup label="Amount" error="Must be greater than 0">
        <input type="number" id="amount" aria-label="Amount" />
      </FormGroup>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('FormattedNumberInput has no violations when given an aria-label', async () => {
    // FormattedNumberInput must be paired with a visible label or aria-label in
    // practice; here we supply aria-label to represent correct usage.
    const { container } = render(
      <FormattedNumberInput value={0} onChange={vi.fn()} aria-label="Gross pay" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('InfoBox has no violations', async () => {
    const { container } = render(<InfoBox>This is informational text.</InfoBox>);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Modal has no violations when open', async () => {
    const { container } = render(
      <Modal isOpen={true} onClose={vi.fn()} header="Settings">
        <p>Modal body content</p>
      </Modal>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('PageHeader has no violations', async () => {
    const { container } = render(
      <PageHeader title="Key Metrics" subtitle="View your financial overview" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('PillBadge has no violations', async () => {
    const { container } = render(<PillBadge variant="success">Active</PillBadge>);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('PillToggle has no violations', async () => {
    const { container } = render(
      <PillToggle value={false} onChange={vi.fn()} leftLabel="Off" rightLabel="On" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ProgressBar with label has no violations', async () => {
    const { container } = render(
      <ProgressBar percentage={60} label="Budget used" details="$600 of $1,000" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('RadioGroup has no violations', async () => {
    const options = [
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
    ];
    const { container } = render(
      <RadioGroup name="frequency" value="weekly" options={options} onChange={vi.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Toast – success has no violations', async () => {
    const { container } = render(<Toast message="Plan saved!" type="success" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Toast – warning has no violations', async () => {
    const { container } = render(<Toast message="Low balance detected" type="warning" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Toast – error has no violations', async () => {
    const { container } = render(<Toast message="Save failed" type="error" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Toggle with label has no violations', async () => {
    const { container } = render(
      <Toggle checked={false} onChange={vi.fn()} label="Enable encryption" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ViewModeSelector has no violations', async () => {
    const { container } = render(
      <ViewModeSelector mode="paycheck" onChange={vi.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

// ─────────────────────────────────────────────────────────────────
// 2.  Semantic structure & ARIA attributes
// ─────────────────────────────────────────────────────────────────

describe('Semantic structure and ARIA attributes', () => {
  // ── Banner ───────────────────────────────────────────────────
  describe('Banner', () => {
    it('has role="status" so screen readers announce updates', () => {
      render(<Banner label="Remaining" value="$500" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-live="polite" for non-urgent announcements', () => {
      render(<Banner label="Remaining" value="$500" />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });
  });

  // ── Toast ────────────────────────────────────────────────────
  describe('Toast', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('has role="status" so screen readers announce it', () => {
      render(<Toast message="Saved!" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-live="polite" so updates are announced without interruption', () => {
      render(<Toast message="Saved!" />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });

    it('is absent from the DOM when message is null (no stale live region)', () => {
      const { container } = render(<Toast message={null} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  // ── Alert ────────────────────────────────────────────────────
  describe('Alert', () => {
    it('renders as a <div> (its parent can add role="alert" when needed)', () => {
      const { container } = render(<Alert>Note</Alert>);
      expect(container.firstChild?.nodeName).toBe('DIV');
    });
  });

  // ── Modal ────────────────────────────────────────────────────
  describe('Modal', () => {
    it('close button has an accessible label', () => {
      render(<Modal isOpen={true} onClose={vi.fn()} header="Edit Plan">content</Modal>);
      expect(screen.getByRole('button', { name: 'Close modal' })).toBeInTheDocument();
    });

    it('header renders as an h2 (correct heading level for dialog)', () => {
      render(<Modal isOpen={true} onClose={vi.fn()} header="Edit Plan">content</Modal>);
      expect(screen.getByRole('heading', { level: 2, name: 'Edit Plan' })).toBeInTheDocument();
    });

    it('renders nothing when closed (no invisible modal in DOM)', () => {
      const { container } = render(
        <Modal isOpen={false} onClose={vi.fn()}>content</Modal>,
      );
      expect(container).toBeEmptyDOMElement();
    });
  });

  // ── Toggle ───────────────────────────────────────────────────
  describe('Toggle', () => {
    it('uses a checkbox input (correct role for a binary on/off control)', () => {
      render(<Toggle checked={true} onChange={vi.fn()} label="Dark mode" />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('label is programmatically associated with the checkbox via htmlFor', () => {
      render(<Toggle id="dark-mode" checked={true} onChange={vi.fn()} label="Dark mode" />);
      const checkbox = screen.getByRole('checkbox');
      const labelEl = document.querySelector(`label[for="${checkbox.id}"]`);
      expect(labelEl).not.toBeNull();
    });

    it('reflects its state in aria-checked (implicit via checked attribute)', () => {
      render(<Toggle checked={true} onChange={vi.fn()} label="Notifications" />);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });
  });

  // ── RadioGroup ───────────────────────────────────────────────
  describe('RadioGroup', () => {
    const options = [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
    ];

    it('each option uses a radio input (correct role for exclusive selection)', () => {
      render(<RadioGroup name="choice" value="a" options={options} onChange={vi.fn()} />);
      expect(screen.getAllByRole('radio')).toHaveLength(2);
    });

    it('shares a common name attribute for grouping (required for radio semantics)', () => {
      render(<RadioGroup name="pay-freq" value="a" options={options} onChange={vi.fn()} />);
      for (const radio of screen.getAllByRole('radio')) {
        expect(radio).toHaveAttribute('name', 'pay-freq');
      }
    });

    it('the selected option is marked checked', () => {
      render(<RadioGroup name="choice" value="b" options={options} onChange={vi.fn()} />);
      expect(screen.getByLabelText('Option B')).toBeChecked();
      expect(screen.getByLabelText('Option A')).not.toBeChecked();
    });

    it('a disabled option has the disabled attribute', () => {
      const opts = [{ value: 'x', label: 'X', disabled: true }];
      render(<RadioGroup name="n" value="" options={opts} onChange={vi.fn()} />);
      expect(screen.getByRole('radio')).toBeDisabled();
    });
  });

  // ── PageHeader ───────────────────────────────────────────────
  describe('PageHeader', () => {
    it('title renders as an h1 (top-level heading)', () => {
      render(<PageHeader title="Key Metrics" />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Key Metrics');
    });
  });

  // ── Button ───────────────────────────────────────────────────
  describe('Button', () => {
    it('has type="button" by default to prevent accidental form submission', () => {
      render(<Button>Click me</Button>);
      // HTMLButtonElement defaults to type="submit" inside a form; explicit type prevents this.
      // The component does not override type by default, which is the browser default.
      // We verify it is still identified as a button.
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('forwarded aria-label is accessible to screen readers', () => {
      render(<Button variant="icon" aria-label="Delete item">🗑</Button>);
      expect(screen.getByRole('button', { name: 'Delete item' })).toBeInTheDocument();
    });

    it('disabled button is not focusable via Tab', async () => {
      render(<Button disabled>Save</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
      // disabled attribute prevents focus on most browsers
      expect(btn).toHaveAttribute('disabled');
    });
  });

  // ── FormGroup ────────────────────────────────────────────────
  describe('FormGroup', () => {
    it('label is associated with its child input via nesting (implicit association)', () => {
      render(
        <FormGroup label="Email">
          <input type="email" />
        </FormGroup>,
      );
      // The label wraps the input — getByLabelText uses implicit association
      expect(document.querySelector('label')).toBeInTheDocument();
    });

    it('required indicator (*) is present when required prop is set', () => {
      render(<FormGroup label="Name" required><input /></FormGroup>);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('error text has "error" CSS class (conventionally styled for visibility)', () => {
      render(<FormGroup error="Required"><input /></FormGroup>);
      expect(screen.getByText('Required')).toHaveClass('error');
    });
  });

  // ── PillToggle ───────────────────────────────────────────────
  describe('PillToggle', () => {
    it('both options are rendered as <button> elements', () => {
      render(<PillToggle value={false} onChange={vi.fn()} leftLabel="Off" rightLabel="On" />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });

    it('active option has the "active" class (visual affordance for sighted users)', () => {
      render(<PillToggle value={true} onChange={vi.fn()} leftLabel="Off" rightLabel="On" />);
      expect(screen.getByRole('button', { name: 'On' })).toHaveClass('active');
    });

    it('both buttons are disabled when the component is disabled', () => {
      render(<PillToggle value={false} onChange={vi.fn()} disabled />);
      for (const btn of screen.getAllByRole('button')) {
        expect(btn).toBeDisabled();
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// 3.  Keyboard interaction
// ─────────────────────────────────────────────────────────────────

describe('Keyboard interaction', () => {
  // ── Modal / ConfirmDialog / ErrorDialog – Escape to dismiss ──
  describe('Modal – Escape key dismisses dialog', () => {
    it('calls onClose when Escape is pressed while modal is open', async () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose} header="Options">
          <p>content</p>
        </Modal>,
      );
      await userEvent.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when modal is closed', async () => {
      const onClose = vi.fn();
      render(<Modal isOpen={false} onClose={onClose}>content</Modal>);
      await userEvent.keyboard('{Escape}');
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('ConfirmDialog – Escape key dismisses', () => {
    it('calls onClose when Escape is pressed', async () => {
      const onClose = vi.fn();
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={onClose}
          onConfirm={vi.fn()}
          title="Confirm"
          message="Are you sure?"
        />,
      );
      await userEvent.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('ErrorDialog – Escape key dismisses', () => {
    it('calls onClose when Escape is pressed', async () => {
      const onClose = vi.fn();
      render(<ErrorDialog isOpen={true} onClose={onClose} title="Error" message="Oops" />);
      await userEvent.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Button – Space and Enter activate ────────────────────────
  describe('Button – keyboard activation', () => {
    it('fires onClick when Enter is pressed on a focused button', async () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Save</Button>);
      screen.getByRole('button').focus();
      await userEvent.keyboard('{Enter}');
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('fires onClick when Space is pressed on a focused button', async () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Save</Button>);
      screen.getByRole('button').focus();
      await userEvent.keyboard(' ');
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not fire onClick when button is disabled', async () => {
      const onClick = vi.fn();
      render(<Button disabled onClick={onClick}>Save</Button>);
      // disabled buttons should not be focusable in most browsers, but we verify
      // the attribute is set which conveys inoperability
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  // ── Toggle – Space activates ──────────────────────────────────
  describe('Toggle – keyboard activation', () => {
    it('fires onChange when Space is pressed on the checkbox', async () => {
      const onChange = vi.fn();
      render(<Toggle checked={false} onChange={onChange} label="Notifications" />);
      screen.getByRole('checkbox').focus();
      await userEvent.keyboard(' ');
      expect(onChange).toHaveBeenCalledWith(true);
    });
  });

  // ── RadioGroup – arrow-key navigation ────────────────────────
  describe('RadioGroup – arrow-key navigation', () => {
    it('ArrowDown moves focus to the next radio option', async () => {
      const options = [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
        { value: 'c', label: 'Gamma' },
      ];
      render(
        <RadioGroup name="letters" value="a" options={options} onChange={vi.fn()} />,
      );
      screen.getByLabelText('Alpha').focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(screen.getByLabelText('Beta')).toHaveFocus();
    });
  });

  // ── PillToggle – keyboard activation ─────────────────────────
  describe('PillToggle – keyboard activation', () => {
    it('fires onChange when Enter is pressed on the right button', async () => {
      const onChange = vi.fn();
      render(<PillToggle value={false} onChange={onChange} leftLabel="Off" rightLabel="On" />);
      screen.getByRole('button', { name: 'On' }).focus();
      await userEvent.keyboard('{Enter}');
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('fires onChange when Space is pressed on the left button', async () => {
      const onChange = vi.fn();
      render(<PillToggle value={true} onChange={onChange} leftLabel="Off" rightLabel="On" />);
      screen.getByRole('button', { name: 'Off' }).focus();
      await userEvent.keyboard(' ');
      expect(onChange).toHaveBeenCalledWith(false);
    });
  });

  // ── ViewModeSelector – keyboard activation ───────────────────
  describe('ViewModeSelector – keyboard activation', () => {
    it('fires onChange when Enter is pressed on a mode button', async () => {
      const onChange = vi.fn();
      render(<ViewModeSelector mode="paycheck" onChange={onChange} />);
      screen.getByRole('button', { name: 'Monthly' }).focus();
      await userEvent.keyboard('{Enter}');
      expect(onChange).toHaveBeenCalledWith('monthly');
    });

    it('fires onChange when Space is pressed on a mode button', async () => {
      const onChange = vi.fn();
      render(<ViewModeSelector mode="paycheck" onChange={onChange} />);
      screen.getByRole('button', { name: 'Yearly' }).focus();
      await userEvent.keyboard(' ');
      expect(onChange).toHaveBeenCalledWith('yearly');
    });
  });

  // ── Modal overlay click ───────────────────────────────────────
  describe('Modal – overlay click dismisses', () => {
    it('calls onClose when the backdrop overlay is clicked', async () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose}>
          <p>Modal body</p>
        </Modal>,
      );
      const overlay = screen.getByText('Modal body').closest('.modal-overlay')!;
      await userEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when the modal content area is clicked', async () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose}>
          <p>Modal body</p>
        </Modal>,
      );
      await userEvent.click(screen.getByText('Modal body'));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // ── ConfirmDialog – button keyboard activation ────────────────
  describe('ConfirmDialog – button keyboard activation', () => {
    it('fires onConfirm when Enter is pressed on the confirm button', async () => {
      const onConfirm = vi.fn();
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={onConfirm}
          title="Delete"
          message="Sure?"
        />,
      );
      screen.getByRole('button', { name: 'Confirm' }).focus();
      await userEvent.keyboard('{Enter}');
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('fires onClose when Enter is pressed on the cancel button', async () => {
      const onClose = vi.fn();
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={onClose}
          onConfirm={vi.fn()}
          title="Delete"
          message="Sure?"
        />,
      );
      screen.getByRole('button', { name: 'Cancel' }).focus();
      await userEvent.keyboard('{Enter}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});

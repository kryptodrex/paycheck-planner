import React, { useMemo, useRef, useState } from 'react';
import { Button, Dropdown, FormGroup, Modal } from '../../_shared';
import './FeedbackModal.css';
import { MessageSquareText } from 'lucide-react';

type FeedbackCategory = 'bug' | 'feature' | 'ui' | 'performance' | 'other';

type FeedbackContext = {
  appVersion: string;
  activeTab: string;
  planYear?: number;
  planName?: string;
  currentFilePath?: string;
};

type FeedbackPayload = {
  email?: string;
  category: FeedbackCategory;
  subject: string;
  messageHtml: string;
  messageText: string;
  includeDiagnostics: boolean;
  diagnostics?: Record<string, unknown>;
  screenshot?: {
    fileName: string;
    mimeType: string;
    dataUrl: string;
  };
};

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: FeedbackContext;
  onSubmitted: (result: { success: boolean; message: string }) => void;
}

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, context, onSubmitted }) => {
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('feature');
  const [subject, setSubject] = useState('');
  const [messageHtml, setMessageHtml] = useState('');
  const [messageText, setMessageText] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [screenshot, setScreenshot] = useState<FeedbackPayload['screenshot']>();
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const canSubmit = useMemo(() => {
    return subject.trim().length > 0 && messageText.trim().length > 0 && !isSubmitting;
  }, [subject, messageText, isSubmitting]);

  const normalizeEditorContent = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const html = editor.innerHTML;
    const text = (editor.textContent || '').replace(/\u00a0/g, ' ').trim();
    setMessageHtml(html);
    setMessageText(text);
  };

  const applyFormat = (command: 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList') => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command);
    normalizeEditorContent();
  };

  const resetForm = () => {
    setEmail('');
    setCategory('feature');
    setSubject('');
    setMessageHtml('');
    setMessageText('');
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
    setIncludeDiagnostics(true);
    setScreenshot(undefined);
    setScreenshotError(null);
    setFieldError(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleScreenshotChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setScreenshot(undefined);
      setScreenshotError(null);
      return;
    }

    if (file.size > MAX_SCREENSHOT_BYTES) {
      setScreenshot(undefined);
      setScreenshotError('Screenshot is too large. Maximum size is 5MB.');
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Could not read screenshot file.'));
        reader.readAsDataURL(file);
      });

      setScreenshot({
        fileName: file.name,
        mimeType: file.type || 'image/png',
        dataUrl,
      });
      setScreenshotError(null);
    } catch {
      setScreenshot(undefined);
      setScreenshotError('Could not read screenshot file. Please try a different image.');
    }
  };

  const buildDiagnostics = (): Record<string, unknown> => ({
    timestamp: new Date().toISOString(),
    appVersion: context.appVersion,
    activeTab: context.activeTab,
    planYear: context.planYear,
    planName: context.planName,
    currentFilePath: context.currentFilePath,
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
  });

  const handleSubmit = async () => {
    const trimmedSubject = subject.trim();
    const trimmedMessageText = messageText.trim();
    const trimmedMessageHtml = messageHtml.trim();

    if (!trimmedSubject || !trimmedMessageText) {
      setFieldError('Subject and message are required.');
      return;
    }

    if (!window.electronAPI?.submitFeedback) {
      onSubmitted({ success: false, message: 'Feedback form is unavailable in this environment.' });
      return;
    }

    const payload: FeedbackPayload = {
      email: email.trim() || undefined,
      category,
      subject: trimmedSubject,
      messageHtml: trimmedMessageHtml,
      messageText: trimmedMessageText,
      includeDiagnostics,
      diagnostics: includeDiagnostics ? buildDiagnostics() : undefined,
      screenshot,
    };

    setFieldError(null);
    setIsSubmitting(true);

    try {
      const result = await window.electronAPI.submitFeedback(payload);
      if (result.success) {
        onSubmitted({ success: true, message: 'Feedback form opened. Please review and submit in your browser.' });
        handleClose();
      } else {
        onSubmitted({ success: false, message: result.error || 'Could not submit feedback.' });
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Could not submit feedback.';
      onSubmitted({ success: false, message: messageText });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      header="Share Feedback"
      headerIcon={<MessageSquareText className="ui-icon" aria-hidden="true" />}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </>
      }
    >
      <div className="feedback-modal">
        <p className="feedback-intro">
          Share bug reports, UX friction, and feature requests.
        </p>

        <FormGroup label="Email (optional)">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tester@example.com"
          />
        </FormGroup>

        <FormGroup label="Category" required>
          <Dropdown value={category} onChange={(event) => setCategory(event.target.value as FeedbackCategory)}>
            <option value="bug">Bug</option>
            <option value="feature">Feature request</option>
            <option value="ui">UI improvement</option>
            <option value="performance">Performance issue</option>
            <option value="other">Other</option>
          </Dropdown>
        </FormGroup>

        <FormGroup label="Subject" required>
          <input
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Short summary"
            className={fieldError && !subject.trim() ? 'field-error' : ''}
          />
        </FormGroup>

        <FormGroup label="Details" required>
          <div className={`feedback-editor-shell ${fieldError && !messageText.trim() ? 'field-error' : ''}`}>
            <div className="feedback-editor-toolbar" role="toolbar" aria-label="Formatting controls">
              <button type="button" className="editor-tool" onClick={() => applyFormat('bold')} title="Bold"><strong>B</strong></button>
              <button type="button" className="editor-tool" onClick={() => applyFormat('italic')} title="Italic"><em>I</em></button>
              <button type="button" className="editor-tool" onClick={() => applyFormat('underline')} title="Underline"><u>U</u></button>
              <button type="button" className="editor-tool" onClick={() => applyFormat('insertUnorderedList')} title="Bullet list">• List</button>
              <button type="button" className="editor-tool" onClick={() => applyFormat('insertOrderedList')} title="Numbered list">1. List</button>
            </div>
            <div
              ref={editorRef}
              className="feedback-editor"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="What happened, expected behavior, and steps to reproduce..."
              onInput={normalizeEditorContent}
              onBlur={normalizeEditorContent}
            />
          </div>
        </FormGroup>

        {/* <div className="feedback-row">
          <label className="feedback-checkbox">
            <input
              type="checkbox"
              checked={includeDiagnostics}
              onChange={(event) => setIncludeDiagnostics(event.target.checked)}
            />
            Include environment diagnostics (tab, plan metadata, browser info)
          </label>
        </div> */}

        <FormGroup label="Screenshot (optional)">
          <input type="file" accept="image/*" onChange={handleScreenshotChange} />
          {screenshot && <small className="helper-text">Attached: {screenshot.fileName}</small>}
          {screenshotError && <small className="error">{screenshotError}</small>}
        </FormGroup>

        {fieldError && <p className="feedback-error">{fieldError}</p>}
      </div>
    </Modal>
  );
};

export default FeedbackModal;

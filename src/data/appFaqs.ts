export interface AppFaqItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
}

export interface AppFaqSection {
  id: string;
  title: string;
  description: string;
  searchTerms: string;
  items: AppFaqItem[];
}

export const appFaqSections: AppFaqSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Plan setup, opening files, and basic workflow.',
    searchTerms: 'welcome setup new plan open save import encryption',
    items: [
      {
        id: 'create-new-plan',
        question: 'How do I create a new paycheck plan?',
        answer:
          'Use File > New Plan, or press Cmd/Ctrl+Shift+N. The welcome screen can also create a new plan. After setup, save the plan to keep your settings and data.',
        keywords: ['new plan', 'start', 'welcome', 'create'],
      },
      {
        id: 'open-existing-plan',
        question: 'How do I open an existing plan file?',
        answer:
          'Use File > Open Plan, or press Cmd/Ctrl+O. You can also double-click a supported plan file in your OS and it opens in the app.',
        keywords: ['open', 'load', 'file', 'recent files'],
      },
      {
        id: 'save-plan',
        question: 'What is the best way to avoid losing changes?',
        answer:
          'Save regularly with Cmd/Ctrl+S. Before close, the app prompts you to save when unsaved changes exist. You can also export app settings as backup from Settings.',
        keywords: ['save', 'unsaved', 'backup', 'close'],
      },
    ],
  },
  {
    id: 'pay-and-income',
    title: 'Pay and Income',
    description: 'Updating salary and understanding income behavior.',
    searchTerms: 'salary annual gross paycheck other income withholding auto taxable net',
    items: [
      {
        id: 'update-annual-salary',
        question: 'How can I update my annual salary?',
        answer:
          'Open Pay Options from the toolbar or View menu, then update your base pay amount and cadence. Your dashboard totals and related calculations refresh automatically.',
        keywords: ['annual salary', 'base pay', 'pay options', 'update'],
      },
      {
        id: 'other-income-auto-withholding',
        question: "What does withholding mode 'auto' mean for other income sources?",
        answer:
          "Auto mode applies a recommended withholding profile for that income source and records the withholding impact separately. It is intended to estimate tax impact without overwriting your manual tax line strategy.",
        keywords: ['withholding', 'auto mode', 'other income', 'tax impact'],
      },
      {
        id: 'pay-treatment-differences',
        question: "What is the difference between Gross, Taxable Only, and Net pay treatment?",
        answer:
          'Gross increases gross pay and can flow through taxes. Taxable Only affects taxable income/withholding while remaining distinct from base paycheck gross. Net increases take-home only and does not affect taxable income.',
        keywords: ['gross', 'taxable only', 'net only', 'pay treatment'],
      },
    ],
  },
  {
    id: 'settings-and-accessibility',
    title: 'Settings and Accessibility',
    description: 'Theme, font, readability, and interface behavior.',
    searchTerms: 'settings theme font accessibility contrast color vision glossary term links',
    items: [
      {
        id: 'change-font',
        question: 'How do I change the app font?',
        answer:
          'Open Settings and go to Accessibility. Use App Font to choose System Default, Inter, Verdana, Atkinson Hyperlegible, or OpenDyslexic. The change applies app-wide and persists.',
        keywords: ['font', 'accessibility', 'dyslexia', 'readability'],
      },
      {
        id: 'theme-vs-preset',
        question: 'What is the difference between Theme and Preset in Settings?',
        answer:
          'Theme controls light, dark, or system behavior. Preset controls the color palette used within that theme. You can mix them to fit your readability preferences.',
        keywords: ['theme', 'preset', 'light', 'dark', 'system'],
      },
      {
        id: 'disable-glossary-links',
        question: 'Can I turn off glossary term links and hover definitions?',
        answer:
          'Yes. In Settings > Glossary, set Term Links to Off. Terms will render as plain text without glossary hover/click behavior.',
        keywords: ['glossary', 'term links', 'hover', 'disable'],
      },
    ],
  },
  {
    id: 'imports-exports-and-safety',
    title: 'Imports, Exports, and Safety',
    description: 'Backups, importing app data, and encryption basics.',
    searchTerms: 'import export backup encryption keychain reset app settings',
    items: [
      {
        id: 'backup-app-settings',
        question: 'How do I back up my app settings and local preferences?',
        answer:
          'Open Settings > App Data and Reset, then choose Back Up First. This exports your app-level settings so they can be imported later on this or another device.',
        keywords: ['backup', 'export', 'app settings', 'preferences'],
      },
      {
        id: 'import-app-settings',
        question: 'What happens when I import app data?',
        answer:
          'Importing app data restores app-level settings and preferences from the selected backup file. The app then re-syncs theme/accessibility behavior from the restored data.',
        keywords: ['import', 'restore', 'settings', 'preferences'],
      },
      {
        id: 'reset-app-settings',
        question: 'Does Reset App Settings delete my saved plan files?',
        answer:
          'No. Reset App Settings clears app memory on the device (like local preferences and recent files) but does not delete your plan files from disk.',
        keywords: ['reset', 'delete', 'files', 'local data'],
      },
    ],
  },
];

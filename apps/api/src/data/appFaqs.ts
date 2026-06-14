/** Platforms a FAQ entry can apply to. */
export type AppFaqPlatform = 'desktop' | 'mobile';

export interface AppFaqItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  /**
   * Platforms this FAQ applies to. Omit (or leave undefined) when the entry is
   * relevant to every platform. Consumers hide entries that don't include their
   * own platform.
   */
  platforms?: AppFaqPlatform[];
  /**
   * Optional per-platform answer override. When a question applies everywhere but
   * the steps differ (e.g. menus/shortcuts on desktop vs. taps on mobile), provide
   * the platform-specific text here. Consumers fall back to `answer` when there is
   * no override for their platform.
   */
  platformAnswers?: Partial<Record<AppFaqPlatform, string>>;
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
        platformAnswers: {
          mobile:
            'Tap New Plan on the welcome screen (or the + button on the plans list) and complete setup. Your plan is saved to this device automatically.',
        },
      },
      {
        id: 'open-existing-plan',
        question: 'How do I open an existing plan file?',
        answer:
          'Use File > Open Plan, or press Cmd/Ctrl+O. You can also double-click a supported plan file in your OS and it opens in the app.',
        keywords: ['open', 'load', 'file', 'recent files'],
        platformAnswers: {
          mobile:
            'Tap Open on the welcome screen to import a .budget file from Files or iCloud, or open one that was shared to the app. It is copied into the app and kept in sync as you edit.',
        },
      },
      {
        id: 'save-plan',
        question: 'What is the best way to avoid losing changes?',
        answer:
          'Save regularly with Cmd/Ctrl+S. Before close, the app prompts you to save when unsaved changes exist. You can also export app settings as backup from Settings.',
        keywords: ['save', 'unsaved', 'backup', 'close'],
        platformAnswers: {
          mobile:
            'There is no manual save — changes are saved to this device automatically as you make them. For an extra copy, use Export / Back Up Plan in Settings.',
        },
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
        platformAnswers: {
          mobile:
            'Open the Summary tab and tap Edit on the Income card to open Pay Settings, then update your base pay and cadence. Your totals refresh automatically.',
        },
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
        platforms: ['desktop'],
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
        platforms: ['desktop'],
      },
    ],
  },
  {
    id: 'bills-and-allocations',
    title: 'Bills and Allocations',
    description: 'Details about managing bills and allocating funds across accounts.',
    searchTerms: 'bills stable allocation per paycheck buffer account starting balance seed bi-weekly smooth',
    items: [
      {
        id: 'account-starting-buffer',
        question: 'What is the suggested starting buffer for an account?',
        answer:
          'The suggested starting buffer is the amount to make sure you have in an account you are allocating funds to at the beginning of the year. It is calculated based on your monthly allocation totals for that account and your pay frequency. Seeding the account with at least the given amount before you start ensures you always have enough to cover the allocations for the months with fewer paychecks, even before the longer months can replenish it.',
        keywords: ['buffer', 'starting balance', 'account', 'bi-weekly', 'stable allocation', 'seed', 'shortfall', 'suggested'],
      },
    ],
  },
  {
    id: 'imports-exports-and-safety',
    title: 'Imports, Exports, and Safety',
    description: 'Backups, importing app data, and encryption basics.',
    searchTerms: 'import export backup encryption keychain reset app settings icloud files',
    items: [
      {
        id: 'backup-plan-mobile',
        question: 'How do I back up my plan?',
        answer:
          'Your plan saves to this device automatically. To keep an extra copy, open Settings and tap Export / Back Up Plan, then save it to Files or iCloud, or send it to the desktop app. Encrypted plans stay encrypted in the exported file.',
        keywords: ['backup', 'export', 'save', 'icloud', 'files', 'copy'],
        platforms: ['mobile'],
      },
      {
        id: 'backup-app-settings',
        question: 'How do I back up my app settings and local preferences?',
        answer:
          'Open Settings > App Data and Reset, then choose Back Up First. This exports your app-level settings so they can be imported later on this or another device.',
        keywords: ['backup', 'export', 'app settings', 'preferences'],
        platforms: ['desktop'],
      },
      {
        id: 'import-app-settings',
        question: 'What happens when I import app data?',
        answer:
          'Importing app data restores app-level settings and preferences from the selected backup file. The app then re-syncs theme/accessibility behavior from the restored data.',
        keywords: ['import', 'restore', 'settings', 'preferences'],
        platforms: ['desktop'],
      },
      {
        id: 'reset-app-settings',
        question: 'Does Reset App Settings delete my saved plan files?',
        answer:
          'No. Reset App Settings clears app memory on the device (like local preferences and recent files) but does not delete your plan files from disk.',
        keywords: ['reset', 'delete', 'files', 'local data'],
        platforms: ['desktop'],
      },
    ],
  },
];

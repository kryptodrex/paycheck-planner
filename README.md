# Budget Manager

A local desktop application for managing personal budgets with encrypted file storage. Built with Electron, React, TypeScript, and Vite.

## Features

✨ **Local-First** - All data stays on your computer, no cloud or accounts required  
🔒 **Encrypted Storage** - Budget files are encrypted using AES encryption  
💾 **Flexible Storage** - Save your budget files anywhere (iCloud, Google Drive, local folders)  
📊 **Budget Tracking** - Create categories, set budgets, and track spending  
💰 **Transaction Management** - Record income and expenses with detailed descriptions  
🎨 **Modern UI** - Clean, intuitive interface built with React  

## Prerequisites

- Node.js (v20.19+ or v22.12+)
- npm (comes with Node.js)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run in Development Mode

```bash
npm run dev
```

On first launch, you'll be guided through security setup where you can choose to enable encryption or skip it.

### 3. Build for Production

To create a distributable application:

```bash
# Build for your current platform
npm run build

# Or build without packaging (faster for testing)
npm run build:dir
```

The built application will be in the `release/` directory.

## How to Use

### First Launch - Security Setup

On your first launch, you'll see a security setup screen with two options:

**Option 1: Enable Encryption (Recommended)**
- Your budget files will be encrypted with AES-256
- You can choose to:
  - Use a generated secure key (recommended)
  - Enter your own custom key
- **Important:** Save your encryption key! You'll need it to access your files
- The key is stored securely on your computer

**Option 2: Skip Encryption**
- Budget files will be saved as readable JSON
- Easier to backup and inspect, but not secure
- Good for non-sensitive budgets or testing

You can change this setting later by clearing your browser storage and restarting the app.

### Creating Your First Budget

1. Launch the app
2. Click "Create New Budget"
3. Enter a name for your budget (e.g., "2026 Personal Budget")
4. Start adding categories and transactions!

### Adding Categories

Categories help organize your spending (e.g., Groceries, Rent, Entertainment).

1. Click "+ Add Category"
2. Enter the category name if you enabled encryption
- You can save to iCloud, Google Drive, Dropbox, or any local folder
- Files are saved with the `.budget` extension
4. The app will automatically assign a color

### Adding Transactions

Record your income and expenses:

1. Click "+ Add Transaction"
2. Enter a description
3. Enter the amount
4. Choose whether it's income or an expense
5. The transaction is added instantly

### Saving Your Budget

Click the "💾 Save Budget" button in the header. You'll be prompted to choose:

- Where to save the file (any folder on your computer)
- The file will be encrypted automatically
- You can save to iCloud, Google Drive, Dropbox, or any local folder

### Opening an Existing Budget

From the welcome screen, click "Open Existing Budget" and select your `.budget` file.

## File Format

Budget files use the `.budget` extension and contain:
JSON data (encrypted or plain text, based on your choice)
- All categories, transactions, and settings
- Can be backed up like any other file
- Encrypted files can only be opened with the correct encryption keyttings
- Can be backed up like any other file

## Project Structure

```
budget-manager/
├── electron/              # Electron main process files
│   ├── main.ts           # Main process (handles file I/O)
│   └── preload.ts        # Preload script (secure bridge)
├── src/
│   ├── components/       # React UI components
│   │   ├── WelcomeScreen.tsx
│   │   ├── BudgetDashboard.tsx
│   │   └── *.css
│   ├── contexts/         # React Context (state management)
│   │   └── BudgetContext.tsx
│   ├── services/         # Business logic
│   │   └── fileStorage.ts
│   ├── types/           # TypeScript type definitions
│   │   ├── auth.ts
│   │   └── electron.d.ts
│   ├── App.tsx          # Main app component
│   └── main.tsx         # App entry point
├── package.json
├── vite.config.ts
├── tsconfig.json
├── TYPESCRIPT_GUIDE.md   # TypeScript reference for JS developers
└── README.md            # This file
```

## Technology Stack

- **Electron** - Desktop app framework
- **React 19** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **crypto-js** - Encryption library
- **React Context** - State management

## Understanding TypeScript

If you're more familiar with JavaScript, check out [TYPESCRIPT_GUIDE.md](./TYPESCRIPT_GUIDE.md) for a comprehensive explanation of TypeScript concepts used in this project.

All code files include detailed comments explaining what each piece does!

## Security Notcan be encrypted with AES-256 (optional, your choice)
- If encryption is enabled:
  - The encryption key is stored locally on your computer
  - Keep your key safe - you'll need it to decrypt files
  - Files encrypted with one key cannot be decrypted with a different key
- If encryption is disabled:
  - Files are saved as plain JSON and readable by anyone
  - Good for non-sensitive budgets or when you need easy file inspection
- You choose the encryption setting on first launch
- For maximum security, generate a unique encryption key
- Files can only be decrypted with the correct key

## Troubleshooting

### "Electron API not available" Error

MakeCan't Open Encrypted File

If you get an error about encryption when opening a file:
- The file was created with encryption enabled
- Make sure your encryption key matches the one used to create the file
- Check that you completed the encryption setup

### Changing Encryption Settings

To change encryption settings:
1. Open the browser developer tools (View → Toggle Developer Tools)
2. Go to Console tab
3. Type: `localStorage.clear()`
4. Restart the app
5. You'll go through the setup again with new choices

### Lost Encryption Key

If you lose your encryption key and files are encrypted:
- Unfortunately, encrypted files cannot be recovered without the key
- This is by design for security
- Always keep a secure backup of your encryption key

Check that the app has permission to write to the selected directory.

### Encryption Key Issues

Make sure your `.env` file exists and contains `VITE_ENCRYPTION_KEY`.

### Node.js Version Warning

If you see a warning about Node.js version, it's safe to ignore if your version is 22.4+. The app will still run correctly.

## Future Enhancements

Potential features to add:

- 📈 Charts and visualizations
- 📤 Export to CSV/PDF
- 🔍 Search and filter transactions
- 🏷️ Tags for transactions
- 📅 Recurring transactions
- 💱 Multi-currency support
- 🌙 Dark mode
- 📱 Mobile companion app
- 🔄 Automatic backups
- 📊 Budget reports and analytics

## Contributing

Feel free to submit issues or pull requests!

## License

MIT License - feel free to use this for personal or commercial projects.

## Support

If you encounter issues or have questions, please open an issue on GitHub.

---

**Made with ❤️ using Electron, React, and TypeScript**

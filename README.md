# Persistent Highlighter

A Visual Studio Code extension that allows you to permanently highlight text in your code.

## Features

- **Persistent Highlighting**: Highlights are saved and will reappear when you reopen the file.
- **Multiple Colors**: Use a variety of colors to highlight different terms.
- **25 Built-in Colors**: Choose from 25 carefully selected built-in colors.
- **Custom Color Support**: Use any hex color code for personalized highlighting.
- **Color Selection UI**: Easy-to-use color picker for both built-in and custom colors.
- **Tree View Sidebar**: Manage all your highlights in a dedicated sidebar view.
- **Cross-Session Persistence**: Highlights persist across VS Code sessions.
- **Easy to Use**: Simple commands to add, remove, toggle, and manage highlights.

## Commands

### Core Commands
- `Persistent Highlighter: Add Highlight`: Adds a highlight to the selected text or the word under the cursor.
- `Persistent Highlighter: Add Highlight with Custom Color`: Adds a highlight with a custom color chosen from 25 built-in colors or a custom hex color.
- `Persistent Highlighter: Remove Highlight`: Removes a highlight from the selected text or the word under the cursor.
- `Persistent Highlighter: Toggle Highlight`: Toggles the highlight for the selected text or the word under the cursor.
- `Persistent Highlighter: Clear All Highlights`: Removes all highlights from all files.

### Sidebar Commands
- `Persistent Highlighter: Jump to Highlight`: Navigate to a specific highlight in the current file.
- `Persistent Highlighter: Edit Highlight`: Modify the text of an existing highlight.
- `Persistent Highlighter: Remove Highlight`: Delete a highlight from the sidebar.
- `Persistent Highlighter: Refresh`: Refresh the highlights tree view.

## Installation

1. Open Visual Studio Code.
2. Go to the Extensions view (`Ctrl+Shift+X`).
3. Search for "Persistent Highlighter" and click "Install".
4. Reload Visual Studio Code.

## Usage

### Basic Usage
1. Select the text you want to highlight or place the cursor on a word.
2. Open the command palette (`Ctrl+Shift+P`).
3. Run one of the `Persistent Highlighter` commands.

### Custom Color Usage
1. Select the text you want to highlight.
2. Run `Persistent Highlighter: Add Highlight with Custom Color`.
3. Choose from 25 built-in colors or select "Custom Color".
4. If choosing custom color, enter a hex color code (e.g., #FF5733).
5. The highlight will be applied with your chosen color.

### Keyboard Shortcut
- Use `Ctrl+Alt+T` (Windows/Linux) or `Cmd+Alt+T` (macOS) to quickly toggle highlights.

### Sidebar Management
1. Open the Explorer sidebar (`Ctrl+Shift+E`).
2. Find the "Highlights" section at the bottom.
3. Use the tree view to:
   - See all highlighted terms across all files
   - Jump to specific highlights
   - Edit highlight text
   - Remove individual highlights
   - Clear all highlights at once

## Development

### Prerequisites
- Node.js (version 16 or higher)
- Visual Studio Code
- TypeScript

### Development Setup
```bash
# Clone the repository
git clone https://github.com/jsfaint/persistent-highlighter.git
cd persistent-highlighter

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run in development mode (watch)
npm run watch

# Run tests
npm test

# Package extension
vsce package
```

### Architecture
The extension uses a single-file architecture with:
- `HighlightManager` class: Central manager for all highlighting operations
- VS Code API integration: Uses `TextEditorDecorationType` for rendering highlights
- State persistence: Uses `globalState` to store highlights across sessions
- Event-driven updates: Listens to document changes, active editor changes, and configuration changes

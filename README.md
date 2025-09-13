# Persistent Highlighter

A Visual Studio Code extension that allows you to permanently highlight text in your code.

## Features

- **Persistent Highlighting**: Highlights are saved and will reappear when you reopen the file.
- **Whole-Word Matching**: Accurate highlighting with proper word boundaries to avoid partial matches.
- **Multiple Colors**: Use a variety of colors to highlight different terms.
- **25 Built-in Colors**: Choose from 25 carefully selected built-in colors.
- **18 Preset Colors**: Quick access to 18 curated preset colors in the custom color picker.
- **Custom Color Support**: Use any hex color code for personalized highlighting.
- **Color Selection UI**: Easy-to-use color picker for both built-in and custom colors.
- **Tree View Sidebar**: Manage all your highlights in a dedicated sidebar view.
- **Cross-Session Persistence**: Highlights persist across VS Code sessions.
- **Case Sensitive Matching**: Optional case-sensitive search for highlights.
- **Large File Optimization**: Intelligent performance optimization for large files.
- **Caching System**: Efficient caching mechanism for improved performance.
- **Easy to Use**: Simple commands to add, remove, toggle, and manage highlights.

## Commands

- `Persistent Highlighter: Add Highlight`: Adds a highlight to the selected text or the word under the cursor.
- `Persistent Highlighter: Add Custom Color Highlight`: Adds a highlight with a custom color chosen from 25 built-in colors or a custom hex color.
- `Persistent Highlighter: Remove Highlight`: Removes a highlight from the selected text or the word under the cursor.
- `Persistent Highlighter: Toggle Highlight`: Toggles the highlight for the selected text or the word under the cursor.
- `Persistent Highlighter: Jump to Next Highlight`: Navigate to the next highlight in the current file.
- `Persistent Highlighter: Jump to Previous Highlight`: Navigate to the previous highlight in the current file.
- `Persistent Highlighter: Clear All Highlights`: Removes all highlights from all files.
- `Persistent Highlighter: Refresh`: Refresh the highlights tree view.
- `Persistent Highlighter: Jump to Highlight`: Navigate to a specific highlight in the current file.
- `Persistent Highlighter: Edit Highlight`: Modify the text of an existing highlight.

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
2. Run `Persistent Highlighter: Add Custom Color Highlight`.
3. Choose from 18 preset colors or select "Custom Color".
4. If choosing custom color, enter a hex color code (e.g., #FF5733).
5. The highlight will be applied with your chosen color.

**Preset Colors**: Coral, Turquoise, Sky Blue, Mint, Light Yellow, Plum, Seafoam, Golden, Lavender, Light Blue, Apricot, Light Green, Salmon, Light Purple, Pale Green, Peach, Pale Blue, Rose

### Keyboard Shortcuts

- `Shift+F1`: Toggle highlight

### Sidebar Management

1. Open the Explorer sidebar (`Ctrl+Shift+E`).
2. Find the "Highlights" section at the bottom.
3. Use the tree view to:
   - See all highlighted terms across all files
   - Jump to specific highlights
   - Edit highlight text
   - Remove individual highlights
   - Clear all highlights at once

## Configuration

The extension provides several configuration options to customize behavior:

### Performance Settings

- `persistent-highlighter.enableLargeFileOptimization`: Enable optimization for large files (default: true)
- `persistent-highlighter.chunkSize`: Chunk size in characters for large file processing (default: 50000)
- `persistent-highlighter.maxFileSize`: Maximum file size in characters before applying optimization (default: 1000000)
- `persistent-highlighter.visibleRangeBuffer`: Number of lines to buffer around visible range for large files (default: 100)

### Search Settings

- `persistent-highlighter.caseSensitive`: Enable case-sensitive matching for highlights (default: false)

To modify these settings, go to VS Code Settings and search for "Persistent Highlighter".

## Recent Updates

### Version 0.0.9

- **Update version to 0.0.9**: Keep project version up to date
- **Fix invalid highlight text provided issue**: Prevents adding empty or whitespace-only highlights
- **Remove redundant clearAllFromTreeCommand**: Streamlined command list for clarity
- **Update gitignore and vscodeignore**: Keep project files clean and optimized

### Version 0.0.7

- **Jump to Next/Previous Highlight**: Add new command for navigation between highlights
- **Cyclic Navigation**: Highlights cycle through the file when reaching end/beginning
- **Case-sensitive Support**: Navigation respects the case-sensitive configuration setting
- **Improved User Experience**: Seamless highlight navigation with appropriate warning messages

### Version 0.0.6

- **Fixed greedy matching issue**: Highlights now use whole-word matching with proper word boundaries
- **Improved search accuracy**: Enhanced `jumpToHighlight` function to use whole-word matching
- **Better text matching**: Fixed issue where partial word matches were incorrectly highlighted
- **Performance maintained**: All optimizations and caching systems remain intact

### Version 0.0.5

- Added intelligent caching system for improved performance
- Implemented large file optimization with configurable chunk processing
- Added case-sensitive matching option
- Enhanced custom color picker with 18 preset colors
- Improved sidebar tree view with better highlight management
- Added incremental document change processing

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

The extension uses a comprehensive architecture with:

- `HighlightManager` class: Central manager for all highlighting operations with caching support
- `HighlightsTreeProvider` class: Manages the sidebar tree view for highlight management
- VS Code API integration: Uses `TextEditorDecorationType` for rendering highlights
- State persistence: Uses `globalState` to store highlights across sessions
- Event-driven updates: Listens to document changes, active editor changes, and configuration changes
- Performance optimization: Intelligent caching and large file handling
- Custom color management: Dynamic decoration type creation for custom colors
- Incremental updates: Efficient processing of document changes without full re-rendering
sing of document changes without full re-rendering

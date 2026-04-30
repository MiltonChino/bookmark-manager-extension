# Prism Bookmarks Manager

Prism Bookmarks is a stunning, modern Native Chrome Bookmark Manager built with a glassmorphism interface. It provides an intuitive, highly interactive experience for managing, organizing, and searching your bookmarks.

## Features

- **Glassmorphism Interface**: A sleek, modern design that elevates the standard bookmarking experience.
- **Hierarchical Folder Tree**: Navigate your bookmark folders easily through a collapsible sidebar.
- **Marquee & Multi-Selection**: Click and drag a selection box to highlight multiple bookmarks at once.
- **Advanced Drag & Drop**:
  - Drag and drop to reorder bookmarks within the grid.
  - Drag bookmarks and drop them directly into folders (both in the grid and in the sidebar).
  - Move multiple selected bookmarks simultaneously.
- **Custom Context Menu**: Right-click any bookmark or folder to quickly rename, edit URLs, or delete items via a custom modal interface.
- **Real-Time Search**: Instantly filter and find your bookmarks as you type.

## How to Test and Install Locally

To test this extension on your machine, follow these steps to load it as an unpacked extension in Google Chrome:

1. **Get the Code**: Ensure you have the project directory on your local machine (e.g., `c:\test\bookmark-manager-extension`).
2. **Open Extensions Page**: Launch Google Chrome and navigate to `chrome://extensions/` in the URL bar.
3. **Enable Developer Mode**: In the top right corner of the Extensions page, toggle on **Developer mode**.
4. **Load Unpacked**: Click the **Load unpacked** button that appears in the top left corner.
5. **Select Directory**: Browse to and select the `bookmark-manager-extension` folder.
6. **Launch the Extension**: The "Prism Bookmarks" extension should now appear in your list. Click the extension icon in your Chrome toolbar (you may need to pin it first from the puzzle piece icon). It will open the custom bookmark manager interface in a new tab.

## Technologies Used

- **HTML5 & CSS3** (Vanilla CSS with Flexbox/Grid)
- **Vanilla JavaScript** (No external frameworks)
- **Chrome Extensions API** (Manifest V3, `chrome.bookmarks`, `chrome.tabs`)

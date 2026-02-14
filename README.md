# Brave Vertical Tabs Scrollbar

A lightweight extension that restores a visual draggable scrollbar for Brave’s Vertical Tabs to quickly jump between tabs.

Brave 1.86 removed the native (experimental) vertical tabs scrollbar due to upstream Chromium changes.
This affected Chromium-based browsers that rely on Chromium’s tab UI implementation rather than building their own.

---

## Features

- Slim vertical scrollbar overlay
- Draggable thumb to switch tabs
- Live tab preview (title + favicon)
- Customizable colors, width, and sizes
- Adjustable bottom filler spacing
- Lightweight and optimized

---

## Important

This is **not a real native scrollbar**.

Brave does not expose the vertical tabs scroll container to extensions, so true scroll syncing is not possible.

Instead, this extension simulates scrolling by activating tabs based on position.  
Because of this limitation, behavior is slightly different from a native scrollbar.

---

## Bottom Filler (40px)

The default 40px space at the bottom is **purely visual**, added to better match Brave’s layout. You can remove it by setting its height to 0px in the popup settings.
---

## Installation

1. Download the latest release `.zip`
2. Extract it
3. Open `brave://extensions`
4. Enable **Developer Mode**
5. Click **Load unpacked**
6. Select the extracted folder

---

## Author

Created by ollix.

---

## License

MIT License

# Archive Roulette

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Chrome Extension](https://img.shields.io/badge/Platform-Chrome-green.svg)](https://www.google.com/chrome/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)

**Browser extension for exploratory discovery of Internet Archive materials with quality filtering**

A Chrome extension that transforms your new tab page into a serendipity engine for digital history. Discover random photographs, audio recordings, videos, books, vintage magazines, historical newspapers, and software from the Internet Archive's vast collections.

![Archive Roulette Screenshot](screenshot.png)
*Screenshot coming soon*

---

## Features

- **Curated Randomization** — Draws from high-quality collections (Prelinger Archives, Library of Congress, Smithsonian, NASA, etc.) to surface meaningful content
- **Smart Quality Filtering** — Automatically excludes test images, placeholder files, and low-quality uploads
- **Duplicate Avoidance** — Tracks recently shown items to ensure variety across discoveries
- **Language Filtering** — Filter content by language (20+ options including English, Spanish, French, German, Japanese, Chinese, Arabic)
- **Media Type Filters** — Focus on Images, Audio, Video, Texts, Software, Web Archives, Newspapers, or Magazines
- **Advanced Search** — Narrow by year range, keywords, or specific Archive collections
- **Rich Metadata Display** — View comprehensive item information mirroring the Archive's item pages
- **Favorites with Sync** — Save interesting finds across devices via Chrome sync
- **Session History** — Rolling log of your last 50 discoveries
- **Export/Import** — Backup and share your favorites as JSON
- **Retro Aesthetic** — Warm, archival design with sepia tones and typewriter typography

---

## Installation

### From Source (Developer Mode)

1. **Download** this repository (Code → Download ZIP) or clone it:
   ```bash
   git clone https://github.com/yourusername/archive-roulette.git
   ```

2. **Open Chrome** and navigate to `chrome://extensions/`

3. **Enable Developer Mode** using the toggle in the top-right corner

4. **Click "Load unpacked"** and select the `archive-roulette` folder

5. **Open a new tab** to start exploring

### Updating

After pulling new changes or downloading an update:
1. Go to `chrome://extensions/`
2. Find Archive Roulette
3. Click the refresh icon (↻)

---

## Usage

### Basic Operation

1. Open a new tab in Chrome
2. A random item from the Internet Archive appears
3. Click **Next** (↻) to discover another item
4. Click **View on Archive.org →** to see the full item page

### Filtering

**Quick Toggles**: Click media type buttons to filter by category

**Advanced Filters** (click ⚙): 
- Year range (e.g., 1920–1940)
- Language selection
- Keyword search
- Specific collection IDs

### Favorites

- Click ♡ to save items (syncs across devices)
- Export as JSON for backup
- Import to restore or share collections

---

## How It Works

### Curated Collections

When no filters are applied, the extension randomly selects from quality-vetted collections:

| Media Type | Collections |
|------------|-------------|
| **Images** | Flickr Commons, Brooklyn Museum, NYPL, Smithsonian, NASA, Library of Congress, MoMA, Rijksmuseum |
| **Audio** | LibriVox, Grateful Dead Archive, etree, Old Time Radio, 78rpm recordings |
| **Video** | Prelinger Archives, Classic TV, Feature Films, Silent Films, Classic Cartoons |
| **Texts** | Project Gutenberg, Americana, Biodiversity Heritage Library, Pulp Magazine Archive |
| **Software** | MS-DOS Games, Apple Software, C64, Internet Arcade, Console Living Room |

### Quality Filtering

Items are automatically excluded if they match patterns indicating:
- Test content (`TESTIMAGES*`, `testfile*`)
- Camera auto-names (`IMG_*`, `DSC*`, `MVI_*`)
- Timestamp-only titles
- Very short or hash-like identifiers

### Randomization Strategy

1. Randomly select from curated collections (or apply user filters)
2. Vary sort order (downloads, date, title, rating) for diversity
3. Use multiple offset strategies across result sets
4. Fetch 100 candidates and apply quality filters
5. Exclude recently seen items (last 500)
6. Select randomly from remaining candidates

---

## Project Structure

```
archive-roulette/
├── manifest.json      # Chrome extension config (Manifest V3)
├── newtab.html        # Page structure
├── newtab.css         # Retro-archival styling
├── newtab.js          # Application logic, API calls, filtering
├── storage.js         # Persistence layer
├── background.js      # Service worker
├── icons/             # Extension icons
├── LICENSE            # GPL-3.0
└── README.md
```

---

## Customization

### Colors

Edit CSS custom properties in `newtab.css`:

```css
:root {
  --color-paper: #f4efe4;
  --color-ink: #2c2416;
  --color-accent: #8b4513;
}
```

### Adding Collections

Edit `CURATED_COLLECTIONS` in `newtab.js`:

```javascript
CURATED_COLLECTIONS: {
  image: ['flickrcommons', 'your_collection', ...],
}
```

### Quality Filters

Add patterns to `EXCLUSION_PATTERNS` in `newtab.js`:

```javascript
EXCLUSION_PATTERNS: [
  /^test/i,
  /your_pattern/i,
]
```

---

## APIs Used

This extension uses the Internet Archive's free, open APIs:

- **Advanced Search**: `https://archive.org/advancedsearch.php`
- **Metadata**: `https://archive.org/metadata/{identifier}`

No API keys required.

---

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/improvement`)
3. Commit changes (`git commit -am 'Add feature'`)
4. Push to branch (`git push origin feature/improvement`)
5. Open a Pull Request

---

## License

This project is licensed under the GNU General Public License v3.0. See [LICENSE](LICENSE) for details.

---

## Acknowledgments

- **[Internet Archive](https://archive.org)** — For preserving and providing open access to our digital heritage
- **Contributing Institutions** — Library of Congress, Smithsonian, NYPL, Brooklyn Museum, NASA, Prelinger Archives, and the many organizations that share their collections openly

---

## Author

Created by [Lance Eaton](http://www.LanceEaton.com)

---

## Related Resources

- [Internet Archive](https://archive.org)
- [Archive.org Advanced Search](https://archive.org/advancedsearch.php)
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)

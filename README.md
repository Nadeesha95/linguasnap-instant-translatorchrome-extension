# LinguaSnap – Instant Translator Extension

A Chrome extension that translates selected text into 25 languages with a 500 words/day limit.

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer Mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `translator-extension` folder

## Features

- 🌐 **25 languages** — Sinhala, Tamil, Chinese, Spanish, French, German, Japanese, Korean, Arabic, Hindi, Portuguese, Russian, Italian, Dutch, Turkish, Polish, Swedish, Indonesian, Malay, Thai, Vietnamese, Ukrainian, Bengali, Persian, Greek
- 🎯 **Select any text** on any webpage → instant translation tooltip
- 📊 **500 words/day limit** with visual usage bar
- 🔄 **Auto-resets** at midnight daily
- 🎨 **Beautiful dark UI** with language search
- auto detect language

## Usage

1. Click the extension icon in the toolbar
2. Select your target language
3. Toggle the extension **ON**
4. Select any English text on a webpage — the translation appears in a tooltip

## Files

```
translator-extension/
├── manifest.json      # Extension config
├── popup.html         # Popup UI
├── popup.js           # Popup logic + language list
├── content.js         # Page script (selection + tooltip)
├── tooltip.css        # Tooltip styles injected into pages
└── icons/             # Extension icons
```

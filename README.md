# Blind Helper

Accessible Chrome extension that announces hovered and focused page elements for blind and low-vision users. Uses text-to-speech to describe interactive elements, images, and page content in real-time.

![React](https://img.shields.io/badge/React-19.2-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6)
![Vite](https://img.shields.io/badge/Vite-8.0-646cff)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285f4)

## Features

- **Real-time Element Announcement**: Hover over or tab-navigate through page elements to hear descriptions
- **Multi-language Support**: 15 languages including English, Georgian, Russian, Spanish, French, German, Turkish, Arabic, Chinese, Japanese, and more
- **Multiple TTS Engines**:
  - Local browser voices (free, instant)
  - ElevenLabs cloud TTS (high-quality, configurable)
  - Google omnivorous fallback (last resort)
- **AI-Powered Image Descriptions**: Uses Gemini Vision API to describe images, charts, and visual content
- **Visual Highlight Overlay**: Orange border highlights the currently focused element
- **Adjustable Speech Rate**: Control narration speed from 0.5x to 2.5x
- **Keyboard Shortcuts**: Alt+Shift+Up/Down to adjust speech rate
- **Smart Language Detection**: Automatically detects script language (Cyrillic, Arabic, Chinese, etc.)
- **Rate Limit Handling**: Graceful degradation when API quotas are exceeded
- **Persistent Settings**: All preferences saved across sessions

## Installation

### Prerequisites

- Node.js 18+ and npm
- Google Chrome browser
- (Optional) ElevenLabs API key for premium voice synthesis
- (Optional) Google Gemini API key for AI image descriptions

### Setup

1. Clone the repository:
```bash
git clone https://github.com/giohello/react-chrome-ext.git
cd react-chrome-ext
```

2. Install dependencies:
```bash
npm install
```

3. Configure API keys (optional):
   - Open `src/hooks/useSettings.ts` and set default API keys if desired
   - Or enter them in the extension popup after loading

4. Build the extension:
```bash
npm run build
```

5. Load in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `dist` folder from your project directory

## Usage

### Basic Usage

1. Click the extension icon in Chrome's toolbar to open the popup
2. Toggle "Enable Blind Helper" to activate
3. Hover your mouse over page elements or use Tab to navigate
4. Listen as elements are described aloud

### Keyboard Controls

- **Alt + Shift + ↑**: Increase speech rate
- **Alt + Shift + ↓**: Decrease speech rate

### Settings

Access the popup to configure:

- **Interface Language**: Choose your preferred UI language
- **Speech Language**: Set the language for element descriptions
- **Narrator Voice**: Select a specific system voice or use auto-detection
- **Speech Rate**: Adjust narration speed (0.5x - 2.5x)
- **ElevenLabs Integration**: Enable premium cloud TTS with your API key
- **AI Descriptions**: Enable Gemini Vision for image descriptions

## Project Structure

```
react-chrome-ext/
├── public/
│   ├── manifest.json          # Chrome extension manifest (V3)
│   └── icons.svg              # Extension icons
├── src/
│   ├── main.tsx               # Extension entry point
│   ├── App.tsx                # Popup UI component
│   ├── App.css                # Popup styles
│   ├── content.ts             # Content script (injected into pages)
│   ├── constants.ts           # Shared constants
│   ├── speechConfig.ts        # Speech rate utilities
│   ├── languages.ts           # Language definitions
│   ├── tabSupport.ts          # Tab management utilities
│   ├── hooks/
│   │   ├── useSettings.ts     # Settings state management
│   │   ├── useTabMessaging.ts # Chrome tab communication
│   │   ├── useElevenLabsApi.ts # ElevenLabs integration
│   │   └── useSpeechVoices.ts # System voice enumeration
│   ├── i18n/
│   │   ├── useTranslation.ts  # Internationalization hook
│   │   └── locales/           # Translation files
│   └── assets/                # Static assets
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Architecture

### Content Script (`src/content.ts`)

The content script is injected into every webpage and handles:

- **DOM Observation**: Tracks mouse movement and keyboard navigation
- **Element Description**: Extracts accessible labels, roles, and text content
- **Speech Engine**: Three-tier strategy for text-to-speech
- **Visual Overlays**: Creates highlight borders and info panels
- **AI Integration**: Fetches Gemini Vision API for image analysis
- **State Management**: Maintains extension state and settings

### Popup (`src/App.tsx`)

React-based settings interface that:

- Communicates with content script via Chrome messaging
- Manages user preferences and API keys
- Displays Gemini API usage statistics
- Provides intuitive controls for all features

### Speech Strategy

The extension uses a priority-based approach:

1. **Exact Local Voice**: Matches system voice to detected language (preferred)
2. **ElevenLabs Cloud**: High-quality TTS when configured and no local voice exists
3. **Omnivorous Google**: Last-resort fallback using Google's network voices

## Development

### Available Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production (TypeScript + Vite)
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

### Tech Stack

- **React 19.2** - UI framework
- **TypeScript 6.0** - Type safety
- **Vite 8.0** - Build tool and dev server
- **ESLint** - Code linting with React hooks plugin
- **Chrome Extension Manifest V3** - Extension API

### Adding Languages

1. Add language entry in `src/languages.ts`
2. Create translation file in `src/i18n/locales/`
3. Update `src/content.ts` language list for AI detection

## API Keys

### ElevenLabs (Optional)

Sign up at [elevenlabs.io](https://elevenlabs.io) for premium text-to-speech voices.

1. Get your API key from the ElevenLabs dashboard
2. Enter it in the extension popup
3. Select a voice from "My Voices" or browse the Voice Library

Free tier includes 10,000 characters/month.

### Google Gemini (Optional)

Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

1. Create an API key
2. Enter it in the extension popup
3. Enable "AI Descriptions" toggle

Free tier includes 15 requests/minute and 1,500 requests/day.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Known Limitations

- **CORS Restrictions**: Some images may not be analyzable due to cross-origin policies
- **Voice Availability**: Language support depends on installed system voices
- **API Quotas**: Gemini free tier has daily limits; ElevenLabs has monthly character limits
- **Dynamic Content**: May need page refresh for SPAs with dynamic content

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Built with [React](https://react.dev/) and [Vite](https://vitejs.dev/)
- Speech synthesis powered by [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- AI descriptions powered by [Google Gemini](https://ai.google.dev/)
- Premium voices powered by [ElevenLabs](https://elevenlabs.io/)

## Support

For issues, questions, or feature requests, please [open an issue](https://github.com/giohello/react-chrome-ext/issues) on GitHub.
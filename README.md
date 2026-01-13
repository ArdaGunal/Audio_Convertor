# 🎵 Audio Convertor

**Audio Convertor** is a modern, sleek, and powerful audio conversion and video-to-audio extraction studio built with cutting-edge web technologies. It runs entirely in your browser, respects your privacy, and processes files locally using FFmpeg.wasm - no server uploads required!

![Audio Convertor Preview](https://images.unsplash.com/photo-1614149162883-504ce4d13909?q=80&w=2608&auto=format&fit=crop)

## ✨ Features

### 🎧 Audio Converter
- **Format Support:** MP3, WAV, FLAC, M4A, OGG, AAC, WMA
- **Batch Conversion:** Process multiple files simultaneously
- **Instant Preview:** Listen to files before or after conversion
- **Seek Bar:** Jump to any second in audio files
- **ZIP Download:** Download all converted files as a single ZIP

### 🎬 Video to Audio Extractor
- **Video Support:** MP4, MKV, AVI, WEBM, MOV
- **Fast Extraction:** Create high-quality WAV/MP3 audio from videos
- **Drag & Drop:** Easily drop large video files into the interface

### ✂️ Audio Tools
- **Audio Trimming:** Cut specific portions of audio files
- **More coming soon:** Audio merging, normalization, and more

### 💾 Persistent Storage
- Files are automatically saved to your browser's IndexedDB
- Refresh the page? Your files are still there!
- No account or cloud storage needed

### 🎨 Interface & Experience
- **Cinematic Design:** Full-screen, modern dark mode interface
- **Dynamic Views:** Switch between List or Grid view
- **Glassmorphism:** Modern glass effects and neon accents

## 🛠️ Technologies

This project is built with:

- **[Next.js 16](https://nextjs.org/)** - React Framework (App Router)
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling
- **[Shadcn/ui](https://ui.shadcn.com/)** - UI Components
- **[FFmpeg.wasm](https://ffmpegwasm.netlify.app/)** - Browser-based audio/video processing
- **[Lucide React](https://lucide.dev/)** - Icon set

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ArdaGunal/Audio_Convertor.git
   cd Audio_Convertor
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000` (or `3001` if 3000 is in use)

### Building for Production

```bash
npm run build
npm start
```

## 🔧 Easy Setup Script (Windows)

For Windows users, you can use the included batch file:

1. Double-click `AudioForge Baslat.bat`
2. The script will automatically start the development server
3. Your browser will open with the application

## 📁 Project Structure

```
Audio_Convertor/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   │   ├── AudioConverterSection.tsx
│   │   ├── VideoExtractorSection.tsx
│   │   ├── AudioToolsSection.tsx
│   │   └── ...
│   └── lib/              # Utilities and types
│       ├── types.ts
│       └── storage.ts    # IndexedDB persistence
├── public/               # Static assets
└── README.md
```

## 🌐 Browser Support

Audio Convertor works best on modern browsers that support:
- Web Audio API
- IndexedDB
- WebAssembly (for FFmpeg.wasm)

**Recommended:** Chrome, Edge, Firefox (latest versions)

## 🤝 Contributing

Contributions are welcome! Feel free to:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👤 Author

**Arda Günal**
- GitHub: [@ArdaGunal](https://github.com/ArdaGunal)

---

⭐ If you find this project useful, please consider giving it a star!

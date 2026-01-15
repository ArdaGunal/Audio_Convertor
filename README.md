# 🎵 Audio Convertor & Timeline Editor

**Audio Convertor** has evolved into a full-fledged **Timeline-Based Media Editor**. It's a modern, powerful studio built with cutting-edge web technologies. It runs entirely in your browser, respects your privacy, and processes files locally using FFmpeg.wasm - no server uploads required!

![Audio Convertor Preview](https://images.unsplash.com/photo-1614149162883-504ce4d13909?q=80&w=2608&auto=format&fit=crop)

## ✨ Features

### 🎬 Timeline Video Editor (New!)
- **Multi-Track Editing:** Unlimited video and audio tracks.
- **Drag & Drop:** Intuitively drag files from library to timeline.
- **Precision Editing:**
  - **Trim:** Drag clip edges to resize.
  - **Split:** Cut clips at the playhead position.
  - **Move:** Rearrange clips freely on tracks.
- **Clipboard Operations:** Cut, Copy, Paste clips between tracks.
- **Keyboard Shortcuts:** Speed up your workflow (see below).
- **Persistent Project:** Your timeline state is automatically saved.

### 🎧 Audio Converter
- **Format Support:** MP3, WAV, FLAC, M4A, OGG, AAC, WMA
- **Batch Conversion:** Process multiple files simultaneously
- **Instant Preview:** Listen to files before or after conversion
- **ZIP Download:** Download all converted files as a single ZIP

### 🎥 Video to Audio Extractor
- **Video Support:** MP4, MKV, AVI, WEBM, MOV
- **Fast Extraction:** Create high-quality WAV/MP3 audio from videos

### ⌨️ Keyboard Shortcuts
| Action | Shortcut |
|--------|----------|
| **Play/Pause** | `Space` |
| **Split Clip** | `S` or `Ctrl + B` |
| **Delete Clip** | `Delete` |
| **Copy** | `Ctrl + C` |
| **Cut** | `Ctrl + X` |
| **Paste** | `Ctrl + V` |

### 💾 Persistent Storage
- Files are automatically saved to your browser's IndexedDB
- Refresh the page? Your files are still there!
- No account or cloud storage needed

### 🎨 Interface & Experience
- **Cinematic Design:** Full-screen, modern dark mode interface
- **Responsive Layout:** Collapsible sidebars for focused editing
- **Glassmorphism:** Modern glass effects and neon accents

## 🛠️ Technologies & Architecture

This project is built with a modular modern stack:

- **[Next.js 16](https://nextjs.org/)** - React Framework (App Router)
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling
- **[FFmpeg.wasm](https://ffmpegwasm.netlify.app/)** - Browser-based processing
- **Custom Hooks Architecture:**
  - `useMediaFiles`: Robust file management with IndexedDB sync.
  - `useTimeline`: State logic for tracks, clips, and playback (immutable & sanitized).
  - `useMediaExport`: FFmpeg pipeline management.

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

## 🔧 Easy Setup Script (Windows)

For Windows users, you can use the included batch file:
1. Double-click `AudioForge Baslat.bat`
2. The script will automatically start the development server
3. Your browser will open with the application

## 🌐 Browser Support

Audio Convertor works best on modern browsers that support:
- Web Audio API
- IndexedDB
- WebAssembly (for FFmpeg.wasm)

**Recommended:** Chrome, Edge, Firefox (latest versions)

## 🤝 Contributing

Contributions are welcome! Feel free to open a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👤 Author

**Arda Günal**
- GitHub: [@ArdaGunal](https://github.com/ArdaGunal)

---

⭐ If you find this project useful, please consider giving it a star!

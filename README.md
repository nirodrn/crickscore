# 🏏 CricketZCore

CricketZCore is a professional-grade **live cricket scoring application** built for broadcasters, streamers, and local cricket clubs. Unlike standard scoring apps, CricketZCore is built with **OBS (Open Broadcaster Software) integration** at its core, allowing you to generate TV-style broadcast overlays that sync in real time with your scoring data.

---

## 🔗 Live Demo

https://cricketzcore.web.app

---

## 🚀 Key Features

### 🎯 Professional Scoring Engine

* Ball-by-ball scoring (Runs, Wickets, Wides, No-Balls, Byes, Leg Byes)
* Match Management (T20, ODI, Test, Custom)
* Player Database with roles (Batter, Bowler, Keeper, Captain)
* Undo feature for correcting errors
* Offline-ready (local storage caching)

### 📺 Broadcast & OBS Integration

* Real-time sync via Firebase Realtime Database
* Scorer and Stream PC can operate across networks
* **10+ Broadcast Graphics Panels**:

  * Footer Overlay (Live bottom ticker)
  * Versus Screen
  * Scorecard Summary
  * Fall of Wickets
  * Run Rate Analysis (Worm, Manhattan, Powerplay/Death)
  * Player Stats (Head-to-head & individual)
  * Winner Panel
* Remote overlay control from the scoring interface

### 🎨 Customization

* Team color theming
* Logo upload (File, URL, ImgBB, Pexels)
* Live style editor for overlays (fonts, gradients, spacing)

---



## 🛠️ Tech Stack

* **Frontend:** React.js (Vite) + TypeScript
* **Styling:** Tailwind CSS
* **Backend:** Firebase (Auth, Realtime DB)
* **Hosting:** Firebase Hosting
* **Icons:** Lucide React
* **External Services:** ImgBB, Pexels API

---

## ⚡ Quick Start Guide

### 1. Setting Up a Match

1. Log in
2. Click **New Match**
3. Add Teams, Logos, Players
4. Choose match format
5. Toss → Select openers
6. Start Match

### 2. Using with OBS / Streamlabs

1. After starting a match, click **OBS URL**
2. Copy the provided browser source link
3. In OBS → Add **Browser Source**
4. Paste URL
5. Set resolution to **1920×1080**
6. Use Overlay Control Panel to toggle graphics

---

## 💻 Local Development

### Clone the repo

```bash
git clone https://github.com/nirodrn/crickscore.git
cd crickscore
```

### Install dependencies

```bash
npm install
```

### Configure Firebase

Open `src/firebase.ts` and replace with your Firebase details:

```ts
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "YOUR_DB_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Run development server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

---

## 📂 Project Structure

```bash
src/
├── components/
│   ├── MatchSetup
│   ├── ScoreControls
│   ├── ScoreDisplay
│   ├── OverlayControlPanel
│   └── ...
├── utils/
├── types.ts
├── firebase.ts
├── cricketUtils.ts
└── App.tsx
```

---

## 🤝 Contributing

1. Fork repo
2. Create feature branch

```bash
git checkout -b feature/AmazingFeature
```

3. Commit

```bash
git commit -m "Add AmazingFeature"
```

4. Push

```bash
git push origin feature/AmazingFeature
```

5. Open PR

---

## 📄 License

MIT License. By DETZ.

---

Built with ❤️ by **Nirod RA**

# SHADOW NINJA — 2D Anime Action RPG

An offline single-player 2D Action RPG / Hack-and-Slash Platformer built with **Phaser 3**, **React**, **TypeScript**, **Tailwind CSS**, and **Capacitor** for Android landscape play.

## Features
- **Full Action Combat**: Walk, sprint, jump, double-jump, shadow dash (with i-frames), 3-hit melee combo, aerial crescent slash, unlockable active skills, Eclipse Ultimate, guard & perfect parry, critical hits, knockback, hitstop, and screen shake.
- **5 Realms & 5 Bosses + 3 Mini-Bosses**: Shadow Forest, Forgotten Village, Dark Mountain, Ancient Temple, and Demon Castle—each with bespoke hand-painted anime backgrounds, parallax depth, weather effects, traps, secret areas, checkpoints, and sealed boss arenas.
- **Progression & Offline Persistence**: XP & leveling, Skill Tree, Equipment & Inventory, Quests & Achievements, 3 Save Slots stored in IndexedDB with localStorage fallback and corruption validation.
- **Bilingual**: Full Indonesian (`ID`) & English (`EN`) localization.
- **Android Ready**: Responsive landscape virtual joystick & action buttons, 60 FPS / 30 FPS limiter, graphics quality scaler, Capacitor configuration, and GitHub Actions APK pipeline.

## Browser Development
```bash
npm install
npm run dev
```

## Production Web Build
```bash
npm run lint
npm run build
```

## Android Capacitor Build (Local)
```bash
npm install @capacitor/android
npx cap add android
npm run cap:android
cd android && ./gradlew assembleDebug
```
The compiled APK will be generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

# PWA — Install Stokify to Home Screen

## Goal

Turn the existing React/Vite app into an installable Progressive Web App so users
can add Stokify to their iOS/Android home screen without any App Store involvement.
Looks and behaves like a native app, works offline for cached views.

## Estimated effort: 1–2 days

## What changes

### 1. Web App Manifest (`public/manifest.json`)

Create `public/manifest.json` and link it in `index.html`:

```json
{
  "name": "Stokify",
  "short_name": "Stokify",
  "description": "Household stock tracker",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1a73e8",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Add to `index.html`:
```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#1a73e8" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Stokify" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

### 2. Icons

Generate from the existing logo:
- `public/icons/icon-192.png` (192×192)
- `public/icons/icon-512.png` (512×512)
- `public/icons/icon-512-maskable.png` (512×512 with safe-zone padding for Android)

Tool: https://maskable.app or `pwa-asset-generator` npm package.

### 3. Service Worker via vite-plugin-pwa

Add `vite-plugin-pwa` (the standard Vite PWA plugin — zero manual service worker code):

```bash
npm install -D vite-plugin-pwa
```

`vite.config.ts`:
```ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Cache app shell + static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Don't cache API calls — always go to network for fresh data
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\//,
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: false, // we manage manifest.json ourselves
    }),
  ],
})
```

### 4. Safe-area insets

The app already uses `pb: 9` on most pages for the bottom nav. Audit for any fixed
bottom elements and add `env(safe-area-inset-bottom)` padding so content isn't
hidden behind iPhone home indicator:

```ts
// In global CSS or MUI theme
paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)'
```

`index.html` needs the viewport meta tag:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

### 5. Splash screens (iOS)

Apple does not use the manifest for splash screens — it needs static `apple-touch-startup-image`
link tags for each device size, or a JS workaround. Use `pwa-asset-generator` to auto-generate:

```bash
npx pwa-asset-generator public/icons/icon-512.png public/icons \
  --index public/index.html --manifest public/manifest.json
```

## What does NOT change

- Backend — zero changes
- Firebase Auth — works identically in standalone mode
- Firebase RTDB real-time sync — works
- Receipt camera — `<input capture="environment">` works in PWA mode on both platforms
- All existing routes and features

## Known limitations (PWA vs native)

| Capability | PWA | Capacitor (native) |
|---|---|---|
| App Store listing | ✗ | ✓ |
| Push notifications (iOS) | Limited (iOS 16.4+, must be added to home screen first) | Full |
| Background sync | Partial | Full |
| Home screen install prompt | Android: automatic; iOS: manual "Add to Home Screen" | Automatic |
| Camera (receipt scan) | ✓ already works | ✓ (better UX) |
| Offline | Partial (cached shell + assets) | Full (with more effort) |

## Test plan

- [ ] Lighthouse PWA audit scores ≥ 90 (run in Chrome DevTools)
- [ ] "Add to Home Screen" prompt appears on Android Chrome
- [ ] iOS Safari shows "Add to Home Screen" option in share sheet
- [ ] Installed app opens in standalone mode (no browser chrome)
- [ ] Receipt camera works from installed PWA on both platforms
- [ ] App updates automatically after a new deploy (autoUpdate strategy)
- [ ] Safe-area insets correct on iPhone with home indicator

## Files to create / modify

| File | Action |
|---|---|
| `public/manifest.json` | Create |
| `public/icons/icon-192.png` | Create |
| `public/icons/icon-512.png` | Create |
| `public/icons/icon-512-maskable.png` | Create |
| `index.html` | Add manifest link + meta tags + viewport-fit=cover |
| `vite.config.ts` | Add VitePWA plugin |
| `package.json` | Add `vite-plugin-pwa` dev dependency |

## Next step after PWA

If App Store presence becomes a requirement, the Capacitor path
(`_features/Capacitor_Plan.md`) builds directly on top of this work —
the manifest and icons carry over, and the service worker is replaced by
Capacitor's native layer.

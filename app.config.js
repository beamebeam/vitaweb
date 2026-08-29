// app.config.js (dinamis, menggantikan app.json) - supaya base path web bisa diatur
// otomatis lewat environment variable saat build di GitHub Actions (lihat .github/workflows/deploy.yml).
// Kalau EXPO_PUBLIC_BASE_PATH tidak diset (mis. saat `expo start` di lokal / build mobile),
// nilainya kosong '' dan tidak berpengaruh sama sekali.
const basePath = process.env.EXPO_PUBLIC_BASE_PATH || '';

export default {
  expo: {
    name: 'vita',
    slug: 'snack-d41198a3-f9fe-4576-ac31-9dedb046badd',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
      output: 'single',
    },
    experiments: {
      baseUrl: basePath,
    },
    description: 'App for Odhiv',
  },
};

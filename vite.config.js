import { defineConfig } from 'vite';

export default defineConfig({
  server: { host: true, port: 5173 }, // host: true → se puede abrir desde el celular en la misma red wifi
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600, // Phaser pesa ~1.2 MB y se carga aparte, solo al entrar al campus
  },
});

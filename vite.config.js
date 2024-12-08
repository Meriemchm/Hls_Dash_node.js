import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'


export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Pour que le serveur écoute sur toutes les interfaces
    port: 5173,       // Le port sur lequel Vite tourne (5173 par défaut)
  },
})

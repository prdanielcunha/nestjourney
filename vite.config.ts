import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Keep route-level lazy loading effective by separating the long-lived framework,
// Firebase SDK families, and icon library from NestJourney's application code.
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules\/(?:react|react-dom|react-router-dom)\// },
            { name: 'firebase-firestore', test: /node_modules\/@firebase\/firestore/ },
            { name: 'firebase-auth', test: /node_modules\/@firebase\/auth/ },
            { name: 'firebase-vendor', test: /node_modules\/(?:firebase|@firebase)\// },
            { name: 'icons-vendor', test: /node_modules\/lucide-react\// },
          ],
        },
      },
    },
  },
})

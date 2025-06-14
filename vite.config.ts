import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.AIzaSyAaLIV7OGol-XvcuieKOXwRT--thR19Eps),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.AIzaSyAaLIV7OGol-XvcuieKOXwRT--thR19Eps)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

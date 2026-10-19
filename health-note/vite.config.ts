import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_SUPABASE_');
  const supabaseUrl = env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    const hostname = new URL(supabaseUrl).hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    if (mode === 'development' && !isLocal) {
      throw new Error(
        '개발 환경은 로컬 Supabase에 연결해야 합니다. .env.development을 확인하세요.',
      );
    }
    if (mode === 'production' && isLocal) {
      throw new Error(
        '운영 빌드에는 클라우드 Supabase 주소가 필요합니다. .env.production 또는 배포 환경 변수를 확인하세요.',
      );
    }
  }

  return {
    server: { port: 5173, strictPort: true },
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "@/styles/variables" as *; @use "@/styles/mixins" as *;\n',
        },
      },
    },
  };
});

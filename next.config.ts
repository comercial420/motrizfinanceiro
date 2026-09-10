import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Necessário para deploy no Vercel com Supabase
  experimental: {
    // Garante que as variáveis de ambiente NEXT_PUBLIC_* sejam incluídas no bundle do cliente
  },
  // Headers de segurança para produção
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ];
  },
};

export default nextConfig;
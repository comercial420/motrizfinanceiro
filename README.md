# Financial Master Motriz

Dashboard financeiro e operacional para **MH8 Mobilidade Ltda** (Motriz) — locadora B2B de motocicletas elétricas.

## Stack

- Next.js 16 (App Router, Turbopack)
- TypeScript (strict mode)
- Tailwind CSS + shadcn/ui
- Recharts (gráficos)
- TanStack Table (tabelas performáticas)
- React Hook Form + Zod (formulários validados)
- Zustand (estado global com persistência localStorage)
- Lucide React (ícones)

## Getting Started

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no browser.

### Seed Data

O app carrega automaticamente dados fictícios realistas na primeira execução (15 motos, 5 clientes B2B, 4 contratos ativos, ~42 lançamentos financeiros dos últimos 3 meses). Os dados são persistidos no `localStorage` do browser sob a chave `fmm_data`.

Para resetar os dados, abra o DevTools Console e execute:
```js
localStorage.removeItem('fmm_data'); location.reload();
```

## Estrutura de Telas

| Rota | Descrição |
|------|-----------|
| `/` | Dashboard Executivo com 9 KPIs, 3 gráficos interativos e alertas inteligentes |
| `/lancamentos` | CRUD de lançamentos financeiros com validação contextual e filtros |
| `/frota-contratos` | Gestão de estoque de motos e contratos ativos com vínculo de chassis |
| `/projecoes` | Simulador de cenários (Base/Pessimista/Otimista) e projeção 12 meses |

## Configuração Supabase (opcional)

O app funciona com `localStorage` por padrão. Para migrar para Supabase:

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Copie `.env.example` para `.env.local`
3. Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Implemente as queries no adapter em `src/lib/supabase-adapter.ts` (TODOs marcados)

## Deploy na Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)

Ou via CLI:
```bash
npx vercel --prod
```

O build gera páginas 100% estáticas (`○ Static`) — sem necessidade de servidor Node em produção.

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Não | URL do projeto Supabase (apenas se usar Supabase) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Não | Anon key do Supabase (apenas se usar Supabase) |

## Regras de Negócio Implementadas

- **Motos de Locação:** M3K, Z3K, U3K, U5K, Tóquio (geram receita recorrente)
- **Estoque Parado:** S8K, R8K, Vespa (não entram na receita recorrente)
- **CAPEX ≠ Despesa:** Compra de moto é saída de caixa mas não reduz lucro operacional
- **Comissões Híbridas:** Sócio e Técnico têm parte fixa + variável vinculada a contrato
- **Receita Previsível:** Métrica rainha, sempre visível no dashboard
- **Integridade Referencial:** Chassi → Contrato → Cliente → Receita (cadeia obrigatória)

## Scripts

```bash
npm run dev      # Dev server com hot reload
npm run build    # Build de produção
npm run start    # Servir build de produção
npm run lint     # ESLint
```

## Licença

Proprietário — MH8 Mobilidade Ltda.
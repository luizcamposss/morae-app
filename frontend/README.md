# Moraê — frontend

React 19 + TypeScript + Vite + Tailwind 4. Visual e componentes seguem o `DESIGN.md` da raiz do projeto.

## Rodar

```bash
npm ci
npm run dev      # http://localhost:5173 (a API precisa estar em VITE_API_URL)
```

Variáveis em `.env` (modelo em `.env.example`): `VITE_API_URL`, endereço da API.

## Checagens

```bash
npm run lint
npm run build
```

## Organização

- `src/app`: rotas por papel (`routes/`), provedores de sessão e condomínio.
- `src/features`: uma pasta por tela ou módulo, com a página, os componentes e o serviço da API.
- `src/shared`: componentes, hooks, layout e funções comuns (`lib/api`, `lib/date`, `lib/currency`).

As rotas da API estão em `docs/ai/api.md`.

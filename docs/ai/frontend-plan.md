# Moraê — plano da rodada de frontend

O backend está completo (`docs/ai/api.md`). O Luiz quer **redesenhar a interface**: não basta ligar telas novas no visual atual. Esta rodada faz o redesenho e cria as telas que faltam, dividida em tarefas que podem rodar **em paralelo** em worktrees separadas (Orca).

- **Contexto de produto:** `PRODUCT.md` (público, posicionamento, referências de marca). O sistema visual vai para `DESIGN.md` quando for definido.
- **Figma primeiro:** as telas são desenhadas no Figma e aprovadas pelo Luiz antes de codar. Ordem: hero da landing + painel do Admin (definem o mundo visual) → login + tela do morador no celular → componentes → demais telas.
- **Figma (fonte da verdade do visual):** arquivo "Moraê — Design" (`https://www.figma.com/design/UKGvrNjI0Xd2fuVOCVf3Dx`). Página **Landing**: hero com frase-seletor ("Hoje, o que mais me tira o sono é ▾") e a página completa com a história em scroll. Página **App** (hoje não está neste arquivo): painel do Admin v2, Carteira, Cobranças, Início do morador, Login e cédula da Assembleia. As cores estão nas variáveis "Moraê / Cores".
- **Estilo do app (decidido pelo Luiz):** clean e minimalista, inspirado nos apps da Apple. Mesma estrutura do código atual (menu lateral por papel + conteúdo), mas: menu com ícone + nome (sem grupos), sem barra de topo separada (título grande com sininho e perfil na mesma linha), números agrupados num só cartão, listas agrupadas estilo Ajustes do iPhone (ícone em quadradinho colorido, título, subtítulo, ›), fundo cinza-esverdeado claro `#EDF0EA` com cartões brancos, menu `#E4E9E2`, cantos de 12–16 px, botões em pílula, ícones de linha (estilo Lucide). Sem telas mobile no Figma por enquanto. A mensalidade do Moraê (cobrança da plataforma) fica em Ajustes → Plano e pagamento.
- **PWA:** um só sistema web para computador e celular, instalável na tela inicial (manifest + service worker). Toda tela precisa funcionar nos dois tamanhos.

> **Situação em 2026-10-22:** as ondas 0, 1 e 2, a landing (T8) e a importação (L) estão prontas e mescladas na `develop`. Falta o deploy (G, issue #108), o PWA (#107) e o tour animado (#106).

## Roadmap (combinado com o Luiz em out/2026)

Por painel, na ordem abaixo. Cada item é uma parte pequena: explicar → o Luiz decide → implementar → `lint` + `build` → conferir no Chrome → parar com o bloco de commit. Código limpo a cada parte (sem sobras do visual antigo), seguindo o padrão existente, sem nada mirabolante. Todo trabalho de interface passa pela skill **Impeccable**. Cada fase tem a sua branch a partir da `develop`.

| Fase | Branch | Partes |
|---|---|---|
| **0. Fundação** | `feat/frontend-foundation` | 0.1 Configuração (`VITE_API_URL` no front, `Cors__Origins` no backend) · 0.2 Sistema visual (tokens + `DESIGN.md`, a partir do Figma "App") · 0.3 Componentes base · 0.4 Layout e menu por papel + guarda de permissões do síndico · 0.5 Logos animados no app (Chegada, Respiro, Confirmação) |
| **1. Acesso** | `feat/frontend-auth` | 1.1 Login · 1.2 Esqueci/redefinir senha · 1.3 Aceitar convite · 1.4 Telas de bloqueio (suspenso, condomínio inativo) |
| **2. Master** | `feat/frontend-master` | 2.1 Painel · 2.2 Condomínios · 2.3 Admins e convites · 2.4 Mensalidade (cobranças da plataforma) · 2.5 Contatos da landing (backend 1.1 e 1.2) · 2.6 Ajustes |
| **3. Admin** (por módulo) | uma branch por módulo | 3.1 Financeiro (backend: lote/recorrência e multa/juros) · 3.2 Pessoas, unidades e síndico (backend: importação por planilha) · 3.3 Avisos e Documentos · 3.4 Ocorrências (backend: fotos e resposta) · 3.5 Manutenção e Visitantes · 3.6 Assembleias · 3.7 Painel com gráficos |
| **4. Síndico** | `feat/frontend-syndic` | As telas do Admin com permissões e prédios do síndico |
| **5. Morador** | `feat/frontend-resident` | Celular primeiro: início, pagar, avisos, documentos, visitas, ocorrências, votar |
| **6. Landing** | `feat/landing-page` | Codar o desenho do Figma (tour animado + formulário) |
| **7. Lançamento** | `feat/pwa`, `feat/deploy` | PWA (manifest, service worker) e deploy na VPS |

As tarefas T1–T8 abaixo continuam valendo como descrição do que cada tela precisa.

## Como dividir sem conflito

- **Onda 0 (F0) vem antes e sozinha.** Ela define o visual, os componentes compartilhados e os "pontos de registro" de rotas e menus. As outras tarefas só começam depois do merge da F0 na `develop`.
- **Cada tarefa é dona da sua pasta** em `frontend/src/features/<pasta>`. Não edite pastas de outra tarefa.
- **Arquivos compartilhados** (`app/AppRouter.tsx`, `shared/layout/*`, `shared/lib/api/*`, `shared/components/*`) só mudam na F0. Depois dela, as tarefas apenas **acrescentam uma entrada** nos registros de rota e menu do papel (criados na F0). Se precisar de um componente compartilhado novo, crie dentro da sua pasta e avise o Luiz para promover depois.
- Cada tarefa tem a sua branch, criada a partir da `develop` já com a F0. Siga as regras do `CLAUDE.md`: explicar → decidir → implementar → testar → parar a cada parte para o commit.
- **Teste:** cada agente sobe a própria API temporária (5243, 5244…) e o próprio Vite (5174, 5175…) com `VITE_API_URL` apontando para a sua API. Confira no navegador com as contas de teste dos 4 papéis, e rode `npm run lint` e `npm run build`.

---

## Onda 0 — F0 Fundação do redesenho (bloqueia as outras)

**Branch:** `feat/frontend-foundation`. **Comece conversando com o Luiz** sobre a direção visual (referências, cores, tipografia, claro/escuro). Não escolha sozinho.

1. **Configuração:**
   - `API_BASE_URL` vindo de `import.meta.env.VITE_API_URL` (hoje está fixo em `shared/lib/api/config.ts`), com `frontend/.env.example`.
   - **Backend:** CORS lendo `Cors__Origins` (lista separada por vírgula; hoje está fixo em `http://localhost:5173` no `Program.cs`), para os agentes testarem em outras portas e para o deploy. Documentar em `backend/.env.example`.
2. **Sistema visual:** tokens (cores, espaços, raios, sombras), tipografia, claro/escuro se o Luiz quiser.
3. **Componentes base em `shared/components`:** Button, Input/Select/Textarea, DateField e TimeField (`"HH:mm"`), Modal, ConfirmDialog, Table/List com estado vazio e carregando, Badge de status, Tabs, Toast de sucesso/erro (mostrando a `message` da API), FileUpload (valida tipo e 20 MB **antes** de enviar), Pagination/Filters.
4. **API:** helpers em `shared/lib/api` para upload `multipart/form-data` e download autenticado (blob + nome do arquivo do `Content-Disposition`).
5. **Layout:** AppLayout/Sidebar/Topbar redesenhados. Menu por papel montado a partir de um **registro por papel** (ex.: `app/navigation/<papel>.ts`) e rotas a partir de `app/routes/<papel>.tsx`, para as tarefas acrescentarem itens sem editar o mesmo trecho.
6. **Acesso:**
   - `SyndicAccessProvider` + guarda de rota: síndico sem a permissão não abre a tela pela URL. Hoje `defaultSyndicAccess` é `true` (deixa passar): mudar para **negar por padrão**.
   - Mapear as permissões novas (`documents.manage`, `maintenance.manage`, `visitors.manage`, `assemblies.manage`) em `features/syndicAccess`.
   - Telas de bloqueio: **condomínio inativo** (`isCondominiumInactive` do `GET /api/me`) e conta suspensa (já existe `/suspended`, revisar).
7. **Aplicar o novo visual nas telas que já existem**, sem mudar comportamento. Pode ser feito por papel em partes (Master, Admin, Síndico, Morador).
8. **PWA:** `manifest.webmanifest` (nome Moraê, ícones a partir do logo, cores do tema), service worker simples (cache do app shell; nunca cachear respostas da API com dados pessoais), meta tags de tela inicial no iOS.
9. Limpeza: apagar páginas mock órfãs (confirmar com grep que não são importadas: `features/{inspections,maintenance,communication,masterInvitations,adminUsers,people}`), remover o BOM do `Sidebar.tsx`, corrigir os warnings de `exhaustive-deps`.

---

## Onda 1 — em paralelo (depois da F0)

### T1 — Senha e sessão · `feat/frontend-auth`
- Telas `/forgot-password` e `/reset-password?token=` (rotas públicas). Ligar o link "Esqueci minha senha" do login.
- `POST /api/auth/forgot-password` (sempre mostra a mensagem neutra), `POST /api/auth/reset-password` (`{ token, newPassword }`, regras com `PasswordRequirements`).
- Mensagens: link inválido/expirado (pedir de novo), senha fraca, sucesso → ir para o login.

### T2 — Síndico e permissões · `feat/frontend-syndic`
- **Admin:** na tela de pessoas/usuários do condomínio, editar as **permissões do síndico** (todas, com rótulos em português) e os **prédios que ele administra** ("todos os prédios" ou lista).
- **Síndico — Financeiro:** criar cobrança (só unidades dos prédios dele), dar baixa manual, comprovante. Ações visíveis conforme `charges.create` / `charges.mark_as_paid`. Reusar os formulários de cobrança/pagamento do Admin (`features/charges`, `features/payments`).
- Menus e telas do síndico respeitando as permissões (usar a guarda da F0).

### T3 — Documentos · `feat/frontend-documents`
- **Gestão** (Admin e síndico com `documents.manage`): enviar (título, categoria, descrição, visibilidade, arquivo), editar detalhes, apagar, lista com filtro por categoria.
- **Morador:** lista por categoria e download.
- Rotas no front: `/admin/documents`, `/syndic/documents`, `/resident/documents` (são os links que as notificações usam).

### T4 — Manutenção preventiva · `feat/frontend-maintenance`
- Só gestão (Admin e síndico com `maintenance.manage`). Rotas: `/admin/preventive-maintenance`, `/syndic/preventive-maintenance` (links dos lembretes).
- Lista com status colorido (em dia / vence em breve / atrasada), "faltam X dias", filtros por status e prédio, botão **"Adicionar manutenções comuns"**.
- Formulário (nome, categoria, prédio ou condomínio inteiro, frequência em meses, próxima data, empresa, telefone, observações).
- Detalhe com **histórico**: registrar execução (data, empresa, observações, anexo), baixar anexo, desfazer o último registro.
- Não confundir com a tela "Manutenção" atual do síndico, que é de **ocorrências** (corretiva).

### T5 — Visitantes · `feat/frontend-visitors`
- **Morador:** "Minhas visitas" (próximas e histórico), cadastrar única ou recorrente (dias da semana, período, horário opcional, tipo, 4 últimos dígitos do documento, empresa), editar, cancelar.
- **Gestão** (Admin e síndico com `visitors.manage`): agenda de **hoje** e dos próximos dias (até 31), filtros por prédio, unidade e tipo, "incluir canceladas". Cadastrar visita do condomínio (sem unidade).

---

### T8 — Landing page · `feat/landing-page`
- Superfície nova (não existe hoje), pública, em `/` (o app continua em `/login` e nas áreas por papel). Público: administradores de condomínios e condomínios pequenos.
- Mostrar o posicionamento do `PRODUCT.md` (pagamento integrado, simples e moderno, tudo em um) com capturas reais do produto. **Pré-lançamento: não inventar clientes, depoimentos, números nem preço.**
- **Hero com seletor de dor** (ver `docs/ai/decisions.md`), CTA "Ver o Moraê funcionando" com formulário curto e WhatsApp. Estrutura enxuta (sem calculadora) descrita em `docs/ai/decisions.md`. Usar a skill `marketing-senior` para o texto.
- **Backend necessário:** endpoint público para gravar contatos (com rate limit e e-mail para o Master), guardando nome, WhatsApp, nº de unidades, perfil (administrador/síndico) e a dor escolhida no hero. O Master tem a tela **Contatos** (Figma) com status (Novo, Em conversa, Fechado, Sem interesse), mensagem pronta e botão "Chamar no WhatsApp" (link wa.me com o texto). O número de WhatsApp comercial do dono do app vira configuração (usado na landing e no login). A seção de migração só entra quando a **importação por planilha** existir.
- Desenhada no Figma junto com a F0 (o hero ajuda a definir o mundo visual); pode ser codada em paralelo com a Onda 1.

## Onda 2 — depois da Onda 1

### T6 — Assembleias e votações · `feat/frontend-assemblies`
- **Gestão** (Admin e síndico com `assemblies.manage`): criar/editar rascunho (dados, período, quem vota, pautas Sim/Não ou múltipla escolha, quórum, secreto), publicar (confirmar: depois não muda mais), cancelar com motivo, ver a participação durante a votação, ver o resultado, **ligar a ata** (escolher um documento da categoria Atas, de T3).
- **Morador:** lista (agendada/aberta/encerrada), detalhe com as pautas, **cédula** por unidade (`my-ballot`: mostrar `blockReason` quando não puder votar), votar e mudar o voto até fechar, resultado com o `summary` de cada pauta e a ata.
- Rotas: `/admin/assemblies/:id`, `/syndic/assemblies/:id`, `/resident/assemblies/:id` (+ listas). São os links das notificações e e-mails.

### T7 — Painéis, notificações e acabamento · `feat/frontend-polish`
- Dashboards dos 4 papéis com dados reais (os cards de "Atrasados" agora funcionam, com a rotina do Módulo D). Corrigir a inconsistência do painel do morador.
- Atalhos nos painéis para os módulos novos (próxima assembleia aberta, manutenções atrasadas, visitas de hoje, documentos recentes).
- Sininho: abrir o link de cada notificação nas telas novas.
- Responsividade (celular), estados vazios, mensagens de erro, acessibilidade básica.

---

## Backend novo antes do lançamento — L Importação por planilha · `feat/spreadsheet-import`

- Admin sobe uma planilha (modelo para baixar + aceitar CSV/XLSX) com unidades, moradores e vínculos, e cobranças em aberto. O sistema casa as colunas, mostra uma **prévia com erros por linha** e só grava quando o Admin confirma. Relatório do que foi importado. Seguir as regras do `CLAUDE.md` (explicar → decidir → partes pequenas).

## Depois do frontend — G Deploy

Ver `docs/ai/decisions.md` (seção Deploy). Inclui Dockerfiles (backend multi-stage; frontend build Vite → nginx com fallback de SPA), `docker-compose.prod.yaml`, bloco no Caddy existente, volumes, backup, `ForwardedHeaders__KnownNetworks`, credenciais de produção.

## Backlog (não fazer sem o Luiz pedir)

"Reenviar e-mail" de convite ainda válido; papel de funcionário e registro de entrada/saída; QR code de visitante; ligar/desligar módulos por condomínio; voto por fração ideal; trocar a pasta de arquivos por S3/R2.

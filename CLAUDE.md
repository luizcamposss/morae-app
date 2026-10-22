# Moraê — guia para agentes

Moraê é um SaaS de gestão de condomínios, feito para **produção real** (não é demo). Escreva o nome do produto como **Moraê** nas conversas.
O dono do projeto é o Luiz. Ele fala português: **responda sempre em português, de forma simples e direta**, com tabelas e exemplos curtos quando ajudarem.

Leia também, quando a tarefa pedir:
- `PRODUCT.md` — para quem é o Moraê, posicionamento, referências de marca e o que a landing não pode inventar (é a base de qualquer trabalho de design)
- `docs/ai/decisions.md` — decisões de produto já tomadas (não pergunte de novo o que já está decidido lá)
- `docs/ai/api.md` — todas as rotas da API, enums e formatos de data
- `docs/ai/frontend-plan.md` — plano da rodada de frontend, dividido em tarefas para agentes em paralelo
- `docs/ai/backend-backlog.md` — o que ainda falta no backend, com prioridade e ordem sugerida
- `DESIGN.md` — sistema visual ("A Casa em Ordem"): cores, fontes, componentes e regras. Base de qualquer tela

## Regras de trabalho (obrigatórias)

1. **Explique antes de implementar.** Para cada tarefa: explique o que vai fazer em linguagem simples → espere o Luiz decidir → implemente → teste → entregue.
2. **Divida em partes pequenas.** Ao terminar e testar cada parte, pare e mostre ao Luiz o que mudou. Nada de um commit gigante no fim.
3. **Commit e push são do agente, mas só depois do ok do Luiz** em cada parte. Mensagem de uma linha no padrão conventional commits, em inglês (`feat(escopo): mensagem curta`), com a identidade git já configurada (a do Luiz). **Não** coloque linha `Co-Authored-By` nem rodapé de ferramenta (ex.: "Generated with…") em commits e PRs. Faça `git add` só dos arquivos da parte (nunca segredos). No primeiro push de uma branch nova, use `git push -u origin <branch>`. O PR leva `Closes #N` da issue; quem mescla é o Luiz.
4. **Nunca mostre segredos.** Não imprima o conteúdo de `backend/.env` nem de `backend/.env.test-accounts`. Leia os valores por script sem exibi-los.
5. **Serviços principais (API 5242, front 5173, ngrok): o agente pode parar e reiniciar** quando precisar (ex.: depois de mudar o backend), avisando no chat o que reiniciou. Ver "Como rodar e testar". Com vários agentes em paralelo, cada um testa nas **suas** portas; só reinicie os principais para código que já está na branch em que o Luiz está trabalhando.
6. **Teste de verdade e conte o resultado fielmente.** Se algo falhou, diga. Apague os dados de teste que criar e restaure qualquer coisa que alterar (permissões, status de cobranças), num bloco que rode mesmo se o teste quebrar.
7. Escreva código parecido com o que já existe ao redor: mesmo estilo, nomes, densidade de comentários (comentários em inglês, mensagens ao usuário em português).
8. **Frontend sempre com a skill Impeccable.** Toda tela, componente, animação ou ajuste visual passa pela skill `impeccable` (carregar o contexto, seguir o `DESIGN.md` e a referência do comando, rodar o detector no fim). O visual segue o Figma "Moraê — Design" (páginas Landing e App) e o `DESIGN.md`. Conferir no Chrome no computador e no celular antes de entregar.

## Stack

- **Backend** (`backend/`): ASP.NET Core 8, EF Core + Pomelo MySQL, Identity, JWT (15 min) + refresh token em cookie HttpOnly, AutoMapper, DotEnv. Migrations aplicadas sozinhas ao iniciar.
- **Frontend** (`frontend/`): React 19, TypeScript, Vite, Tailwind 4, React Router 7, Recharts, `@mercadopago/sdk-react` (Payment Brick).
- **Banco:** MySQL no Docker (`morae-app-morae-mysql-1`, porta 3306, banco `moraeDB`).
- **E-mail:** Resend (domínio `morae.synergylab.tech`). **Pagamentos:** Mercado Pago (checkout transparente, OAuth por condomínio, webhook).

## Domínio em 1 minuto

- **4 papéis:** Master (dono da plataforma), Admin (gestão do condomínio), Síndico, Morador. O papel vale **por condomínio** (`UserCondominium.Role`).
- O **síndico** tem permissões que o Admin liga/desliga (`Constants/AppPermissions.cs`) e pode ser limitado a alguns prédios (`ManagesAllBuildings` / `UserCondominiumBuildings`).
- Toda checagem de acesso passa por `Services/Permissions/PermissionService.cs`. **Reuse sempre esse serviço.** Condomínio inativo bloqueia o acesso.
- Datas: fuso **America/Sao_Paulo** (`Constants/AppTimeZone.cs`). Instantes ficam em UTC no banco (conversor global). Datas de calendário usam `DateOnly` (ou `Charge.DueDate`, que é exceção). Horários (`TimeOnly`) trafegam como `"HH:mm"`.
- Rotina de hora em hora (`Services/Jobs/ScheduledTasks.cs`): marca cobranças atrasadas, expira convites, limpa dados velhos, encerra assembleias e manda lembretes (a partir das 9h de SP).
- E-mails passam por uma fila em memória (`Services/Email/EmailQueue.cs` + `EmailBackgroundService`). Sem `Resend__ApiKey`, eles só aparecem no log. Endereços `.local/.test/.example` nunca recebem envio.

## Como rodar e testar

- Serviços principais: API `http://localhost:5242`, front `http://localhost:5173`, ngrok `https://supreme-erupt-sheep.ngrok-free.dev` → 5242 (webhook e OAuth do Mercado Pago). Para (re)iniciar, em segundo plano, e conferir que respondeu:
  - API: parar pelo PID da porta 5242 e rodar `dotnet run` dentro de `backend/`.
  - Front: `npm run dev` dentro de `frontend/` (o Vite recarrega sozinho; quase nunca precisa reiniciar).
  - ngrok: `ngrok http --url=supreme-erupt-sheep.ngrok-free.dev 5242`.
- **Node:** o shell dos agentes pode abrir com o Node 18 do sistema, e o Vite pede 20+. Use o do nvm: `export PATH=$HOME/.nvm/versions/node/v22.23.3/bin:$PATH`.
- Contas de teste dos 4 papéis: `backend/.env.test-accounts` (no `.gitignore`; leia por script, não exiba). Se o banco não tiver as contas, rode `dotnet run -- --seed-test-data` dentro de `backend/` (só em Development): cria o "Condomínio Teste Moraê" (Torre A e B, 28 unidades com cobranças) e regrava o arquivo; rodar de novo só troca as senhas.
- **API temporária para testes:** compile (`dotnet build`) e rode `dotnet backend/bin/Debug/net8.0/backend.dll` **a partir de outra pasta** (o DotEnv lê o `.env` da pasta atual), passando as variáveis do `.env` por script, `ASPNETCORE_URLS=http://localhost:<porta>` e `Resend__ApiKey=` vazio (para não enviar e-mail). Pare o processo no fim (mate pelo PID da porta, não use `pkill -f`).
- **Agentes em paralelo:** cada agente usa a **sua** porta de API (5243, 5244, 5245…) e de front (5174, 5175…). O banco é compartilhado: crie dados de teste com prefixo único e apague no fim. O CORS do backend hoje aceita só `http://localhost:5173` (ver tarefa F0 no plano de frontend).
- Login tem limite de 10 tentativas/minuto por IP: espere 1 minuto se receber 429.
- Para consultar o MySQL com acentos: `docker exec morae-app-morae-mysql-1 mysql -uroot -proot --default-character-set=utf8mb4 moraeDB -e "..."`.
- Checagens: `dotnet build` no backend; `npm run lint` e `npm run build` no frontend.

## Git

- Branch principal de integração: **`develop`** (PRs vão para ela). `main` só recebe na hora do deploy.
- Uma branch por módulo/tarefa (`feat/...`, `fix/...`). Se a branch nova depende de outra ainda não mesclada, avise o Luiz da ordem dos merges.

## Estado atual (2026-10-10)

- **Backend completo:** Mercado Pago, datas em SP, login/sessão (A), permissões e segurança (B), e-mail (C), rotinas automáticas (D), correções (F), Documentos (H), Manutenção preventiva (I), Visitantes (J), Assembleias e votações (K).
- **Falta:** a **rodada de frontend** (o Luiz quer redesenhar a interface; ver `docs/ai/frontend-plan.md`) e o **deploy (G)** na VPS do Luiz, em `https://morae.synergylab.tech`, ao lado de um site que já roda lá com Caddy (não mexer na configuração dele).

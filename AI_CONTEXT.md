# MORAÊ - Contexto Completo do Projeto

Última atualização: 30/07/2026

Este arquivo é a memória principal para qualquer IA continuar o projeto sem perder contexto. Leia tudo antes de sugerir ou alterar qualquer coisa.

---

## 1. Identidade do Produto

Nome do app: **MORAÊ**

Idioma do produto: **PT-BR**

Tema visual:

- Verde moderno.
- Clean, Apple-like, profissional.
- Nada com “cara de IA” ou layout genérico.
- Tipografia principal no frontend: **Nunito**.
- Ícones: biblioteca `@edusites/icons`.
- Paleta visual recorrente:
  - Verde escuro: `#0B3D2E`
  - Verde primário: `#16A34A`
  - Verde claro: `#22C55E`
  - Verde suave: `#86EFAC`
  - Verde pastel: `#DCFCE7`
  - Neutro claro: `#F3F4F6`
  - Neutro escuro: `#111827`

Diretriz de UI/UX:

- Visual limpo, espaçado e coerente entre perfis.
- Cards claros com borda suave e sombra leve.
- Evitar excesso de cards verdes fortes.
- Usar verde forte só para CTAs, destaques pontuais e estados positivos.
- Tudo que é clicável deve ter `cursor-pointer`.
- Modais devem usar `X` circular no canto superior direito, seguindo padrão do app.
- Selects nativos estavam feios; vários foram substituídos por dropdown custom limpo.
- Placeholders devem ser claros, humanos e padronizados.
- Não mostrar dados falsos/mockados no MVP. Tudo que aparece em tela deve vir do backend ou ser estado vazio real.

---

## 2. Como Trabalhar com o Luiz

O Luiz está aprendendo React/backend e quer entender as decisões.

Modo de colaboração:

- Explicar o porquê das mudanças.
- Fazer por módulos pequenos.
- Antes de alterações grandes, avisar o que será alterado.
- Quando ele pedir, pode alterar diretamente.
- Quando ele disser que quer guiar, entregar trechos e revisar depois.
- Manter respostas curtas e práticas.
- Ao final de módulo relevante, sugerir branch e commit.
- Nunca sair mudando arquitetura sem verificar os padrões existentes.
- Sempre preservar o fluxo já criado.

Regras importantes:

- O Luiz quer fazer um MVP para deploy e portfólio.
- O projeto precisa ficar profissional para GitHub, LinkedIn e recrutadores.
- A arquitetura e segurança são tão importantes quanto a UI.
- Se algo impactar banco, explicar e pedir/indicar migration.
- Não usar dados fake no frontend.
- Master não pode acessar operação interna de condomínio.

---

## 3. Stack Atual

Backend:

- ASP.NET Core 8
- Entity Framework Core
- MySQL
- ASP.NET Identity
- JWT Bearer Authentication
- AutoMapper
- Swagger
- Middleware global de exceções

Frontend:

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- React Router DOM
- Recharts
- `@edusites/icons`

Infra local:

- Docker Compose com MySQL 8.4.

Portas locais:

- Frontend: `http://localhost:5173`
- Backend/API: `http://localhost:5242`

Banco local:

- Database: `moraeDB`
- MySQL local via Docker.

---

## 4. Arquitetura Geral

O projeto segue arquitetura em camadas, mesmo dentro de um único projeto backend.

Backend:

```text
backend
├── Controllers
├── Services
├── DTOs
├── Models
├── Enums
├── Constants
├── Profiles
├── Data
├── Migrations
├── Middlewares
└── Program.cs
```

Frontend:

```text
frontend/src
├── app
├── features
├── shared
└── assets
```

Regras de arquitetura:

- Controller deve ser fino.
- Controller não acessa `AppDbContext` diretamente.
- Controller recebe DTO, chama service e retorna DTO.
- Regra de negócio fica em service.
- Validação de acesso fica centralizada em `PermissionService`.
- DTOs são obrigatórios; não retornar entidade EF diretamente.
- AutoMapper deve ser usado para mappings.
- Services devem lançar exceções customizadas:
  - `BadRequestException`
  - `ConflictException`
  - `ForbiddenException`
  - `NotFoundException`
- Backend é a fonte da verdade.
- Frontend pode esconder rotas/botões, mas segurança real é no backend.

---

## 5. Modelo de Acesso

Hierarquia conceitual:

```text
Master -> Admin -> Syndic -> Resident
```

Termos no produto:

- Master: administrador da plataforma.
- Admin: administrador institucional do condomínio.
- Syndic: síndico/gestor delegado.
- Resident: morador.

Importante:

- `Master` gerencia plataforma e dados institucionais.
- `Admin` gerencia operação do condomínio.
- `Syndic` gerencia somente o que for permitido.
- `Resident` vê apenas seus dados e unidades.

---

## 6. Regras de Segurança por Papel

### Master

Pode:

- Criar condomínios.
- Fazer onboarding de condomínio com primeiro Admin.
- Criar/gerenciar Admins institucionais dos condomínios criados por ele.
- Gerenciar convites de Admin.
- Criar cobranças institucionais da plataforma para condomínios.
- Ver dados comerciais/institucionais dos condomínios.
- Editar pessoas globais criadas por ele.
- Editar usuários/Admins criados por ele dentro dos condomínios dele.

Não pode:

- Acessar unidades internas.
- Acessar moradores internos.
- Acessar prédios operacionais.
- Acessar cobranças internas do condomínio.
- Acessar dados operacionais que pertencem ao Admin.
- Virar “membro automático” do condomínio.

Regra essencial:

> Master não é operador do condomínio. Ele cuida da plataforma e da relação institucional/comercial.

### Admin

Pode:

- Acessar condomínios vinculados via `UserCondominium`.
- Gerenciar prédios.
- Gerenciar unidades.
- Gerenciar moradores/pessoas do condomínio.
- Vincular pessoas a unidades.
- Criar convites para moradores e síndicos.
- Gerenciar permissões dos síndicos.
- Criar cobranças internas do condomínio.
- Ver cobranças MORAÊ do condomínio.
- Configurar conta bancária/Pix do condomínio.

Não pode:

- Acessar outro condomínio apenas por ter role `Admin`.
- Gerenciar plataforma inteira.
- Criar cobranças institucionais MORAÊ.

### Syndic

Pode:

- Acessar somente dados delegados.
- No fluxo definido mais recentemente, o síndico deve ver **apenas o prédio ao qual está vinculado**, não o condomínio inteiro.
- Suas permissões vêm de `UserCondominiumPermission`.
- Admin define o que o síndico pode acessar.

Permissões atuais:

```text
news.create
news.edit
charges.create
charges.mark_as_paid
delinquency.view
occurrences.manage
```

Observação importante:

- Já foi criada área no Admin para configurar acesso do síndico.
- A conexão real com backend foi feita via `syndicAccessService`.
- A mensagem verde explicativa da tela de permissões foi removida a pedido do Luiz.

### Resident

Pode:

- Ver suas unidades.
- Ver boletos/cobranças vinculadas às suas unidades.
- Ver avisos/comunicados do condomínio.
- Criar/acompanhar ocorrências/manutenções quando o backend permitir.
- Ver configurações do próprio perfil.

Não pode:

- Gerenciar estrutura do condomínio.
- Ver dados de outras unidades ou moradores.

---

## 7. Entidades Principais

### Condominium

Representa o condomínio.

Campos/regras importantes:

- CNPJ único.
- Nome.
- E-mail de contato.
- Endereço.
- Número.
- Cidade.
- Estado.
- CEP.
- Status.
- `CreatedByUserId`: Master que criou.

No frontend Master:

- Página de condomínios está conectada ao backend.
- Cadastro tem validação completa.
- CNPJ validado com 14 dígitos.
- CPF validado no admin inicial.
- Estado é select, não input livre.
- CEP foi adicionado e pode preencher endereço automaticamente.
- Texto “Endereço preenchido automaticamente pelo CEP.” foi removido quando incomodava.

### Building

Representa prédio/bloco/torre.

Campos/regras:

- CondominiumId.
- Nome do prédio.
- Código/identificação único dentro do condomínio.
- Tipo do prédio.
- Quantidade de andares.
- Possui elevador.
- Observações.
- Status.
- Datas de criação/atualização.

Frontend Admin:

- Página `Prédios` conectada ao backend.
- Cadastro foi ajustado para usar os campos reais do backend.
- Select de tipo do prédio foi melhorado.
- Detalhes do prédio mostram dados reais.
- Deve mostrar o síndico quando houver vínculo.
- Texto “Esta tela usa dados reais...” foi removido.

### Unit

Representa unidade/apartamento.

Campos/regras:

- BuildingId.
- Número da unidade.
- Tipo.
- Quartos.
- Banheiros.
- Metros quadrados.
- Observações.
- Status.

Frontend Admin:

- Página `Unidades` conectada ao backend.
- Filtros em ordem: busca / filtro prédio / status.
- Filtro de prédio deve se ajustar ao tamanho do nome.
- Botão “Todos” isolado foi removido.
- Modais têm `X`.
- Excluir unidade tem confirmação.
- Vincular pessoa a unidade deve permitir scroll na lista.
- Deve ser possível desvincular pessoa da unidade.

### Person

Representa pessoa física antes ou depois de ter usuário.

Campos/regras:

- Nome.
- CPF único.
- Telefone.
- Pode existir sem usuário.
- Pode estar vinculada a condomínio via `PersonCondominium`.
- Pode estar vinculada a unidade via `PersonUnit`.
- Pode se tornar usuário via convite.

Frontend Admin:

- Página de moradores/pessoas conectada.
- Síndico também deve aparecer em moradores/pessoas.
- A coluna de status deve indicar vínculo, não simplesmente papel.
- Pessoa já registrada não deve aparecer para convite novamente.
- Botão “Preparar convite” foi removido para quem já possui acesso.
- Detalhe do morador mostra:
  - Nome.
  - CPF formatado.
  - Telefone formatado.
  - Condomínio.
  - Unidade principal.
  - Vínculos com unidades.
  - Acesso ao sistema.
  - Papel atual.
  - Criado em.
  - Atualizado em.
- A mensagem “Acesso do morador” só aparece quando a pessoa ainda não tem acesso.
- Em editar morador, o campo papel foi removido.

### PersonUnit

Relaciona pessoa e unidade.

Tipos:

```text
Owner
Resident
Tenant
```

No frontend:

- Tela de vínculo deve permitir escolher pessoa existente ou nova pessoa.
- Deve ter `cursor-pointer`.
- Deve permitir remover vínculo.

### Invitation

Convite para criar acesso.

Regras:

- Master cria convites apenas para Admin.
- Admin cria convites para Resident ou Syndic.
- Convite gera link `/accept-invitation/{token}`.
- Aceitar convite cria `ApplicationUser`, atribui role Identity e cria `UserCondominium`.
- Se convite já foi aceito, não exibir link de aceite.
- Em detalhes do convite:
  - Traduzir status.
  - Se aceito, mostrar “Aceito em” no lugar de “Expira em”.
  - Remover botão “Copiar link” quando convite estiver aceito.

Frontend:

- Página de convites Master conectada.
- Página de convites Admin conectada.
- Modal de novo convite foi padronizado.
- Botão “Novo Convite” voltou para o canto superior direito.
- Empty state não deve ter botão duplicado no meio.
- Selects de pessoa/papel foram estilizados.
- X dos filtros/modais foi padronizado.

### Charge

Cobranças.

Conceito importante:

- Existem cobranças institucionais da plataforma MORAÊ.
- Existem cobranças internas do condomínio.

Regras:

- Master cria cobrança institucional MORAÊ para condomínio.
- Admin vê cobranças MORAÊ do seu condomínio, mas não cria essas cobranças.
- Admin cria cobranças internas do condomínio para unidades.
- Morador vê boletos vinculados às suas unidades.

Frontend:

- Master Payments conectado.
- Admin Payments conectado.
- Resident Bills conectado.
- Cards verdes fortes de “Próxima cobrança” foram padronizados para cards claros.

### FinancialAccount

Conta bancária/Pix.

Regras:

- Master configura conta recebedora da plataforma.
- Admin configura conta recebedora do condomínio ativo.
- Dados ficam isolados pelo escopo.

Frontend:

- Master Settings tem blocos de configuração.
- Admin Settings tinha formulário grande, mas foi pedido para ficar mais próximo do modelo clean do Master.

### News

Comunicados/avisos.

Frontend:

- Resident Notices usa dados reais.
- Card verde grande de aviso em destaque foi padronizado para card claro.
- Cards que eram verdes fortes devem seguir padrão claro quando destoarem.

### Occurrence

Ocorrências/manutenções.

Foi adicionado:

- Enum `OccurrenceType`.
- Campo `Type` em `Occurrence`.
- `CreateOccurrenceDto.Type`.
- `OccurrenceResponseDto.Type`.
- Validação em `OccurrenceService`.
- Default no `AppDbContext`.

Migration:

- Migration `AddOccurrenceType` existe no repositório:
  - `20260730144629_AddOccurrenceType.cs`
  - `20260730144629_AddOccurrenceType.Designer.cs`

Comando que já foi indicado:

```powershell
dotnet ef migrations add AddOccurrenceType --project .\backend\backend.csproj --startup-project .\backend\backend.csproj
dotnet ef database update --project .\backend\backend.csproj --startup-project .\backend\backend.csproj
```

Frontend:

- Resident/Syndic Occurrences devem mostrar o tipo.
- Ícone de ocorrência no Sidebar foi corrigido de `alerta` para `atencao`.

### Notification

Notificações.

Regras decididas:

- Integrar notificações reais ao backend.
- Notificar eventos úteis:
  - Convite recebido/aceito.
  - Usuário suspenso/reativado.
  - Cobrança criada/paga/cancelada.
  - Comunicado publicado.
  - Ocorrência criada/atualizada.
- Menu de notificações no topo:
  - Ícone com bolinha quando houver nova notificação.
  - Sem bolinha quando não houver.
  - Deve permitir limpar todas.

Problema já visto:

- Erro `Table 'moraeDB.Notifications' doesn't exist`.
- Causa: migration não aplicada ou banco fora de sincronia.
- Também houve erro tentando criar tabelas Identity já existentes quando migrations estavam desalinhadas.

---

## 8. Backend - Controllers Existentes

Controllers presentes:

```text
AuthController
BuildingController
ChargesController
CondominiumController
DelinquencyController
FinancialAccountsController
InvitationController
MeController
MyCondominiumsController
NewsController
NotificationsController
OccurrencesController
PaymentsController
PersonsController
PermissionsController
PersonUnitsController
UnitsController
UserCondominiumAccessController
UserCondominiumPermissionsController
```

Endpoints importantes:

```text
POST /Auth/login
GET  /api/me
GET  /api/me/units
GET  /api/me/condominiums
POST /api/condominium/onboarding
GET  /api/condominiums/{condominiumId}/buildings
POST /api/condominiums/{condominiumId}/buildings
GET  /api/buildings/{buildingId}/units
POST /api/buildings/{buildingId}/units
GET  /api/condominiums/{condominiumId}/persons
POST /api/condominiums/{condominiumId}/persons
GET  /api/condominiums/{condominiumId}/invitations
POST /api/invitations
GET  /api/invitations/{token}
POST /api/invitations/{token}/accept
```

Observação:

- Verificar assinatura real no código antes de usar endpoint em novos módulos.

---

## 9. Frontend - Estrutura Atual

Arquivos principais:

```text
frontend/src/app/AppRouter.tsx
frontend/src/app/providers/AuthProvider.tsx
frontend/src/app/providers/AuthContext.ts
frontend/src/app/providers/useAuth.ts
frontend/src/app/providers/CondominiumProvider.tsx
frontend/src/app/providers/CondominiumContext.ts
frontend/src/app/providers/useCondominium.ts
frontend/src/shared/layout/AppLayout.tsx
frontend/src/shared/layout/Topbar.tsx
frontend/src/shared/layout/Sidebar.tsx
frontend/src/shared/lib/api/apiClient.ts
frontend/src/shared/lib/api/config.ts
```

API base atual:

```ts
export const API_BASE_URL = "http://localhost:5242";
```

Autenticação:

- Login conectado ao backend.
- Token salvo em `localStorage`.
- `AuthProvider` chama `GET /api/me`.
- `useAuth` fica separado para evitar erro de Fast Refresh.
- `AuthContext` fica separado para evitar erro de Fast Refresh.

Roteamento:

- `PublicRoute`
- `ProtectedRoute`
- `RoleRoute`

Redirecionamento padrão:

```text
Master   -> /master/dashboard
Admin    -> /admin/dashboard
Syndic   -> /syndic/dashboard
Resident -> /resident/dashboard
```

---

## 10. Frontend - Módulos/Páginas

### Auth

Arquivos:

```text
frontend/src/features/auth/LoginPage.tsx
frontend/src/features/auth/AcceptInvitationPage.tsx
frontend/src/features/auth/ProtectedRoute.tsx
frontend/src/features/auth/PublicRoute.tsx
frontend/src/features/auth/RoleRoute.tsx
frontend/src/features/auth/authRedirect.ts
frontend/src/features/auth/authService.ts
frontend/src/features/auth/authStorage.ts
```

Estado:

- Login real funcionando.
- Login com credencial válida e inválida já foi testado.
- CORS foi habilitado no backend para `http://localhost:5173`.
- Login UI foi muito trabalhado:
  - Nome MORAÊ.
  - Acentos corrigidos.
  - Sem botões F/G/A.
  - Olho de senha.
  - “Esqueceu sua senha?” visual apenas.
  - Responsivo mobile.
  - Background e planta visual.
  - Vaso/planta foram ajustados várias vezes.

Accept Invitation:

- UI refeita no padrão do login.
- Fundo igual ao login.
- Texto “Seu acesso ao MORAÊ está quase pronto.”
- Logo no canto superior direito da área branca.
- Sem borda pesada no card de dados.
- Placeholder de senha.
- Botão “Ativar meu acesso”.

### Shared Layout

Sidebar:

- Usa logo MORAÊ.
- Ícones em vez de letras.
- Hover expand.
- Alinhada visualmente com dashboard.
- Fixa/padrão para todos os perfis.
- Exibe foto de perfil quando houver.
- Mostra nome do usuário e role no menu expandido.
- Botão sair.
- Ícones do menu:
  - Dashboard
  - Condomínios
  - Convites
  - Pagamentos
  - Usuários/Moradores
  - Configurações
  - Prédios
  - Unidades
  - Avisos
  - Ocorrências

Topbar:

- Mostra data.
- Temperatura foi ajustada/removida em alguns perfis quando aparecia estranho.
- Bolinha de notificação virou menu de notificações.

Scroll:

- Foi criado scroll custom verde/clean.
- Marcadores/triângulos do scrollbar incomodaram e foram removidos.

---

## 11. Master - Estado Atual

Regra:

- Master cuida da plataforma, não da operação interna.

Páginas:

```text
/master/dashboard
/master/condominiums
/master/invitations
/master/payments
/master/users
/master/settings
```

Dashboard Master:

- Modelo visual usado como referência para os demais perfis.
- Cards:
  - Total de condomínios.
  - Convites pendentes.
  - Receita total.
  - Receita pendente.
- Gráficos com Recharts:
  - Crescimento de condomínios.
  - Receita MORAÊ.
- Atividades recentes reais.
- Texto “Plataforma MORAÊ” foi removido a pedido.
- Frases verdes dos cards foram refinadas.
- Filtros dos gráficos foram adicionados e depois removidos quando não agradaram.

Condomínios:

- Conectado ao backend.
- Novo condomínio com onboarding.
- Sem senha inicial no formulário depois da decisão: admin deve definir senha via convite/link.
- CEP adicionado.
- Estado por select.
- Validações completas.
- Placeholder padronizado.
- Tabela mostra admins vinculados.
- Ver condomínio mostra dados institucionais, contato, localização e admins.
- Editar condomínio permite alterar Admin vinculado.
- Remover/adicionar admin vinculado no modal foi solicitado.
- Tabela deve parecer com tabela de usuários:
  - Botões limpos.
  - Data sem negrito.
  - Admins sem fundo exagerado.
  - Mostrar apenas nomes dos admins.

Convites Master:

- Conectado.
- Master cria Admin.
- Convite gera link.
- Se expirado, pode renovar.
- Textos e filtros melhorados.
- Botão atualizar/recarregar com ícone.
- Dropdown customizado.

Usuários Master:

- Lista apenas Admins dos condomínios criados pelo Master.
- Pode suspender/reativar.
- Pode excluir usuário.
- Botão `+ Novo Admin`.
- Criar novo Admin deve gerar convite e ir para aba de convites.
- Suspensão deve notificar e ter tela/mensagem adequada.

Pagamentos Master:

- Cobranças MORAÊ.
- Master cria cobrança institucional.
- Admin vê do lado dele.
- Registro manual de pagamento.
- Conta bancária/Pix da plataforma em settings.

Configurações Master:

- Modelo clean com blocos.
- Blocos:
  - Perfil e dados pessoais.
  - Notificações.
  - Conta bancária/Pix quando aplicável.
- Abre popup para configurar.
- Título e texto embaixo como outras páginas.

---

## 12. Admin - Estado Atual

Páginas:

```text
/admin/dashboard
/admin/buildings
/admin/units
/admin/people
/admin/invitations
/admin/payments
/admin/settings
```

Dashboard Admin:

- Deve seguir modelo do Master.
- Esquerda: prédios e moradores, com gráfico.
- Direita: receita total e receita pendente.
- Abaixo: atividades recentes funcionando.
- Remover “receita atrasada”.
- Temperatura e número “1” indesejado foram ajustados.
- Atividades recentes devem ser reais.
- Não usar mock.

Prédios:

- Conectado ao backend.
- Textos melhorados.
- Cadastro precisa usar exatamente campos do backend.
- Select do tipo do prédio estilizado.
- Cursor pointer em botões, filtros e X.
- Modal de detalhes com dados reais.
- Criado em / Atualizado em precisaram de correção/formatar horário.
- Deve exibir síndico vinculado quando houver.

Unidades:

- Conectado ao backend.
- Textos dos cards refinados.
- Modal de cadastro melhorado.
- Select de prédio custom.
- Filtros: busca / prédio / status.
- Cursor pointer em botões.
- Modal detalhes precisa permitir desvincular pessoa.
- Vincular pessoas deve ter scroll na lista.
- Excluir unidade com confirmação.

Moradores/Pessoas:

- Conectado ao backend.
- Síndico deve aparecer também aqui.
- Status deve falar de vínculo.
- Botão `+ Novo Morador`.
- Modais com `X`.
- Placeholders padronizados.
- Detalhes mostram todas as infos.
- Editar morador não deve ter campo papel.
- Se pessoa já tem acesso, não exibir opção/mensagem de preparar convite.
- Pessoas já registradas não podem ser convidadas de novo.

Convites Admin:

- Admin cria convite para Morador ou Síndico usando pessoa cadastrada.
- Botão `+ Novo Convite` no canto superior direito.
- Empty state sem botão duplicado.
- Detalhes traduzidos:
  - `Accepted` -> `Aceito`
  - `Pending` -> `Pendente`
  - `Expired` -> `Expirado`
- Se convite aceito, remover link e mostrar “Aceito em”.
- X padronizado.

Configurações Admin:

- Deve ficar igual ao Master: cards clean e popups.
- Também inclui dados financeiros do condomínio:
  - Conta bancária.
  - Chave Pix.
  - Condomínio ativo.

Permissões do Síndico:

- Existe área no Admin para gerenciar acesso do síndico.
- Deve conectar com backend.
- Select de síndico foi melhorado.
- Mensagem verde explicativa removida.

---

## 13. Syndic - Estado Atual

Regra mais recente e importante:

> Agora estamos mexendo apenas no Síndico. Master e Admin estão ok. Síndico deve ver apenas o prédio ao qual está vinculado, não o condomínio inteiro.

Páginas:

```text
/syndic/dashboard
/syndic/residents
/syndic/maintenance
/syndic/communication
/syndic/finance
/syndic/inspections
/syndic/settings
```

Dashboard Syndic:

- Ajustar temperatura.
- Remover número “1” que aparecia no canto do card.
- Cards atuais precisam refletir prédio vinculado:
  - Prédios: provavelmente deve virar “Prédio vinculado” ou equivalente.
  - Unidades.
  - Moradores.
  - Ocorrências.
- Gráfico “Ocupação por prédio” precisa respeitar prédio vinculado.
- Mensagens devem deixar claro que o síndico vê sua área delegada.
- Não deve mostrar dados do condomínio todo se ele só tem prédio.

Syndic Residents:

- Lista pessoas conforme escopo permitido.
- Precisa respeitar vínculo/permissão.

Maintenance / Occurrences:

- Deve usar ocorrências reais.
- Deve incluir tipo da ocorrência.

Settings:

- Deve seguir padrão visual do Master/Admin.

---

## 14. Resident - Estado Atual

Páginas:

```text
/resident/dashboard
/resident/unit
/resident/bills
/resident/notices
/resident/occurrences ou manutenção/inspeções conforme rotas existentes
/resident/settings
```

Dashboard Resident:

- Temperatura ajustada.
- Remover badge “1 unidade(s)” que ficava no canto.
- Cards:
  - Minhas unidades.
  - Boletos em aberto.
  - Boletos pagos.
  - Ocorrências.
- Textos verdes precisam ser bonitos:
  - Evitar “Vinculadas ao seu cadastro” se soar genérico.
  - Usar frases claras e humanas.

Minha Unidade:

- Card verde grande foi padronizado para card claro.
- Cards verdes fortes devem seguir padrão claro.
- Mostrar dados reais:
  - Prédio.
  - Unidade.
  - Tipo.
  - Vínculo.
- Texto explicativo extra foi removido.

Meus Boletos:

- Conectado ao backend.
- Card “Próxima cobrança” foi padronizado para card claro.
- Não usar mock.

Avisos:

- Conectado ao backend.
- Card verde grande de aviso em destaque foi padronizado para card claro.
- Cards verdes devem seguir padrão do sistema.

Configurações Resident:

- Blocos:
  - Perfil/dados pessoais/foto.
  - Notificações.
- Foto de perfil deve aparecer no app.

Ocorrências/Manutenção:

- Deve exibir tipo de ocorrência.
- Integração com backend em evolução.

---

## 15. Decisões Recentes de UI

Aplicar daqui para frente:

- Cards verdes grandes que parecem pesados devem virar cards claros.
- Verde forte fica para:
  - Botão principal.
  - Destaque muito específico.
  - Estado positivo.
- Cards padrão:

```text
rounded-[1.5rem] border border-[#E5E7EB] bg-[#F9FAFB] p-5 shadow-sm
```

Ícone padrão:

```text
bg-[#DCFCE7] text-[#16A34A]
```

Badge padrão:

```text
bg-[#DCFCE7] text-[#0B3D2E]
```

Texto principal:

```text
text-[#111827]
```

Texto secundário:

```text
text-[#4B5563] ou text-[#6B7280]
```

Botões:

- Principal: verde `#16A34A`, branco, sombra leve.
- Secundário: branco, borda cinza, texto cinza/escuro.
- Perigo: vermelho suave/borda vermelha.
- Todos com `cursor-pointer`.

Modais:

- Cabeçalho limpo.
- Botão fechar como X circular.
- Sem botão “Fechar” escrito quando o resto do sistema usa X.

Selects:

- Nativo pode ficar feio no Windows.
- Preferir dropdown custom quando o select aparecer aberto/azul feio.

---

## 16. README / Portfólio

Foi criado um README profissional para GitHub e LinkedIn.

Arquivos criados:

```text
README.md
docs/images/morae-cover.svg
docs/images/role-flow.svg
docs/images/architecture.svg
```

Objetivo do README:

- Mostrar o projeto para recrutadores.
- Explicar stack.
- Explicar fluxo Master/Admin/Síndico/Morador.
- Explicar arquitetura.
- Explicar segurança e isolamento multi-condomínio.
- Incluir sugestão de post para LinkedIn.

Validação:

- SVGs foram validados como XML.
- README está em UTF-8 correto.
- O terminal pode mostrar `MORAÃŠ`, mas os bytes do arquivo estão corretos.

Commit sugerido para README:

```bash
docs: create professional readme and project visuals
```

---

## 17. Branch Atual e Status Git

Branch vista recentemente:

```text
codex/system-review
```

Há muitos arquivos modificados no worktree por causa da evolução do app.

Importante:

- Não reverter alterações sem permissão do Luiz.
- Não usar `git reset --hard`.
- Não usar `git checkout --` para desfazer arquivos sem autorização explícita.
- Se precisar limpar algo, perguntar antes.

Arquivos/módulos com alterações recentes incluem backend e frontend:

- Permissões de síndico.
- OccurrenceType.
- Dashboards.
- Sidebar.
- Resident pages.
- Admin pages.
- README/docs.

---

## 18. Build e Validações Recentes

Frontend:

```powershell
cd frontend
npm.cmd run build
```

Últimos builds frontend passaram.

Backend:

```powershell
dotnet build backend\backend.csproj /p:UseAppHost=false
```

Observação:

- Build normal pode falhar se `dotnet watch run` estiver ativo porque DLL/EXE ficam bloqueados.
- Usar saída temporária quando necessário:

```powershell
dotnet build backend\backend.csproj /p:UseAppHost=false -o .tmp\backend-build
```

Migrations:

- Luiz costuma rodar migrations quando combinamos.
- Sempre explicar quando migration é necessária.

---

## 19. Problemas Já Vistos e Soluções

### CORS

Erro:

```text
No 'Access-Control-Allow-Origin' header is present
```

Solução:

- Backend habilitou CORS para `http://localhost:5173`.

### MySQL caching_sha2_password

Erro:

```text
Authentication method 'caching_sha2_password' failed
```

Solução provável:

- Adicionar `AllowPublicKeyRetrieval=True` na connection string local.

### Fast Refresh

Erro:

```text
Fast refresh only works when a file only exports components
```

Solução aplicada:

- Separar `AuthProvider`, `AuthContext` e `useAuth` em arquivos diferentes.

### React effect warning

Erro:

```text
Calling setState synchronously within an effect
```

Contexto:

- Aconteceu no `AuthProvider`.
- Foi discutido e ajustado para evitar padrão problemático.

### Tabela Notifications não existe

Erro:

```text
Table 'moraeDB.Notifications' doesn't exist
```

Causa:

- Migration não aplicada ou banco fora de sincronia.

### AspNetRoles already exists

Erro:

```text
Table 'AspNetRoles' already exists
```

Causa:

- Tentativa de aplicar migration inicial em banco que já tinha tabelas Identity.
- Cuidado ao mexer em migrations/banco final.

### Encoding no terminal

Problema:

- PowerShell pode mostrar `MORAÃŠ` mesmo quando o arquivo está UTF-8 correto.

Como validar:

```powershell
$bytes = [System.IO.File]::ReadAllBytes('README.md')
[System.Text.Encoding]::UTF8.GetString($bytes[0..40])
```

---

## 20. Regras para Próximos Passos

Antes de implementar qualquer módulo:

1. Ler arquivos existentes.
2. Confirmar papel/permissão.
3. Confirmar se dados vêm do backend.
4. Não criar mock temporário.
5. Seguir padrão visual atual.
6. Rodar build quando possível.
7. Sugerir commit.

Para backend:

1. Criar/ajustar Model se necessário.
2. Criar/ajustar Enum se necessário.
3. DTOs.
4. Profile AutoMapper.
5. Service/interface.
6. Controller fino.
7. `Program.cs` se novo serviço/profile.
8. Migration se mudou banco.
9. Validar permissões no `PermissionService`.

Para frontend:

1. Criar service em `features/{modulo}` ou usar service existente.
2. Tipar responses em `types.ts`.
3. Usar `apiClient`.
4. Página não deve fazer `fetch` cru.
5. Usar loaders/empty/error states.
6. Garantir responsividade.
7. Usar textos PT-BR com acentos.

---

## 21. Próximo Foco Provável

O último foco funcional era:

```text
Mexer apenas no Síndico.
Master e Admin estão ok.
Síndico deve ver apenas o prédio ao qual está vinculado, não o condomínio inteiro.
Depois seguir para Morador.
```

Depois o foco foi:

- Ajustar Resident cards verdes para padrão claro.
- Padronizar UI dos módulos Resident.
- Atualizar README e contexto.

Se continuar desenvolvimento:

1. Revisar dashboard Síndico com escopo por prédio.
2. Validar se backend já consegue saber prédio vinculado ao síndico.
3. Se não conseguir, definir modelagem de vínculo Síndico -> Building.
4. Ajustar telas do Síndico para não somar condomínio inteiro.
5. Rodar build.
6. Commit.

---

## 22. Commits Sugeridos Recentes

Para README:

```bash
docs: create professional readme and project visuals
```

Para contexto:

```bash
docs: update project context memory
```

Para UI Resident cards:

```bash
style: standardize resident highlight cards
```

Para occurrence type:

```bash
feat: add occurrence type to maintenance flow
```

---

## 23. Observações Finais

Este projeto está em fase forte de polimento para MVP/deploy/portfólio.

O mais importante é não quebrar os pilares:

- Dados reais vindos do backend.
- Segurança por condomínio.
- Master sem acesso operacional.
- Admin só nos condomínios vinculados.
- Síndico limitado por prédio/permissões.
- Morador limitado às próprias unidades.
- UI consistente, limpa e profissional.
- PT-BR com acentos corretos.
- Código seguindo padrões já existentes.


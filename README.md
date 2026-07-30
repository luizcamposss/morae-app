# MORAÊ

![MORAÊ - Gestão condominial](docs/images/morae-cover.svg)

**MORAÊ** é uma plataforma de gestão de condomínios construída como um MVP full stack, com backend em ASP.NET Core e frontend em React. O projeto foi desenvolvido com foco em arquitetura limpa, segurança por escopo de condomínio e experiência visual moderna em PT-BR.

O objetivo é resolver um problema real: permitir que uma plataforma gerencie vários condomínios sem misturar dados operacionais, financeiros ou usuários entre diferentes perfis.

---

## Visão Geral

O sistema organiza a operação condominial em quatro perfis:

![Fluxo de perfis](docs/images/role-flow.svg)

| Perfil | Responsabilidade |
| --- | --- |
| **Master** | Gerencia a plataforma, cadastra condomínios, cria admins, acompanha cobranças institucionais e contatos comerciais. |
| **Admin** | Opera os condomínios aos quais foi vinculado: prédios, unidades, moradores, convites, cobranças e permissões. |
| **Síndico** | Acessa apenas os prédios/recursos delegados pelo Admin, com permissões granulares. |
| **Morador** | Consulta suas unidades, boletos, comunicados e ocorrências vinculadas ao seu perfil. |

---

## Principais Funcionalidades

- Autenticação com JWT e reidratação de sessão via `/api/me`.
- Controle de acesso por papel global e vínculo com condomínio.
- Onboarding de condomínio com criação do primeiro administrador.
- Gestão de condomínios, prédios, unidades e moradores.
- Convites com link de aceite para criação de acesso.
- Permissões específicas para síndicos por condomínio.
- Cobranças institucionais da plataforma e cobranças internas do condomínio.
- Cadastro de conta bancária e chave Pix para recebimentos.
- Comunicados, ocorrências, notificações e dashboards por perfil.
- Interface responsiva, em PT-BR, com identidade visual própria do MORAÊ.

---

## Arquitetura

![Arquitetura do MORAÊ](docs/images/architecture.svg)

O backend segue uma separação em camadas mesmo dentro de um único projeto ASP.NET Core:

| Camada | Responsabilidade |
| --- | --- |
| **Controllers** | Recebem requisições, extraem usuário autenticado e chamam serviços. |
| **Services** | Guardam regras de negócio, validações, permissões e persistência. |
| **DTOs + AutoMapper** | Protegem as bordas da API e evitam exposição direta das entidades. |
| **Domain** | Entidades, enums, constantes de papéis e permissões. |
| **Infrastructure** | `AppDbContext`, migrations, Identity e MySQL. |

Regra importante do projeto: **controllers não acessam `AppDbContext` diretamente**. Toda regra passa por services e por validações centralizadas no `PermissionService`.

---

## Segurança e Isolamento

O MORAÊ não depende apenas de `[Authorize(Roles = "...")]`.

A autorização é composta por:

- **Role global** pelo ASP.NET Identity.
- **Vínculo com condomínio** via `UserCondominium`.
- **Permissões granulares** via `UserCondominiumPermission`.
- **Validações por recurso** em `PermissionService`.

Isso impede, por exemplo, que um Admin visualize condomínios que não administra ou que o Master acesse dados operacionais internos, como unidades e moradores, sem regra explícita.

---

## Stack Técnica

### Backend

- ASP.NET Core 8
- Entity Framework Core
- MySQL
- ASP.NET Identity
- JWT Bearer Authentication
- AutoMapper
- Swagger
- Middleware global de exceções

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- React Router
- Recharts
- `@edusites/icons`

### Infra local

- Docker Compose com MySQL 8.4

---

## Fluxo Principal do Produto

1. O **Master** cadastra um condomínio e cria o primeiro Admin.
2. O sistema gera convite/acesso para o Admin.
3. O **Admin** entra no painel e cadastra prédios, unidades e moradores.
4. O Admin vincula pessoas às unidades e cria convites para moradores ou síndicos.
5. O **Síndico** acessa apenas o que foi permitido.
6. O **Morador** consulta dados próprios: unidade, boletos, avisos e ocorrências.
7. Cobranças, notificações e atividades recentes são exibidas com dados reais do backend.

---

## Como Rodar Localmente

### 1. Clonar o projeto

```bash
git clone <url-do-repositorio>
cd morae-app
```

### 2. Subir o MySQL

```bash
docker compose up -d
```

### 3. Configurar o backend

Crie `backend/.env` com os valores locais:

```env
ConnectionStrings__DefaultConnection=Server=localhost;Database=moraeDB;User=root;Password=root;AllowPublicKeyRetrieval=True;
Jwt__Secret=sua-chave-segura-com-tamanho-suficiente
Jwt__Issuer=Morae
Jwt__Audience=Morae
```

### 4. Aplicar migrations

```bash
dotnet ef database update --project backend/backend.csproj --startup-project backend/backend.csproj
```

### 5. Rodar a API

```bash
dotnet watch run --project backend/backend.csproj
```

API local:

```text
http://localhost:5242
```

### 6. Rodar o frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend local:

```text
http://localhost:5173
```

---

## Estrutura do Repositório

```text
morae-app
├── backend
│   ├── Controllers
│   ├── Services
│   ├── DTOs
│   ├── Models
│   ├── Profiles
│   ├── Data
│   ├── Migrations
│   └── Program.cs
├── frontend
│   └── src
│       ├── app
│       ├── features
│       └── shared
├── docs
│   └── images
└── docker-compose.yaml
```

---

## Diferenciais Técnicos

- Arquitetura orientada a serviços, com controllers finos.
- Controle real de multi-tenancy por condomínio.
- Fluxo de convites com aceite público e criação de usuário.
- Separação entre cobrança institucional da plataforma e cobrança operacional do condomínio.
- Dashboards segmentados por perfil, sem depender de dados mockados.
- UI própria, responsiva e consistente com a identidade visual verde do MORAÊ.
- Tratamento de erros centralizado no backend e mensagens amigáveis no frontend.

---

## Status do MVP

O MVP já possui os principais fluxos operacionais conectados entre frontend e backend:

- Login e sessão.
- Roteamento por perfil.
- Gestão Master.
- Gestão Admin.
- Gestão de prédios, unidades e moradores.
- Convites e aceite de acesso.
- Cobranças e pagamentos manuais.
- Conta bancária/Pix.
- Notificações, comunicados e ocorrências em evolução.

Próximas melhorias planejadas:

- Finalizar hardening de UX.
- Expandir auditoria e histórico de ações.
- Refinar notificações em tempo real.
- Preparar ambiente de produção.
- Adicionar testes automatizados.

---

## Para Recrutadores

Este projeto demonstra:

- Construção de um produto SaaS multi-perfil.
- Backend com regras de acesso reais e isolamento por entidade.
- Frontend moderno com React, TypeScript e Tailwind.
- Integração ponta a ponta entre UI, API, autenticação, banco e permissões.
- Capacidade de evoluir um MVP com cuidado arquitetural e visão de produto.

---

## Sugestão de Post para LinkedIn

> Estou desenvolvendo o **MORAÊ**, uma plataforma full stack para gestão de condomínios.
>
> O projeto nasceu como um MVP, mas foi estruturado com preocupações reais de produto: autenticação JWT, ASP.NET Identity, isolamento multi-condomínio, permissões por perfil, dashboards em React e dados reais vindos do backend.
>
> A arquitetura segue controllers finos, services com regra de negócio, DTOs, AutoMapper, EF Core e MySQL. No frontend, uso React, TypeScript, Tailwind CSS e uma UI própria em PT-BR.
>
> O ponto mais interessante foi modelar o acesso entre Master, Admin, Síndico e Morador sem misturar responsabilidades ou dados entre condomínios.

---

## Autor

Desenvolvido por **Luiz** como projeto full stack de estudo, portfólio e evolução profissional.


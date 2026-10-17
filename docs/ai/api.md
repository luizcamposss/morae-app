# Moraê — referência da API

Base: `http://localhost:5242` (dev). Todas as rotas exigem `Authorization: Bearer <token>`, exceto login, refresh, logout, esqueci/redefinir senha, ver/aceitar convite, callback e webhook do Mercado Pago.

Para os detalhes de cada rota (corpo, validações, quem pode chamar), leia o controller e o service correspondentes em `backend/Controllers` e `backend/Services`. Os DTOs ficam em `backend/DTOs`.

## Convenções

- **JSON em camelCase.** **Enums trafegam como número** (tabela no fim).
- **Instantes** (`createdAt`, `votingEndsAt`…): ISO em UTC com `Z`. Mostre no fuso de São Paulo (`frontend/src/shared/lib/date.ts`). Ao enviar, uma data **sem fuso** (`2026-10-20T22:00`) é tratada como horário de São Paulo (assembleias).
- **Datas de calendário** (`DateOnly`: manutenção, visitas): `"AAAA-MM-DD"`. `Charge.dueDate` também é data de calendário (vem como meia-noite, sem fuso).
- **Horários** (`TimeOnly`, visitas): `"HH:mm"` (aceita `"HH:mm:ss"` na entrada).
- **Erros:** `{ "statusCode": 400, "message": "texto em português para mostrar ao usuário" }`. Erro inesperado: `"Ocorreu um erro inesperado. Tente novamente. Código: XXXXXXXX"`. Rate limit: 429.
- **Sessão:** o access token dura 15 min. Em 401, `apiClient.ts` chama `POST /api/auth/refresh` (cookie HttpOnly em `/api/auth`, `credentials: "include"`) e repete. Se falhar → `/login?expired=1`.
- **Uploads** (`multipart/form-data`): documentos (`file`, `title`, `description`, `category`, `visibility`) e execução de manutenção (`performedOn`, `providerName`, `notes`, `file` opcional). Limite de 20 MB; tipos PDF, JPG, PNG, DOCX, XLSX. Ocorrência: até 5 `photos` (JPG ou PNG, 10 MB cada).
- **Downloads** (documento, anexo de manutenção, comprovante): exigem o token, então baixe com `fetch` + `Authorization` e gere um blob/URL temporária (link direto não funciona).
- **Recursos escondidos** aparecem como **404** (não 403) quando o usuário não pode nem saber que existem (documento "só gestão", rascunho de assembleia, visita/manutenção de outro prédio).

## Pontos de atenção por módulo

- **Cobranças/pagamentos:** pagar com Mercado Pago = `payment-setup` (public key) → Payment Brick → `POST /api/charges/{id}/mercadopago/payments` com o `formData` do Brick (snake_case: `payment_method_id`, `token`, `issuer_id`, `payer`). Pix/boleto: acompanhar por `payment-status`.
- **Síndico:** `GET /api/me/permissions?condominiumId=` diz o que ele pode naquele condomínio; esconda menus/ações sem permissão (a API também bloqueia). Prédios do síndico: `GET/PUT /api/condominiums/{id}/syndics/{userId}/buildings` (envio: `{ allBuildings, buildingIds }`).
- **`GET /api/me`:** traz `isCondominiumInactive` e `isSuspended` (mostrar telas de bloqueio).
- **Documentos:** `GET .../documents?category=`. Visibilidade 2 = só gestão.
- **Manutenção:** lista com `?status=&buildingId=`, ordenada pela mais urgente; cada item traz `status`, `daysUntilDue` (negativo = atrasada) e `lastPerformedOn`. `POST .../maintenance-plans/defaults` cria as manutenções comuns.
- **Visitantes:** `daysOfWeek` = 0 (domingo) a 6 (sábado); vazio = todos os dias do período. A agenda (`?from=&to=&unitId=&buildingId=&visitorType=&includeCanceled=`, até 31 dias) devolve `dates` com os dias em que cada visita acontece. `my-visits?includePast=true` inclui canceladas e passadas.
- **Assembleias:** `phase` é o que a tela deve usar (rascunho/agendada/aberta/encerrada/cancelada). Cédula: `GET /my-ballot` (unidades do usuário, `canVote`, `blockReason`, `votes` por item). Votar: `PUT /votes` `{ unitId, votes: [{ itemId, optionId }] }`. Resultado: `GET /results` (com `isFinal=false`, a gestão vê só a participação). Cada pauta traz `summary` pronto em português.

## Rotas

### Autenticação
```
POST   /api/auth/change-password
POST   /api/auth/forgot-password
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/reset-password
```

### Usuário logado
```
GET    /api/me
GET    /api/me/condominiums
GET    /api/me/notification-preferences
PUT    /api/me/notification-preferences
GET    /api/me/permissions
PUT    /api/me/profile
PUT    /api/me/profile-photo
GET    /api/me/units
```

### Notificações (sininho)
```
GET    /api/notifications
DELETE /api/notifications/clear
PATCH  /api/notifications/read-all
PATCH  /api/notifications/{id:int}/read
```

### Meus condomínios
```
GET    /api/my/condominiums
```

### Condomínios (Master)
```
GET    /api/condominium
POST   /api/condominium
POST   /api/condominium/onboarding
DELETE /api/condominium/{id}
GET    /api/condominium/{id}
PUT    /api/condominium/{id}
DELETE /api/condominium/{id}/admin
PUT    /api/condominium/{id}/admin
PUT    /api/condominium/{id}/status
```

### Acessos de usuários
```
DELETE /api/condominiums/{condominiumId}/users/{userId}
PUT    /api/condominiums/{condominiumId}/users/{userId}/reactivate
PUT    /api/condominiums/{condominiumId}/users/{userId}/role
PUT    /api/condominiums/{condominiumId}/users/{userId}/suspend
GET    /api/master/users
POST   /api/master/users
```

### Permissões e prédios do síndico
```
GET    /api/condominiums/{condominiumId}/syndics/{userId}/buildings
PUT    /api/condominiums/{condominiumId}/syndics/{userId}/buildings
GET    /api/condominiums/{condominiumId}/syndics/{userId}/permissions
PUT    /api/condominiums/{condominiumId}/syndics/{userId}/permissions
```

### Lista de permissões
```
GET    /api/permissions
```

### Prédios
```
DELETE /api/buildings/{buildingId}
GET    /api/buildings/{buildingId}
PUT    /api/buildings/{buildingId}
GET    /api/condominiums/{condominiumId}/buildings
POST   /api/condominiums/{condominiumId}/buildings
```

### Unidades
```
GET    /api/buildings/{buildingId}/units
POST   /api/buildings/{buildingId}/units
DELETE /api/units/{unitId}
GET    /api/units/{unitId}
PUT    /api/units/{unitId}
```

### Pessoas
```
GET    /api/condominiums/{condominiumId}/persons
POST   /api/condominiums/{condominiumId}/persons
PUT    /api/condominiums/{condominiumId}/persons/{id}
GET    /api/persons
POST   /api/persons
DELETE /api/persons/{id}
GET    /api/persons/{id}
PUT    /api/persons/{id}
```

### Vínculos pessoa-unidade
```
DELETE /api/person-units/{id}
GET    /api/units/{unitId}/persons
POST   /api/units/{unitId}/persons
```

### Convites
```
GET    /api/condominiums/{condominiumId}/invitations
POST   /api/invitations
POST   /api/invitations/accept
POST   /api/invitations/{id:int}/cancel
POST   /api/invitations/{id:int}/renew
GET    /api/invitations/{token}
```

### Cobranças
```
POST   /api/charges
GET    /api/charges/platform
GET    /api/charges/{id}
PUT    /api/charges/{id}/cancel
GET    /api/condominiums/{condominiumId}/charges
GET    /api/my/charges
```

### Pagamentos e comprovante
```
GET    /api/charges/{chargeId}/payments
POST   /api/charges/{chargeId}/payments/manual
GET    /api/charges/{chargeId}/receipt
```

### Inadimplência
```
GET    /api/condominiums/{condominiumId}/delinquency
GET    /api/delinquency/platform
```

### Contas de recebimento
```
GET    /api/condominiums/{condominiumId}/financial-account
PUT    /api/condominiums/{condominiumId}/financial-account
GET    /api/financial-accounts/platform
PUT    /api/financial-accounts/platform
```

### Mercado Pago
```
GET    /api/charges/{chargeId}/mercadopago/payment-setup
GET    /api/charges/{chargeId}/mercadopago/payment-status
POST   /api/charges/{chargeId}/mercadopago/payments
POST   /api/charges/{chargeId}/mercadopago/refund
GET    /api/mercadopago/oauth/callback
POST   /api/mercadopago/oauth/complete
POST   /api/mercadopago/oauth/connect
DELETE /api/mercadopago/oauth/connection
GET    /api/mercadopago/oauth/status
POST   /api/mercadopago/webhooks
```

### Avisos (comunicados)
```
GET    /api/condominiums/{condominiumId}/news
POST   /api/news
GET    /api/news/platform
DELETE /api/news/{id}
GET    /api/news/{id}
PUT    /api/news/{id}
```

### Ocorrências
```
GET    /api/condominiums/{condominiumId}/occurrences
GET    /api/my/occurrences
POST   /api/occurrences
GET    /api/occurrences/{id}
PUT    /api/occurrences/{id}/response
PUT    /api/occurrences/{id}/status
GET    /api/occurrence-photos/{id}
```
- `POST /api/occurrences` aceita JSON (sem fotos) ou `multipart/form-data` com os mesmos campos + até 5 arquivos `photos` (só JPG ou PNG, conferidos pelo conteúdo; até 10 MB cada).
- `PUT /api/occurrences/{id}/response` (Admin ou síndico com `occurrences.manage`): `{ "message": "..." }` (até 2000 caracteres). Grava `managementResponse`, `respondedAt` e `respondedByName` e avisa no sininho quem abriu (tipo `Occurrence`).
- `GET /api/occurrence-photos/{id}` devolve o arquivo da foto (com o token; use `apiDownload`). Quem pode ver a ocorrência pode ver a foto.
- A resposta das ocorrências traz também `buildingId`, `buildingName`, `unitNumber`, `createdByName` e `photos` (`id`, `fileName`, `contentType`, `sizeBytes`).

### Documentos (H)
```
GET    /api/condominiums/{condominiumId}/documents
POST   /api/condominiums/{condominiumId}/documents
DELETE /api/documents/{id}
PUT    /api/documents/{id}
GET    /api/documents/{id}/download
```

### Manutenção preventiva (I)
```
GET    /api/condominiums/{condominiumId}/maintenance-plans
POST   /api/condominiums/{condominiumId}/maintenance-plans
POST   /api/condominiums/{condominiumId}/maintenance-plans/defaults
DELETE /api/maintenance-plans/{id}
GET    /api/maintenance-plans/{id}
PUT    /api/maintenance-plans/{id}
```

### Manutenção — execuções (I)
```
GET    /api/maintenance-plans/{planId}/records
POST   /api/maintenance-plans/{planId}/records
DELETE /api/maintenance-records/{id}
GET    /api/maintenance-records/{id}/attachment
```

### Visitantes (J)
```
GET    /api/condominiums/{condominiumId}/my-visits
GET    /api/condominiums/{condominiumId}/visits
POST   /api/condominiums/{condominiumId}/visits
PUT    /api/visits/{id}
POST   /api/visits/{id}/cancel
```

### Assembleias e votações (K)
```
DELETE /api/assemblies/{id}
GET    /api/assemblies/{id}
PUT    /api/assemblies/{id}
POST   /api/assemblies/{id}/cancel
PUT    /api/assemblies/{id}/minutes
GET    /api/assemblies/{id}/my-ballot
POST   /api/assemblies/{id}/publish
GET    /api/assemblies/{id}/results
PUT    /api/assemblies/{id}/votes
GET    /api/condominiums/{condominiumId}/assemblies
POST   /api/condominiums/{condominiumId}/assemblies
```

## Enums

- `AssemblyType`: 1 Ordinary, 2 Extraordinary
- `AssemblyVoterRule`: 1 OwnersOnly, 2 OwnersAndResidents
- `AssemblyStatus`: 1 Draft, 2 Published, 3 Closed, 4 Canceled
- `AssemblyPhase`: 1 Draft, 2 Scheduled, 3 Open, 4 Closed, 5 Canceled
- `AssemblyVoteType`: 1 YesNo, 2 MultipleChoice
- `AssemblyQuorum`: 1 MajorityOfVotes, 2 AbsoluteMajorityOfUnits, 3 TwoThirdsOfUnits, 4 Unanimity
- `AssemblyItemOutcome`: 1 Approved, 2 Rejected, 3 Decided, 4 Undecided
- `BankAccountType`: 1 Checking, 2 Savings, 3 Payment
- `ChargeScope`: 1 Platform, 2 Condominium
- `ChargeStatus`: 1 Pending, 2 Paid, 3 Overdue, 4 Canceled
- `DocumentCategory`: 1 Convention, 2 InternalRules, 3 Minutes, 4 Financial, 5 Contract, 6 Other
- `DocumentVisibility`: 1 Everyone, 2 ManagementOnly
- `FinancialAccountScope`: 1 Platform, 2 Condominium
- `InvitationStatus`: 1 Pending, 2 Accepted, 3 Refused, 4 Expired, 5 Canceled
- `MaintenanceCategory`: 1 Elevator, 2 FireSafety, 3 WaterTank, 4 PestControl, 5 Electrical, 6 Equipment, 7 Structure, 8 Pool, 9 Other
- `MaintenanceStatus`: 1 UpToDate, 2 DueSoon, 3 Overdue
- `NewsScope`: 1 Condominium, 2 Platform
- `NewsTargetAudience`: 1 Everyone, 2 Admins, 3 Syndics, 4 Residents, 5 Doormen
- `NotificationType`: 1 System, 2 Invitation, 3 Charge, 4 Payment, 5 Access, 6 News, 7 Occurrence
- `OccurrencePriority`: 1 Low, 2 Medium, 3 High, 4 Urgent
- `OccurrenceStatus`: 1 Open, 2 InProgress, 3 Resolved, 4 Canceled
- `OccurrenceType`: 1 Maintenance, 2 Security, 3 Cleaning, 4 Noise, 5 CommonArea, 6 Other
- `PaymentMethod`: 1 Pix, 2 CreditCard, 3 DebitCard, 4 BankSlip, 5 BankTransfer, 6 AccountBalance, 7 PrepaidCard, 8 DigitalWallet, 9 Other
- `PaymentSource`: 1 Manual, 2 MercadoPago
- `PixKeyType`: 1 Cpf, 2 Cnpj, 3 Email, 4 Phone, 5 Random
- `Priority`: 1 High, 2 Normal, 3 Low
- `Status`: 1 Active, 2 Inactive
- `UnitRelationshipType`: 1 Owner, 2 Resident, 3 Tenant
- `UnitType`: 1 Apartment, 2 House, 3 CommercialRoom, 4 Store, 5 Garage, 6 Penthouse
- `UserCondominiumStatus`: 1 Active, 2 Suspended
- `UserRole`: 1 Master, 2 Admin, 3 Syndic, 4 Resident
- `VisitStatus`: 1 Active, 2 Canceled
- `VisitorType`: 1 Visitor, 2 ServiceProvider, 3 HouseholdStaff, 4 Other

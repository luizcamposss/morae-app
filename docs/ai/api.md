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
- **Uploads** (`multipart/form-data`): documentos (`file`, `title`, `description`, `category`, `visibility`) e execução de manutenção (`performedOn`, `providerName`, `notes`, `file` opcional). Limite de 20 MB; tipos PDF, JPG, PNG, DOCX, XLSX. Ocorrência: até 5 `photos` (JPG ou PNG, 10 MB cada). Importação por planilha: campo `file` (CSV ou XLSX, até 2 MB e 2.000 linhas).
- **Downloads** (documento, anexo de manutenção, comprovante): exigem o token, então baixe com `fetch` + `Authorization` e gere um blob/URL temporária (link direto não funciona).
- **Recursos escondidos** aparecem como **404** (não 403) quando o usuário não pode nem saber que existem (documento "só gestão", rascunho de assembleia, visita/manutenção de outro prédio).

## Pontos de atenção por módulo

- **Cobranças/pagamentos:** pagar com Mercado Pago = `payment-setup` (public key) → Payment Brick → `POST /api/charges/{id}/mercadopago/payments` com o `formData` do Brick (snake_case: `payment_method_id`, `token`, `issuer_id`, `payer`). Pix/boleto: acompanhar por `payment-status`.
- **Lote, recorrência, multa e juros:** cada cobrança traz `finePercent`/`monthlyInterestPercent` (null = sem multa/juros), `daysLate`, `fineAmount`, `interestAmount` e `updatedAmount` (o que se paga hoje; é o valor usado no Mercado Pago). Lote e recorrência devolvem `skipped` (unidades sem ninguém vinculado). Detalhes em "Lote, recorrência e regras de cobrança".
- **Síndico:** `GET /api/me/permissions?condominiumId=` diz o que ele pode naquele condomínio; esconda menus/ações sem permissão (a API também bloqueia). Prédios do síndico: `GET/PUT /api/condominiums/{id}/syndics/{userId}/buildings` (envio: `{ allBuildings, buildingIds }`).
- **Prédios e unidades para o síndico:** `GET /api/condominiums/{id}/buildings`, `GET /api/buildings/{id}`, `GET /api/buildings/{id}/units` e `GET /api/units/{id}` aceitam `residents.view` **ou** qualquer permissão financeira (`charges.create`, `charges.mark_as_paid`, `delinquency.view`), sempre só nos prédios que ele cuida. Sem `residents.view`, a unidade vem com `responsiblePersonName` vazio e as pessoas (`/units/{id}/persons`, `/persons`) continuam 403.
- **`GET /api/me`:** traz `isCondominiumInactive` e `isSuspended` (mostrar telas de bloqueio).
- **Documentos:** `GET .../documents?category=`. Visibilidade 2 = só gestão.
- **Manutenção:** lista com `?status=&buildingId=`, ordenada pela mais urgente; cada item traz `status`, `daysUntilDue` (negativo = atrasada) e `lastPerformedOn`. `POST .../maintenance-plans/defaults` cria as manutenções comuns.
- **Visitantes:** `daysOfWeek` = 0 (domingo) a 6 (sábado); vazio = todos os dias do período. A agenda (`?from=&to=&unitId=&buildingId=&visitorType=&includeCanceled=`, até 31 dias) devolve `dates` com os dias em que cada visita acontece. `my-visits?includePast=true` inclui canceladas e passadas.
- **Importação por planilha (só Admin):** baixe o modelo (`?format=csv` ou `xlsx`), envie em `preview` (nada é gravado) e, se `canConfirm`, envie **o mesmo arquivo** em `confirm` (valida tudo de novo e grava numa transação: tudo ou nada; com qualquer linha com erro devolve 400). Cada linha = uma unidade, com pessoa e cobrança em aberto opcionais. Colunas casadas pelo cabeçalho, sem acento/maiúsculas: Prédio (nome ou código; cria se não existir), Unidade, Tipo da unidade, Quartos, Banheiros, Metragem, Nome, CPF, Telefone (opcional), E-mail (opcional; aceita "Email"/"E-mail"), Vínculo (Proprietário/Morador/Inquilino; vazio = Morador), Valor, Vencimento (DD/MM/AAAA; **pode ser passado**: dívida antiga entra como pendente e a rotina de hora em hora marca atrasada — só na importação, a criação manual continua recusando data passada), Descrição. Colunas desconhecidas vêm em `ignoredColumns`. O que já existe é reaproveitado (`action: "existing"`, conta em `skipped`). Não envia e-mails, convites nem notificações. A prévia traz `summary` (`created`/`skipped` por tipo: buildings, units, persons, links, charges) e `rows` (`line`, `errors`, `warnings` (avisos que não bloqueiam, ex.: "Vencida em 10/01."), `email`, e `buildingAction`/`unitAction`/`personAction`/`linkAction`/`chargeAction` = `create`/`existing`/null).
- **Assembleias:** `phase` é o que a tela deve usar (rascunho/agendada/aberta/encerrada/cancelada). Cédula: `GET /my-ballot` (unidades do usuário, `canVote`, `blockReason`, `votes` por item). Votar: `PUT /votes` `{ unitId, votes: [{ itemId, optionId }] }`. Resultado: `GET /results` (com `isFinal=false`, a gestão vê só a participação). Cada pauta traz `summary` pronto em português. **Anexo por opção** (ex.: orçamento de uma empresa): cada opção traz `hasAttachment`, `attachmentFileName` e `attachmentSizeBytes` (no resultado, `hasAttachment` e `attachmentFileName`). Enviar/trocar: `PUT /api/assembly-options/{optionId}/attachment` (multipart, campo `file`; PDF, JPG, PNG, DOCX ou XLSX até 20 MB) e remover: `DELETE` na mesma rota — só gestão, só em rascunho e nunca na "Abstenção"; ambos devolvem a assembleia. Baixar: `GET` na mesma rota (quem pode ver a assembleia). Como as pautas são recriadas a cada `PUT /api/assemblies/{id}`, a opção que continua igual (mesma posição da pauta e mesmo texto) mantém o anexo; as outras perdem o arquivo. Apagar o rascunho apaga os arquivos.

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
Corpo de criar/editar: `name`, `cpf` (11 dígitos), `phoneNumber` (opcional; se vier, 10–20 dígitos; sem telefone fica `""`) e `email` (opcional, até 256, validado; vazio = null). A resposta traz `email` (ou null).
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

- Toda cobrança traz `dueSoonReminderSentAt` e `overdueReminderSentAt` (instantes UTC; null = lembrete ainda não enviado): quando a rotina mandou o e-mail de "vence em breve" e o de atraso. Usados na linha do tempo da cobrança e no contador "lembretes enviados hoje" do painel (contado pelo dia de São Paulo no front).

### Lote, recorrência e regras de cobrança
```
GET    /api/condominiums/{condominiumId}/billing-settings        (qualquer membro ativo)
PUT    /api/condominiums/{condominiumId}/billing-settings        (só Admin)
POST   /api/condominiums/{condominiumId}/charges/batch           (charges.create)
GET    /api/condominiums/{condominiumId}/recurring-charges       (Admin ou síndico do Financeiro)
POST   /api/condominiums/{condominiumId}/recurring-charges       (charges.create)
PUT    /api/recurring-charges/{id}/pause | /resume | /end        (charges.create)
```
- Regras: `PUT billing-settings` `{ billingDueDay: 10, lateFeeEnabled: true, finePercent: 2, monthlyInterestPercent: 1 }` (dia 1–31, no mês curto vira o último dia; multa 0–2; juros 0–1 ao mês). A resposta traz também `maxFinePercent` e `maxMonthlyInterestPercent`.
- Lote: `POST .../charges/batch` `{ buildingId?: 3, value: 500, dueDate?: "2026-11-10", description: "Taxa de novembro", unitValues?: [{ unitId: 12, value: 650 }] }`. Sem `buildingId` = todos os prédios (síndico limitado: só os dele). Sem `dueDate` = próximo dia `billingDueDay`. Resposta: `{ dueDate, createdCount, totalValue, charges: [...], skipped: [{ unitId, unitNumber, buildingName, reason }] }`.
- Recorrência: `POST .../recurring-charges` `{ buildingId?, value: 500, dueDay?: 10, description, unitValues? }` (sem `dueDay` = o do condomínio; síndico limitado precisa escolher o prédio). A rotina gera **10 dias antes** do vencimento, uma vez por unidade e mês. Criar e retomar já geram o mês se estiver dentro da janela (vem em `generation`). Encerrada não volta.

### Pagamentos e comprovante
```
GET    /api/charges/{chargeId}/payments
POST   /api/charges/{chargeId}/payments/manual
GET    /api/charges/{chargeId}/receipt
```
- Pagamento manual aceita de `value` (gestão perdoa multa/juros) até o valor atualizado no dia do pagamento. O comprovante traz `originalValue` e `lateFeesPaid` (`amountPaid = originalValue + lateFeesPaid`).

### Pix com comprovante (condomínio sem Mercado Pago)
```
GET    /api/charges/{chargeId}/pix-info          (quem pode pagar: Admin ou morador da unidade)
POST   /api/charges/{chargeId}/payment-proofs    (quem pode pagar; multipart: file + note?)
GET    /api/charges/{chargeId}/payment-proofs    (gestão com charges.mark_as_paid ou quem pode pagar)
GET    /api/payment-proofs/{id}/file             (idem; download com token)
PUT    /api/payment-proofs/{id}/reject           (gestão com charges.mark_as_paid) { reason }
```
- Só cobranças do condomínio (`scope` 2) em aberto. `pix-info` → `{ chargeId, description, condominiumName, pixKey, pixKeyType, holderName, amount }` (`amount` = valor atualizado hoje); 404 se o condomínio não tem chave Pix.
- Comprovante: PDF, JPG ou PNG até 10 MB (conferido pelo conteúdo), `note` até 500. Um pendente por vez (400 se já houver). Notifica no sininho os Admins e os síndicos com `charges.mark_as_paid` no prédio da unidade.
- Aceitar = dar baixa com `POST .../payments/manual`: os comprovantes pendentes da cobrança viram `Accepted`. Recusar notifica quem enviou.
- Resposta do comprovante: `{ id, chargeId, uploadedByUserId, uploadedByName, fileName, contentType, note, status, rejectionReason, reviewedByName, reviewedAt, createdAt }`.
- Toda cobrança (listas e `GET /api/charges/{id}`) traz `onlinePaymentAvailable` (Mercado Pago conectado para quem recebe; se `false`, mostrar "Pagar com Pix"), `pendingProofCount`, `latestProofStatus` e `latestProofRejectionReason` (só quando o último foi recusado).

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
- Só a chave Pix. `PUT` → `{ pixKeyType, pixKey }` (`pixKeyType` obrigatório, enum `PixKeyType`). A chave é validada pelo tipo (400 com mensagem em português) e guardada normalizada: CPF/CNPJ só números (com dígito verificador), celular `+55DDD9XXXXXXXX`, e-mail em minúsculas (até 77 caracteres), aleatória = UUID em minúsculas.
- Resposta (e `pix-info`): `{ id, condominiumId, condominiumName, pixKeyType, pixKey, updatedByUserId, createdAt, updatedAt }`. Chaves antigas, salvas antes do tipo, têm `pixKeyType` deduzido pelo formato (se não der, vem 5 Random).

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
POST   /api/news/{id}/read
GET    /api/news/{id}/unread
```

- **Leitura:** ao publicar um aviso do condomínio, os destinatários (público + prédio, mesma regra de quem vê o aviso, sem o autor) ficam gravados em `NewsRecipients`. Mudar público ou prédio na edição recalcula a lista (quem continua mantém a leitura). Avisos antigos (antes da tabela) ficam com 0 destinatários.
- `POST /api/news/{id}/read`: marca que o usuário abriu o aviso; idempotente (só a primeira vez vale), `204`. Quem não estava na lista não muda nada.
- `recipientCount` / `readCount` em `NewsResponseDto`: só para quem gerencia avisos (Master, Admin, síndico com `news.create`/`news.edit`); `null` para morador.
- `GET /api/news/{id}/unread`: só gestão (`403` para os demais). Lista `{ name, buildingName, unitNumber }` de quem ainda não leu (uma linha por unidade; sem unidade = `buildingName`/`unitNumber` nulos).
- Síndico limitado a alguns prédios: só vê avisos do condomínio todo e dos seus prédios; contagens e lista só com pessoas que têm unidade nesses prédios.

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

### Importação por planilha
```
POST   /api/condominiums/{condominiumId}/imports/confirm
POST   /api/condominiums/{condominiumId}/imports/preview
GET    /api/condominiums/{condominiumId}/imports/template?format=csv|xlsx
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
DELETE /api/assembly-options/{optionId}/attachment
GET    /api/assembly-options/{optionId}/attachment
PUT    /api/assembly-options/{optionId}/attachment
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
- `RecurringChargeStatus`: 1 Active, 2 Paused, 3 Ended
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
- `PaymentProofStatus`: 1 Pending, 2 Accepted, 3 Rejected
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

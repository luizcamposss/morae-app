# Moraê — referência da API

Base: `http://localhost:5242` (dev). Todas as rotas exigem `Authorization: Bearer <token>`, exceto login, refresh, logout, esqueci/redefinir senha, ver/aceitar convite, callback e webhook do Mercado Pago e as rotas de `/api/public` (WhatsApp comercial e formulário de contato da landing).

Para os detalhes de cada rota (corpo, validações, quem pode chamar), leia o controller e o service correspondentes em `backend/Controllers` e `backend/Services`. Os DTOs ficam em `backend/DTOs`.

## Convenções

- **JSON em camelCase.** **Enums trafegam como número** (tabela no fim).
- **Instantes** (`createdAt`, `votingEndsAt`…): ISO em UTC com `Z`. Mostre no fuso de São Paulo (`frontend/src/shared/lib/date.ts`). Ao enviar, uma data **sem fuso** (`2026-10-20T22:00`) é tratada como horário de São Paulo (assembleias).
- **Datas de calendário** (`DateOnly`: manutenção, visitas): `"AAAA-MM-DD"`. `Charge.dueDate` também é data de calendário (vem como meia-noite, sem fuso).
- **Horários** (`TimeOnly`, visitas): `"HH:mm"` (aceita `"HH:mm:ss"` na entrada).
- **Erros:** `{ "statusCode": 400, "message": "texto em português para mostrar ao usuário" }`. Erro inesperado: `"Ocorreu um erro inesperado. Tente novamente. Código: XXXXXXXX"`. Rate limit: 429.
- **Sessão:** o access token dura 15 min. Em 401, `apiClient.ts` chama `POST /api/auth/refresh` (cookie HttpOnly em `/api/auth`, `credentials: "include"`) e repete. Se falhar → `/login?expired=1`.
- **Uploads** (`multipart/form-data`): documentos (`file`, `title`, `description`, `category`, `visibility`) e execução de manutenção (`performedOn`, `providerName`, `notes`, `file` opcional). Despesa: `categoryId`, `amount` (texto com ponto: `"1234.56"`), `paidOn`, `supplier`, `buildingId`, `description`, `file` opcional (só PDF, JPG ou PNG) e, na edição, `removeReceipt`. Limite de 20 MB; tipos PDF, JPG, PNG, DOCX, XLSX. Ocorrência: até 5 `photos` (JPG ou PNG, 10 MB cada). Importação por planilha: campo `file` (CSV ou XLSX, até 2 MB e 2.000 linhas).
- **Downloads** (documento, anexo de manutenção, comprovante, comprovante de despesa): exigem o token, então baixe com `fetch` + `Authorization` e gere um blob/URL temporária (link direto não funciona).
- **Recursos escondidos** aparecem como **404** (não 403) quando o usuário não pode nem saber que existem (documento "só gestão", rascunho de assembleia, visita/manutenção de outro prédio).

## Pontos de atenção por módulo

- **Cobranças/pagamentos:** pagar com Mercado Pago = `payment-setup` (public key) → Payment Brick → `POST /api/charges/{id}/mercadopago/payments` com o `formData` do Brick (snake_case: `payment_method_id`, `token`, `issuer_id`, `payer`). Pix/boleto: acompanhar por `payment-status`.
- **Lote, recorrência, multa e juros:** cada cobrança traz `finePercent`/`monthlyInterestPercent` (null = sem multa/juros), `daysLate`, `fineAmount`, `interestAmount` e `updatedAmount` (o que se paga hoje; é o valor usado no Mercado Pago). Lote e recorrência devolvem `skipped` (unidades sem ninguém vinculado). Detalhes em "Lote, recorrência e regras de cobrança".
- **Síndico:** `GET /api/me/permissions?condominiumId=` diz o que ele pode naquele condomínio; esconda menus/ações sem permissão (a API também bloqueia). Prédios do síndico: `GET/PUT /api/condominiums/{id}/syndics/{userId}/buildings` (envio: `{ allBuildings, buildingIds }`).
- **Prédios e unidades para o síndico:** `GET /api/condominiums/{id}/buildings`, `GET /api/buildings/{id}`, `GET /api/buildings/{id}/units` e `GET /api/units/{id}` aceitam `residents.view` **ou** qualquer permissão financeira (`charges.create`, `charges.mark_as_paid`, `delinquency.view`) **ou** `expenses.manage`, sempre só nos prédios que ele cuida. Sem `residents.view`, a unidade vem com `responsiblePersonName` vazio e as pessoas (`/units/{id}/persons`, `/persons`) continuam 403.
- **`GET /api/me`:** traz `isCondominiumInactive` e `isSuspended` (mostrar telas de bloqueio).
- **Documentos:** `GET .../documents?category=`. Visibilidade 2 = só gestão.
- **Manutenção:** lista com `?status=&buildingId=`, ordenada pela mais urgente; cada item traz `status`, `daysUntilDue` (negativo = atrasada) e `lastPerformedOn`. `POST .../maintenance-plans/defaults` cria as manutenções comuns.
- **Visitantes:** `daysOfWeek` = 0 (domingo) a 6 (sábado); vazio = todos os dias do período. A agenda (`?from=&to=&unitId=&buildingId=&visitorType=&includeCanceled=`, até 31 dias) devolve `dates` com os dias em que cada visita acontece. `my-visits?includePast=true` inclui canceladas e passadas.
- **Importação por planilha (só Admin):** baixe o modelo (`?format=csv` ou `xlsx`), envie em `preview` (nada é gravado) e, se `canConfirm`, envie **o mesmo arquivo** em `confirm` (valida tudo de novo e grava numa transação: tudo ou nada; com qualquer linha com erro devolve 400). Cada linha = uma unidade, com pessoa e cobrança em aberto opcionais. Colunas casadas pelo cabeçalho, sem acento/maiúsculas: Prédio (nome ou código; cria se não existir), Unidade, Tipo da unidade, Quartos, Banheiros, Metragem, Nome, CPF, Telefone (opcional), E-mail (opcional; aceita "Email"/"E-mail"), Vínculo (Proprietário/Morador/Inquilino; vazio = Morador), Valor, Vencimento (DD/MM/AAAA; **pode ser passado**: dívida antiga entra como pendente e a rotina de hora em hora marca atrasada — só na importação, a criação manual continua recusando data passada), Descrição. Colunas desconhecidas vêm em `ignoredColumns`. O que já existe é reaproveitado (`action: "existing"`, conta em `skipped`). Não envia e-mails, convites nem notificações. A prévia traz `summary` (`created`/`skipped` por tipo: buildings, units, persons, links, charges) e `rows` (`line`, `errors`, `warnings` (avisos que não bloqueiam, ex.: "Vencida em 10/01."), `email`, e `buildingAction`/`unitAction`/`personAction`/`linkAction`/`chargeAction` = `create`/`existing`/null).
- **Contatos da landing:** `POST /api/public/contacts` é **público** (sem token), limite de 5/min por IP. Corpo `{ name, whatsApp, unitCount, profile, pain }`: nome de 2 a 120 caracteres; WhatsApp com qualquer formatação, 10 a 13 dígitos (número com DDD sem o 55 ganha o 55 na frente e fica gravado só com dígitos); `unitCount` de 1 a 10.000; `profile` = `LandingContactProfileType`; `pain` opcional, um dos ids do hero (`inadimplencia`, `avisos`, `sistema`, `assembleia`, `migrar`), gravado como texto. Responde sempre `{ message }`. O mesmo WhatsApp de novo em 24 h **atualiza** o contato anterior (sem linha nova, sem e-mail e sem avisar o visitante). Cada contato novo manda e-mail para todos os Master, com os dados e o link do WhatsApp (acima de 30 contatos novos na última hora, o contato é gravado mas sem e-mail, contra robôs). Lista e status são **só do Master**: `GET /api/landing-contacts?status=` (mais novo primeiro) e `PATCH .../{id}/status` `{ status }` (devolve o contato). Cada item: `id`, `name`, `whatsApp` (só dígitos, com 55), `unitCount`, `profile`, `pain`, `painLabel` (a dor em palavras), `status`, `whatsAppUrl` (link `wa.me` com mensagem pronta, o mesmo do e-mail), `createdAt`, `updatedAt`.
- **Reservas de áreas comuns:** a gestão (Admin e síndico com `reservations.manage`, só nas áreas do condomínio todo e dos prédios dele) usa `GET/POST .../common-areas` e `PUT/DELETE /api/common-areas/{id}`. Corpo da área: `name`, `description`, `capacity`, `buildingId` (null = condomínio todo), `isActive`, `fullDay` (true = um por dia; false = por turnos), `shifts` (`[{ id?, name, startTime, endTime }]`, até 6, sem sobrepor; mande o `id` dos que continuam), `minAdvanceDays`/`maxAdvanceDays` (antecedência em dias), `monthlyLimitPerUnit` (null = sem limite), `requiresApproval`, `fee` (null/0 = grátis; com taxa, o condomínio precisa de Pix ou Mercado Pago), `freeCancellationDays` (cancelar até N dias antes cancela a taxa; null = sempre), `terms`. Área com reserva no histórico não se apaga (desative). Foto: `PUT/DELETE/GET /api/common-areas/{id}/photo` (campo `file`, JPG/PNG até 10 MB; baixe com `fetch`). O morador lista `.../common-areas/bookable`, vê o mês em `GET /api/common-areas/{id}/availability?month=AAAA-MM&unitId=` (`days[].inWindow` e `days[].slots[]` com `shiftId` (null = dia inteiro), `isFree`, `isMine`; mais `usedInMonth` e `monthlyLimitPerUnit`) e pede com `POST .../reservations` `{ commonAreaId, unitId, date, shiftId, acceptTerms, notes }` (409 = horário já tomado). Sem aprovação, já nasce aprovada. Aprovar cria a cobrança da taxa (categoria 8 Reserva, vence no dia da reserva) e devolve `chargeId`/`chargeStatus`. `reject` exige `{ reason }`; `cancel` aceita `{ reason }`. Cada reserva traz `canCancel` e `freeCancellationUntil`. Lista da gestão: `?from=&to=&status=&commonAreaId=` (padrão: de hoje a 1 ano).
- **Assembleias:** `phase` é o que a tela deve usar (rascunho/agendada/aberta/encerrada/cancelada). Cédula: `GET /my-ballot` (unidades do usuário, `canVote`, `blockReason`, `votes` por item). Votar: `PUT /votes` `{ unitId, votes: [{ itemId, optionId }] }`. Resultado: `GET /results` (com `isFinal=false`, a gestão vê só a participação). Cada pauta traz `summary` pronto em português. **Anexo por opção** (ex.: orçamento de uma empresa): cada opção traz `hasAttachment`, `attachmentFileName` e `attachmentSizeBytes` (no resultado, `hasAttachment` e `attachmentFileName`). Enviar/trocar: `PUT /api/assembly-options/{optionId}/attachment` (multipart, campo `file`; PDF, JPG, PNG, DOCX ou XLSX até 20 MB) e remover: `DELETE` na mesma rota — só gestão, só em rascunho e nunca na "Abstenção"; ambos devolvem a assembleia. Baixar: `GET` na mesma rota (quem pode ver a assembleia). Como as pautas são recriadas a cada `PUT /api/assemblies/{id}`, a opção que continua igual (mesma posição da pauta e mesmo texto) mantém o anexo; as outras perdem o arquivo. Apagar o rascunho apaga os arquivos.

## Rotas

### Público (landing e login, sem login)
```
GET    /api/public/commercial-contact   → { whatsAppNumber } (só dígitos, com DDI; null = sem número, esconda o botão)
```
Número vem de `Commercial__WhatsAppNumber` no `.env`. Limite de 60/min por IP.

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
PUT    /api/me/guides                                               { showTips?, markSeen?: ["tour:admin", "tip:..."], resetTips? }  (tutorial; `GET /api/me` traz `guides: { showTips, seen }`)
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
- `type` (`CondominiumType`) no `POST` (padrão 1) e opcional no `PUT` (omitido = não muda). Trocar o tipo volta os módulos ao padrão dele. A resposta traz `type`.

### Tipo e módulos do condomínio (#197)
```
GET    /api/condominiums/{condominiumId}/modules        (só Admin)
PUT    /api/condominiums/{condominiumId}/modules        (só Admin)  { enabledModules: ["occurrences", ...] }
```
- Resposta: `{ condominiumId, type, modules: [{ key, label, enabled }] }`. Chaves: `occurrences`, `visitors`, `maintenance`, `documents`, `assemblies`, `reservations`, `agreements`, `expenses`, `rentals` (aluguéis) e `consumption` (leituras de água, luz e gás) — esses dois só vêm ligados em Prédio de aluguel e Os dois. Financeiro, moradores, unidades e avisos não são módulos (sempre ligados).
- `GET /api/me/condominiums` traz `type` e `enabledModules` de cada condomínio (o front esconde o que está desligado).
- Módulo desligado: as rotas dele respondem **403** ("O módulo … está desligado neste condomínio."), para Admin, síndico e morador; a permissão do síndico daquele módulo não vale. Nada é apagado. Exceção: **acordos** desligados só impedem acordo novo (os que existem continuam listados e valendo). Lembretes automáticos de manutenção e de "últimas horas" da assembleia param enquanto o módulo está desligado.

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

- **Categoria e destinatário (#190):** `POST /api/charges` aceita `category` (`ChargeCategory`; sem enviar = 10 Outros; ignorada na mensalidade da plataforma, que fica 1) e `recipientPersonId` (opcional; a pessoa precisa estar vinculada à unidade, senão 400). Toda cobrança traz `category`, `recipientPersonId` e `recipientName` (null = cobrança de todos os vinculados da unidade). `GET /api/condominiums/{id}/charges?category=5` filtra pela categoria.
- **Cobrança dirigida a uma pessoa:** só o destinatário (se tiver conta) vê em `/api/my/charges`, abre `GET /api/charges/{id}`, pede `pix-info`, envia comprovante, paga no Mercado Pago e recebe e-mails/notificações (nova cobrança, lembretes, pagamento). Os outros vinculados da unidade recebem 403. A gestão vê normalmente (com `recipientName`).
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
- Regras: `PUT billing-settings` `{ billingDueDay: 10, lateFeeEnabled: true, finePercent: 2, monthlyInterestPercent: 1, openingBalance?: 15000, openingBalanceMonth?: "2026-10-01" }` (dia 1–31, no mês curto vira o último dia; multa 0–2; juros 0–1 ao mês). A resposta traz também `maxFinePercent` e `maxMonthlyInterestPercent`.
- Lote: `POST .../charges/batch` `{ buildingId?: 3, value: 500, dueDate?: "2026-11-10", description: "Taxa de novembro", category?: 6, unitIds?: [12, 13], unitValues?: [{ unitId: 12, value: 650 }] }`. Sem `buildingId` = todos os prédios (síndico limitado: só os dele). `unitIds` = só essas unidades (ex.: água pela leitura; os valores calculados na tela vão em `unitValues`). Sem `category` = 6 Rateio. Sem `dueDate` = próximo dia `billingDueDay`. Resposta: `{ dueDate, createdCount, totalValue, charges: [...], skipped: [{ unitId, unitNumber, buildingName, reason }] }`.
- Recorrência: `POST .../recurring-charges` `{ buildingId?, value: 500, dueDay?: 10, description, category?, unitId?, recipientPersonId?, unitValues? }` (sem `dueDay` = o do condomínio; síndico limitado precisa escolher o prédio; sem `category` = 1 Taxa de condomínio). Com `unitId` a recorrência é **de uma unidade só** (ex.: aluguel; `buildingId` vira o prédio da unidade e `unitValues` é ignorado) e aceita `recipientPersonId` (vinculado à unidade). Se o destinatário deixar a unidade, o mês é pulado (`skipped`) em vez de cair nos outros moradores. A resposta traz `category`, `unitId`, `unitNumber`, `recipientPersonId` e `recipientName`. As cobranças geradas herdam categoria e destinatário. A rotina gera **10 dias antes** do vencimento, uma vez por unidade e mês. Criar e retomar já geram o mês se estiver dentro da janela (vem em `generation`). Encerrada não volta.

### Contas do mês (#198)
```
GET    /api/condominiums/{condominiumId}/invoices?month=AAAA-MM     (Admin; síndico com acesso ao financeiro)
POST   /api/condominiums/{condominiumId}/invoices/items             (charges.create)
POST   /api/condominiums/{condominiumId}/invoices/send              (charges.create)  { month, chargeIds? }
PUT    /api/invoices/{chargeId}                                     (rascunho)  { dueDate }
DELETE /api/invoices/{chargeId}                                     (rascunho)
PUT    /api/invoice-items/{itemId}                                  (rascunho)  { category, description, amount }
DELETE /api/invoice-items/{itemId}                                  (rascunho; o último item apaga a conta)
```
- A conta do mês é uma **cobrança** com categoria `MonthlyBill` (11) e **itens** (`items: [{ id, category, description, amount }]`); `value` = soma dos itens. Uma por unidade + pagador (`recipientPersonId`) + mês (`referenceMonth`).
- `POST items` `{ unitId, recipientPersonId?, month: "2026-11", category, description, amount }`: entra no rascunho daquele mês (cria se não existir; vencimento = dia de vencimento do condomínio). Itens não podem ser Acordo, Reserva ou Conta do mês.
- Rascunho (`ChargeStatus.Draft` = 6) não aparece em nenhuma outra rota (morador, A receber, inadimplência, lembretes) e não pode ser pago. `send` vira Pendente, copia a regra de multa/juros, avisa no sininho e por e-mail com os itens. Rascunho com vencimento que já passou não é enviado (400).
- Envio automático: `billing-settings` traz `invoiceAutoSendDaysBefore` (null = só manual); no `PUT`, `{ invoiceAutoSend: true, invoiceAutoSendDaysBefore: 10 }` (0–28) ou `{ invoiceAutoSend: false }`. A rotina de hora em hora (a partir das 9h) envia os rascunhos cujo dia chegou.
- `ChargeResponseDto` e o comprovante (`/receipt`) trazem `items`. O balanço divide o pagamento de uma conta do mês entre as categorias dos itens, na proporção de cada um.

### Contratos de aluguel (#199)
```
GET    /api/condominiums/{condominiumId}/rental-contracts     (rentals.manage)
POST   /api/condominiums/{condominiumId}/rental-contracts     (rentals.manage)
PUT    /api/rental-contracts/{id}                             (rentals.manage; não muda unidade, inquilino, início nem valor)
POST   /api/rental-contracts/{id}/adjust                      { newValue }
POST   /api/rental-contracts/{id}/end                         { endDate, reason? }
GET    /api/my/rental-contracts                               (inquilino: contratos ativos dele)
```
- Corpo: `{ unitId, tenantPersonId, monthlyRent, dueDay, startDate: "2026-11-01", endDate?, condominiumBillsPaidBy (1 inquilino, 2 proprietário; padrão 1), includesCondominiumFee, condominiumFeeAmount?, adjustmentIndex, nextAdjustmentDate? }` (`includesWater/Electricity/Gas` ficam por compatibilidade; quem paga água/luz/gás segue `condominiumBillsPaidBy`).
- **Quem vê/paga as contas do condomínio da unidade** (sem `recipientPersonId`): o inquilino quando o contrato ativo diz "inquilino paga" e a conta vence a partir do início do contrato; senão os proprietários; sem proprietário, todos os vinculados (#208). `GET /api/me/condominiums` traz também `hasOwnRentalContracts`. O inquilino precisa estar vinculado à unidade; um contrato ativo por unidade (409).
- Módulo `rentals` (permissão do síndico `rentals.manage`). A rotina de hora em hora (a partir das 9h) põe "Aluguel" (e "Taxa de condomínio", se incluída) no rascunho da conta do mês do inquilino **20 dias antes do vencimento**, uma vez por mês; mês com vencimento já passado é pulado; inquilino que saiu da unidade = mês pulado. Também roda ao cadastrar/editar.
- Reajuste: aviso no sininho para a gestão 30 dias antes de `nextAdjustmentDate`; `adjust` grava o histórico (`valueChanges`) e vale do próximo mês ainda não gerado; a próxima data anda 12 meses.
- `end` com data passada encerra na hora; com data futura, a rotina encerra depois do último mês.

### Água, luz e gás (#200, valor digitado desde #209)
```
GET    /api/condominiums/{condominiumId}/utilities?month=AAAA-MM          (Admin; síndico com financeiro)
POST   /api/condominiums/{condominiumId}/utilities                        (charges.create)  { month, amounts: [{ unitId, category, amount|null }] }
PUT    /api/condominiums/{condominiumId}/utilities/settings               (só Admin)  { utilities: [3, 4] }
GET    /api/my/consumption                                                (morador: R$ dos últimos 12 meses, das unidades que ele paga)
```
- Módulo `consumption`. Sem leitura de relógio nem preço: a gestão digita o valor em R$ de cada unidade (3 Água, 4 Luz, 5 Gás; quais aparecem = `utilities` do condomínio, padrão água e luz).
- Cada valor vira item "Água"/"Luz"/"Gás" no rascunho da conta do mês de quem paga as contas da unidade (#208). Mudar o valor troca o item; `null`/0 tira; depois que a conta sai, o valor trava (400, `isLocked`).

### Taxa de condomínio (#211)
```
GET    /api/condominiums/{condominiumId}/condominium-fee     (qualquer membro ativo)
PUT    /api/condominiums/{condominiumId}/condominium-fee     (só Admin)  { enabled, amount, exceptions: [{ unitId, amount }] }
```
- A taxa do mês é **uma** cobrança fixa do condomínio inteiro (categoria Taxa de condomínio): valor por unidade e exceções (0 = isenta), vencimento no dia do condomínio. Salvar edita a mesma cobrança fixa; `enabled: false` encerra. Novo valor vale para as próximas contas.
- Ajustes → **Financeiro** junta: taxa de condomínio, vencimento/multa/juros, envio das contas, água/luz/gás (o que cobra; `PUT utilities/settings`) e prestação de contas. Recebimento (Mercado Pago, Pix) continua no mesmo Ajustes.

### Lançar cobrança (#209)
```
POST   /api/condominiums/{condominiumId}/invoices/launch                  (charges.create)  { month, category, description, units: [{ unitId, amount }], recipientPersonId? }
```
- Aceita todas as categorias de cobrança comum (taxa, aluguel, água, luz, gás, rateio, multa, outros), aqui e nas rotas de avulsa/lote/fixa (desde 2026-11-15; antes o #209 recusava aluguel e água/luz/gás). `recipientPersonId` só com uma unidade: o item vai só para essa pessoa (ex.: o inquilino). Pelo app, água/luz/gás na conta do mês sem pessoa vão por `POST utilities` (valor do mês da unidade).
- Entra como item na conta do mês de cada unidade (unidade sem ninguém vinculado volta em `skipped`). "Agora, separada" usa as rotas de cobrança avulsa/lote.
- **Cobrança fixa** (antes "recorrência", `recurring-charges`): a rotina põe o item na conta do mês 20 dias antes do vencimento, uma vez por mês e unidade (`ChargeItem.recurringChargeId`); não repete um mês que já teve cobrança solta antiga.
- Envio automático passou a ser o padrão: condomínios sem regra ficaram com 10 dias antes do vencimento.

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

### Acordos de dívida (#192)
```
GET    /api/condominiums/{condominiumId}/agreements
POST   /api/condominiums/{condominiumId}/agreements
GET    /api/agreements/{id}
PUT    /api/agreements/{id}/cancel
GET    /api/my/agreements
```
- Criar e cancelar: permissão `charges.create` (síndico só nas unidades dos prédios dele; Master não). Listar: Admin ou síndico com acesso financeiro (filtra pelos prédios dele). `GET /{id}`: quem pode ler as parcelas (pagadores, Admin, síndico). `/api/my/agreements`: acordos das unidades do usuário (o dirigido a uma pessoa só para ela).
- `POST` body: `{ unitId, recipientPersonId?, chargeIds: [..], discountType (0 nenhum, 1 %, 2 R$), discountValue, downPayment?, downPaymentDueDate?, installmentCount (1–36), firstInstallmentDueDate, breakAfterDaysLate (1–180, padrão 30), notes? }`. Cobranças: da mesma unidade, **atrasadas**, sem comprovante pendente e fora de outro acordo. Desconto só sobre multa+juros de hoje. Entrada < total e vence antes da 1ª parcela; parcelas iguais arredondadas para baixo no centavo, a última leva a diferença; parcela N vence no mesmo dia dos meses seguintes (dia 31 vira o último dia do mês).
- Ao criar: as originais ficam `Renegotiated` (5) e são gravadas em `AgreementCharges` com valor, multa e juros do dia; as parcelas viram cobranças `category = 9` com `agreementId` e `agreementInstallmentNumber` (0 = entrada), regra de multa/juros do condomínio e o mesmo destinatário. Pix/boleto aberto das originais é cancelado. Notificação "Acordo criado" (sem e-mail por parcela).
- Resposta: `{ id, condominiumId, unitId, unitNumber, buildingName, recipientPersonId, recipientName, status, originalAmount, fineAmount, interestAmount, discountType, discountValue, discountAmount, totalAmount, downPayment, installmentCount, installmentDueDay, breakAfterDaysLate, notes, createdAt, endedAt, endReason, paidCount, totalCount, paidAmount, originalCharges: [{ chargeId, description, category, dueDate, value, fineAmount, interestAmount, status }], installments: [{ chargeId, number, value, dueDate, status, daysLate, updatedAmount }] }`.
- Quitado (`2`) na hora em que a última parcela é paga (baixa manual ou Mercado Pago; estorno reabre). Cancelar (`PUT .../cancel`, body `{ reason? }`, só ativo) e quebra (rotina) fazem o mesmo: parcelas em aberto → `Canceled`, originais → `Overdue` (multa/juros contados de novo desde o vencimento original), notificação ao morador. Parcelas já pagas continuam pagas.
- Cobrança `Renegotiated` não aparece na inadimplência, não tem multa/juros nem lembretes e não pode ser paga nem cancelada (400). Parcela de acordo também não pode ser cancelada sozinha (cancele o acordo).

### Inadimplência
```
GET    /api/condominiums/{condominiumId}/delinquency
GET    /api/delinquency/platform
```
- Lista as cobranças vencidas e não pagas: `{ chargeId, scope, condominiumId, targetUserId, unitId, value, fineAmount, interestAmount, updatedAmount, dueDate, daysLate, description, status }`.
- `value` é o valor original; `fineAmount` e `interestAmount` são a multa e os juros de hoje (data de SP, regra gravada na cobrança, mesmo cálculo de `GET /api/charges/{id}`); `updatedAmount = value + fineAmount + interestAmount`. Totais de inadimplência somam `updatedAmount` (total original = soma de `value`).
- Lembretes: o e-mail e a notificação de atraso mostram o valor original e o total de hoje com multa e juros ("R$ 480,00 + multa e juros = R$ 495,68"); o lembrete de vencimento mostra a regra de multa/juros da cobrança, se houver.

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

### Despesas e prestação de contas (balancete)
```
GET    /api/condominiums/{condominiumId}/expense-categories     (expenses.manage)
POST   /api/condominiums/{condominiumId}/expense-categories     (expenses.manage)
PUT    /api/expense-categories/{id}                             (expenses.manage)
DELETE /api/expense-categories/{id}                             (expenses.manage)
GET    /api/condominiums/{condominiumId}/expenses?month=&categoryId=   (expenses.manage)
POST   /api/condominiums/{condominiumId}/expenses               (expenses.manage, multipart)
PUT    /api/expenses/{id}                                       (expenses.manage, multipart)
DELETE /api/expenses/{id}                                       (expenses.manage)
GET    /api/expenses/{id}/receipt                               (qualquer membro ativo)
GET    /api/condominiums/{condominiumId}/monthly-balance?month= (qualquer membro ativo)
```
- **Categorias:** cada condomínio tem a sua lista. As 11 padrão (Água, Luz, Gás, Folha e encargos, Limpeza, Manutenção, Segurança, Administração, Seguros, Impostos e taxas, Outros) são criadas na primeira vez que a lista é pedida e trazem `iconKey` (`water`, `electricity`, `gas`, `payroll`, `cleaning`, `maintenance`, `security`, `administration`, `insurance`, `taxes`, `other`); as criadas pelo condomínio vêm com `iconKey: null`. Item: `{ id, name, iconKey, expenseCount }`. Corpo de criar/renomear: `{ name }` (até 60, nome único no condomínio). Apagar só sem despesas lançadas e nunca a última.
- **Despesa:** `month` = `"AAAA-MM"` (vazio = mês atual de SP), pela data `paidOn`. Não aceita data futura. Síndico limitado a alguns prédios precisa escolher o prédio e só vê/edita as despesas dos prédios dele. Resposta: `{ id, condominiumId, categoryId, categoryName, categoryIconKey, buildingId, buildingName, amount, paidOn, supplier, description, hasReceipt, receiptFileName, receiptSizeBytes, createdByName, createdAt, updatedAt }`. Na edição, um `file` novo troca o comprovante; `removeReceipt=true` remove.
- **Balancete:** `{ condominiumId, month, isDetailed, incomeTotal, income: [{ category, label, total, paymentCount }], expenseTotal, expenses: [{ categoryId, name, iconKey, total, expenseCount, receipts: [{ expenseId, fileName, paidOn }], items }], monthBalance, openingBalance, openingBalanceMonth, previousBalance, accumulatedBalance }`. Entradas = pagamentos das cobranças do condomínio (não as faturas da plataforma) pelo dia do pagamento em SP, agrupados pela `ChargeCategory`; valor pago inclui multa/juros. Morador recebe `isDetailed: false` e `items: null` (só totais e comprovantes); Admin e síndico recebem `items` (as despesas). `previousBalance`/`accumulatedBalance` = saldo inicial + entradas − saídas a partir do mês do saldo inicial; `null` em mês anterior a ele.
- **Saldo inicial:** em `billing-settings` (`openingBalance`, `openingBalanceMonth` = `"AAAA-MM-01"` ou null = desde o começo). No `PUT` são opcionais: sem `openingBalance` o saldo atual fica como está; qualquer dia do mês vira o dia 1.

### Relatórios financeiros (#191)
```
GET /api/condominiums/{condominiumId}/reports/{type}?from=&to=&buildingId=&format=xlsx|pdf
```
- Só Admin e síndico. Tipos: `delinquency` (cobranças vencidas no período ainda em aberto, com multa, juros e dias de atraso de hoje; síndico precisa de `delinquency.view`), `receipts` (pagamentos no período por categoria e forma; a conta do mês é dividida pelas categorias dos itens; síndico precisa de acesso ao financeiro), `expenses` (despesas com categoria e fornecedor; `expenses.manage`) e `balance` (entradas, saídas e saldo de cada mês; síndico precisa dos dois). `expenses` e `balance` exigem o módulo `expenses` ligado (403).
- `from`/`to` = datas inclusivas `AAAA-MM-DD` (sem datas = mês atual de SP; máximo 10 anos). `buildingId` opcional, do condomínio e dos prédios do síndico; sem ele, síndico com prédios limitados recebe só os prédios dele (despesas gerais do condomínio ficam de fora).
- Resposta: arquivo (`.xlsx` ou `application/pdf`). Pagamentos pela data em SP.

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

### Contatos da landing (leads)
```
POST   /api/public/contacts
GET    /api/landing-contacts?status=
PATCH  /api/landing-contacts/{id}/status
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

### Reservas de áreas comuns
```
GET    /api/common-areas/{id}/availability
DELETE /api/common-areas/{id}
PUT    /api/common-areas/{id}
DELETE /api/common-areas/{id}/photo
GET    /api/common-areas/{id}/photo
PUT    /api/common-areas/{id}/photo
GET    /api/condominiums/{condominiumId}/common-areas
POST   /api/condominiums/{condominiumId}/common-areas
GET    /api/condominiums/{condominiumId}/common-areas/bookable
GET    /api/condominiums/{condominiumId}/my-reservations
GET    /api/condominiums/{condominiumId}/reservations
POST   /api/condominiums/{condominiumId}/reservations
POST   /api/reservations/{id}/approve
POST   /api/reservations/{id}/cancel
POST   /api/reservations/{id}/reject
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
- `RentAdjustmentIndex`: 1 Ipca, 2 Igpm, 3 Agreed (valor combinado), 4 None; `RentalContractStatus`: 1 Active, 2 Ended
- `CondominiumType`: 1 Residential (todos os módulos), 2 Rental (prédio de aluguel: sem assembleias), 3 Mixed (todos)
- `ChargeCategory`: 1 CondominiumFee (Taxa de condomínio), 2 Rent (Aluguel), 3 Water (Água), 4 Electricity (Luz), 5 Gas (Gás), 6 Apportionment (Rateio), 7 Fine (Multa), 8 Reservation (Reserva), 9 Agreement (Acordo), 10 Other (Outros), 11 MonthlyBill (Conta do mês, com itens)
- `ChargeStatus`: 1 Pending, 2 Paid, 3 Overdue, 4 Canceled, 5 Renegotiated (dentro de um acordo), 6 Draft (conta do mês ainda não enviada)
- `AgreementStatus`: 1 Active, 2 Completed (quitado), 3 Broken (quebrado), 4 Canceled; `AgreementDiscountType`: 0 None, 1 Percent, 2 Amount
- `RecurringChargeStatus`: 1 Active, 2 Paused, 3 Ended
- `DocumentCategory`: 1 Convention, 2 InternalRules, 3 Minutes, 4 Financial, 5 Contract, 6 Other
- `DocumentVisibility`: 1 Everyone, 2 ManagementOnly
- `FinancialAccountScope`: 1 Platform, 2 Condominium
- `InvitationStatus`: 1 Pending, 2 Accepted, 3 Refused, 4 Expired, 5 Canceled
- `LandingContactProfileType`: 1 Administrator (administrador/administradora), 2 Syndic (síndico)
- `LandingContactStatus`: 1 New (Novo), 2 InConversation (Em conversa), 3 Closed (Fechado), 4 NotInterested (Sem interesse)
- `MaintenanceCategory`: 1 Elevator, 2 FireSafety, 3 WaterTank, 4 PestControl, 5 Electrical, 6 Equipment, 7 Structure, 8 Pool, 9 Other
- `MaintenanceStatus`: 1 UpToDate, 2 DueSoon, 3 Overdue
- `NewsScope`: 1 Condominium, 2 Platform
- `NewsTargetAudience`: 1 Everyone, 2 Admins, 3 Syndics, 4 Residents, 5 Doormen
- `NotificationType`: 1 System, 2 Invitation, 3 Charge, 4 Payment, 5 Access, 6 News, 7 Occurrence, 8 Reservation
- `OccurrencePriority`: 1 Low, 2 Medium, 3 High, 4 Urgent
- `OccurrenceStatus`: 1 Open, 2 InProgress, 3 Resolved, 4 Canceled
- `OccurrenceType`: 1 Maintenance, 2 Security, 3 Cleaning, 4 Noise, 5 CommonArea, 6 Other
- `PaymentMethod`: 1 Pix, 2 CreditCard, 3 DebitCard, 4 BankSlip, 5 BankTransfer, 6 AccountBalance, 7 PrepaidCard, 8 DigitalWallet, 9 Other
- `PaymentProofStatus`: 1 Pending, 2 Accepted, 3 Rejected
- `PaymentSource`: 1 Manual, 2 MercadoPago
- `PixKeyType`: 1 Cpf, 2 Cnpj, 3 Email, 4 Phone, 5 Random
- `ReservationStatus`: 1 Pending, 2 Approved, 3 Rejected, 4 Canceled
- `Priority`: 1 High, 2 Normal, 3 Low
- `Status`: 1 Active, 2 Inactive
- `UnitRelationshipType`: 1 Owner, 2 Resident, 3 Tenant
- `UnitType`: 1 Apartment, 2 House, 3 CommercialRoom, 4 Store, 5 Garage, 6 Penthouse
- `UserCondominiumStatus`: 1 Active, 2 Suspended
- `UserRole`: 1 Master, 2 Admin, 3 Syndic, 4 Resident
- `VisitStatus`: 1 Active, 2 Canceled
- `VisitorType`: 1 Visitor, 2 ServiceProvider, 3 HouseholdStaff, 4 Other

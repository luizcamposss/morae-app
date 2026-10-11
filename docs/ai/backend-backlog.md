# Backend — o que ainda falta

Lista do que falta no backend do Moraê (atualizada em 2026-10-10). Cada item segue o fluxo do `CLAUDE.md`: explicar → o Luiz decide → partes pequenas → testar → commit.

Itens marcados com **(decidir)** estão hoje na lista "Ficou de fora" do `decisions.md`: só entram quando o Luiz aprovar.

## 1. Obrigatório antes de lançar

| # | Item | O que fazer |
|---|---|---|
| 1.1 | **Contatos da landing (leads)** | Rota pública com rate limit que grava nome, WhatsApp, nº de unidades, perfil (administrador/síndico) e a dor escolhida no hero. E-mail para o Master a cada contato novo. O Master lista os contatos e muda o status (Novo, Em conversa, Fechado, Sem interesse). Ver tarefa T8 no `frontend-plan.md`. |
| 1.2 | **WhatsApp comercial em configuração** | O número do dono do app vira configuração, lida pela landing e pelo login (botão "Chamar no WhatsApp"). |
| 1.3 | **Importação por planilha** | CSV/XLSX com unidades, moradores, vínculos e cobranças em aberto, mais um modelo para baixar. O sistema mostra uma prévia com erros por linha e só grava quando o Admin confirma; no fim, relatório do que entrou. Ver tarefa L no `frontend-plan.md`. |
| 1.4 | **Deploy (G)** | Docker Compose (api, web, mysql) na VPS, um bloco novo no Caddy sem mexer no site que já existe, volumes e backup, e credenciais de produção do Mercado Pago e do Resend. Ver "Deploy" no `decisions.md`. |

## 2. Pedido pelas telas novas do Figma

| # | Tela | O que falta | Sugestão |
|---|---|---|---|
| 2.1 | Abrir ocorrência | Anexar **fotos** (hoje `CreateOccurrenceDto` não aceita arquivo) | Reaproveitar `IFileStorage` e `UploadedFileInspector` dos Documentos (só imagens, limite de tamanho). |
| 2.2 | Ocorrências | **Resposta da administração** (hoje só muda o status) | Campo de resposta/comentário da gestão, com aviso no sininho para quem abriu. |
| 2.3 | Comprovante | Botão "Baixar PDF" (hoje `GET /api/charges/{id}/receipt` devolve só os dados) | Gerar o PDF no navegador. **Não precisa de backend.** |

Já resolvido, sem backend novo: a tela "Acesso pausado" usa `isSuspended` e `isCondominiumInactive` de `GET /api/me`.

Ajustes que serão feitos no desenho, não no backend:
- Avisar visita: usar os tipos reais (Visitante, Prestador, Funcionário doméstico, Outro) e tirar "você recebe um aviso quando ela chegar", porque não há registro de entrada.
- Ocorrência: usar as categorias reais (Manutenção, Segurança, Limpeza, Barulho, Área comum, Outro).

## 3. O que o mercado tem e o Moraê ainda não

### 🔴 Prioridade alta: o cliente sente falta no primeiro mês

| # | Recurso | Hoje | O que fazer |
|---|---|---|---|
| 3.1 | **Cobrança em lote e recorrente** (decidir) | `POST /api/charges` cria **uma** cobrança para **uma** unidade: 60 unidades = 60 cobranças à mão por mês | Gerar a taxa do mês para todas as unidades (ou por prédio) de uma vez, e a opção de gerar sozinho todo mês na rotina de hora em hora. |
| 3.2 | **Multa e juros automáticos** (decidir) | O valor atrasado continua o mesmo | Configurar por condomínio (multa de até 2% e juros de até 1% ao mês, conforme o Código Civil) e calcular o valor atualizado no pagamento. |
| 3.3 | **Prestação de contas** (decidir) | Só existe o upload de PDF em Documentos | Lançar despesas por categoria e montar o balancete mensal (entradas × saídas) que o morador pode ver. |
| 3.4 | **Relatórios e exportação** (decidir) | Nada | Inadimplência, recebimentos e despesas em Excel/PDF. |
| 3.5 | **Reservas de áreas comuns** (decidir) | Nada | Áreas (salão, churrasqueira), regras (antecedência, taxa, limite), agenda e aprovação pela gestão. |

### 🟡 Prioridade média: ajuda a fechar contratos

| # | Recurso |
|---|---|
| 3.6 | Encomendas: a gestão/portaria registra e o morador é avisado (decidir) |
| 3.7 | Portaria completa: papel de porteiro, registro de entrada e saída, QR code de visitante (decidir) |
| 3.8 | Acordos e parcelamento de dívidas (decidir) |
| 3.9 | Notificação push no celular (PWA Web Push), além do sininho e do e-mail |
| 3.10 | Enquetes rápidas, fora de assembleia |
| 3.11 | Cadastro de veículos e pets (decidir) |
| 3.12 | Ligar/desligar módulos por condomínio (decidir) |
| 3.13 | "Reenviar e-mail" de convite ainda válido (decidir) |

### ⚪ Não vale a pena agora

Garantia de receita (pagar o condomínio mesmo com inadimplência), conta digital própria, app nas lojas, integração com contabilidade, rateio e voto por fração ideal.

## Ordem sugerida

1. **Antes do frontend:** 3.1 e 3.2. O financeiro é o principal argumento de venda e fica incompleto sem eles.
2. **Junto com o frontend:** 1.1, 1.2, 2.1 e 2.2.
3. **Antes de lançar:** 1.3 e 1.4.
4. **Depois do lançamento:** 3.3, 3.4, 3.5 e o resto, conforme os primeiros clientes pedirem.

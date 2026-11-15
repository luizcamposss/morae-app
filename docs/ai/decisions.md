# Moraê — decisões de produto

Decisões já tomadas com o Luiz. Siga sem perguntar de novo; se algo novo contradizer uma delas, pergunte antes.

## Papéis e permissões

- 4 papéis: **Master, Admin, Síndico, Morador**. Papel por condomínio.
- Master: plataforma (condomínios, Admins, cobranças da plataforma). Não vê dados internos do condomínio.
- Síndico: permissões ligadas pelo Admin. Um **síndico novo nasce com todas as permissões** e gerenciando **todos os prédios** (padrão do mercado). O Admin restringe (subsíndico, síndico de bloco). Síndico paga só as cobranças da própria unidade.
- Permissões do síndico (`AppPermissions`): `residents.view`, `news.create`, `news.edit`, `charges.create`, `charges.mark_as_paid`, `delinquency.view`, `occurrences.manage`, `documents.manage`, `maintenance.manage`, `visitors.manage`, `assemblies.manage`, `reservations.manage`, `expenses.manage`, `rentals.manage`.
- Condomínio **inativo** bloqueia Admin, síndico e morador (o login funciona; as cobranças da plataforma continuam visíveis e pagáveis pelo Admin).
- Não existe papel de porteiro/funcionário. Foi discutido e **adiado**: por agora não há registro de entrada/saída.

## Pagamentos (Mercado Pago)

- Cobranças da **plataforma** → conta MP do Master. Cobranças do **condomínio** → uma conta MP por condomínio, conectada por um Admin. Sem split.
- **Checkout transparente** (Payment Brick dentro do Moraê), não redirecionamento. Métodos: Pix, cartão de crédito (**só 1x**), débito, boleto.
- Comprovante de pagamento, estorno pelo Master/Admin, webhook com validação de assinatura, aviso de pagamento em duplicidade (uma vez só).

## Login e sessão

- Bloqueio por 15 min após 5 senhas erradas. Senha: 8+ caracteres, com letra e número.
- Sessão: JWT de 15 min + refresh token de 7 dias em cookie HttpOnly (rotação e detecção de reuso). Sessão expirada → `/login?expired=1`.
- "Esqueci minha senha": link válido por **1 hora**, uso único, sem o e-mail na URL. Resposta sempre neutra. Trocar/redefinir senha derruba as outras sessões e envia o e-mail "senha alterada".

## E-mail

- Resend, remetente `nao-responda@morae.synergylab.tech`.
- Enviados: convite (criar/renovar, inclusive no cadastro de condomínio pelo Master), esqueci a senha, senha alterada, nova cobrança, pagamento confirmado (recibo), lembretes de cobrança, lembretes de manutenção (resumo diário por pessoa), convocação/cancelamento/últimas horas de assembleia.
- A chave **"Lembretes de boletos"** (`BillsEnabled`) controla os avisos de cobrança no sininho e no e-mail. O **recibo de pagamento vai sempre**.

## Rotinas automáticas (de hora em hora)

- Cobrança pendente vencida → **Atrasado**.
- Acordos (#192): quita os totalmente pagos e quebra os que têm parcela com atraso acima do limite do acordo.
- Cobranças recorrentes: gera o mês 10 dias antes do vencimento (a partir das 9h de SP, junto com os lembretes).
- Lembrete de cobrança: até **3 dias antes** e **1 dia depois** de vencer (só para vencidas há até 3 dias, para não mandar e-mail de dívidas antigas). Cobrança criada hoje não recebe lembrete hoje.
- Convites vencidos → Expirado. Limpeza: sessões vencidas, tentativas de conexão do MP, notificações **lidas** com mais de 90 dias, visitas com mais de 12 meses (LGPD).

## Documentos (H)

- Arquivos numa pasta da VPS (`Storage__LocalPath`, volume no deploy, entra no backup). Código preparado para trocar por S3/R2 depois.
- Quem publica: Admin e síndico com `documents.manage`. Visibilidade por documento: **todos do condomínio** ou **só a gestão**.
- Tipos: PDF, JPG, PNG, Word (.docx), Excel (.xlsx), até **20 MB**, conferidos pelo conteúdo real. Download só pela API (sem link público).
- Aviso de documento novo: só no sininho.

## Manutenção preventiva (I)

- Só a gestão usa (Admin e síndico com `maintenance.manage`, limitado aos prédios dele). Moradores não veem a agenda.
- Próxima data calculada **a partir do dia em que foi feita**. Registrar execução antiga não mexe na agenda; apagar o último registro desfaz.
- Lembretes: **30 dias antes, 7 dias antes e depois de vencer**, por sininho e e-mail-resumo (sempre enviado: obrigação legal).
- Botão "manutenções comuns" (elevador só se algum prédio tiver elevador).

## Visitantes (J)

- Morador avisa visitas previstas (únicas ou recorrentes, até 1 ano); a gestão (Admin e síndico com `visitors.manage`) vê a agenda. A gestão também cadastra visitas do próprio condomínio (sem unidade).
- Documento: só os **4 últimos dígitos**. Cancelar não apaga (fica no histórico). Visitas apagadas 12 meses depois de terminarem.
- Sem QR code e sem portaria por enquanto.

## Assembleias e votações (K)

- Organiza: Admin e síndico com `assemblies.manage`. Rascunho → publicar (convocação por sininho e e-mail para todos) → votação → encerramento automático → resultado → ata ligada a um documento.
- Quem vota: escolha por assembleia — **só proprietários** (padrão) ou proprietários e moradores. **Um voto por unidade.** Unidade com cobrança **atrasada não vota** (Código Civil, art. 1.335). Pode mudar o voto até fechar.
- Voto aberto por padrão; **secreto** opcional por pauta. "Abstenção" automática em toda pauta (conta participação, nunca aprova).
- Quóruns: maioria dos votos, maioria absoluta das unidades, 2/3 das unidades, unanimidade. Base = unidades em dia no encerramento (congelada). Múltipla escolha: vence a mais votada; empate = sem decisão.
- Durante a votação ninguém vê parcial; a gestão vê só a participação. Lembrete "últimas horas" a menos de 24 h do fim.

## Landing page e migração

- A landing capta clientes (o Moraê é entregue pronto para vender). CTA principal **"Ver o Moraê funcionando"** (formulário de 4 campos: nome, WhatsApp, nº de unidades, administrador/síndico), secundário **WhatsApp**. Sem calculadora (removida em out/2026: não fazia sentido). Os contatos são gravados no backend e o Master é avisado por e-mail.
- **Assinatura da landing: hero com seletor de dor** — "O que mais te tira o sono no condomínio?" com 5 opções (inadimplência, avisos no WhatsApp, sistema antigo, assembleia vazia, medo de migrar); cada uma troca título, número de prova e a tela do produto; abre na inadimplência; a dor escolhida vai junto no formulário de contato. O seletor **mantém as 5 dores**, mesmo com 4 capítulos (decisão do Luiz, out/2026); a opção "medo de migrar" não pode prometer a importação antes de ela existir.
- **Landing enxuta (out/2026):** pouco texto; em 5 segundos o visitante entende que é gestão de condomínio. Cada seção tem título + 1 frase + uma tela real do produto. Ordem: hero → barra de capítulos (**Receber, Avisar, Decidir, Cuidar**) → segurança do dinheiro → perguntas frequentes → CTA final → rodapé. Menu: Cobranças, Avisos, Assembleias, Dia a dia, Dúvidas, Entrar + botão "Ver funcionando". Saíram: intro "Um mês no condomínio", capítulo "Sistema antigo" (vira o tom da página), capítulo de migração (até a importação existir), faixa de garantias e calculadora.
- **Tour + coleta (out/2026):** o botão "Ver o Moraê funcionando" abre um **tour animado** (60–90 s, telas reais em movimento, começando pela dor escolhida). A última cena é o **formulário** (nome, WhatsApp, nº de unidades, administrador/síndico + a dor), gravado no backend (item 1.1 do backlog) com e-mail para o Master, que chama a pessoa no WhatsApp. O mesmo formulário fica no fim da página. Enquanto o tour não existir, o botão leva direto ao formulário.
- **Capítulos com provas:** cada capítulo tem título + 1 frase + 3 etiquetas com fatos reais do produto. Seção "Como começar em 3 passos" antes do FAQ. Painéis com motion (grade ficando verde, aviso chegando, barra de votação enchendo).
- **Taxas:** o Moraê não cobra por pagamento. Só existem as taxas do Mercado Pago (descontadas na conta do condomínio) e a mensalidade do Moraê. Pode ser dito no FAQ.
- **Migração:** construir **importação por planilha** (unidades, moradores e vínculos, cobranças em aberto) com prévia e erros antes de gravar. Sem migração assistida e sem exportação completa por agora.

## Financeiro novo (aprovado em out/2026)

- **Cobrança em lote e recorrente** (backlog 3.1): gerar a taxa do mês para todas as unidades (ou por prédio) de uma vez, e a opção de gerar sozinho todo mês.
- **Multa e juros** (backlog 3.2): configuráveis por condomínio, multa de até 2% e juros de até 1% ao mês (Código Civil), com o valor atualizado no pagamento.
- **Lote:** mesmo valor para todas as unidades (do condomínio ou de um prédio), com a opção de ajustar o valor de unidades específicas antes de gerar.
- **Vencimento:** dia fixo configurado no condomínio (padrão dia 10; no mês curto vira o último dia), que pode ser trocado em cada lote/recorrência.
- **Unidade sem morador:** cobra do proprietário (a cobrança é da unidade). Unidade sem ninguém vinculado é pulada e volta na lista `skipped`.
- **Recorrência:** a rotina de hora em hora gera sozinha todo mês, **10 dias antes do vencimento**, sem duplicar (uma por recorrência, unidade e mês), até a gestão pausar ou encerrar. Nunca gera mês com vencimento já passado. Unidades novas entram no mês seguinte.
- **Multa:** até 2% (teto do Código Civil); o Admin pode configurar menos, nunca mais. **Juros:** até 1% ao mês, pro rata por dia de atraso (1/30 por dia), sobre o valor original.
- Multa/juros valem **só para cobranças criadas depois** que a regra for ligada (a cobrança guarda uma cópia das taxas). **Desligado por padrão**; só o Admin liga nos ajustes do condomínio (e só ele muda o dia de vencimento).
- O valor atualizado é o cobrado no Mercado Pago. Pix/boleto gerado num dia anterior continua válido (é aceito entre o valor original e o atualizado de hoje), mas a tela de pagamento passa a oferecer um novo com o valor do dia. No pagamento manual, a gestão pode perdoar multa/juros (aceita do valor original até o atualizado).
- **Categorias (#190):** toda cobrança tem categoria: Taxa de condomínio, Aluguel, Água, Luz, Gás, Rateio, Multa, Reserva, Acordo, Outros. As antigas, as importadas por planilha e as mensalidades da plataforma ficam "Taxa de condomínio" (na plataforma a categoria não é usada). Padrões quando não vem: avulsa = Outros, lote = Rateio, recorrência = Taxa de condomínio.
- **Cobrança para uma pessoa (#190):** a cobrança pode ter um destinatário vinculado à unidade (ex.: aluguel só para o inquilino, caso do Admin que também é dono do imóvel). Só ele vê, paga e recebe e-mail/notificação; sem destinatário, vale para todos os vinculados. O dinheiro vai para a conta do condomínio, com multa/juros e comprovante como as outras. Na recorrência, o destinatário só existe na recorrência de **uma unidade**; se ele sair da unidade, o mês é pulado.
- **"Nova cobrança" em 3 passos (#190):** o que cobrar (categoria) → de quem (uma unidade, com opção de uma pessoa; ou várias: condomínio, prédio ou unidades escolhidas) → quanto e quando (mesmo valor, valor por unidade, ou leitura de água/luz/gás com R$ por m³/kWh e taxa mínima, calculado na tela e enviado como valor por unidade; as leituras não são guardadas). "Repetir todo mês" vira recorrência (não vale para leitura nem para unidades escolhidas a dedo).
- Criar lote/recorrência, pausar e encerrar = permissão `charges.create` (síndico limitado só nos prédios dele).
- **Acordos de dívida (#192):** a gestão (`charges.create`) junta cobranças **atrasadas** de uma unidade num acordo: desconto opcional só na multa/juros (em % ou R$), entrada opcional e 1–36 parcelas mensais (categoria Acordo). As originais ficam "Renegociada": continuam no histórico, saem da inadimplência e param multa, juros e lembretes. Quitado quando todas as parcelas são pagas. **Quebra:** parcela com mais de X dias de atraso (padrão 30, escolhido no acordo) → a rotina de hora em hora cancela as parcelas em aberto e devolve as originais como atrasadas, com multa/juros desde o vencimento original; cancelar o acordo à mão faz o mesmo. Parcelas já pagas não são abatidas das originais (a gestão ajusta, se precisar). Morador é avisado ao criar, quebrar e cancelar.
- **Assembleia e acordo:** quem está em dia com um acordo **ativo** vota (as renegociadas não contam como atraso); parcela de acordo atrasada bloqueia como qualquer cobrança atrasada; acordo quebrado devolve as originais ao atraso.

## Reservas de áreas comuns (#189)

- Gestão = Admin e síndico com `reservations.manage` (síndico limitado: áreas do condomínio todo e dos prédios dele). Área pode ser de um prédio só (só as unidades dele reservam).
- Regras por área: **turnos** (ex.: Almoço 11h–16h, Noite 18h–23h, até 6, sem sobrepor) **ou dia inteiro**, antecedência mínima e máxima (dias), limite por unidade por mês (conta pendentes e aprovadas), precisa de aprovação (sim/não), taxa, prazo para cancelar sem custo e termos de uso (o morador precisa aceitar).
- Quem reserva: qualquer pessoa vinculada à unidade. Sem conflito: um turno (ou dia) só tem uma reserva pendente/aprovada; recusada ou cancelada libera o horário.
- **Taxa vira cobrança avulsa da unidade**, categoria Reserva, ao aprovar (ou na criação, se a área não exige aprovação), com vencimento no dia da reserva.
- Recusar exige motivo. Cancelar: a gestão cancela qualquer reserva futura e a taxa em aberto; o morador cancela a dele, e a taxa só é cancelada até o prazo sem custo (depois do prazo ela continua). Taxa já paga não é estornada pelo sistema.
- Sininho: gestão ao pedir (e quando o morador cancela uma aprovada); morador ao aprovar, recusar ou a gestão cancelar. As reservas aprovadas aparecem na Agenda do condomínio.
- Áreas com reserva no histórico não se apagam: desative. Turno com reserva futura não pode ser removido.

## Tipo do condomínio e módulos (#197)

- O Master escolhe o **tipo** ao criar o condomínio: Condomínio residencial, Prédio de aluguel ou Os dois (misto). O tipo só define os módulos que vêm ligados; trocar o tipo volta os módulos ao padrão dele. O Master continua sem ver dados de dentro.
- O **Admin** liga e desliga módulos em Ajustes → Módulos: ocorrências, visitantes, manutenção, documentos, assembleias, reservas, acordos, despesas e prestação de contas. Financeiro, moradores, unidades e avisos ficam sempre ligados.
- Desligado: some do menu de todos (Admin, síndico, morador), da tela inicial e da agenda; a API recusa as rotas; a permissão do síndico daquele módulo some dos Ajustes. **Nada é apagado.** Acordos desligados só impedem acordo novo.
- Prédio de aluguel nasce sem assembleias. Aluguéis e consumo de água/luz/gás entram como módulos nas issues #199 e #200.
- Condomínios que já existiam viraram Residencial com tudo ligado.

## Contas do mês e Financeiro unificado (#198)

- **Conta do mês:** uma cobrança por unidade, pagador e mês, feita de itens (aluguel, água, luz, gás, taxa, rateio, multa, outros), paga com um Pix/pagamento só e um comprovante com os itens. Multa e juros correm sobre o total. Sem pagamento parcial.
- Nasce em **rascunho** (o morador não vê). A gestão monta, muda o vencimento, tira itens e clica em **Enviar contas**; ou liga o **envio automático** X dias antes do vencimento (Admin). Rascunho vencido não sai: precisa de novo vencimento. Depois de enviada a conta não muda; se precisar, cancela em A receber.
- Por enquanto o único recebedor é o condomínio. Contratos de aluguel (#199) e leituras (#200) vão colocar itens sozinhos no rascunho.
- **Menu:** Admin e síndico têm um item **Financeiro** com as abas Contas do mês · A receber · Despesas · Balanço (endereços antigos redirecionam). O morador tem **Minhas contas** (antes "Boletos"), com a prestação de contas como link no fim e o botão **Pagar tudo** quando há mais de uma conta em aberto (um pagamento depois do outro).

## Contrato de aluguel (#199)

- Módulo **Aluguéis** (ligado em Prédio de aluguel e Os dois). Admin e síndico com `rentals.manage` cadastram: unidade, inquilino (vinculado à unidade), valor, dia de vencimento, início, fim opcional, o que entra na conta do inquilino (água, luz, gás pela leitura; taxa de condomínio com valor fixo) e reajuste anual (IPCA, IGP-M, valor combinado ou sem reajuste).
- O aluguel entra sozinho no **rascunho da conta do mês** do inquilino 20 dias antes de vencer; mês já vencido não é gerado (a gestão lança à mão, se quiser). Um contrato ativo por unidade.
- Reajuste: a gestão é avisada 30 dias antes e digita o novo valor; o histórico fica guardado e o valor novo vale do próximo mês ainda não gerado. Sem busca automática do índice.
- Encerrar: para de gerar depois do mês do fim; contas já geradas ficam. O inquilino vê o resumo do contrato em Minha unidade. Atalho "Alugar esta unidade" na ficha da unidade.

## Consumo individual (#200)

- Módulo **Consumo** (ligado em Prédio de aluguel e Os dois). O Admin configura preço por m³ (água, gás) ou kWh (luz) e um mínimo mensal opcional.
- **Leituras do mês:** uma linha por unidade com a anterior já preenchida; a gestão (charges.create) digita só a atual. Aviso de consumo acima de 2× a média recente; leitura menor que a anterior não salva. Leituras ficam guardadas.
- O valor entra na conta do mês do inquilino quando o contrato inclui aquela conta; senão, na conta da unidade. Correção só enquanto a conta é rascunho.
- O morador vê o gráfico dos últimos 12 meses em Minhas contas. O "Nova cobrança" continua com o cálculo por leitura digitada (não usa as leituras guardadas).

## Relatórios financeiros (#191)

- Aba **Relatórios** no Financeiro (Admin e síndico): inadimplência, recebimentos, despesas e balanço mensal em Excel (.xlsx) ou PDF, por intervalo de datas, com filtro opcional por prédio.
- Síndico vê só os prédios dele. Inadimplência exige `delinquency.view`; recebimentos, acesso ao financeiro; despesas, `expenses.manage`; balanço, os dois. Despesas e balanço exigem o módulo Despesas ligado (para o Admin também).
- Recebimentos dividem a conta do mês pelas categorias dos itens (mesma regra do balanço).
- PDF com QuestPDF (licença Community: grátis para empresas com receita anual bruta abaixo de US$ 1 milhão; acima disso, licença paga). Excel com ClosedXML (MIT).

## Proprietário recebe o aluguel (#201)

- Condomínio com Aluguéis ligado: o proprietário de uma unidade aluga em **Meus aluguéis** (área do morador) e recebe na **própria conta Mercado Pago**. Só o proprietário cria, edita, reajusta e encerra esses contratos.
- A conta do aluguel é separada da conta do condomínio (nunca mistura recebedores) e sai para o inquilino 10 dias antes do vencimento, quando a conta do proprietário está conectada; sem conta, espera. **Sem multa e juros automáticos.** Pagamento só pelo app (não usa a chave Pix do condomínio). Taxa de condomínio não entra no aluguel do proprietário; água/luz/gás pela leitura vão numa conta do condomínio para o inquilino.
- A gestão só vê que a unidade está alugada e por quem; nenhum valor. O aluguel do proprietário não entra em inadimplência, balanço, relatórios nem acordos, e não bloqueia o voto em assembleia.

## Financeiro único (#208–#212)

- Regras: tudo o que se paga é uma **conta**; toda conta diz quem paga e quem recebe; ninguém vê conta que não é para pagar; o sistema faz o trabalho repetitivo.
- **Quem paga as contas do condomínio de uma unidade** (taxa, água, luz, rateio…; regra única em `Services/Charges/UnitPayers.cs`): alugada com "inquilino paga" (padrão do contrato) → o **inquilino**, para contas que vencem **a partir do início do contrato** (dívidas antigas ficam com o proprietário); senão → os **proprietários**; sem proprietário cadastrado → todos os vinculados. O proprietário nunca paga aluguel. Vale para Minhas contas, sininho, e-mail, pagamento e acordos.
- Itens do condomínio de uma unidade cujo inquilino paga entram na mesma conta do aluguel quando o condomínio também recebe o aluguel (um Pix só).
- **Minhas contas**: "A pagar agora" + Pagar tudo, contas abertas com itens e para quem, pagas recolhidas, consumo e prestação de contas no fim. **Meus aluguéis** só aparece no menu de quem tem contrato; para começar, "Alugar este apartamento" em Minha unidade.
- Decidido também: reserva e parcela de acordo continuam **separadas** da conta do mês; envio automático é o padrão (10 dias antes; a gestão pode voltar para "só quando clicar").
- **Ajustes → Financeiro (#211):** uma página para o dinheiro: taxa de condomínio (só ela, como cobrança fixa: valor por unidade com exceções, 0 = isenta), vencimento/multa/juros, envio das contas, água/luz/gás e prestação de contas. O que o condomínio cobra de água/luz/gás é escolhido só aqui.
- **Um jeito só para cobrar (#209):** aluguel só pelo contrato; água, luz e gás só na tela **Água, luz e gás**, com **valor digitado em R$** (sem leitura de relógio nem preço por m³/kWh); taxa, rateio, multa e outros pelo **Lançar cobrança** — na conta do mês (padrão) ou "agora, separada"; a taxa do mês é uma **cobrança fixa** que entra sozinha na conta de cada mês. O gráfico do morador mostra R$ por mês.

## Ficou de fora (não implementar sem o Luiz pedir)

Encomendas, veículos/pets, papel de porteiro/funcionário, registro de entrada/saída, QR code de visitante, voto por fração ideal, "reenviar e-mail" de convite ainda válido.

## Deploy (G, ainda não feito)

- VPS do Luiz (Hostinger), IP `187.77.59.219`, que já roda **Caddy** servindo outro site. Moraê em `https://morae.synergylab.tech` (DNS já aponta). Adicionar um bloco no Caddy **sem mexer** no site existente.
- Docker Compose (api, web, mysql), volumes para MySQL, chaves do DataProtection e arquivos (`Storage__LocalPath`), backup. Credenciais de **produção** do Mercado Pago e do Resend na hora do deploy.

## Despesas e prestação de contas (balancete)

- Admin e síndico com `expenses.manage` lançam as despesas **já pagas** (categoria, valor, data do pagamento, fornecedor e prédio opcionais, descrição, comprovante PDF/JPG/PNG até 20 MB). Lançar é simples, no estilo do "Nova cobrança". "Repetir todo mês" fica para depois.
- Categorias de despesa padrão por condomínio (criadas sob demanda), e o condomínio pode acrescentar e renomear as suas (nos Ajustes ou ao lançar).
- Balancete do mês: entradas = pagamentos recebidos no mês (pela data do pagamento, fuso de SP), por categoria da cobrança; saídas = despesas por categoria; saldo do mês e saldo acumulado a partir de um **saldo inicial** opcional (Admin, nos Ajustes).
- Morador vê o balancete com **totais por categoria e os comprovantes**, não a lista de cada despesa. Gestão vê tudo. Ver o balancete: qualquer membro ativo.

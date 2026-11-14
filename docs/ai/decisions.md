# Moraê — decisões de produto

Decisões já tomadas com o Luiz. Siga sem perguntar de novo; se algo novo contradizer uma delas, pergunte antes.

## Papéis e permissões

- 4 papéis: **Master, Admin, Síndico, Morador**. Papel por condomínio.
- Master: plataforma (condomínios, Admins, cobranças da plataforma). Não vê dados internos do condomínio.
- Síndico: permissões ligadas pelo Admin. Um **síndico novo nasce com todas as permissões** e gerenciando **todos os prédios** (padrão do mercado). O Admin restringe (subsíndico, síndico de bloco). Síndico paga só as cobranças da própria unidade.
- Permissões do síndico (`AppPermissions`): `residents.view`, `news.create`, `news.edit`, `charges.create`, `charges.mark_as_paid`, `delinquency.view`, `occurrences.manage`, `documents.manage`, `maintenance.manage`, `visitors.manage`, `assemblies.manage`, `reservations.manage`, `expenses.manage`.
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

## Ficou de fora (não implementar sem o Luiz pedir)

Encomendas, veículos/pets, relatórios, papel de porteiro/funcionário, registro de entrada/saída, QR code de visitante, ligar/desligar módulos por condomínio, voto por fração ideal, "reenviar e-mail" de convite ainda válido.

## Deploy (G, ainda não feito)

- VPS do Luiz (Hostinger), IP `187.77.59.219`, que já roda **Caddy** servindo outro site. Moraê em `https://morae.synergylab.tech` (DNS já aponta). Adicionar um bloco no Caddy **sem mexer** no site existente.
- Docker Compose (api, web, mysql), volumes para MySQL, chaves do DataProtection e arquivos (`Storage__LocalPath`), backup. Credenciais de **produção** do Mercado Pago e do Resend na hora do deploy.

## Despesas e prestação de contas (balancete)

- Admin e síndico com `expenses.manage` lançam as despesas **já pagas** (categoria, valor, data do pagamento, fornecedor e prédio opcionais, descrição, comprovante PDF/JPG/PNG até 20 MB). Lançar é simples, no estilo do "Nova cobrança". "Repetir todo mês" fica para depois.
- Categorias de despesa padrão por condomínio (criadas sob demanda), e o condomínio pode acrescentar e renomear as suas (nos Ajustes ou ao lançar).
- Balancete do mês: entradas = pagamentos recebidos no mês (pela data do pagamento, fuso de SP), por categoria da cobrança; saídas = despesas por categoria; saldo do mês e saldo acumulado a partir de um **saldo inicial** opcional (Admin, nos Ajustes).
- Morador vê o balancete com **totais por categoria e os comprovantes**, não a lista de cada despesa. Gestão vê tudo. Ver o balancete: qualquer membro ativo.

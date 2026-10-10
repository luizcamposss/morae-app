# Moraê — decisões de produto

Decisões já tomadas com o Luiz. Siga sem perguntar de novo; se algo novo contradizer uma delas, pergunte antes.

## Papéis e permissões

- 4 papéis: **Master, Admin, Síndico, Morador**. Papel por condomínio.
- Master: plataforma (condomínios, Admins, cobranças da plataforma). Não vê dados internos do condomínio.
- Síndico: permissões ligadas pelo Admin. Um **síndico novo nasce com todas as permissões** e gerenciando **todos os prédios** (padrão do mercado). O Admin restringe (subsíndico, síndico de bloco). Síndico paga só as cobranças da própria unidade.
- Permissões do síndico (`AppPermissions`): `residents.view`, `news.create`, `news.edit`, `charges.create`, `charges.mark_as_paid`, `delinquency.view`, `occurrences.manage`, `documents.manage`, `maintenance.manage`, `visitors.manage`, `assemblies.manage`.
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

## Ficou de fora (não implementar sem o Luiz pedir)

Reservas de áreas comuns, encomendas, veículos/pets, todo financeiro novo (recorrência, multa/juros, prestação de contas, acordos), relatórios, papel de porteiro/funcionário, registro de entrada/saída, QR code de visitante, ligar/desligar módulos por condomínio, voto por fração ideal, "reenviar e-mail" de convite ainda válido.

## Deploy (G, ainda não feito)

- VPS do Luiz (Hostinger), IP `187.77.59.219`, que já roda **Caddy** servindo outro site. Moraê em `https://morae.synergylab.tech` (DNS já aponta). Adicionar um bloco no Caddy **sem mexer** no site existente.
- Docker Compose (api, web, mysql), volumes para MySQL, chaves do DataProtection e arquivos (`Storage__LocalPath`), backup. Credenciais de **produção** do Mercado Pago e do Resend na hora do deploy.

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Um único sistema web usado no **computador (desktop)** e no **celular**, entregue como **PWA**: o usuário pode instalá-lo na tela inicial do celular a partir do navegador. Não há app nativo nem app nas lojas planejados por agora. Todas as telas precisam funcionar bem nos dois tamanhos.

## Users

- **Quem compra (público da landing page):** administradores de condomínios (quem cuida da gestão de um ou mais condomínios) e **condomínios pequenos** que contratam direto.
- **Quem usa o produto, por papel e por condomínio:**
  - **Admin:** gestão do condomínio no dia a dia (prédios, unidades, pessoas, convites, cobranças, avisos, documentos, manutenção, assembleias, permissões do síndico).
  - **Síndico:** acompanha os prédios sob sua responsabilidade, com as permissões que o Admin liberar.
  - **Morador:** paga boletos, recebe avisos, consulta documentos, avisa visitas, abre ocorrências e vota em assembleias.
  - **Master:** dono da plataforma Moraê. Cadastra condomínios e cobra a mensalidade da plataforma.

## Product Purpose

Moraê é um SaaS de gestão de condomínios feito para produção real. Ele reúne num lugar só o financeiro (cobranças e pagamentos), a comunicação e a operação do condomínio, para a gestão gastar menos tempo com planilhas, WhatsApp e papel, e para o morador resolver tudo pelo celular.

Sucesso é o condomínio receber em dia sem trabalho manual, o morador participar (pagar, votar, ser avisado) sem precisar ir à administração, e a gestão ter registro de tudo.

## Positioning

- **Pagamento integrado:** o morador paga com Pix, cartão (à vista) e boleto **dentro do Moraê** (checkout transparente do Mercado Pago). O pagamento é baixado automaticamente, e o dinheiro cai **direto na conta do condomínio**, sem intermediário (sem split).
- **Simples e moderno:** dá para usar sem treinamento, ao contrário dos sistemas antigos e cheios de menus.
- **Tudo em um:** cobranças, avisos, documentos, manutenção preventiva, visitantes e assembleias com votação online no mesmo produto.

## Operating Context

- A gestão (Admin, síndico, Master) trabalha mais no **computador**, por longos períodos; o morador entra rápido, quase sempre pelo **celular** (hipótese do produto, ainda não validada com usuários).
- Contexto brasileiro: interface e e-mails em **português (PT-BR)**, valores em reais, fuso de São Paulo, Pix e boleto, LGPD, regras do Código Civil para assembleias (voto de inadimplente, quórum).
- Comunicação automática por **e-mail** (convites, recibos, lembretes, convocações) e pelo **sininho** de notificações dentro do app.
- Cada pessoa pode ter papéis diferentes em condomínios diferentes; o síndico pode estar limitado a alguns prédios.

## Capabilities and Constraints

- **Pronto no backend:** login com sessão segura e "esqueci minha senha"; convites por e-mail; prédios, unidades, pessoas e vínculos; cobranças, pagamentos (Mercado Pago), comprovante, estorno e inadimplência; avisos por público e prédio; ocorrências; documentos com controle de visibilidade; manutenção preventiva com lembretes; visitantes previstos; assembleias com convocação, votação online por unidade, quórum e resultado; rotinas automáticas (atrasos, lembretes, limpeza LGPD).
- **Frontend atual:** React 19 + TypeScript + Vite + Tailwind 4. A interface atual é considerada **feia e pouco profissional** e será redesenhada; ela serve como referência de **funcionalidades**, não de visual.
- **Fluxo de design combinado:** as telas são desenhadas primeiro no **Figma** (navegador, conta Education) e só depois codadas.
- **Ainda não existe landing page**; ela entra como superfície nova.
- **Fora do escopo por agora:** reservas de áreas comuns, encomendas, veículos/pets, novos recursos financeiros (recorrência, multa/juros, acordos), relatórios, portaria/registro de entrada e saída, app nativo.
- **Planejado antes do lançamento:** **importação por planilha** para quem vem de outro sistema (unidades, moradores, vínculos e cobranças em aberto), com prévia e erros apontados antes de gravar. **Ainda não existe**: a landing só pode prometer depois de pronto. Migração assistida (serviço) e exportação completa **não** estão planejadas por agora.
- **Indefinido:** preço/planos do Moraê.

## Brand Commitments

- Nome: **Moraê** (com M maiúsculo e acento circunflexo no ê).
- Logo existente: `frontend/src/assets/logo-morae.svg` (símbolo em verde `#00AE54`). Há também uma animação de carregamento: `frontend/src/assets/load-morae.mp4`.
- Referências que o Luiz escolheu como norte: produtos da **AbacatePay** e do **Marc Lou**, e "appllama" (nome a confirmar). O que ele valoriza nelas: são **modernas**, **não têm cara de feito por IA** e têm uma **landing page bonita e única**.
- Tom: português claro e direto, sem jargão técnico para o morador.
- **Proibido pelo Luiz:** interface/landing **escura (dark)** — o Moraê é claro; visual **infantil** ou gamificado; **fotos de banco de imagem** (prédio genérico, família sorrindo, aperto de mão).

## Evidence on Hand

- **Pré-lançamento:** ainda **não há clientes**, depoimentos, números de uso, cases ou imprensa. A landing page e qualquer material **não podem inventar** clientes, logos de parceiros, depoimentos, estatísticas ou preços.
- O Luiz foi **contratado para construir o Moraê**, que será **entregue pronto para vender**. A landing precisa **captar clientes (leads)** desde o lançamento, pensada com mentalidade de marketing sênior (skill do projeto: `.claude/skills/marketing-senior`).
- A landing ataca as dores: **inadimplência (a nº 1)**, bagunça no WhatsApp, assembleia vazia e o dia a dia esquecido (manutenção, visitas, chamados). "Sistema antigo" aparece no tom (simples, pouco texto), e o **medo de migrar** só entra quando a importação por planilha existir.
- **Pouco texto:** o Luiz quer que o visitante entenda em menos de 5 segundos que é gestão de condomínio. Cada seção: título + 1 frase + tela real.
- Pesquisa de mercado (out/2026): inadimplência acima de 30 dias em recorde de 11,95% no 1º semestre de 2025 (dado de levantamentos do setor, inclusive de concorrentes: só citar com a fonte); reclamações frequentes contra concorrentes: suporte lento, cobrança indevida, boleto para a pessoa errada, acesso cortado sem aviso; migração trava por planilha/mapeamento de colunas e medo de ficar preso (caso NokNox, desligado em 01/12/2025).
- Provas reais disponíveis: o próprio produto funcionando (fluxos de pagamento, votação, documentos etc.), que pode ser mostrado em capturas de tela ou demonstrações.

## Product Principles

1. **O morador resolve em segundos, pelo celular.** Pagar, votar e avisar uma visita não pode exigir explicação.
2. **A gestão confia no que vê.** Números, status e prazos sempre claros e corretos, com registro de quem fez o quê.
3. **Dinheiro e decisões são coisa séria.** Pagamentos, quóruns e dados pessoais seguem a lei (LGPD, Código Civil) e nunca são ambíguos.
4. **Um produto, uma experiência.** Landing, gestão e morador devem parecer o mesmo produto, mesmo com propósitos diferentes.
5. **Honestidade antes de impressionar.** Nada de promessas, números ou provas que o produto ainda não tem.

// Copy for the landing page. Everything here is real product behavior or marked as example data:
// PRODUCT.md forbids inventing clients, numbers or prices.

export type PainId = "inadimplencia" | "avisos" | "sistema" | "assembleia" | "migrar";

export type Pain = {
  id: PainId;
  // How the hero sentence ends: "Hoje, o que mais me tira o sono é <selector>".
  selectorLabel: string;
  // Chip in the contact form: "Você escolheu: <formLabel>".
  formLabel: string;
  headline: { before: string; highlight: string; after: string };
  subtitle: string;
};

export const pains: Pain[] = [
  {
    id: "inadimplencia",
    selectorLabel: "a inadimplência",
    formLabel: "Inadimplência",
    headline: { before: "Receba ", highlight: "em dia", after: " sem correr atrás de ninguém." },
    subtitle: "Pix, cartão e boleto no app. O Moraê lembra o morador e dá baixa sozinho quando ele paga.",
  },
  {
    id: "avisos",
    selectorLabel: "o aviso que some no grupo",
    formLabel: "Avisos no WhatsApp",
    headline: { before: "Todo aviso ", highlight: "chega", after: ", e fica registrado." },
    subtitle: "Para todos ou para uma torre, no app e no sininho, sem se perder no grupo do WhatsApp.",
  },
  {
    id: "sistema",
    selectorLabel: "o sistema antigo",
    formLabel: "Sistema antigo",
    headline: { before: "Gestão de condomínio ", highlight: "sem manual", after: "." },
    subtitle: "Simples no computador e no celular. O morador usa sem treinamento.",
  },
  {
    id: "assembleia",
    selectorLabel: "a assembleia vazia",
    formLabel: "Assembleia vazia",
    headline: { before: "Assembleia com quórum, ", highlight: "sem sair de casa", after: "." },
    subtitle: "Um voto por unidade, pelo celular, e o quórum é calculado sozinho.",
  },
  {
    // The spreadsheet import does not exist yet, so this pain cannot promise it (decisions.md).
    id: "migrar",
    selectorLabel: "o medo de trocar de sistema",
    formLabel: "Medo de migrar",
    headline: { before: "Trocar de sistema ", highlight: "sem virar bagunça", after: "." },
    subtitle: "A gente cadastra o seu condomínio com você e acompanha os primeiros passos.",
  },
];

export type FaqItem = { question: string; answer: string };

export const faqItems: FaqItem[] = [
  {
    question: "O dinheiro passa pelo Moraê?",
    answer: "Não. O pagamento cai direto na conta do condomínio no Mercado Pago. O Moraê só mostra quem pagou e dá a baixa.",
  },
  {
    question: "O morador mais velho vai conseguir usar?",
    answer: "Sim. O boleto chega por e-mail e no app, e o Pix sai em poucos toques, em qualquer celular. Quem preferir, paga o boleto no banco, como sempre.",
  },
  {
    question: "Preciso instalar alguma coisa?",
    answer: "Não. Abre no navegador do celular ou do computador e, se quiser, fica na tela inicial como um app. Sem loja de aplicativos.",
  },
  {
    question: "Cuido de vários condomínios. Funciona?",
    answer: "Sim. Com um só login você troca de condomínio, e cada um tem seus moradores, cobranças e síndico separados.",
  },
  {
    question: "Serve para condomínio pequeno?",
    answer: "Sim. Dá para começar com um prédio só. Se o condomínio crescer, é só cadastrar as novas torres.",
  },
  {
    question: "Tem taxa para receber?",
    answer: "O Moraê não cobra nada por pagamento recebido. Só existe a taxa do Mercado Pago, descontada de quem recebe, como numa maquininha.",
  },
  {
    question: "Quanto custa?",
    answer: "Depende do tamanho do condomínio. Deixe seu contato e receba uma proposta, sem compromisso.",
  },
];

export const startSteps = [
  { title: "Você manda a mensagem", text: "Ela abre pronta no WhatsApp. É só revisar e enviar." },
  { title: "A gente cadastra seu condomínio", text: "Você recebe o acesso de administrador por e-mail." },
  { title: "Primeiro Pix", text: "Conecte o Mercado Pago, convide os moradores e receba." },
];

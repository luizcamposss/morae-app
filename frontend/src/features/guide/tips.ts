import type { GuideStep } from "./types";

// Quick tips on the first visit to each screen: what the screen is for and, when there is one, its
// main button. Keyed by the screen's path; the tip of a screen shows once per account.
type Tip = { title: string; body: string; action?: string };

const tipTexts: Record<string, Tip> = {
  // Admin
  "/admin/portfolio": { title: "Carteira", body: "Todos os condomínios que você administra lado a lado: recebido, em atraso e o que precisa de atenção em cada um." },
  "/admin/buildings": { title: "Prédios", body: "As torres ou blocos do condomínio. Cada unidade fica dentro de um prédio.", action: "Use “Novo prédio” para cadastrar mais um." },
  "/admin/units": { title: "Unidades", body: "Filtre por prédio e por situação. Clique numa unidade para ver moradores, contas e histórico.", action: "Use “Nova unidade” para cadastrar uma de cada vez. Para muitas, use Importar." },
  "/admin/people": { title: "Moradores", body: "Donos, inquilinos e quem mais mora. O vínculo de cada pessoa define quem recebe e paga a conta da unidade.", action: "“Novo morador” cadastra a pessoa. Para ligar a uma unidade, abra a unidade e use “Vincular pessoa”." },
  "/admin/invitations": { title: "Convites", body: "Acompanhe quem já entrou no app e reenvie o convite de quem ainda não criou a senha.", action: "“Novo convite” manda o link por e-mail. Ele vale por 7 dias." },
  "/admin/documents": { title: "Documentos", body: "Atas, regulamentos e contratos do condomínio, por categoria. Os moradores veem em Avisos e documentos." },
  "/admin/rentals": { title: "Aluguéis", body: "Os contratos de aluguel do condomínio. O aluguel entra sozinho na conta do inquilino todo mês, e o reajuste avisa antes.", action: "“Alugar unidade” cria o contrato." },
  "/admin/my-rentals": { title: "Meus aluguéis", body: "O aluguel do imóvel que é seu. Ele cai na sua conta pessoal do Mercado Pago, separado da conta do condomínio, e a gestão não vê os valores.", action: "“Alugar unidade” cria o contrato." },
  "/admin/utilities": { title: "Água, luz e gás", body: "Digite o valor do mês de cada unidade. Ele entra na conta do mês de quem paga a unidade." },
  "/admin/finance": { title: "Resumo do financeiro", body: "O que entrou, o que falta receber e o que está atrasado. Em “Precisa de você” ficam as tarefas do mês." },
  "/admin/finance/accounts": { title: "Contas", body: "Todas as cobranças: a sair, em aberto, atrasadas e pagas. Clique numa para ver detalhes, comprovante e histórico.", action: "“Lançar cobrança” cria taxa, aluguel, água, luz, gás, multa ou rateio." },
  "/admin/finance/expenses": { title: "Despesas", body: "Lance o que o condomínio gasta. Junto com o que entrou, isso vira o balanço do mês e a prestação de contas." },
  "/admin/finance/reports": { title: "Relatórios", body: "Baixe em Excel ou PDF: inadimplência, recebimentos, despesas e balanço." },
  "/admin/occurrences": { title: "Ocorrências", body: "O que os moradores relatam. Abra uma para ver as fotos, mudar a situação e responder. Quem abriu é avisado." },
  "/admin/news": { title: "Avisos", body: "Escreva para o condomínio todo ou só para um prédio. Os moradores recebem no app.", action: "“Novo aviso” abre o formulário." },
  "/admin/assemblies": { title: "Assembleias", body: "Crie a assembleia com as pautas, publique e acompanhe a votação pelo app. O resultado sai sozinho no fim." },
  "/admin/reservations": { title: "Reservas", body: "Pedidos para aprovar, a agenda das áreas comuns e as regras de cada área (horários, taxa, antecedência)." },
  "/admin/agenda": { title: "Agenda", body: "Tudo o que acontece em cada dia: manutenções, visitas, reservas e ocorrências, num só calendário." },
  "/admin/preventive-maintenance": { title: "Manutenção", body: "Elevador, extintores, caixa d'água… O Moraê avisa antes de vencer. Registre cada execução para manter o histórico." },
  "/admin/visitors": { title: "Visitantes", body: "As visitas avisadas para cada dia, para a portaria conferir. Troque o dia nas setas ou no calendário." },
  "/admin/import": { title: "Importar", body: "Traga unidades, moradores e cobranças de uma planilha. Primeiro você vê a prévia com os erros, e nada é salvo antes de confirmar.", action: "Baixe o “Modelo Excel” para preencher." },
  "/admin/settings": { title: "Ajustes", body: "Dados do condomínio, módulos ligados, taxa, vencimento, recebimento e o acesso de cada síndico." },
  // Síndico
  "/syndic/residents": { title: "Moradores", body: "Quem mora em cada unidade dos prédios que você cuida." },
  "/syndic/rentals": { title: "Aluguéis", body: "Os contratos de aluguel. O aluguel entra sozinho na conta do inquilino todo mês." },
  "/syndic/my-rentals": { title: "Meus aluguéis", body: "O aluguel do imóvel que é seu. Ele cai na sua conta pessoal do Mercado Pago, separado da conta do condomínio, e a gestão não vê os valores.", action: "“Alugar unidade” cria o contrato." },
  "/syndic/utilities": { title: "Água, luz e gás", body: "Digite o valor do mês de cada unidade. Ele entra na conta do mês de quem paga a unidade." },
  "/syndic/finance": { title: "Financeiro", body: "O que entrou, o que falta receber e o que está atrasado, conforme o acesso que a administração liberou." },
  "/syndic/finance/accounts": { title: "Contas", body: "As cobranças do condomínio: a sair, em aberto, atrasadas e pagas. Clique numa para ver os detalhes." },
  "/syndic/occurrences": { title: "Ocorrências", body: "O que os moradores relatam. Abra uma para ver as fotos, mudar a situação e responder." },
  "/syndic/news": { title: "Avisos", body: "Escreva para o condomínio todo ou só para um prédio. Os moradores recebem no app.", action: "“Novo aviso” abre o formulário." },
  "/syndic/documents": { title: "Documentos", body: "Atas, regulamentos e contratos do condomínio, por categoria." },
  "/syndic/assemblies": { title: "Assembleias", body: "Crie a assembleia com as pautas, publique e acompanhe a votação." },
  "/syndic/reservations": { title: "Reservas", body: "Pedidos para aprovar, a agenda das áreas comuns e as regras de cada área." },
  "/syndic/agenda": { title: "Agenda", body: "Manutenções, visitas, reservas e ocorrências de cada dia, num só calendário." },
  "/syndic/preventive-maintenance": { title: "Manutenção", body: "O Moraê avisa antes de cada manutenção vencer. Registre cada execução para manter o histórico." },
  "/syndic/visitors": { title: "Visitantes", body: "As visitas avisadas para cada dia, para a portaria conferir." },
  // Morador
  "/resident/unit": { title: "Minha unidade", body: "Quem mora com você e seus vínculos. Se for dono e quiser alugar, comece por aqui." },
  "/resident/bills": { title: "Minhas contas", body: "O que está em aberto aparece primeiro. Toque numa conta para pagar com Pix ou cartão e, depois, baixar o recibo." },
  "/resident/rentals": { title: "Meus aluguéis", body: "O aluguel do seu imóvel cai direto na sua conta do Mercado Pago. O condomínio não vê esses valores.", action: "“Alugar unidade” cria o contrato." },
  "/resident/occurrences": { title: "Ocorrências", body: "Relate um problema do prédio, com foto, e acompanhe a resposta da administração.", action: "Toque em “Nova” para relatar." },
  "/resident/visits": { title: "Visitas", body: "Avise quem vem te visitar. A portaria vê a lista do dia.", action: "“Avisar visita” cadastra a pessoa e o dia." },
  "/resident/reservations": { title: "Reservas", body: "Escolha a área, o dia e o horário livre. Suas reservas ficam em “Minhas reservas”." },
  "/resident/notices": { title: "Avisos e documentos", body: "Os comunicados do condomínio e os documentos, como atas e regulamento." },
  "/resident/assemblies": { title: "Assembleias", body: "Leia as pautas e vote enquanto a votação estiver aberta. Depois, veja o resultado." },
  // Master
  "/master/condominiums": { title: "Condomínios", body: "Cada condomínio da plataforma, com tipo, módulos e situação. Clique num para ver os detalhes.", action: "“Novo condomínio” cadastra mais um." },
  "/master/payments": { title: "Receita", body: "As mensalidades do Moraê de cada condomínio: pagas, em aberto e atrasadas." },
  "/master/contacts": { title: "Contatos", body: "Quem pediu contato pela página do Moraê. Abra um para ver a mensagem e marcar o andamento." },
  "/master/admins": { title: "Administradores", body: "Quem administra cada condomínio.", action: "“Convidar admin” manda o convite por e-mail." },
  "/master/news": { title: "Avisos", body: "Avisos da plataforma para os administradores.", action: "“Novo aviso” abre o formulário." },
};

export function tipKey(path: string) {
  return `tip:${path.replace(/^\//, "").replace(/\//g, "-")}`;
}

export function tipFor(path: string): GuideStep[] | null {
  const tip = tipTexts[path];
  if (!tip) return null;
  const steps: GuideStep[] = [{ target: "page:title", title: tip.title, body: tip.body }];
  if (tip.action) steps.push({ target: "page:action", title: "Por onde começar", body: tip.action });
  return steps;
}

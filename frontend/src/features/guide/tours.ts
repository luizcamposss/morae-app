import type { AreaRole } from "../../app/routes";
import type { Guide } from "./types";

// The first-access tour of each role. Steps of screens the user doesn't have (module off, syndic
// without that access) are skipped on their own. Short texts: one idea per balloon.
const welcome = {
  title: "Boas-vindas ao Moraê",
  body: "Em 1 minuto mostramos onde fica cada coisa. Dá para pular e ver de novo quando quiser, em Ajustes → Ajuda e tutorial.",
};

const done = {
  title: "Pronto!",
  body: "Na primeira vez em cada tela, aparece uma dica rápida do que dá para fazer ali. Se precisar, o tutorial fica em Ajustes.",
};

const notifications = {
  target: "header:notifications",
  title: "Notificações",
  body: "Pagamentos, ocorrências novas e pedidos de reserva chegam aqui. O número mostra o que você ainda não viu.",
};

export const tours: Partial<Record<AreaRole, Guide>> = {
  Admin: {
    key: "tour:admin",
    steps: [
      welcome,
      { nav: "/admin/dashboard", title: "Início", body: "O resumo do condomínio: o que entrou no mês, o que está atrasado e o que precisa de você hoje." },
      { nav: "/admin/units", title: "Unidades", body: "Cada apartamento ou casa do condomínio. Clique numa unidade para ver quem mora, contas e histórico." },
      { nav: "/admin/people", title: "Moradores", body: "Donos, inquilinos e quem mais mora. É pelo vínculo de cada pessoa que a conta certa chega a quem paga." },
      { nav: "/admin/invitations", title: "Convites", body: "Mande o convite por e-mail para o morador criar a senha e começar a usar o app." },
      { nav: "/admin/finance", title: "Financeiro", body: "Contas do mês, cobranças, acordos, despesas e relatórios ficam aqui." },
      {
        path: "/admin/finance/accounts",
        target: "finance:launch",
        title: "Lançar cobrança",
        body: "Taxa, aluguel, água, luz, gás, multa ou rateio: escolha o que cobrar, de quem, e se entra na conta do mês ou sai separada.",
      },
      {
        path: "/admin/finance/accounts",
        target: "finance:drafts",
        title: "Contas a sair",
        body: "As contas do mês ficam aqui como rascunho. Elas saem sozinhas 10 dias antes do vencimento, e até lá você pode corrigir.",
      },
      { nav: "/admin/news", title: "Avisos", body: "Publique avisos para o condomínio todo ou só para um prédio. Os moradores recebem no app." },
      notifications,
      { nav: "/admin/settings", title: "Ajustes", body: "Dados do condomínio, módulos, taxa, vencimento, recebimento e o acesso do síndico." },
      done,
    ],
  },
  Syndic: {
    key: "tour:syndic",
    steps: [
      welcome,
      { nav: "/syndic/dashboard", title: "Início", body: "O resumo do condomínio e o que precisa de você hoje." },
      { nav: "/syndic/residents", title: "Moradores", body: "Quem mora em cada unidade dos prédios que você cuida." },
      { nav: "/syndic/finance", title: "Financeiro", body: "Contas, cobranças e despesas, conforme o acesso que a administração liberou para você." },
      { nav: "/syndic/occurrences", title: "Ocorrências", body: "Os problemas que os moradores relatam. Responda e mude a situação para eles acompanharem." },
      { nav: "/syndic/news", title: "Avisos", body: "Publique avisos para os moradores." },
      { nav: "/syndic/reservations", title: "Reservas", body: "Pedidos de reserva das áreas comuns para aprovar ou recusar." },
      notifications,
      { nav: "/syndic/settings", title: "Ajustes", body: "Seus dados, senha, notificações e o tutorial." },
      done,
    ],
  },
  Resident: {
    key: "tour:resident",
    steps: [
      welcome,
      { nav: "/resident/dashboard", title: "Início", body: "O que está em aberto, os avisos novos e os atalhos do dia a dia." },
      { nav: "/resident/bills", title: "Minhas contas", body: "Suas contas do mês. Pague com Pix ou cartão, direto no app, e baixe o recibo depois." },
      { nav: "/resident/unit", title: "Minha unidade", body: "Quem mora com você, seus dados e o histórico da unidade." },
      { nav: "/resident/rentals", title: "Meus aluguéis", body: "Se você aluga seu imóvel, cuide do contrato e receba o aluguel na sua conta." },
      { nav: "/resident/occurrences", title: "Ocorrências", body: "Viu um problema no prédio? Relate aqui, com foto, e acompanhe a resposta." },
      { nav: "/resident/visits", title: "Visitas", body: "Avise a portaria de quem vem te visitar." },
      { nav: "/resident/reservations", title: "Reservas", body: "Reserve o salão, a churrasqueira e outras áreas comuns." },
      { nav: "/resident/notices", title: "Avisos e documentos", body: "Comunicados do condomínio, atas e regulamentos." },
      { nav: "/resident/assemblies", title: "Assembleias", body: "Leia as pautas e vote pelo app quando a votação abrir." },
      notifications,
      done,
    ],
  },
};

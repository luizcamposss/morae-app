import type { AreaRole } from "../../app/routes";
import type { Guide, GuideStep } from "./types";

// The platform tour of each role, in chapters. It walks screen by screen, points at the tabs,
// filters and buttons, and opens the main windows to explain their fields (nothing is saved).
// Steps of screens the user doesn't have are left out on their own. One idea per balloon.

// Helpers: a menu entry, an element of a screen, a field inside a window opened by `open`.
const nav = (path: string, title: string, body: string): GuideStep => ({ nav: path, title, body });
const at = (path: string, target: string, title: string, body: string): GuideStep => ({ path, target, title, body });
const inWindow = (path: string, open: string, target: string, title: string, body: string): GuideStep => ({ path, open, target, title, body });
const intro = (title: string, body: string): GuideStep => ({ title, body });

const notifications: GuideStep = {
  target: "header:notifications",
  title: "Notificações",
  body: "Pagamentos, ocorrências novas, pedidos de reserva e avisos chegam aqui. O número mostra o que você ainda não viu.",
};
const profile: GuideStep = {
  target: "header:profile",
  title: "Seu perfil",
  body: "Seu nome, seu papel no condomínio e o atalho para Ajustes e para Sair.",
};
const end = intro("Pronto!", "Você viu todo o Moraê. Os capítulos ficam em Ajustes → Ajuda e tutorial, para rever quando quiser. Nas telas, uma dica rápida aparece na primeira visita.");

// Admin and síndico share most screens; the síndico only sees what the administration allowed.
function managementTour(role: "admin" | "syndic"): Guide[] {
  const base = `/${role}`;
  const isAdmin = role === "admin";
  const peoplePath = isAdmin ? `${base}/people` : `${base}/residents`;

  return [
    {
      key: `tour:${role}-start`,
      title: "Começando",
      steps: [
        intro(
          "Boas-vindas ao Moraê",
          "Vamos passar pela plataforma inteira, em capítulos: começando, cadastros, financeiro, comunicação, dia a dia e ajustes. Dá para pausar e continuar depois em Ajustes → Ajuda e tutorial.",
        ),
        nav(`${base}/dashboard`, "Início", "A tela que abre quando você entra: o resumo do condomínio e o que precisa de você."),
        at(`${base}/dashboard`, "text:Hoje", "Hoje", "As tarefas do dia: manutenções vencendo, ocorrências abertas, pedidos de reserva. Clique numa para ir direto a ela."),
        at(`${base}/dashboard`, "text:Unidades em atraso", "Unidades em atraso", "Quem está devendo, com o valor já com multa e juros. Clique para ver as cobranças atrasadas."),
        at(`${base}/dashboard`, "text:Cobranças de", "Cobranças do mês", "Cada quadradinho é uma unidade: verde pagou, amarelo vence esta semana, vermelho atrasou. Troque o prédio nas abas."),
        at(`${base}/dashboard`, "text:Receita por mês", "Receita por mês", "O que entrou e o que ficou em aberto, mês a mês."),
        at(`${base}/dashboard`, "text:Atividades recentes", "Atividades recentes", "O que aconteceu por último: pagamentos, cadastros, respostas."),
        nav(`${base}/portfolio`, "Carteira", "Se você administra mais de um condomínio, aqui vê todos lado a lado. Troque o condomínio ativo no nome dele, no alto do menu."),
        notifications,
        profile,
      ],
    },
    {
      key: `tour:${role}-registry`,
      title: "Cadastros",
      steps: [
        intro("Cadastros", "Prédios, unidades e moradores: é deles que saem as contas certas e os avisos para as pessoas certas."),
        nav(`${base}/buildings`, "Prédios", "As torres ou blocos do condomínio. Cada unidade fica dentro de um prédio."),
        inWindow(`${base}/buildings`, "page:action", "text:Nome do prédio", "Novo prédio", "Dê um nome (ex.: Torre A), um código curto e o número de andares. Nada é salvo agora: é só para mostrar."),
        nav(`${base}/units`, "Unidades", "Cada apartamento, casa, sala ou loja."),
        at(`${base}/units`, "text:Todas", "Filtros", "Veja todas, só as ocupadas ou as vagas (sem ninguém ligado). Em cima, troque o prédio."),
        inWindow(`${base}/units`, "page:action", "text:Número", "Nova unidade", "Número, tipo (apartamento, casa, cobertura…), quartos, banheiros e área."),
        inWindow(`${base}/units`, "css:main li button", "text:Quem mora aqui", "Dentro da unidade", "Clicando numa unidade, você vê quem mora nela e o histórico."),
        inWindow(`${base}/units`, "css:main li button", "text:Vincular pessoa", "Vincular pessoa", "É aqui que você liga dono, inquilino ou morador à unidade. A conta do mês vai para quem paga a unidade."),
        inWindow(`${base}/units`, "css:main li button", "text:Alugar esta unidade", "Alugar esta unidade", "Cria o contrato de aluguel da unidade: o aluguel passa a entrar sozinho na conta do inquilino."),
        nav(peoplePath, "Moradores", isAdmin ? "Todas as pessoas do condomínio: donos, inquilinos e quem mais mora." : "Quem mora em cada unidade dos prédios que você cuida."),
        at(`${base}/people`, "text:Sem acesso", "Quem ainda não usa o app", "Pessoas sem acesso ainda não criaram a senha. Mande um convite para elas."),
        inWindow(`${base}/people`, "page:action", "text:CPF", "Novo morador", "Nome, CPF, telefone e e-mail. Depois, ligue a pessoa à unidade em Unidades → Vincular pessoa."),
        nav(`${base}/invitations`, "Convites", "O convite chega por e-mail com um link para a pessoa criar a senha. Ele vale por 7 dias."),
        at(`${base}/invitations`, "text:Pendentes", "Situação dos convites", "Pendentes ainda não foram usados; expirados passaram dos 7 dias e podem ser reenviados."),
        inWindow(`${base}/invitations`, "page:action", "text:Papel", "Novo convite", "Escolha a pessoa e o papel: morador ou síndico."),
        nav(`${base}/import`, "Importar", "Para cadastrar muita coisa de uma vez: unidades, moradores e cobranças em aberto, por planilha."),
        at(`${base}/import`, "text:Modelo Excel", "Modelo da planilha", "Baixe o modelo, preencha e envie. Antes de salvar, você vê a prévia com os erros de cada linha."),
      ],
    },
    {
      key: `tour:${role}-finance`,
      title: "Financeiro",
      steps: [
        intro("Financeiro", "Cobranças, contas do mês, acordos, despesas e relatórios. Tudo num lugar só."),
        nav(`${base}/finance`, "Financeiro", "Três abas: Resumo, Contas e Despesas e relatórios."),
        at(`${base}/finance`, "text:Precisa de você", "Precisa de você", "As tarefas do financeiro: contas para sair, água e luz para lançar, comprovantes Pix para conferir, unidades atrasadas."),
        at(`${base}/finance/accounts`, "finance:launch", "Lançar cobrança", "Para cobrar qualquer coisa: taxa, aluguel, água, luz, gás, multa, rateio ou outro."),
        inWindow(`${base}/finance/accounts`, "finance:launch", "text:Aluguel", "O que cobrar", "Escolha o tipo. Depois você escolhe de quem (uma unidade, várias ou só uma pessoa), o valor e se entra na conta do mês ou sai separada."),
        inWindow(`${base}/finance/accounts`, "finance:launch", "text:Água", "Água, luz e gás", "O valor do mês de cada unidade também é lançado aqui. Para lançar todas as unidades de uma vez, use o aviso “Lançar” no Resumo do financeiro."),
        at(`${base}/finance/accounts`, "finance:drafts", "A sair", "As contas do mês ficam aqui como rascunho. Elas saem sozinhas 10 dias antes do vencimento, e até lá dá para corrigir."),
        at(`${base}/finance/accounts`, "text:Atrasadas", "Situação", "Em aberto, atrasadas, pagas, renegociadas e canceladas. Clique numa cobrança para ver detalhes, comprovante e histórico."),
        at(`${base}/finance/accounts`, "text:Categoria", "Filtros", "Filtre por prédio, mês de vencimento e tipo de cobrança, ou busque pela unidade ou pelo nome."),
        at(`${base}/finance/accounts`, "text:Acordos", "Acordos", "Para quem está devendo: junte as cobranças atrasadas e divida em parcelas."),
        at(`${base}/finance/expenses`, "text:Lançar despesa", "Despesas", "Lance o que o condomínio gasta: água, luz, folha, limpeza, manutenção…"),
        at(`${base}/finance/balance`, "text:Entradas por categoria", "Balanço", "O mês fechado: o que entrou e o que saiu, por categoria. É a prestação de contas que os moradores veem."),
        at(`${base}/finance/reports`, "text:Baixar Excel", "Relatórios", "Escolha o período e o prédio e baixe em Excel ou PDF: inadimplência, recebimentos, despesas e balanço."),
        nav(`${base}/rentals`, "Aluguéis", "Os contratos de aluguel que o condomínio administra."),
        inWindow(`${base}/rentals`, "page:action", "text:Inquilino", "Alugar unidade", "Unidade, inquilino, valor, dia do vencimento e início. O aluguel entra sozinho na conta do inquilino 20 dias antes de vencer."),
        inWindow(`${base}/rentals`, "page:action", "text:Reajuste anual", "Reajuste", "Escolha o índice (IPCA, IGP-M ou combinado). O Moraê avisa quando chegar a hora de reajustar."),
        nav(
          `${base}/my-rentals`,
          "Meus aluguéis",
          "Aparece porque você também é dono de uma unidade aqui. É o aluguel do seu imóvel: cai na sua conta pessoal do Mercado Pago, separado do dinheiro do condomínio, e a gestão não vê os valores.",
        ),
        at(`${base}/my-rentals`, "text:Alugar unidade", "Alugar o seu imóvel", "Cadastre o inquilino, o valor e o vencimento. A conta chega para ele 10 dias antes, sem multa nem juros."),
      ],
    },
    {
      key: `tour:${role}-communication`,
      title: "Comunicação",
      steps: [
        intro("Comunicação", "Avisos, documentos e assembleias: tudo o que o condomínio precisa falar com os moradores."),
        nav(`${base}/news`, "Avisos", "Escreva para o condomínio todo, só para moradores, só para síndicos ou só para um prédio."),
        at(`${base}/news`, "text:Título", "Novo aviso", "Título e mensagem. Marque “Importante” para destacar no app dos moradores."),
        at(`${base}/news`, "text:Do Moraê para você", "Do Moraê para você", "Novidades da plataforma, enviadas pela equipe do Moraê."),
        nav(`${base}/documents`, "Documentos", "Convenção, regimento, atas, prestação de contas e contratos, por categoria."),
        inWindow(`${base}/documents`, "page:action", "text:Quem pode ver", "Enviar documento", "Escolha a categoria e quem pode ver: todos os moradores ou só a gestão."),
        nav(`${base}/assemblies`, "Assembleias", "Votação pelo app: crie, publique e acompanhe a participação."),
        inWindow(`${base}/assemblies`, "page:action", "text:Quem vota", "Nova assembleia", "Quem vota: só os donos (um voto por unidade) ou donos e moradores."),
        inWindow(`${base}/assemblies`, "page:action", "text:Abre em", "Período de votação", "Quando a votação abre e fecha. No fim, o resultado sai sozinho. Unidades com cobrança atrasada não votam."),
        inWindow(`${base}/assemblies`, "page:action", "text:Adicionar pauta", "Pautas", "Cada pauta é votada separadamente: sim ou não, ou opções (ex.: orçamentos de empresas, com anexo)."),
      ],
    },
    {
      key: `tour:${role}-daily`,
      title: "Dia a dia",
      steps: [
        intro("Dia a dia", "Ocorrências, reservas, agenda, manutenção e visitantes."),
        nav(`${base}/occurrences`, "Ocorrências", "Os problemas que os moradores relatam, com fotos."),
        at(`${base}/occurrences`, "text:Abertas", "Situação", "Abertas, em andamento, resolvidas e canceladas. Filtre por prédio ou busque."),
        inWindow(`${base}/occurrences`, "css:main li button", "text:Resposta da gestão", "Responder", "Abra a ocorrência, mude a situação e escreva a resposta. Quem abriu é avisado."),
        nav(`${base}/reservations`, "Reservas", "Salão, churrasqueira e outras áreas comuns."),
        at(`${base}/reservations`, "text:Pedidos pendentes", "Pedidos", "Os pedidos que esperam sua aprovação. A agenda mostra o que já está reservado."),
        at(`${base}/reservations`, "text:Áreas", "Áreas", "Cada área com suas regras."),
        inWindow(`${base}/reservations`, "page:action", "text:Taxa da reserva", "Nova área", "Turnos ou dia inteiro, antecedência, limite por unidade, taxa e termos de uso. Com taxa, a cobrança sai sozinha ao aprovar."),
        nav(`${base}/agenda`, "Agenda", "Manutenções, visitas, ocorrências e reservas de cada dia, num só calendário."),
        at(`${base}/agenda`, "text:Mês", "Ver por período", "Veja 2 semanas ou o mês inteiro. Clique num dia para ver o que acontece nele."),
        nav(`${base}/preventive-maintenance`, "Manutenção", "Elevador, extintores, caixa d'água, para-raios… O Moraê avisa antes de vencer."),
        at(`${base}/preventive-maintenance`, "text:Atrasadas", "Situação", "Atrasadas, vencendo em breve e em dia."),
        at(`${base}/preventive-maintenance`, "text:Registrar execução", "Registrar execução", "Quando o serviço for feito, registre aqui: a próxima data é calculada sozinha e o histórico fica guardado."),
        inWindow(`${base}/preventive-maintenance`, "page:action", "text:Frequência", "Nova manutenção", "Nome, onde, a cada quantos meses e a próxima data. A empresa e o telefone ajudam na hora de chamar."),
        nav(`${base}/visitors`, "Visitantes", "As visitas avisadas pelos moradores, para a portaria conferir."),
        at(`${base}/visitors`, "text:Próximos 7 dias", "Próximos dias", "Quantas visitas vêm em cada dia da semana."),
        at(`${base}/visitors`, "text:Visita do condomínio", "Visita do condomínio", "Para avisar uma visita da administração, como um prestador de serviço na área comum."),
      ],
    },
    {
      key: `tour:${role}-settings`,
      title: "Ajustes",
      steps: [
        nav(`${base}/settings`, "Ajustes", isAdmin ? "Os dados do condomínio, os módulos, o financeiro e o acesso de cada síndico." : "Seus dados, senha, notificações e o tutorial."),
        at(`${base}/settings`, "text:Segurança e avisos", "Segurança e avisos", "Troque a senha e escolha quais notificações quer receber."),
        at(`${base}/settings`, "text:Ajuda e tutorial", "Ajuda e tutorial", "Os capítulos deste tutorial e a chave das dicas nas telas."),
        // Only the Admin manages the condominium itself.
        ...(isAdmin
          ? [
              at(`${base}/settings`, "text:Condomínio", "Condomínio", "Módulos: ligue só o que o condomínio usa (reservas, assembleias, aluguéis…). E as permissões e prédios de cada síndico."),
              at(`${base}/settings`, "text:Financeiro", "Financeiro", "Taxa de condomínio, vencimento, multa e juros, envio das contas, água, luz e gás e prestação de contas."),
              at(`${base}/settings`, "text:Recebimento do condomínio", "Recebimento", "Conecte o Mercado Pago para receber Pix, cartão e boleto com baixa automática, ou cadastre a chave Pix."),
            ]
          : []),
        end,
      ],
    },
  ];
}

export const tours: Partial<Record<AreaRole, Guide[]>> = {
  Admin: managementTour("admin"),
  Syndic: managementTour("syndic"),
  Resident: [
    {
      key: "tour:resident-start",
      title: "Começando",
      steps: [
        intro("Boas-vindas ao Moraê", "Vamos passar pelo app inteiro: contas, sua unidade, avisos e o dia a dia. Dá para pausar e continuar depois em Ajustes → Ajuda e tutorial."),
        nav("/resident/dashboard", "Início", "O que você precisa ver hoje: contas, avisos e visitas."),
        at("/resident/dashboard", "text:Para pagar", "Para pagar", "A conta em aberto mais próxima, com multa e juros se atrasou."),
        at("/resident/dashboard", "text:Pagar com Pix", "Pagar com Pix", "Paga na hora: o Pix aparece pronto para copiar ou ler o QR Code."),
        at("/resident/dashboard", "text:Últimos avisos", "Últimos avisos", "Os comunicados mais recentes do condomínio."),
        at("/resident/dashboard", "text:Próximas visitas", "Próximas visitas", "As visitas que você avisou à portaria."),
        notifications,
        profile,
      ],
    },
    {
      key: "tour:resident-bills",
      title: "Contas",
      steps: [
        nav("/resident/bills", "Minhas contas", "Todas as suas contas: em aberto primeiro, depois as pagas."),
        at("/resident/bills", "text:Pagar tudo", "Pagar tudo", "Com mais de uma conta em aberto, pague todas de uma vez."),
        at("/resident/bills", "text:Pagar", "Pagar", "Pix, cartão ou boleto, direto no app. O recibo fica guardado depois."),
        at("/resident/bills", "text:Detalhes", "Detalhes", "O que entrou na conta (taxa, água, aluguel…), vencimento e histórico."),
        nav("/resident/rentals", "Meus aluguéis", "Se você aluga seu imóvel: o aluguel cai direto na sua conta do Mercado Pago. O condomínio não vê esses valores."),
      ],
    },
    {
      key: "tour:resident-home",
      title: "Sua unidade e avisos",
      steps: [
        nav("/resident/unit", "Minha unidade", "Seus dados na unidade."),
        at("/resident/unit", "text:Quem mora aqui", "Quem mora aqui", "Donos, inquilinos e moradores da unidade. Para mudar, fale com a administração."),
        nav("/resident/notices", "Avisos e documentos", "Os comunicados do condomínio."),
        at("/resident/notices", "text:Documentos", "Documentos", "Convenção, regimento, atas e prestação de contas."),
        nav("/resident/assemblies", "Assembleias", "Leia as pautas e vote enquanto a votação estiver aberta. Depois, veja o resultado."),
      ],
    },
    {
      key: "tour:resident-daily",
      title: "Dia a dia",
      steps: [
        nav("/resident/occurrences", "Ocorrências", "Viu um problema no prédio? Relate aqui."),
        at("/resident/occurrences", "text:Nova", "Nova ocorrência", "Descreva, mande foto e acompanhe. Você é avisado quando a administração responder."),
        at("/resident/occurrences", "text:Encerradas", "Encerradas", "As que já foram resolvidas ou canceladas, com a resposta."),
        nav("/resident/visits", "Visitas", "Avise a portaria de quem vem te visitar."),
        at("/resident/visits", "text:Avisar visita", "Avisar visita", "Nome, tipo de visita e o dia. A portaria vê a lista do dia."),
        nav("/resident/reservations", "Reservas", "Salão, churrasqueira e outras áreas comuns."),
        at("/resident/reservations", "text:Reservar", "Reservar", "Escolha a área, o dia e o horário livre no calendário, aceite os termos e confirme."),
        at("/resident/reservations", "text:Minhas reservas", "Minhas reservas", "Acompanhe a aprovação e cancele se precisar."),
      ],
    },
    {
      key: "tour:resident-settings",
      title: "Ajustes",
      steps: [
        nav("/resident/settings", "Ajustes", "Seus dados, senha e notificações."),
        at("/resident/settings", "text:Segurança e avisos", "Segurança e avisos", "Troque a senha e escolha quais notificações quer receber."),
        at("/resident/settings", "text:Ajuda e tutorial", "Ajuda e tutorial", "Os capítulos deste tutorial, para rever quando quiser."),
        end,
      ],
    },
  ],
  Master: [
    {
      key: "tour:master-start",
      title: "Começando",
      steps: [
        intro("Boas-vindas ao Moraê", "Este é o painel da plataforma. Vamos passar por tudo: condomínios, administradores, receita, contatos e ajustes."),
        nav("/master/dashboard", "Início", "Os números da plataforma."),
        at("/master/dashboard", "text:Receita por mês", "Receita por mês", "As mensalidades do Moraê: pago, em aberto e atrasado, mês a mês."),
        at("/master/dashboard", "text:Condomínios na plataforma", "Crescimento", "Quantos condomínios usam o Moraê ao longo dos meses."),
        notifications,
        profile,
      ],
    },
    {
      key: "tour:master-clients",
      title: "Condomínios e administradores",
      steps: [
        nav("/master/condominiums", "Condomínios", "Cada condomínio da plataforma."),
        at("/master/condominiums", "text:Mensalidade atrasada", "Situação", "Em dia, com mensalidade atrasada ou inativo (sem acesso)."),
        inWindow("/master/condominiums", "page:action", "text:Tipo do condomínio", "Novo condomínio", "Os dados do condomínio e o tipo (residencial, de aluguel ou misto)."),
        inWindow("/master/condominiums", "page:action", "text:Primeiro administrador", "Primeiro administrador", "Quem vai administrar. Ao salvar, essa pessoa recebe o convite por e-mail."),
        nav("/master/admins", "Administradores", "Quem administra cada condomínio."),
        at("/master/admins", "text:Convites", "Convites", "Os convites enviados e se já foram aceitos."),
        inWindow("/master/admins", "page:action", "text:Condomínio", "Convidar admin", "Escolha o condomínio e os dados da pessoa."),
      ],
    },
    {
      key: "tour:master-revenue",
      title: "Receita e contatos",
      steps: [
        nav("/master/payments", "Receita", "As mensalidades que cada condomínio paga ao Moraê."),
        at("/master/payments", "text:Atrasadas", "Situação", "Em aberto, atrasadas, pagas e canceladas."),
        inWindow("/master/payments", "page:action", "text:Vencimento", "Nova mensalidade", "Condomínio, descrição, valor e vencimento."),
        nav("/master/contacts", "Contatos", "Quem pediu contato pela página do Moraê."),
        at("/master/contacts", "text:Em conversa", "Andamento", "Novos, em conversa, fechados ou sem interesse. Abra um contato para mudar o andamento."),
        nav("/master/news", "Avisos", "Avisos da plataforma para os administradores dos condomínios."),
      ],
    },
    {
      key: "tour:master-settings",
      title: "Ajustes",
      steps: [
        nav("/master/settings", "Ajustes", "Seus dados, senha e o recebimento da plataforma."),
        at("/master/settings", "text:Recebimento da plataforma", "Recebimento", "A chave Pix que recebe as mensalidades."),
        at("/master/settings", "text:Ajuda e tutorial", "Ajuda e tutorial", "Os capítulos deste tutorial."),
        end,
      ],
    },
  ],
};

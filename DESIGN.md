---
name: Moraê
description: Gestão de condomínio calma e clara, do computador da gestão ao celular do morador.
colors:
  tinta: "#0F3D3E"
  tinta-suave: "#4A6563"
  tinta-forte: "#0B3132"
  verde: "#00AE54"
  verde-forte: "#00A04D"
  verde-tinta: "#06301E"
  verde-suave: "#E2F4E9"
  fundo: "#EDF0EA"
  menu: "#E4E9E2"
  campo: "#F2F4F0"
  superficie: "#FFFFFF"
  linha: "#DCE2DA"
  ambar: "#C98A12"
  ambar-suave: "#FBF0D6"
  vermelho: "#B8432A"
  vermelho-suave: "#F8E2DB"
typography:
  display:
    fontFamily: "Familjen Grotesk, sans-serif"
    fontSize: "38px"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Familjen Grotesk, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Familjen Grotesk, sans-serif"
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.45
  label:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "20px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "56px"
components:
  button-primary:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.pill}"
    padding: "14px 24px"
  button-accent:
    backgroundColor: "{colors.verde}"
    textColor: "{colors.verde-tinta}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
  button-quiet:
    backgroundColor: "{colors.campo}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.pill}"
    padding: "9px 16px"
  input:
    backgroundColor: "{colors.campo}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "13px 16px"
  card:
    backgroundColor: "{colors.superficie}"
    rounded: "{rounded.xl}"
    padding: "24px"
  list-row:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    padding: "13px 18px"
  nav-item-active:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "9px 10px"
  chip-success:
    backgroundColor: "{colors.verde-suave}"
    textColor: "{colors.verde-tinta}"
    rounded: "{rounded.sm}"
    padding: "3px 8px"
---

# Design System: Moraê

## Overview

**Creative North Star: "A Casa em Ordem"**

O Moraê é a sensação de abrir o condomínio e ver tudo no lugar. A interface é clara, silenciosa e organizada como uma casa bem cuidada: fundo cinza-esverdeado claro, cartões brancos planos e listas agrupadas no estilo dos Ajustes do iPhone. Nada disputa atenção sem motivo. O verde aparece onde algo está em dia ou pede uma ação; o âmbar e o vermelho só aparecem quando há algo a resolver.

A gestão (Admin, síndico, Master) passa horas no computador, então a densidade é confortável e a leitura é rápida: título grande, um cartão com os números do mês, e uma lista do que precisa de atenção hoje. O morador entra pelo celular e precisa resolver em segundos. Em ambos os casos, o produto parece o mesmo: mesma tinta, mesmas fontes, mesmos cantos.

O Moraê é sempre claro. Não existe tema escuro, visual infantil ou gamificado, nem foto de banco de imagem; a prova é sempre a tela real do produto.

**Key Characteristics:**
- Fundo `fundo` com cartões `superficie` planos; profundidade por camadas de tom, não por sombra.
- Títulos em Familjen Grotesk Bold, apertados; todo o resto em Hanken Grotesk.
- Listas agrupadas: ícone em quadradinho colorido, título, subtítulo e `›`.
- Números importantes agrupados num só cartão, separados por linhas finas.
- Botões em pílula; campos sem borda, em `campo`.

## Colors

Uma tinta verde-petróleo profunda para o texto, um verde vivo de marca para "em dia" e ação, e neutros levemente esverdeados que fazem o branco dos cartões respirar.

### Primary
- **Verde Moraê** (`verde`): a cor da marca e do "deu certo". Logo, item ativo do menu (ícone), valores em dia, barra de progresso, botão de destaque (ex.: "Chamar no WhatsApp"). Nunca como fundo de área grande.
- **Verde Suave** (`verde-suave`): fundo de etiquetas e ícones de sucesso, painel da marca no login.
- **Verde Tinta** (`verde-tinta`): texto sobre `verde` e `verde-suave`.

### Neutral
- **Tinta Petróleo** (`tinta`): todo texto principal, títulos e o botão primário. É a cor mais usada do sistema.
- **Tinta Suave** (`tinta-suave`): subtítulos, legendas, ícones de linha e textos de apoio.
- **Folha** (`fundo`): fundo das telas do app.
- **Menu** (`menu`): fundo do menu lateral.
- **Campo** (`campo`): fundo dos campos de formulário e botões discretos.
- **Superfície** (`superficie`): cartões, listas, janelas e o item ativo do menu.
- **Linha** (`linha`): divisórias entre linhas de lista e entre números do cartão de resumo.

### Status
- **Âmbar** (`ambar`) com **Âmbar Suave** (`ambar-suave`): vence em breve, atenção, manutenção chegando.
- **Vermelho Telha** (`vermelho`) com **Vermelho Suave** (`vermelho-suave`): atrasado, erro, ação destrutiva.

### Named Rules
**The Verde Significa Em Dia Rule.** O verde nunca é decoração: ele marca o que está pago, em dia, confirmado ou a ação principal de um contexto de marca. Se nada está certo nem pede ação, a tela é tinta sobre branco.

**The Status Em Par Rule.** Toda cor de status vem com o seu par suave: ícone ou texto na cor forte, fundo na suave. Nunca vermelho chapado como fundo.

## Typography

**Display Font:** Familjen Grotesk (com sans-serif)
**Body Font:** Hanken Grotesk (com sans-serif)

**Character:** Familjen Grotesk dá aos títulos um peso firme e levemente condensado, com espaçamento apertado; Hanken Grotesk é limpa e legível em tamanhos pequenos, ideal para listas e números do dia a dia.

### Hierarchy
- **Display** (700, 38px, 1.08, -0.015em): o título da tela ("Bom dia, Carla", "Cobranças") e o título do login.
- **Headline** (700, 26px, 1.15, -0.01em): números grandes do cartão de resumo e títulos de janelas.
- **Title** (700, 21px, 1.2, -0.01em): título de seção ("Hoje", "Unidades") e de cartões.
- **Body** (500, 15px, 1.45): título das linhas de lista, itens do menu e textos de formulário. Hanken Medium e SemiBold 15px são a base do app.
- **Label** (600, 13px, 1.3): rótulos de campo, legendas, datas, subtítulos de linha (Regular 13px quando secundário).

### Named Rules
**The Duas Fontes Rule.** Familjen só em títulos e números de destaque; tudo que se lê em sequência é Hanken. Nunca uma terceira família.

**The Número Tabular Rule.** Valores em reais, contagens e datas em tabelas usam algarismos tabulares (`font-variant-numeric: tabular-nums`) para alinhar colunas.

## Layout

App de gestão no computador: menu lateral fixo de 248px em `menu` + área de conteúdo em `fundo` com margens de 56px nas laterais e 40px no topo. Não há barra de topo separada: o título grande, a data acima dele, o sininho e o avatar ficam na mesma linha. O conteúdo usa uma coluna principal larga (listas) e uma coluna lateral estreita (resumos) quando cabe.

Ritmo de espaçamento em passos de 4: 4, 8, 12, 16, 24, 32, 56. Grupos internos usam 12–16px; separação entre blocos usa 24–32px. No celular, o menu vira navegação inferior/compacta e as colunas empilham, com laterais de 16px.

Telas de acesso (login, senha, convite): formulário de 400px à esquerda sobre branco, painel da marca em `verde-suave` à direita com 20px de canto. No celular, só o formulário.

## Elevation & Depth

O Moraê é plano por padrão e cria profundidade por camadas de tom: `fundo` → `superficie` → `campo`. Sombras existem só como sussurro em cartões e mais presentes em elementos que flutuam (notificação, janela).

### Shadow Vocabulary
- **Sussurro** (`box-shadow: 0 1px 3px rgba(15, 61, 62, 0.06)`): cartões e listas sobre o fundo; item ativo do menu.
- **Flutuante** (`box-shadow: 0 12px 30px -8px rgba(15, 61, 62, 0.10)`): cartões de destaque no painel da marca, notificação "Pix recebido".
- **Janela** (`box-shadow: 0 20px 50px rgba(5, 26, 26, 0.18)`): modais e janelas sobre a tela escurecida.

### Named Rules
**The Plano Por Padrão Rule.** Um cartão nunca ganha sombra mais forte que o Sussurro só para chamar atenção; destaque vem de tipografia e cor de status.

## Shapes

Cantos suaves e consistentes: 6px em etiquetas, 10px em campos, linhas e itens de menu, 14px em blocos médios e ícones em quadradinho grandes, 20px em cartões e no painel da marca, pílula (999px) em todos os botões. Ícones são de linha (estilo Lucide), traço de ~1.5px, na cor `tinta-suave` ou na cor de status dentro de um quadradinho de 36px com canto de 9–10px.

## Components

### Buttons
- **Shape:** pílula (999px).
- **Primary:** fundo `tinta`, texto branco, Hanken SemiBold 15px, altura ~50px no formulário. É o "Entrar", "Salvar", "Criar cobrança".
- **Accent:** fundo `verde`, texto `verde-tinta`, para ações de marca/contato ("Chamar no WhatsApp", "Pagar com Pix").
- **Quiet:** fundo `campo`, texto `tinta`, para ações secundárias e filtros.
- **Hover / Focus:** o fundo passa para o tom forte (`tinta-forte`, `verde-forte`, `menu` no discreto) em 150ms; foco visível com anel de 2px em `verde` afastado 2px.
- **Loading:** o logo animado "Respiro" pequeno + texto no gerúndio ("Salvando…").

### Chips
- **Style:** canto 6px, padding 3px 8px, Hanken SemiBold 12px; sucesso em `verde-suave`/`verde-tinta`, atenção em `ambar-suave`/`ambar`, erro em `vermelho-suave`/`vermelho`.

### Cards / Containers
- **Corner Style:** 20px.
- **Background:** `superficie` sobre `fundo`.
- **Shadow Strategy:** Sussurro.
- **Border:** nenhuma; divisórias internas em `linha`.
- **Internal Padding:** 24–28px.

### Inputs / Fields
- **Style:** sem borda, fundo `campo`, canto 10px, padding 13px 16px, texto Hanken 15px; rótulo acima em Hanken SemiBold 14px.
- **Focus:** fundo `superficie` com anel de 2px em `verde`.
- **Error:** anel em `vermelho` e mensagem curta abaixo em `vermelho`, dizendo o problema e como resolver.

### Navigation
- **Menu lateral:** fundo `menu`, logo + seletor de condomínio no topo, itens com ícone de linha + nome (sem grupos), Hanken Medium 15px em `tinta`. Ativo: fundo `superficie`, canto 10px, Sussurro, ícone em `verde`. "Ajustes" fixo no rodapé.
- **Topo da tela:** data em Label, título em Display, sininho e avatar à direita, sem barra.

### Grouped List (assinatura)
Lista estilo Ajustes: cartão branco com linhas de ~66px separadas por `linha`; cada linha tem ícone em quadradinho de 36px (fundo suave da cor do status + ícone na cor forte), título Hanken SemiBold 15px, subtítulo Regular 13px em `tinta-suave` e `›` à direita.

### Summary Card (assinatura)
Um só cartão com 2–4 números lado a lado, separados por linhas verticais em `linha`: rótulo Label em cima, valor em Headline (verde quando bom, vermelho quando atrasado, tinta quando neutro) e uma linha de contexto embaixo.

## Do's and Don'ts

### Do:
- **Do** usar o fundo `fundo` (#EDF0EA) nas telas do app e cartões `superficie` planos com canto de 20px.
- **Do** juntar os números do mês num só cartão, separados por linhas finas.
- **Do** usar listas agrupadas com ícone em quadradinho colorido, título, subtítulo e `›`.
- **Do** usar os logos animados do Moraê para carregamento (Respiro) e confirmação (Confirmação).
- **Do** manter algarismos tabulares em valores e datas.

### Don't:
- **Don't** criar tema escuro: o Moraê é sempre claro.
- **Don't** usar visual infantil, gamificado ou foto de banco de imagem (prédio genérico, família sorrindo, aperto de mão).
- **Don't** usar o verde como decoração ou fundo de área grande.
- **Don't** colocar barra de topo separada ou agrupar o menu em seções.
- **Don't** usar uma terceira família de fonte nem emoji no lugar de ícone.

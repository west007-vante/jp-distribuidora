# JP Distribuidora — Sistema de vendas

Sistema de balcão do Vinícius (produtos hidráulicos): gerar venda com desconto,
imprimir notinha pra assinatura, produtos com cadastro na hora da venda,
controle de entregas, pagamentos e cheques com lembrete de depósito.

## Stack

- Página estática (HTML + CSS + JS puro) — sem build, hospedada no GitHub Pages
- Banco: Supabase (projeto Steve), tabelas com prefixo `jp_`, RLS fechado
  (só usuário autenticado enxerga os dados; a chave publicável no código é
  pública por natureza)
- Login: usuário único no Supabase Auth (e-mail fixo no código, entra só com senha)

## Estrutura

| arquivo | o que é |
|---|---|
| `index.html` | página única (login + app) |
| `style.css` | identidade visual (dark industrial, rail 64px, print A4 da notinha) |
| `app.js` | toda a lógica: abas, combos, venda, notinha, cheques |
| `icon.svg` + `icon-*.png` | ícones do app (manifest / tela inicial) |

## Rodar local

```bash
python3 -m http.server 7791 --directory .
```

## Banco (Supabase Steve)

Tabelas: `jp_config`, `jp_clientes`, `jp_produtos`, `jp_vendas`,
`jp_venda_itens`, `jp_cheques`. Migration: `jp_distribuidora_inicial`.

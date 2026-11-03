# CLAUDE.md — Quiz CV

Projeto: **Quiz CV**, de Marco Stiehl. Jogo de perguntas sobre Cabo Verde (uma pergunta, quatro opções, uma certa). Site estático, projeto irmão do Hoje CV (`../hojecv`), com o mesmo template e estilo.

## Regras de trabalho
- Responder **sempre em português de Portugal (PT-PT)**.
- Todo o texto visível existe em **PT (por defeito) e EN** no objeto `I18N` do `index.html`.
- Mesmo sistema visual do Hoje CV: tokens CSS em `:root` (claro) e `prefers-color-scheme: dark` / `data-theme`; não usar cores soltas. Alterações para computador dentro de `@media (min-width:900px)`.
- Tom sóbrio e informativo.
- Bandeira oficial igual à do Hoje CV (viewBox 1020×600; não alterar proporções).

## Estrutura
| Ficheiro | Função |
|---|---|
| `index.html` | O site inteiro (HTML + CSS + JS) |
| `perguntas.js` | `window.QUIZCV_ATUALIZADO` e `window.QUIZCV_PERGUNTAS = [[...]]` |

Cada pergunta é um array:
`[pergunta, [4 opções], correta (0–3), explicação, fonte, tema, pergunta_en, [4 opções_en], explicação_en]`
- `tema`: `politica | historia | musica | literatura | artes | desporto | religiao | sociedade | geografia` (rótulos em `I18N.*.temas`).
- As opções são baralhadas no jogo (`ordem`); a ordem no ficheiro não importa. As opções em EN têm de estar na mesma ordem que as em PT.
- Perguntas com formato inválido são ignoradas pelo `QS`.
- Os 3 registos atuais são só exemplos. **A geração das perguntas ainda está por fazer** (ideia: gerar a partir dos registos `verificado` do Hoje CV, com distratores plausíveis).

## Código
- Vistas: `ini` → `jogo` → `fim` (`show(v)`). `RONDA=10` perguntas por ronda (ou menos, se houver menos).
- `localStorage`: `quizcv_lang` (língua), `quizcv_best` (melhor resultado).
- «Copiar resultado» copia `shareText` com o domínio (`SITE`; em local, `quizcv.vercel.app`).

## Critérios para as perguntas
1. Só factos comprovados, com fonte consultável (de preferência fontes de confiança, como no Hoje CV).
2. Uma só resposta certa, sem ambiguidade; os distratores têm de ser plausíveis mas claramente errados.
3. PT-PT com tradução EN.

## Publicar
Testar localmente (`python -m http.server 8000`), commit para o repositório, Vercel republica.
Depois de alterações visuais: testar a ≈390, 1280 e 1920 px, temas claro e escuro, PT e EN.

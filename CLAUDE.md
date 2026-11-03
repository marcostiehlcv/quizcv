# CLAUDE.md — Quiz CV

Projeto: **Quiz CV**, de Marco Stiehl. Jogo de perguntas sobre Cabo Verde (uma pergunta, quatro opções, uma certa). Site estático, projeto irmão do Hoje CV (`../hojecv`), com o mesmo template e estilo.

## Regras de trabalho
- Responder **sempre em português de Portugal (PT-PT)**.
- Todo o texto visível existe em **PT (por defeito) e EN** no objeto `I18N` do `index.html`.
- Mesmo sistema visual do Hoje CV: tokens CSS em `:root` (claro) e `prefers-color-scheme: dark` / `data-theme`; não usar cores soltas. Alterações para computador dentro de `@media (min-width:900px)`.
- Textos em PT-PT a **tratar o jogador por «tu»** (informal): «Quem quer ser cabo-verdiano?» (título, em referência ao «Quem quer ser milionário?»), «Tenta outra vez». Tom leve e bem-disposto nos comentários, informativo nas explicações.
- Bandeira oficial igual à do Hoje CV (viewBox 1020×600; não alterar proporções).

## Estrutura
| Ficheiro | Função |
|---|---|
| `index.html` | O site inteiro (HTML + CSS + JS) |
| `perguntas-base.js` | Perguntas escritas à mão (fonte de verdade; módulo Node) |
| `perguntas-base-2.js` | Segundo lote escrito à mão (b51–b150), juntado pelo `perguntas-base.js` |
| `scripts/gerar-perguntas.js` | Gera o `perguntas.js` = base + perguntas tiradas do `../hojecv/eventos.js`, com validação |
| `perguntas.js` | Gerado; **não editar à mão**. `window.QUIZCV_ATUALIZADO` e `window.QUIZCV_PERGUNTAS` |
| `config.js` | `window.QUIZCV_CONFIG = { API: "<url /exec>" }` para os reportes (vazio = desligados) |
| `Code.gs` | Apps Script dos reportes (folha `reportes`, estado `pendente`) |

Cada pergunta é um array:
`[id, nível, tema, pergunta, [certa, errada, errada, errada], explicação, fonte, pergunta_en, [opções_en], explicação_en]`
- **A primeira opção é sempre a certa**; o jogo baralha-as (`ordem`). As opções em EN na mesma ordem.
- `nível`: 1 fácil, 2 médio, 3 difícil. `id`: `bNN` (escritas à mão) ou `h<hash>` (geradas; djb2 em base 36, estável).
- `tema`: `politica | historia | musica | literatura | artes | desporto | religiao | sociedade | catastrofe | celebracao | geografia`.

### Geração (`node scripts/gerar-perguntas.js`)
- Do Hoje CV entram os registos com fonte, exceto presidentes de câmara e datas tradicionais.
- «Em que ano nasceu/morreu X?» (títulos «Nasce X» / «Morre X»), «Em que ano? «título»» (só se o título não tiver o ano) e «Em que ilha nasceu X?» (só ilhas habitadas).
- Nível: registos com `destaque` → médio; os outros → difícil; «em que ilha» → médio. Os anos errados ficam a ±4–20 anos (médio) ou ±1–8 (difícil), com semente fixa.
- As fáceis vêm só do `perguntas-base.js`. Para ter mais variedade nas fáceis, acrescentar aí.
- Pista (campos 11 e 12): contexto tirado da descrição do registo, sem as frases ou partes sobre nascimento/morte e, nas perguntas de ilha, sem nomes de lugares (`LUGARES`); se ainda revelar a resposta, fica vazia. Ficam de fora as nomeações pouco conhecidas (`OBSCUROS`: capitães, governadores, bispos).
- Depois de regenerar o `eventos.js` do Hoje CV, correr de novo o gerador e fazer commit.

## Código
- Ronda: `NIVEIS` (5×1, 5×2, 5×3), `TEMPO=20` s, `SALTOS=3`, pontos `VALOR` {10,20,30} + segundos que sobram.
- `sorteia(nv, usadas)` escolhe ao acaso entre as não vistas (`quizcv_vistas`); quando se esgotam num nível, recomeça.
- Temporizador: anel `#timer` com os segundos em grande, a pulsar a cada segundo (`beat`); cores do anel: verde até 11 s, amarelo (`mid`) de 10 a 6 s, vermelho (`low`, a pulsar mais forte) abaixo de 6 s. Saltar: `#qbox` sai (`out`) e a nova entra (`in`). O feedback mostra a conta dos pontos (`gain`: base do nível + segundos que sobram).
- Alerta do tempo: a partir de `ALERTA=10` s, `#alerta` (camada fixa, sem cliques) pulsa nas margens da janela, a amarelo e depois a vermelho (abaixo de 6 s, como o anel), a cada segundo, cada vez mais forte (`--k` de 0 a 1). Desliga ao responder, saltar, pausar ou sair do jogo.
- Variedade: `sorteia(nv, usadas, vizinhas)` evita o mesmo tema e o mesmo tipo (`tipo`: nascimento/morte) ao lado e a mesma pessoa (`pessoa`) duas vezes na ronda; se não houver candidatas, alivia as regras.
- Cabeçalho: bandeira de fundo `.flagbg` (grande, inclinada e cortada, em degradê radial a partir da direita, ondular lento), igual à do Hoje CV.
- Página inicial: botão grande e vermelho `.startbig` (brilho a atravessar e play a pulsar) e as regras em quatro blocos coloridos (`I18N.*.rules`; verde, amarelo, vermelho, azul).
- Cartão de partilha: bandeira de fundo `drawFlagBg()` no canto superior direito (inclinada, em degradê), igual à do Hoje CV.
- Fim do tempo: `derrota()` — um véu escuro suave (`.velo`) e a pergunta perde a cor e encolhe por instantes (`#qbox.perdeu`), antes de mostrar a resposta. (O tubarão foi experimentado e retirado.)
- Saltar e Revelar são botões cheios e coloridos (`.tool.big`: azul com o número de saltos, amarelo-laranja com ícone de olho); Reportar fica discreto.
- Viragens: ao responder, revelar ou acabar o tempo, só a opção certa e a errada escolhida dão uma volta em Y (`.opt.flip`). Saltar: só a viragem da caixa (`#qbox` `out`/`in`); o contador de saltos mostra «−1» a subir (`.menos1`) e o número vira (`.n.vira`); o atleta `RUNNER` é o ícone do botão; ao saltar e ao passar à seguinte, a caixa `#qbox` vira em 3D (`out` / `in`).
- Resultado de cada pergunta: cartão translúcido no centro do ecrã (`#resbg` / `.rescard`), com a explicação, a fonte e o «Seguinte»; aparece 1,1 s depois de responder (depois da viragem e dos confetes).
- Antes de cada ronda: contagem 3, 2, 1, «Já!» em grande (`contagem()`, `#cd`).
- Saltar e Revelar: ação imediata, sem confirmação. Terminar: janela `confirma()` (`#conf`, ao centro, temporizador em pausa). «Terminar» (`#quit`) acaba a ronda e mostra o resultado só com as perguntas respondidas.
- Estados de cada pergunta: `certo`, `errado`, `tempo`, `revelado` (`fecha()`). O temporizador pára com o reporte aberto ou o separador escondido.
- Animações: `festa()` (confetes com as cores da bandeira e «+N») e `falha()` (clarão e vibração); respeitam `prefers-reduced-motion`. Comentários em `jokesOk`, `jokesBad`, `jokesTime` (PT e EN).
- Resultado: certas/15, por nível, pontos e recorde (`quizcv_best`). Cartão 1080×1080 em `drawCard()` (mesma bandeira `drawFlag` do Hoje CV): Partilhar… (menu nativo), Guardar imagem, Copiar texto.
- Reportes: motivos fixos (`certa`, `outra`, `pergunta`, `fonte`, `traducao`, `ofensivo`), POST `{id, motivos, lang}`; já enviados em `quizcv_rep`.

## Critérios para as perguntas
1. Só factos comprovados, com fonte consultável (de preferência fontes de confiança, como no Hoje CV).
2. Uma só resposta certa, sem ambiguidade; os distratores têm de ser plausíveis mas claramente errados.
3. PT-PT com tradução EN.

## Reportes (Apps Script)
Criar uma Google Sheet (ex.: «Quiz CV — Reportes»), Extensões → Apps Script, colar o `Code.gs`; Deploy → New deployment → Web app, Execute as **Me**, Who has access **Anyone**. Pôr o URL `/exec` em `config.js`.

## Publicar
Testar localmente (`python -m http.server 8000`), commit para o repositório, Vercel republica.
Depois de alterações visuais: testar a ≈390, 1280 e 1920 px, temas claro e escuro, PT e EN.

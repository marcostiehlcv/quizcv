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
| `perguntas-base-3.js` | Terceiro lote escrito à mão (b151–b250), juntado pelo `perguntas-base.js` |
| `perguntas-criancas.js` | Perguntas da versão para crianças, escritas à mão (ids `bk…`, só níveis 1 e 2; módulo Node). O gerador valida-as e escreve-as em `window.QUIZCV_CRIANCAS` |
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
- Atletas (nascimentos com tema `desporto`): sem «em que ano nasceu» (pelo nome é difícil de mais); só «em que ilha nasceu» e só se houver pista.
- Nível: registos com `destaque` → médio; os outros → difícil (também nas perguntas «em que ilha»: assim o nível difícil tem perguntas que não são de data, precisas para nunca haver duas de data seguidas). Os anos errados ficam a ±4–20 anos (médio) ou ±1–8 (difícil), com semente fixa.
- As fáceis vêm só do `perguntas-base.js`. Para ter mais variedade nas fáceis, acrescentar aí.
- Pista (campos 11 e 12): contexto tirado da descrição do registo, sem as frases ou partes sobre nascimento/morte e, nas perguntas de ilha, sem nomes de lugares (`LUGARES`); nas perguntas «Em que ano? «acontecimento»», sem as frases que têm anos (dariam a resposta por aproximação, ex.: «fica no cargo até 2026»); se ainda revelar a resposta, fica vazia. Ficam de fora as nomeações pouco conhecidas (`OBSCUROS`: capitães, governadores, bispos) e os nascimentos e mortes de presos políticos (descrição com «preso político», como os mortos no Tarrafal).
- Depois de regenerar o `eventos.js` do Hoje CV, correr de novo o gerador e fazer commit.

## Código
- **Versão para crianças** (`modo` = `normal` | `kids`; não fica guardado: o URL decide — `?criancas` (ou `?kids`) abre na versão para crianças e sem nada abre na normal; `urlModo()` atualiza o URL ao trocar de versão (`history.replaceState`, mantém o `lang`), para o link poder ser partilhado; o texto de partilha da versão para crianças leva `/?criancas`; seletor `.modo` / `#modo` por cima do botão «Começar», textos `modoLbl`/`modos`; a versão ativa fica bem marcada: «Normal» a azul `--ocean` com texto branco, «Para crianças» a azul-turquesa `--mar` (cor do mar) com estrela amarela — o Marco recusou amarelo com estrela vermelha, por lembrar política; inativa, a estrela das crianças fica amarela e cintila devagar (`brilha`, desligada com movimento reduzido)). `MODOS` define por versão `niveis`, `tempo` e a chave do melhor resultado (`quizcv_best` / `quizcv_best_kids`); `mudaModo()` troca `NIVEIS`, `TEMPO` e o conjunto de perguntas (`QS` = `QS_N` ou `QS_K`). Crianças: 10 perguntas (5×1, 5×2) só do `perguntas-criancas.js`, 30 s, sem alerta, drone, coração, número gigante, clarão vermelho, tremor nem véu (só tique suave e um som de erro suave). Os textos próprios estão em `I18N.*.k` (subtítulo, regras, pontos, «Muito bem!» / «Quase!» / «O tempo acabou!», resposta certa com «Agora já sabes!», `jokesOk`/`jokesBad`/`jokesTime` de incentivo, `verdict` sempre positivo, rodapé do cartão) e substituem os normais através de `LK` (o `L()` devolve `LK[LANG]` na versão para crianças). Regras para as perguntas de crianças: linguagem simples, a tratar por «tu», explicações curtas e educativas; nada de tragédias, mortes, guerras nem álcool (o gerador recusa o tema `catastrofe` e níveis fora de 1–2). O cartão de partilha só mostra os níveis que existem na ronda.
- Ronda: `NIVEIS` (5×1, 5×2, 5×3), `TEMPO=20` s, `SALTOS=3`, pontos `VALOR` {10,20,30} + segundos que sobram.
- `sorteia(nv, usadas)` escolhe ao acaso entre as não vistas (`quizcv_vistas`); quando se esgotam num nível, recomeça.
- Temporizador: anel `#timer` com os segundos em grande, a pulsar a cada segundo (`beat`); cores do anel: verde até 11 s, amarelo (`mid`) de 10 a 6 s, vermelho (`low`, a pulsar mais forte) abaixo de 6 s. Saltar: `#qbox` sai (`out`) e a nova entra (`in`). O feedback mostra a conta dos pontos (`gain`: base do nível + segundos que sobram).
- Alerta do tempo: a partir de `ALERTA=10` s, `#alerta` (camada fixa, sem cliques) pulsa nas margens da janela, a amarelo e depois a vermelho (abaixo de 6 s, como o anel), a cada segundo, cada vez mais forte (`--k` de 0 a 1). Desliga ao responder, saltar, pausar ou sair do jogo.
- Variedade: `sorteia(nv, usadas, vizinhas, fora)` evita ao lado o mesmo tema e o mesmo `formato` (`vida` = em que ano nasceu/morreu, `lugar` = em que ilha/cidade nasceu, `ano` = «Em que ano? «acontecimento»», `outro` = escritas à mão), nunca põe duas perguntas de data seguidas (`doAno`: começam por «Em que ano/década/século» ou «Quando», de qualquer formato), limita por ronda (`MAXF`: vida 4, lugar 3, ano 5; `MAXATLETA` = 1 pergunta sobre um atleta) e não repete a pessoa na ronda, mesmo noutro formato (`mesmaPessoa`: o nome de `pessoa` não pode aparecer no texto de outra pergunta). Tenta primeiro as não vistas e depois as já vistas, antes de aliviar as regras (senão, com o tempo, as não vistas ficavam quase só de um formato e apareciam 4 «em que ano morreu» seguidas). Ao saltar, `fora` é a pergunta trocada.
- Cabeçalho: bandeira de fundo `.flagbg` (grande, inclinada e cortada, em degradê radial a partir da direita, ondular lento), igual à do Hoje CV.
- Página inicial: botão `.startbig` amarelo sólido, simples (sem riscas, brilhos nem halos: o Marco achou que tiravam credibilidade); por baixo, o cartão «Como funciona» (`.how`) com 4 linhas de ícone monocromático + texto curto (`I18N.*.rules`) e a linha dos pontos (`ptsNote`).
- Cartão de partilha: bandeira de fundo `drawFlagBg()` no canto superior direito (inclinada, em degradê), igual à do Hoje CV.
- Mais apps: no rodapé, por baixo do autor, uma linha discreta (`#apps`, `.apps`) com as outras apps do projeto (nome + descrição curta, `I18N.*.maisApps` / `appsDesc`, abre noutro separador). A lista `APPS` ([id, nome, URL]) é **igual em todas as apps**; `ESTA_APP` esconde a própria. Ao criar uma app nova, acrescentá-la a `APPS` e a `appsDesc` em todas. Os links levam `?lang=pt|en`, e o jogo lê esse parâmetro ao abrir (guarda-o em `quizcv_lang`).
- Fim do tempo: `derrota()` — um véu escuro suave (`.velo`) e a pergunta perde a cor e encolhe por instantes (`#qbox.perdeu`), antes de mostrar a resposta. (O tubarão foi experimentado e retirado.)
- Saltar e 50/50 são botões cheios e coloridos (`.tool.big`: azul com o número de saltos, amarelo-laranja com ícone de círculo partido ao meio); Reportar fica discreto.
- Viragens: ao responder ou acabar o tempo, só a opção certa e a errada escolhida dão uma volta em Y (`.opt.flip`). Saltar: só a viragem da caixa (`#qbox` `out`/`in`); o contador de saltos mostra «−1» a subir (`.menos1`) e o número vira (`.n.vira`); o atleta `RUNNER` é o ícone do botão; ao saltar e ao passar à seguinte, a caixa `#qbox` vira em 3D (`out` / `in`).
- Resultado de cada pergunta: cartão translúcido no centro do ecrã (`#resbg` / `.rescard`), com a explicação, a fonte e o «Seguinte»; aparece 1,1 s depois de responder (depois da viragem e dos confetes).
- Antes de cada ronda: contagem 3, 2, 1, «Já!» em grande (`contagem()`, `#cd`).
- Saltar e 50/50: ação imediata, sem confirmação. O 50/50 (botão `#reveal`) é uma ajuda de uso único por ronda (`MEIO=1`): esconde duas opções erradas ao acaso (`fora`, classe `.opt.fora`, sem clique), com efeito: brilham a amarelo, tremem e apagam-se (`.sai`, uma após a outra), o botão dá um pulso (`.pulso`) e há um som curto a descer; sem animação com movimento reduzido. O tempo continua; se faltarem menos de `MINMEIO=10` s, sobe para 10. A resposta certa conta normalmente (base do nível + segundos que sobram). Substituiu o «Revelar resposta» (5/11/2026). Terminar: janela `confirma()` (`#conf`, ao centro, temporizador em pausa). «Terminar» (`#quit`) acaba a ronda e mostra o resultado só com as perguntas respondidas.
- Som (Web Audio, sem ficheiros): `somTique(s)` a cada segundo — verde tique suave, amarelo dois tiques mais agudos, vermelho batimento grave + tique agudo; `somCerto`, `somErrado`, `somTempo`. Botão `#somBtn` no cabeçalho (`quizcv_som`); o áudio desbloqueia no clique em «Começar»; a contagem 3-2-1 tem um bipe por número e um mais agudo no «Já!».
- Tensão (a partir dos 10 s): `tensao(k)` liga um drone (2 osciladores desafinados + filtro) que sobe de tom, volume e brilho até ao fim; no vermelho o coração bate 2×/s (suave) e nos últimos 3 s há um aviso suave por segundo a subir de tom. O Marco achou a 1.ª versão incomodativa: evitar ondas quadradas/dente de serra e volumes altos. Visual com classes no body: `tens-y` (a página respira), `tens-r` (bate levemente, alerta a pulsar), `tens-x` (últimos 3 s: tremor leve e um pouco menos de saturação); número gigante `#fantasma` por trás nos últimos 5 s. Tudo pára ao responder, saltar, pausar ou desligar o som; sem animações com movimento reduzido.
- Estados de cada pergunta: `certo`, `errado`, `tempo` (`fecha()`). O temporizador pára com o reporte aberto ou o separador escondido.
- Acerto: `boa()` mostra uma palavra grande ao centro do ecrã (`.boa`, amarelo com sombra azul; salta, fica um instante e desaparece em 1 s), escolhida de `I18N.*.boa` («Boa!», «Isso!», «Certíssimo!», «Muito bem!»; na versão para crianças `I18N.*.k.boa`, com «Uau!», «Fantástico!», «Espetacular!»…). Não aparece com movimento reduzido.
- Fim da versão para crianças: `parabens()` (chamado em `fim()`, só com `KIDS()` e pelo menos uma resposta) toca uma fanfarra curta (4 notas a subir), mostra «Parabéns!» e «Chegaste ao fim!» ao centro (`.parab`, textos `k.parab`/`k.parabSub`, 3,2 s) e uma chuva de confetes e estrelas (`.fx i`, `.fx i.st`) com as cores da bandeira. Aparece sempre, seja qual for o resultado. Sem animação com movimento reduzido (fica só o som).
- Cabeçalho: ao lado do logótipo, a etiqueta da versão (`#vtag`, `.vtag`, textos `vtag`): «Normal» com contorno discreto, ou «★ Crianças» a azul-turquesa (`--mar`) com estrela amarela. É desenhada no `applyLang()`.
- Animações: `festa()` (confetes com as cores da bandeira e «+N») e `falha()` (clarão e vibração); respeitam `prefers-reduced-motion`. Comentários em `jokesOk`, `jokesBad`, `jokesTime` (PT e EN).
- Resultado: o ecrã final mostra o próprio cartão de partilha (`drawCard()` no `#fCv`, 1080×1080), com a frase do resultado por cima, pontos/recorde por baixo e os botões Partilhar… (menu nativo), Guardar imagem e Copiar texto; «Jogar outra vez» no mesmo estilo do botão inicial.
- Revisão no fim: por baixo de «Jogar outra vez», o botão «Ver perguntas e respostas» (`#revBtn`, textos `revShow`/`revHide`) abre a lista `#rev` (`renderRev()`): cada pergunta respondida num `<details>` com ✓/✗, a resposta dada (`escolhas[i]`, índice em `O(e)`; `null` = acabou o tempo, texto `noAns`), a certa (`rightIs`), a explicação, a fonte e «Reportar problema». As saltadas não aparecem; se se terminar a meio, só as respondidas.
- Reportes: motivos fixos (`certa`, `outra`, `pergunta`, `fonte`, `traducao`, `ofensivo`), POST `{id, motivos, lang}`; já enviados em `quizcv_rep`. A janela serve durante o jogo e na revisão do fim: `abreRep(e)` guarda a pergunta em `repAlvo`.

## Critérios para as perguntas
1. Só factos comprovados, com fonte consultável (de preferência fontes de confiança, como no Hoje CV).
2. Uma só resposta certa, sem ambiguidade; os distratores têm de ser plausíveis mas claramente errados.
3. PT-PT com tradução EN.

## Reportes (Apps Script)
Criar uma Google Sheet (ex.: «Quiz CV — Reportes»), Extensões → Apps Script, colar o `Code.gs`; Deploy → New deployment → Web app, Execute as **Me**, Who has access **Anyone**. Pôr o URL `/exec` em `config.js`.

## Publicar
Testar localmente (`python -m http.server 8000`), commit para o repositório, Vercel republica.
Depois de alterações visuais: testar a ≈390, 1280 e 1920 px, temas claro e escuro, PT e EN.

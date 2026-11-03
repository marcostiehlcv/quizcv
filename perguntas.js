// Perguntas do Quiz CV.
// Cada pergunta é um array:
// [pergunta, [4 opções], índice da correta (0–3), explicação, fonte (URL), tema,
//  pergunta_en, [4 opções_en], explicação_en]
// tema: politica | historia | musica | literatura | artes | desporto | religiao | sociedade | geografia
// As opções são baralhadas no jogo; a ordem aqui não importa.
// Estas três são só exemplos para testar o jogo; a geração das perguntas fica para depois.
window.QUIZCV_ATUALIZADO = "2026-11-03 12:00";
window.QUIZCV_PERGUNTAS = [
  ["Em que ano se tornou Cabo Verde independente?", ["1975", "1974", "1980", "1991"], 0,
   "A independência foi proclamada a 5 de julho de 1975, na Praia.", "https://www.britannica.com/place/Cabo-Verde", "politica",
   "In which year did Cabo Verde become independent?", ["1975", "1974", "1980", "1991"],
   "Independence was proclaimed on 5 July 1975, in Praia."],
  ["Em que cidade nasceu Cesária Évora?", ["Mindelo", "Praia", "São Filipe", "Ribeira Grande"], 0,
   "Cesária Évora nasceu no Mindelo, ilha de São Vicente, a 27 de agosto de 1941.", "https://www.britannica.com/biography/Cesaria-Evora", "musica",
   "In which city was Cesária Évora born?", ["Mindelo", "Praia", "São Filipe", "Ribeira Grande"],
   "Cesária Évora was born in Mindelo, on São Vicente island, on 27 August 1941."],
  ["Quantas ilhas tem o arquipélago de Cabo Verde?", ["10", "9", "12", "8"], 0,
   "São dez ilhas (nove habitadas; Santa Luzia é desabitada), as mesmas que as dez estrelas da bandeira.", "https://www.britannica.com/place/Cabo-Verde", "geografia",
   "How many islands make up the Cabo Verde archipelago?", ["10", "9", "12", "8"],
   "There are ten islands (nine inhabited; Santa Luzia is uninhabited), like the ten stars on the flag."]
];

// Estrutura da torre: rotas por andar e textos de cada sala.
import type { TipoDeSala } from "../dominio/tipos.ts";

export const regioes = [
  { inicio: 1, nome: "East Blue", tema: "", evento: "Baú no porto" },
  { inicio: 6, nome: "País das Ondas", tema: "mist", evento: "Achado na ponte" },
  { inicio: 11, nome: "Castelo Infinito", tema: "demon-slayer", evento: "Treino da Respiração" },
  { inicio: 16, nome: "Arena do Ki", tema: "dragon-ball", evento: "Treino com Mestre Kame" },
] as const;
export const TOTAL_DE_ANDARES = regioes.length * 5;

export function regiaoDoAndar(andar: number) {
  return regioes[Math.floor((andar - 1) / 5)] ?? regioes[0];
}

/** rotas[n] lista as salas possíveis ao sair do andar n (índice 0 = 1º andar). */
export const rotas: readonly (readonly TipoDeSala[])[] = [
  ["combate"],
  ["combate", "evento"],
  ["combate", "loja"],
  ["combate", "descanso"],
  ["chefe"],
  ["combate"],
  ["combate", "evento"],
  ["combate", "loja"],
  ["combate", "descanso"],
  ["chefe"],
  ["combate"],
  ["combate", "evento"],
  ["combate", "loja"],
  ["combate", "descanso"],
  ["chefe"],
  ["combate"],
  ["combate", "evento"],
  ["combate", "loja"],
  ["combate", "descanso"],
  ["chefe"],
];

export const tiposDeSala: Record<TipoDeSala, { nome: string; icone: string; dica: string }> = {
  combate: { nome: "Combate", icone: "⚔", dica: "Ganhe XP, moedas e chance de drop." },
  evento: { nome: "Evento", icone: "✦", dica: "Escolha entre uma recompensa e moedas." },
  loja: { nome: "Loja", icone: "◈", dica: "Troque moedas por recompensas." },
  descanso: { nome: "Descanso", icone: "☾", dica: "Melhore um item ou treine maestria." },
  chefe: { nome: "Chefe", icone: "♜", dica: "Combate obrigatório para avançar." },
};

export const historiasDeEncontro: readonly (readonly [string, string])[] = [
  ["Cais de East Blue", "O sino do porto toca. Um marinheiro bloqueia a passarela e ergue o sabre."],
  ["Beco do porto", "Um pirata do bando de Buggy corta o caminho entre as caixas e saca uma adaga."],
  ["Armazém costeiro", "O estalo de uma pederneira vem de trás dos barris. O atirador já está de mira levantada."],
  ["Convés tomado", "As tábuas rangem. Um espadachim pirata bate a lâmina no convés e chama você para o duelo."],
  [
    "Tenda do circo",
    "A risada de Buggy ecoa na tenda. Quando ele separar o corpo, procure uma abertura ou troque o corte por outro tipo de golpe.",
  ],
  ["Estrada do País das Ondas", "Marcas de sandália somem na lama. Um ninja renegado surge na estrada com uma kunai na mão."],
  ["Margem da ponte", "Uma máscara branca aparece entre as pedras. O ninja da Névoa toma posição antes que você alcance a ponte."],
  ["Passarela de madeira", "Três agulhas acertam um poste ao lado do caminho. Alguém está testando a distância."],
  ["Entrada da neblina", "Uma espada raspa a pedra na entrada da ponte. O espadachim da Névoa espera em silêncio."],
  ["Ponte coberta pela névoa", "Zabuza arrasta a Kubikiribōchō pelo chão. Quando ele sumir na névoa, prepare-se para a emboscada."],
  ["Portão das glicínias", "As lanternas se apagam e um demônio atravessa o portão."],
  ["Corredor dos fios", "Fios quase invisíveis ligam as colunas. Rui ergue a mão, e a teia se fecha."],
  ["Salão das fitas", "Daki espalha seus obis pelas paredes. A próxima abertura pode durar só um instante."],
  ["Galeria das ondas", "Gyokko emerge de um vaso. O som de água preenche a galeria."],
  ["Pavilhão da Lua", "Kokushibo prepara um corte lunar no segundo turno. Defenda-se do golpe que vem em seguida."],
  ["Planície dos Saiyajins", "Uma semente se abre no chão. O Saibaman salta antes que a poeira baixe."],
  ["Desfiladeiro do scouter", "Raditz ajusta o visor e mede seu ki antes de atacar."],
  ["Campo de treinamento", "Nappa afunda os pés na terra. A arena treme enquanto ele reúne energia."],
  ["Arena dos Androides", "A Androide 18 toma posição. Uma faísca cruza a arena."],
  ["Duelo sob o eclipse", "Vegeta concentra ki no segundo turno. Prepare a defesa para o Canhão Galick no terceiro."],
];

export const historiasDeSala: Record<"evento" | "loja" | "descanso", readonly [string, string, string, string]> = {
  evento: [
    "Um baú escondido sob as redes guarda uma fruta estranha e outras peças de saque.",
    "Entre as tábuas soltas da ponte, você encontra a bolsa abandonada de um viajante.",
    "Sob as glicínias, um mestre oferece um pergaminho da Respiração da Água.",
    "Mestre Kame propõe um treino e oferece ensinar o Kamehameha.",
  ],
  loja: [
    "Um mercador abre o alçapão do cais e acende uma lanterna sobre as mercadorias.",
    "Sob a ponte, um vendedor ambulante desamarra o pano que cobre seu estoque.",
    "Um comerciante abre o estoque de uniformes e pergaminhos da Corporação.",
    "Uma banca exibe cápsulas, técnicas e equipamento de treinamento.",
  ],
  descanso: [
    "O barulho do porto fica distante. Perto de uma fogueira, há espaço para abrir a mochila e treinar.",
    "A neblina para na entrada de um abrigo. Você pode reforçar o equipamento antes de subir.",
    "Em um pátio protegido por glicínias, você pode ajustar seu equipamento antes do duelo.",
    "O vento acalma. Use a pausa para treinar ou reforçar seu equipamento antes de enfrentar Vegeta.",
  ],
};

export const nomesDosAtributos = { atk: "Ataque", def: "Defesa", res: "Resistência" } as const;

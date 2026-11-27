// Tipos centrais do jogo. Nada aqui depende do DOM.

export type Raridade = 0 | 1 | 2 | 3 | 4;

export type Slot = "cabeca" | "tronco" | "calca" | "pes" | "arma" | "poder" | "passiva" | "consumivel";

/** Slots que entram no equipamento (consumíveis ficam só na mochila). */
export type SlotEquipavel = Exclude<Slot, "consumivel">;

export type TipoDeDano = "corte" | "projetil" | "impacto" | "energia" | "fogo" | "sombra";

export type Atributo = "atk" | "def" | "res";

/** Ataque básico de uma arma. O `id` indexa a animação. */
export interface Golpe {
  id: string;
  dano: number;
  tipo: TipoDeDano;
}

/** Habilidade que custa energia (poderes, ou armas na maestria II). */
export interface Habilidade {
  id: string;
  nome: string;
  custo: number;
  dano: number;
  tipo: TipoDeDano;
}

/** Ação especial liberada na maestria II que evita a próxima ação inimiga. */
export interface Especial {
  id: string;
  nome: string;
  custo: number;
}

export interface Forma {
  id: string;
  nome: string;
  custo: number;
  atk: number;
  def: number;
  maestriaMinima: number;
  nivelMinimo: number;
}

export interface EfeitosDoItem {
  atk?: number;
  def?: number;
  res?: number;
  /** Defesa extra ao defender. */
  guarda?: number;
  /** Absorção do primeiro golpe recebido na luta. */
  barreira?: number;
  /** Revela a intenção seguinte e recupera energia ao defender. */
  previsao?: boolean;
  /** Acertos consecutivos somam +2 de dano, até +6. */
  sequencia?: boolean;
  /** Dano extra no ataque seguinte a uma defesa. */
  contra?: number;
  golpe?: Golpe;
  habilidade?: Habilidade;
  especial?: Especial;
  formas?: Forma[];
  /** Chave do poder que precisa estar equipado. */
  exige?: string;
  cura?: number;
  carga?: number;
}

/** Definição de catálogo de um item (dados fixos do jogo). */
export interface Item {
  chave: string;
  nome: string;
  obra: string;
  slot: Slot;
  raridade: Raridade;
  descricao: string;
  efeitos: EfeitosDoItem;
}

/** Instância de um item na mochila do jogador. */
export interface ItemDoInventario {
  id: number;
  chave: string;
  slot: Slot;
  xp: number;
  melhoria: number;
}

export interface Inimigo {
  nome: string;
  pv: number;
  ataque: number;
  ataquePesado: number;
  drop: string;
  chanceDeDrop: number;
  simbolo: string;
}

export type TipoDeSala = "combate" | "evento" | "loja" | "descanso" | "chefe";

export type Tela = "titulo" | "combate" | "recompensa" | "rota" | "evento" | "loja" | "descanso" | "vitoria" | "derrota";

export interface FormaAtiva {
  id: string;
  nome: string;
  atk: number;
  def: number;
  turnos: number;
  itemId: number;
}

export interface Batalha {
  pv: number;
  energia: number;
  pvInimigo: number;
  turno: number;
  /** Maestria ganha por item nesta luta (limite de 4). */
  pratica: Record<string, number>;
  primeiroGolpe: boolean;
  defendeuAntes: boolean;
  combo: number;
  forma: FormaAtiva | null;
  formaUsada: boolean;
  /** Ids de itens cujo especial já foi usado nesta luta. */
  especiaisUsados: number[];
  /** Id do especial que vai evitar a próxima ação inimiga. */
  veu: string | null;
}

export interface Sala {
  itens?: string[];
  drop?: string | null;
  moedas?: number;
  xpGanho?: number;
}

export interface EstadoDaPartida {
  tela: Tela;
  andar: number;
  nivel: number;
  xp: number;
  moedas: number;
  proximoId: number;
  itens: ItemDoInventario[];
  historico: { andar: number; tipo: TipoDeSala }[];
  equipados: Partial<Record<SlotEquipavel, number[]>>;
  pontos: number;
  bonus: Record<Atributo, number>;
  registro: string[];
  ultimoDerrotado: string | null;
  /** Chaves já obtidas nesta jornada. Itens não se repetem. */
  obtidos: string[];
  sala: Sala;
  batalha: Batalha | null;
}

export interface Atributos {
  pv: number;
  energia: number;
  atk: number;
  def: number;
  res: number;
}

export type CategoriaDaAcao = "basico" | "golpe" | "habilidade" | "especial" | "forma" | "consumivel";

/** Uma ação que o jogador pode escolher no turno. */
export interface AcaoDeCombate {
  id: string;
  /** Id da animação no registro (id do golpe, habilidade, especial ou forma). */
  animacaoId: string;
  nome: string;
  detalhe: string;
  categoria: CategoriaDaAcao;
  custo: number;
  desativada: boolean;
  itemId: number | null;
  /** Motivo de estar indisponível (formas). */
  motivo?: string;
}

export type IntencaoInimiga = "ataque" | "pesado" | "corpo-separado" | "nevoa" | "emboscada" | "preparacao";

export interface Intencao {
  tipo: IntencaoInimiga;
  rotulo: string;
  dano: number;
  separa: boolean;
}

export type EventoDoTurno =
  | { tipo: "acaoDoJogador"; acaoId: string; animacaoId: string; nome: string; categoria: CategoriaDaAcao }
  | { tipo: "danoNoInimigo"; valor: number; tipoDeDano: TipoDeDano; pvRestante: number; reduzidoPelaNevoa: boolean }
  | { tipo: "esquivaDoInimigo"; motivo: "corpo-separado" }
  | { tipo: "cura"; pv: number; energia: number }
  | { tipo: "energia"; valor: number }
  | { tipo: "formaAtivada"; formaId: string; turnos: number }
  | { tipo: "especialAtivado"; especialId: string }
  | { tipo: "maestria"; itemId: number; chave: string; nivel: number }
  | { tipo: "acaoInimiga"; animacaoId: string; intencao: IntencaoInimiga; danoBase: number }
  | { tipo: "acaoInimigaEvitada"; especialId: string; intencao: IntencaoInimiga }
  | { tipo: "danoNoJogador"; valor: number; bloqueado: boolean; absorvido: number; pvRestante: number }
  | { tipo: "formaEncerrada"; formaId: string }
  | { tipo: "vitoria"; golpeFinal: string; moedas: number; xp: number; drop: string | null }
  | { tipo: "nivel"; nivel: number }
  | { tipo: "derrota"; andar: number };

export interface ResultadoDoTurno {
  aceito: boolean;
  motivo?: string;
  estado: EstadoDaPartida;
  eventos: EventoDoTurno[];
}

/** Comandos que mudam a partida. A interface só fala com o motor por aqui. */
export type Comando =
  | { tipo: "iniciar" }
  | { tipo: "turno"; acaoId: string }
  | { tipo: "rota"; destino: TipoDeSala }
  | { tipo: "pegar"; chave: string }
  | { tipo: "moedasDoEvento" }
  | { tipo: "comprar"; chave: string }
  | { tipo: "continuar" }
  | { tipo: "sairDaLoja" }
  | { tipo: "moedasDoDescanso" }
  | { tipo: "treinar"; itemId: number }
  | { tipo: "melhorar"; itemId: number }
  | { tipo: "atributo"; atributo: Atributo }
  | { tipo: "equipar"; itemId: number }
  | { tipo: "equiparMelhores" };

/** Fonte de aleatoriedade: devolve um número em [0, 1). */
export type Aleatorio = () => number;

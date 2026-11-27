// Único módulo que acessa o localStorage: save da partida, preferências e
// metadados de sincronização com o servidor.
import type { EstadoDaPartida } from "../dominio/tipos.ts";
import { FORMATO, VERSAO_ATUAL, paraVersaoAtual, type ArquivoDeSave } from "./migracoes.ts";
import { SaveInvalido, validarEstado } from "./validacao.ts";

export const CHAVE_DO_SAVE = "torre-do-eclipse:save";
/** Endereço usado pelo jogo original (v1). Só é lido; nunca é apagado. */
export const CHAVE_DO_SAVE_ANTIGO = "torre-do-eclipse-1";
export const CHAVE_DAS_PREFERENCIAS = "torre-do-eclipse:preferencias";
export const CHAVE_DA_SINCRONIZACAO = "torre-do-eclipse:sincronizacao";
export const TAMANHO_MAXIMO_DO_SAVE = 256 * 1024;

export interface Armazenamento {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
  removeItem(chave: string): void;
}

/** localStorage pode não existir (modo privado, testes) ou lançar erro; nesse caso, usa memória. */
function armazenamentoPadrao(): Armazenamento {
  try {
    if (typeof localStorage !== "undefined") {
      const teste = "__torre_teste__";
      localStorage.setItem(teste, "1");
      localStorage.removeItem(teste);
      return localStorage;
    }
  } catch {
    /* cai para a memória */
  }
  const memoria = new Map<string, string>();
  return {
    getItem: (c) => memoria.get(c) ?? null,
    setItem: (c, v) => void memoria.set(c, v),
    removeItem: (c) => void memoria.delete(c),
  };
}

let armazenamento: Armazenamento | null = null;
function disco(): Armazenamento {
  armazenamento ??= armazenamentoPadrao();
  return armazenamento;
}

/** Troca o armazenamento (usado nos testes). */
export function usarArmazenamento(novo: Armazenamento): void {
  armazenamento = novo;
}

export type ResultadoDoImport = { ok: true; estado: EstadoDaPartida; migrado: boolean } | { ok: false; erro: string };

/** Lê dados de save de qualquer versão conhecida, migra e valida. */
export function lerDadosDeSave(dados: unknown): ResultadoDoImport {
  try {
    const migrado = dados !== null && typeof dados === "object" && (dados as { versao?: unknown }).versao !== VERSAO_ATUAL;
    const estado = validarEstado(paraVersaoAtual(dados));
    return { ok: true, estado, migrado };
  } catch (erro) {
    return { ok: false, erro: erro instanceof SaveInvalido ? erro.message : "Save corrompido." };
  }
}

export function criarArquivo(estado: EstadoDaPartida, agora = new Date()): ArquivoDeSave {
  return { formato: FORMATO, versao: VERSAO_ATUAL, salvoEm: agora.toISOString(), estado };
}

export interface CargaLocal {
  estado: EstadoDaPartida | null;
  origem: "atual" | "antigo" | "nenhum";
  erro?: string;
}

/** Carrega o save atual; se não existir, tenta o endereço do jogo original e migra. */
export function carregarLocal(): CargaLocal {
  const bruto = disco().getItem(CHAVE_DO_SAVE);
  if (bruto) {
    const lido = interpretarTexto(bruto);
    if (lido.ok) return { estado: lido.estado, origem: "atual" };
    return { estado: null, origem: "nenhum", erro: lido.erro };
  }
  const antigo = disco().getItem(CHAVE_DO_SAVE_ANTIGO);
  if (antigo) {
    const lido = interpretarTexto(antigo);
    if (lido.ok) {
      salvarLocal(lido.estado);
      return { estado: lido.estado, origem: "antigo" };
    }
  }
  return { estado: null, origem: "nenhum" };
}

/** Grava o estado. A tela de título não é salva (como no jogo original). */
export function salvarLocal(estado: EstadoDaPartida): ArquivoDeSave | null {
  if (estado.tela === "titulo") return null;
  const arquivo = criarArquivo(estado);
  try {
    disco().setItem(CHAVE_DO_SAVE, JSON.stringify(arquivo));
  } catch {
    return null;
  }
  return arquivo;
}

export function apagarSaveLocal(): void {
  disco().removeItem(CHAVE_DO_SAVE);
}

export function interpretarTexto(texto: string): ResultadoDoImport {
  if (texto.length > TAMANHO_MAXIMO_DO_SAVE) return { ok: false, erro: "Arquivo grande demais para um save." };
  let dados: unknown;
  try {
    dados = JSON.parse(texto);
  } catch {
    return { ok: false, erro: "O arquivo não contém JSON válido." };
  }
  return lerDadosDeSave(dados);
}

/** JSON para download. Inclui versão e data, para ser importado aqui ou em outro aparelho. */
export function exportarSave(estado: EstadoDaPartida): string {
  return JSON.stringify(criarArquivo(estado), null, 2);
}

export const importarSave = interpretarTexto;

// ---- Preferências -------------------------------------------------------

export type ModoDeAnimacao = "completas" | "reduzidas" | "desligadas";

export interface Preferencias {
  /** null = seguir prefers-reduced-motion do sistema. */
  animacoes: ModoDeAnimacao | null;
}

export function carregarPreferencias(): Preferencias {
  try {
    const dados = JSON.parse(disco().getItem(CHAVE_DAS_PREFERENCIAS) ?? "{}") as Partial<Preferencias>;
    const modo = dados.animacoes;
    return { animacoes: modo === "completas" || modo === "reduzidas" || modo === "desligadas" ? modo : null };
  } catch {
    return { animacoes: null };
  }
}

export function salvarPreferencias(preferencias: Preferencias): void {
  try {
    disco().setItem(CHAVE_DAS_PREFERENCIAS, JSON.stringify(preferencias));
  } catch {
    /* preferências são opcionais */
  }
}

// ---- Sincronização ------------------------------------------------------

export interface MetadadosDeSincronizacao {
  /** Conta à qual este save local está vinculado. */
  usuario: string | null;
  /** Revisão do servidor em que o save local se baseia. */
  revisao: number | null;
  /** Há mudanças locais que ainda não foram enviadas. */
  pendente: boolean;
}

export function carregarSincronizacao(): MetadadosDeSincronizacao {
  try {
    const d = JSON.parse(disco().getItem(CHAVE_DA_SINCRONIZACAO) ?? "{}") as Partial<MetadadosDeSincronizacao>;
    return {
      usuario: typeof d.usuario === "string" ? d.usuario : null,
      revisao: typeof d.revisao === "number" && Number.isInteger(d.revisao) ? d.revisao : null,
      pendente: d.pendente === true,
    };
  } catch {
    return { usuario: null, revisao: null, pendente: false };
  }
}

export function salvarSincronizacao(meta: MetadadosDeSincronizacao): void {
  try {
    disco().setItem(CHAVE_DA_SINCRONIZACAO, JSON.stringify(meta));
  } catch {
    /* sem disco, a sincronização recomeça na próxima sessão */
  }
}

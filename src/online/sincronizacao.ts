// Liga o save local à conta online. O jogo nunca espera pelo servidor:
// tudo é salvo primeiro neste aparelho e enviado em seguida.
import type { EstadoDaPartida } from "../dominio/tipos.ts";
import {
  carregarSincronizacao,
  criarArquivo,
  lerDadosDeSave,
  salvarSincronizacao,
  type MetadadosDeSincronizacao,
} from "../salvamento/save.ts";
import { ClienteDaApi, ConflitoDeSave, ErroDaApi, ServidorIndisponivel, type SaveRemoto } from "./api.ts";

export type StatusDaSincronizacao =
  | { tipo: "local" }
  | { tipo: "sem-servidor" }
  | { tipo: "enviando" }
  | { tipo: "pendente" }
  | { tipo: "sincronizado"; revisao: number }
  | { tipo: "conflito"; remoto: { revisao: number; estado: EstadoDaPartida; atualizadoEm: string } }
  | { tipo: "erro"; mensagem: string };

export interface PontesDaSincronizacao {
  estadoAtual(): EstadoDaPartida;
  adotarEstado(estado: EstadoDaPartida): void;
  aoMudar(): void;
}

export const ATRASO_DO_ENVIO = 1200;

export class Sincronizador {
  usuario: string | null = null;
  status: StatusDaSincronizacao = { tipo: "local" };
  servidorDisponivel = false;
  private meta: MetadadosDeSincronizacao = carregarSincronizacao();
  private relogio: ReturnType<typeof setTimeout> | null = null;
  private enviando: Promise<void> | null = null;

  constructor(
    private readonly api: ClienteDaApi,
    private readonly pontes: PontesDaSincronizacao,
  ) {}

  private definir(status: StatusDaSincronizacao): void {
    this.status = status;
    this.pontes.aoMudar();
  }

  private gravarMeta(parcial: Partial<MetadadosDeSincronizacao>): void {
    this.meta = { ...this.meta, ...parcial };
    salvarSincronizacao(this.meta);
  }

  /** Consulta a sessão. Sem servidor, o jogo segue só com o save local. */
  async iniciar(): Promise<void> {
    try {
      const sessao = await this.api.sessao();
      this.servidorDisponivel = true;
      this.usuario = sessao.autenticado ? sessao.usuario : null;
      if (this.usuario) await this.reconciliar();
      else this.definir({ tipo: "local" });
    } catch (erro) {
      this.servidorDisponivel = false;
      this.definir(erro instanceof ServidorIndisponivel ? { tipo: "sem-servidor" } : { tipo: "local" });
    }
  }

  async cadastrar(usuario: string, senha: string): Promise<void> {
    const sessao = await this.api.cadastrar(usuario, senha);
    this.usuario = sessao.usuario;
    await this.reconciliar();
  }

  async entrar(usuario: string, senha: string): Promise<void> {
    const sessao = await this.api.entrar(usuario, senha);
    this.usuario = sessao.usuario;
    await this.reconciliar();
  }

  async sair(): Promise<void> {
    if (this.relogio) clearTimeout(this.relogio);
    await this.api.sair().catch(() => undefined);
    this.usuario = null;
    this.definir({ tipo: "local" });
  }

  /** Chamado a cada save local. Agenda o envio se houver conta. */
  aoSalvarLocal(): void {
    if (!this.usuario) return;
    this.gravarMeta({ pendente: true, usuario: this.usuario });
    if (this.status.tipo === "conflito") return;
    this.definir({ tipo: "pendente" });
    if (this.relogio) clearTimeout(this.relogio);
    this.relogio = setTimeout(() => void this.enviar(), ATRASO_DO_ENVIO);
  }

  async enviar(forcarSobre?: number): Promise<void> {
    if (!this.usuario) return;
    if (this.enviando) await this.enviando;
    const estado = this.pontes.estadoAtual();
    if (estado.tela === "titulo") return;
    const base = forcarSobre ?? (this.meta.usuario === this.usuario ? this.meta.revisao : null);
    this.definir({ tipo: "enviando" });
    this.enviando = (async () => {
      try {
        const r = await this.api.gravarSave(criarArquivo(estado), base);
        this.gravarMeta({ usuario: this.usuario, revisao: r.revisao, pendente: false });
        this.definir({ tipo: "sincronizado", revisao: r.revisao });
      } catch (erro) {
        this.tratarErro(erro);
      } finally {
        this.enviando = null;
      }
    })();
    await this.enviando;
  }

  private tratarErro(erro: unknown): void {
    if (erro instanceof ConflitoDeSave) {
      this.mostrarConflito(erro.atual);
    } else if (erro instanceof ServidorIndisponivel) {
      this.definir({ tipo: "pendente" });
    } else if (erro instanceof ErroDaApi && erro.status === 401) {
      this.usuario = null;
      this.definir({ tipo: "erro", mensagem: "Sessão encerrada. Entre de novo para sincronizar." });
    } else {
      this.definir({ tipo: "erro", mensagem: erro instanceof Error ? erro.message : "Falha ao sincronizar." });
    }
  }

  private mostrarConflito(remoto: SaveRemoto): void {
    const lido = lerDadosDeSave(remoto.dados);
    if (!lido.ok) {
      this.definir({ tipo: "erro", mensagem: "O save do servidor está inválido: " + lido.erro });
      return;
    }
    this.definir({ tipo: "conflito", remoto: { revisao: remoto.revisao, estado: lido.estado, atualizadoEm: remoto.atualizadoEm } });
  }

  /**
   * Compara o save local com o da conta depois do login ou ao abrir o jogo.
   * - Servidor vazio: envia o progresso local.
   * - Mesma revisão: envia só se houver mudanças locais.
   * - Servidor mais novo e nada local pendente: adota o do servidor.
   * - Os dois mudaram (ou o save local é de outra conta): conflito, o jogador escolhe.
   */
  async reconciliar(): Promise<void> {
    if (!this.usuario) return;
    let remoto: SaveRemoto | null;
    try {
      remoto = await this.api.lerSave();
    } catch (erro) {
      this.tratarErro(erro);
      return;
    }
    const local = this.pontes.estadoAtual();
    const temProgressoLocal = local.tela !== "titulo";
    const mesmaConta = this.meta.usuario === this.usuario;

    if (!remoto) {
      if (temProgressoLocal) await this.enviar(undefined);
      else this.definir({ tipo: "sincronizado", revisao: 0 });
      return;
    }
    if (mesmaConta && this.meta.revisao === remoto.revisao) {
      if (this.meta.pendente && temProgressoLocal) await this.enviar(remoto.revisao);
      else this.definir({ tipo: "sincronizado", revisao: remoto.revisao });
      return;
    }
    const remotoLido = lerDadosDeSave(remoto.dados);
    const iguais = remotoLido.ok && JSON.stringify(remotoLido.estado) === JSON.stringify(local);
    if (iguais || !temProgressoLocal || (mesmaConta && !this.meta.pendente)) {
      this.adotar(remoto);
      return;
    }
    this.mostrarConflito(remoto);
  }

  private adotar(remoto: SaveRemoto): void {
    const lido = lerDadosDeSave(remoto.dados);
    if (!lido.ok) {
      this.definir({ tipo: "erro", mensagem: "O save do servidor está inválido: " + lido.erro });
      return;
    }
    this.gravarMeta({ usuario: this.usuario, revisao: remoto.revisao, pendente: false });
    this.pontes.adotarEstado(lido.estado);
    this.definir({ tipo: "sincronizado", revisao: remoto.revisao });
  }

  /** Resolve o conflito: ficar com o progresso do servidor ou sobrescrevê-lo com o deste aparelho. */
  async resolverConflito(escolha: "remoto" | "local"): Promise<void> {
    if (this.status.tipo !== "conflito") return;
    const remoto = this.status.remoto;
    if (escolha === "remoto") {
      this.gravarMeta({ usuario: this.usuario, revisao: remoto.revisao, pendente: false });
      this.pontes.adotarEstado(remoto.estado);
      this.definir({ tipo: "sincronizado", revisao: remoto.revisao });
    } else {
      await this.enviar(remoto.revisao);
    }
  }
}

export function descreverStatus(status: StatusDaSincronizacao, usuario: string | null): { rotulo: string; classe: string } {
  switch (status.tipo) {
    case "local":
      return { rotulo: "Salvo neste aparelho", classe: "local" };
    case "sem-servidor":
      return { rotulo: "Salvo neste aparelho · modo offline", classe: "local" };
    case "enviando":
      return { rotulo: "Sincronizando…", classe: "pendente" };
    case "pendente":
      return { rotulo: usuario ? "Salvo localmente · aguardando envio" : "Salvo neste aparelho", classe: "pendente" };
    case "sincronizado":
      return { rotulo: "Sincronizado com a conta", classe: "ok" };
    case "conflito":
      return { rotulo: "Conflito entre aparelhos", classe: "conflito" };
    case "erro":
      return { rotulo: status.mensagem, classe: "conflito" };
  }
}

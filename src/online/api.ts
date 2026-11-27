// Cliente da API PHP (server/). Sessão por cookie e token CSRF em cabeçalho.
export interface Sessao {
  autenticado: boolean;
  usuario: string | null;
  csrf: string;
}

export interface SaveRemoto {
  revisao: number;
  dados: unknown;
  atualizadoEm: string;
}

export class ErroDaApi extends Error {
  readonly status: number;
  readonly corpo: Record<string, unknown>;
  constructor(status: number, mensagem: string, corpo: Record<string, unknown> = {}) {
    super(mensagem);
    this.name = "ErroDaApi";
    this.status = status;
    this.corpo = corpo;
  }
}

/** PUT /api/save recusado porque o servidor tem uma revisão mais nova. */
export class ConflitoDeSave extends ErroDaApi {
  readonly atual: SaveRemoto;
  constructor(atual: SaveRemoto) {
    super(409, "O servidor tem um progresso diferente deste aparelho.");
    this.name = "ConflitoDeSave";
    this.atual = atual;
  }
}

export class ServidorIndisponivel extends Error {
  constructor() {
    super("Servidor indisponível.");
    this.name = "ServidorIndisponivel";
  }
}

function lerSaveRemoto(valor: unknown): SaveRemoto | null {
  const o = valor as { revisao?: unknown; dados?: unknown; atualizado_em?: unknown } | null;
  if (!o || typeof o.revisao !== "number") return null;
  return { revisao: o.revisao, dados: o.dados, atualizadoEm: String(o.atualizado_em ?? "") };
}

export class ClienteDaApi {
  private csrf: string | null = null;
  constructor(
    private readonly base: string = import.meta.env?.VITE_API_URL || "/api",
    private readonly tempoLimite = 8000,
  ) {}

  private async pedir(metodo: string, caminho: string, corpo?: unknown): Promise<Record<string, unknown>> {
    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), this.tempoLimite);
    const cabecalhos: Record<string, string> = { Accept: "application/json" };
    if (corpo !== undefined) cabecalhos["Content-Type"] = "application/json";
    if (metodo !== "GET" && this.csrf) cabecalhos["X-CSRF-Token"] = this.csrf;
    let resposta: Response;
    try {
      resposta = await fetch(this.base + caminho, {
        method: metodo,
        headers: cabecalhos,
        body: corpo === undefined ? null : JSON.stringify(corpo),
        credentials: "same-origin",
        signal: controle.signal,
      });
    } catch {
      throw new ServidorIndisponivel();
    } finally {
      clearTimeout(relogio);
    }
    const tipo = resposta.headers.get("Content-Type") ?? "";
    if (!tipo.includes("application/json")) throw new ServidorIndisponivel();
    const dados = (await resposta.json().catch(() => ({}))) as Record<string, unknown>;
    if (typeof dados.csrf === "string") this.csrf = dados.csrf;
    if (resposta.status === 409) {
      const atual = lerSaveRemoto(dados.atual);
      if (atual) throw new ConflitoDeSave(atual);
    }
    if (!resposta.ok) throw new ErroDaApi(resposta.status, String(dados.erro ?? "Erro " + resposta.status), dados);
    return dados;
  }

  async sessao(): Promise<Sessao> {
    const d = await this.pedir("GET", "/session");
    return { autenticado: d.autenticado === true, usuario: typeof d.usuario === "string" ? d.usuario : null, csrf: String(d.csrf ?? "") };
  }

  private async garantirCsrf(): Promise<void> {
    if (!this.csrf) await this.sessao();
  }

  async cadastrar(usuario: string, senha: string): Promise<Sessao> {
    await this.garantirCsrf();
    const d = await this.pedir("POST", "/register", { usuario, senha });
    return { autenticado: true, usuario: String(d.usuario ?? usuario), csrf: String(d.csrf ?? "") };
  }

  async entrar(usuario: string, senha: string): Promise<Sessao> {
    await this.garantirCsrf();
    const d = await this.pedir("POST", "/login", { usuario, senha });
    return { autenticado: true, usuario: String(d.usuario ?? usuario), csrf: String(d.csrf ?? "") };
  }

  async sair(): Promise<void> {
    await this.garantirCsrf();
    await this.pedir("POST", "/logout");
  }

  async lerSave(): Promise<SaveRemoto | null> {
    const d = await this.pedir("GET", "/save");
    return lerSaveRemoto(d.save);
  }

  /** Grava se a revisão do servidor ainda for `revisaoBase`; senão lança ConflitoDeSave. */
  async gravarSave(dados: unknown, revisaoBase: number | null): Promise<{ revisao: number; atualizadoEm: string }> {
    await this.garantirCsrf();
    const d = await this.pedir("PUT", "/save", { revisao_base: revisaoBase, dados });
    return { revisao: Number(d.revisao), atualizadoEm: String(d.atualizado_em ?? "") };
  }
}

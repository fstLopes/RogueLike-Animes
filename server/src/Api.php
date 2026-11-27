<?php

declare(strict_types=1);

namespace Torre\Api;

use PDO;

/** Rotas da API. Cada conta só enxerga o próprio save: o id vem sempre da sessão. */
final class Api
{
    private ?PDO $pdo = null;

    public function __construct(
        private readonly Configuracao $config,
        private readonly Sessao $sessao,
    ) {
    }

    private function pdo(): PDO
    {
        return $this->pdo ??= Banco::conectar($this->config);
    }

    public function atender(Requisicao $req): void
    {
        try {
            $this->verificarOrigem($req);
            $this->sessao->iniciar();
            [$status, $dados] = $this->rotear($req);
            Resposta::json($status, $dados + ['csrf' => $this->sessao->csrf()]);
        } catch (ErroHttp $erro) {
            $csrf = session_status() === PHP_SESSION_ACTIVE ? ['csrf' => $this->sessao->csrf()] : [];
            Resposta::json($erro->status, ['erro' => $erro->getMessage()] + $erro->extras + $csrf);
        } catch (\Throwable $erro) {
            error_log('[torre-api] ' . $erro::class . ': ' . $erro->getMessage());
            $mensagem = $this->config->emProducao() ? 'Erro interno.' : 'Erro interno: ' . $erro->getMessage();
            Resposta::json(500, ['erro' => $mensagem]);
        }
    }

    /** @return array{0: int, 1: array<string, mixed>} */
    private function rotear(Requisicao $req): array
    {
        $rotas = [
            '/api/session' => ['GET' => fn () => $this->sessaoAtual()],
            '/api/register' => ['POST' => fn () => $this->cadastrar($req)],
            '/api/login' => ['POST' => fn () => $this->entrar($req)],
            '/api/logout' => ['POST' => fn () => $this->sair($req)],
            '/api/save' => ['GET' => fn () => $this->lerSave(), 'PUT' => fn () => $this->gravarSave($req)],
        ];
        $rota = $rotas[$req->caminho] ?? null;
        if ($rota === null) {
            throw new ErroHttp(404, 'Rota não encontrada.');
        }
        $acao = $rota[$req->metodo] ?? null;
        if ($acao === null) {
            header('Allow: ' . implode(', ', array_keys($rota)));
            throw new ErroHttp(405, 'Método não permitido.');
        }
        if ($req->metodo !== 'GET') {
            $this->sessao->exigirCsrf($req);
        }
        return $acao();
    }

    /**
     * Se o navegador informar Origin, ela precisa ser o próprio host ou estar em
     * ORIGENS_PERMITIDAS. Complementa o token CSRF.
     */
    private function verificarOrigem(Requisicao $req): void
    {
        $origem = $req->cabecalho('origin');
        if ($origem === null || $origem === '') {
            return;
        }
        $host = parse_url($origem, PHP_URL_HOST);
        $porta = parse_url($origem, PHP_URL_PORT);
        $hostDaOrigem = $host . ($porta ? ':' . $porta : '');
        $permitidas = array_map(static fn (string $o): string => rtrim($o, '/'), $this->config->lista('ORIGENS_PERMITIDAS'));
        if ($hostDaOrigem === ($req->cabecalho('host') ?? '') || in_array(rtrim($origem, '/'), $permitidas, true)) {
            return;
        }
        throw new ErroHttp(403, 'Origem não permitida.');
    }

    /** @return array{0: int, 1: array<string, mixed>} */
    private function sessaoAtual(): array
    {
        $usuario = $this->sessao->usuario();
        return [200, ['autenticado' => $usuario !== null, 'usuario' => $usuario]];
    }

    /** @return array{0: int, 1: array<string, mixed>} */
    private function cadastrar(Requisicao $req): array
    {
        $dados = $req->json();
        $usuario = Validacao::usuario($dados);
        $senha = Validacao::senha($dados);
        $conta = (new Contas($this->pdo()))->cadastrar($usuario, $senha);
        $this->sessao->entrar($conta['id'], $conta['usuario']);
        return [201, ['autenticado' => true, 'usuario' => $conta['usuario']]];
    }

    /** @return array{0: int, 1: array<string, mixed>} */
    private function entrar(Requisicao $req): array
    {
        $dados = $req->json();
        $usuario = Validacao::usuario($dados);
        $senha = is_string($dados['senha'] ?? null) ? $dados['senha'] : '';
        if ($senha === '' || strlen($senha) > Validacao::SENHA_MAXIMA_BYTES) {
            throw new ErroHttp(401, 'Usuário ou senha incorretos.');
        }
        $conta = (new Contas($this->pdo()))->entrar($usuario, $senha, $req->ip);
        $this->sessao->entrar($conta['id'], $conta['usuario']);
        return [200, ['autenticado' => true, 'usuario' => $conta['usuario']]];
    }

    /** @return array{0: int, 1: array<string, mixed>} */
    private function sair(Requisicao $req): array
    {
        $this->sessao->sair();
        return [200, ['autenticado' => false, 'usuario' => null]];
    }

    /** @return array{0: int, 1: array<string, mixed>} */
    private function lerSave(): array
    {
        $id = $this->sessao->exigirUsuario();
        return [200, ['save' => (new Saves($this->pdo()))->ler($id)]];
    }

    /** @return array{0: int, 1: array<string, mixed>} */
    private function gravarSave(Requisicao $req): array
    {
        $id = $this->sessao->exigirUsuario();
        $save = Validacao::save($req->jsonObjeto());
        $resultado = (new Saves($this->pdo()))->gravar($id, $save['base'], $save['json']);
        return [200, $resultado];
    }
}

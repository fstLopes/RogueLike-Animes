<?php

declare(strict_types=1);

namespace Torre\Api;

/** Erro com status HTTP; vira uma resposta JSON { "erro": ... }. */
final class ErroHttp extends \RuntimeException
{
    /** @param array<string, mixed> $extras */
    public function __construct(public readonly int $status, string $mensagem, public readonly array $extras = [])
    {
        parent::__construct($mensagem);
    }
}

final class Requisicao
{
    public const TAMANHO_MAXIMO = 300 * 1024;

    /** @param array<string, string> $cabecalhos */
    public function __construct(
        public readonly string $metodo,
        public readonly string $caminho,
        public readonly array $cabecalhos,
        private readonly string $corpo,
        public readonly string $ip,
    ) {
    }

    public static function atual(): self
    {
        $cabecalhos = [];
        foreach ($_SERVER as $chave => $valor) {
            if (str_starts_with((string) $chave, 'HTTP_')) {
                $cabecalhos[strtolower(str_replace('_', '-', substr((string) $chave, 5)))] = (string) $valor;
            }
        }
        if (isset($_SERVER['CONTENT_TYPE'])) {
            $cabecalhos['content-type'] = (string) $_SERVER['CONTENT_TYPE'];
        }
        $caminho = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?: '/';
        $corpo = (string) file_get_contents('php://input', false, null, 0, self::TAMANHO_MAXIMO + 1);
        return new self(
            strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')),
            rtrim($caminho, '/') ?: '/',
            $cabecalhos,
            $corpo,
            (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'),
        );
    }

    public function cabecalho(string $nome): ?string
    {
        return $this->cabecalhos[strtolower($nome)] ?? null;
    }

    /** @return array<string, mixed> */
    public function json(): array
    {
        if (strlen($this->corpo) > self::TAMANHO_MAXIMO) {
            throw new ErroHttp(413, 'Requisição grande demais.');
        }
        if ($this->corpo === '') {
            return [];
        }
        $tipo = strtolower($this->cabecalho('content-type') ?? '');
        if (!str_starts_with($tipo, 'application/json')) {
            throw new ErroHttp(415, 'Envie JSON (Content-Type: application/json).');
        }
        try {
            $dados = json_decode($this->corpo, true, 64, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new ErroHttp(400, 'JSON inválido.');
        }
        if (!is_array($dados) || array_is_list($dados) && $dados !== []) {
            throw new ErroHttp(400, 'O corpo deve ser um objeto JSON.');
        }
        return $dados;
    }

    /**
     * Decodifica o corpo preservando objetos (stdClass). Necessário para o save:
     * em modo array, o PHP transformaria {} em [] ao gravar de volta.
     */
    public function jsonObjeto(): \stdClass
    {
        if (strlen($this->corpo) > self::TAMANHO_MAXIMO) {
            throw new ErroHttp(413, 'Requisição grande demais.');
        }
        $tipo = strtolower($this->cabecalho('content-type') ?? '');
        if (!str_starts_with($tipo, 'application/json')) {
            throw new ErroHttp(415, 'Envie JSON (Content-Type: application/json).');
        }
        try {
            $dados = json_decode($this->corpo, false, 64, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new ErroHttp(400, 'JSON inválido.');
        }
        if (!$dados instanceof \stdClass) {
            throw new ErroHttp(400, 'O corpo deve ser um objeto JSON.');
        }
        return $dados;
    }

    public function tamanhoDoCorpo(): int
    {
        return strlen($this->corpo);
    }
}

final class Resposta
{
    /** @param array<string, mixed> $dados */
    public static function json(int $status, array $dados): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: same-origin');
        header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
        echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }
}

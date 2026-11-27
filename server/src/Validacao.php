<?php

declare(strict_types=1);

namespace Torre\Api;

/** Validação de entrada no servidor. O navegador nunca é considerado confiável. */
final class Validacao
{
    public const SENHA_MINIMA = 8;
    /** bcrypt usa só os primeiros 72 bytes; senhas maiores são recusadas. */
    public const SENHA_MAXIMA_BYTES = 72;
    public const SAVE_MAXIMO_BYTES = 256 * 1024;

    /** @param array<string, mixed> $dados */
    public static function usuario(array $dados): string
    {
        $usuario = $dados['usuario'] ?? null;
        if (!is_string($usuario) || !preg_match('/^[A-Za-z0-9_.\-]{3,32}$/', $usuario)) {
            throw new ErroHttp(422, 'Usuário deve ter de 3 a 32 letras, números, ponto, hífen ou sublinhado.', ['campo' => 'usuario']);
        }
        return $usuario;
    }

    /** @param array<string, mixed> $dados */
    public static function senha(array $dados): string
    {
        $senha = $dados['senha'] ?? null;
        if (!is_string($senha) || mb_strlen($senha) < self::SENHA_MINIMA || strlen($senha) > self::SENHA_MAXIMA_BYTES) {
            throw new ErroHttp(422, 'A senha deve ter pelo menos 8 caracteres (máximo de 72 bytes).', ['campo' => 'senha']);
        }
        return $senha;
    }

    /**
     * Confere a forma do save: envelope { formato, versao, salvoEm, estado }.
     * Recebe objetos (stdClass) para regravar o JSON sem trocar {} por [].
     * O servidor não consegue validar as regras do jogo (por isso não há ranking).
     *
     * @return array{base: ?int, json: string}
     */
    public static function save(\stdClass $corpo): array
    {
        $base = $corpo->revisao_base ?? null;
        if ($base !== null && (!is_int($base) || $base < 1)) {
            throw new ErroHttp(422, 'revisao_base deve ser nulo ou um inteiro positivo.');
        }
        $dados = $corpo->dados ?? null;
        if (!$dados instanceof \stdClass) {
            throw new ErroHttp(422, 'dados deve ser um objeto.');
        }
        if (($dados->formato ?? null) !== 'torre-do-eclipse') {
            throw new ErroHttp(422, 'dados não é um save da Torre do Eclipse.');
        }
        $versao = $dados->versao ?? null;
        if (!is_int($versao) || $versao < 2 || $versao > 1000) {
            throw new ErroHttp(422, 'Versão do save inválida.');
        }
        if (!(($dados->estado ?? null) instanceof \stdClass)) {
            throw new ErroHttp(422, 'O save não tem um estado de partida.');
        }
        $salvoEm = $dados->salvoEm ?? '';
        if (!is_string($salvoEm) || strlen($salvoEm) > 40) {
            throw new ErroHttp(422, 'salvoEm inválido.');
        }
        $json = json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        if (strlen($json) > self::SAVE_MAXIMO_BYTES) {
            throw new ErroHttp(413, 'Save grande demais.');
        }
        return ['base' => $base, 'json' => $json];
    }
}

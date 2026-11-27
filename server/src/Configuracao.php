<?php

declare(strict_types=1);

namespace Torre\Api;

/**
 * Lê server/.env (se existir) e as variáveis de ambiente. Variáveis de ambiente
 * do processo têm prioridade sobre o arquivo.
 */
final class Configuracao
{
    /** @var array<string, string> */
    private array $valores = [];

    public function __construct(?string $arquivo = null)
    {
        $arquivo ??= dirname(__DIR__) . '/.env';
        if (is_file($arquivo)) {
            foreach (file($arquivo, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $linha) {
                $linha = trim($linha);
                if ($linha === '' || str_starts_with($linha, '#') || !str_contains($linha, '=')) {
                    continue;
                }
                [$chave, $valor] = array_map('trim', explode('=', $linha, 2));
                $this->valores[$chave] = trim($valor, "\"'");
            }
        }
    }

    public function texto(string $chave, string $padrao = ''): string
    {
        $doAmbiente = getenv($chave);
        if ($doAmbiente !== false && $doAmbiente !== '') {
            return $doAmbiente;
        }
        return $this->valores[$chave] ?? $padrao;
    }

    public function inteiro(string $chave, int $padrao): int
    {
        $valor = $this->texto($chave, (string) $padrao);
        return ctype_digit($valor) ? (int) $valor : $padrao;
    }

    public function booleano(string $chave, bool $padrao): bool
    {
        $valor = strtolower($this->texto($chave, $padrao ? 'true' : 'false'));
        return in_array($valor, ['1', 'true', 'sim', 'yes', 'on'], true);
    }

    /** @return list<string> */
    public function lista(string $chave): array
    {
        $partes = array_map('trim', explode(',', $this->texto($chave)));
        return array_values(array_filter($partes, static fn (string $p): bool => $p !== ''));
    }

    public function emProducao(): bool
    {
        return $this->texto('APP_AMBIENTE', 'producao') === 'producao';
    }
}

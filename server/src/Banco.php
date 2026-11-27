<?php

declare(strict_types=1);

namespace Torre\Api;

use PDO;

/** Cria a conexão PDO. MySQL em produção; SQLite para testes e desenvolvimento sem MySQL. */
final class Banco
{
    public static function conectar(Configuracao $config): PDO
    {
        $driver = $config->texto('DB_DRIVER', 'mysql');
        $opcoes = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        if ($driver === 'sqlite') {
            $arquivo = $config->texto('DB_ARQUIVO', dirname(__DIR__) . '/dados/torre.sqlite');
            $pdo = new PDO('sqlite:' . $arquivo, null, null, $opcoes);
            $pdo->exec('PRAGMA foreign_keys = ON');
            $pdo->exec('PRAGMA busy_timeout = 5000');
            return $pdo;
        }
        if ($driver !== 'mysql') {
            throw new \RuntimeException('DB_DRIVER deve ser mysql ou sqlite.');
        }
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $config->texto('DB_HOST', '127.0.0.1'),
            $config->inteiro('DB_PORTA', 3306),
            $config->texto('DB_NOME', 'torre_do_eclipse'),
        );
        return new PDO($dsn, $config->texto('DB_USUARIO'), $config->texto('DB_SENHA'), $opcoes);
    }

    public static function driver(PDO $pdo): string
    {
        return (string) $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    }

    /** Data e hora UTC no formato aceito por MySQL e SQLite. */
    public static function agora(): string
    {
        return gmdate('Y-m-d H:i:s');
    }

    /** Converte a data do banco para ISO 8601 em UTC. */
    public static function iso(string $data): string
    {
        return str_replace(' ', 'T', $data) . 'Z';
    }
}

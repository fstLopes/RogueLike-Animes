<?php

declare(strict_types=1);

namespace Torre\Api;

use PDO;
use PDOException;

/** Cadastro, login e limite de tentativas. Todas as consultas usam parâmetros. */
final class Contas
{
    private const JANELA_MINUTOS = 15;
    private const LIMITE_POR_USUARIO = 8;
    private const LIMITE_POR_IP = 40;
    /** Hash válido de uma senha qualquer, usado quando o usuário não existe. */
    private const HASH_FICTICIO = '$2y$10$PEQp0gbFSWzTgoqAmYxjwevYckKsFdjp5U9CxOXSmnzmemEBfAWVi';

    public function __construct(private readonly PDO $pdo)
    {
    }

    /** @return array{id: int, usuario: string} */
    public function cadastrar(string $usuario, string $senha): array
    {
        $hash = password_hash($senha, PASSWORD_DEFAULT);
        try {
            $sql = $this->pdo->prepare('INSERT INTO usuarios (usuario, usuario_chave, senha_hash, criado_em) VALUES (:usuario, :chave, :hash, :agora)');
            $sql->execute([':usuario' => $usuario, ':chave' => strtolower($usuario), ':hash' => $hash, ':agora' => Banco::agora()]);
        } catch (PDOException $erro) {
            if ($this->violouUnicidade($erro)) {
                throw new ErroHttp(409, 'Esse nome de usuário já está em uso.', ['campo' => 'usuario']);
            }
            throw $erro;
        }
        return ['id' => (int) $this->pdo->lastInsertId(), 'usuario' => $usuario];
    }

    /** @return array{id: int, usuario: string} */
    public function entrar(string $usuario, string $senha, string $ip): array
    {
        $chave = strtolower($usuario);
        $this->verificarLimite($chave, $ip);
        $sql = $this->pdo->prepare('SELECT id, usuario, senha_hash FROM usuarios WHERE usuario_chave = :chave');
        $sql->execute([':chave' => $chave]);
        $linha = $sql->fetch();
        // Verifica um hash qualquer quando o usuário não existe, para o tempo de resposta não revelar isso.
        $hash = is_array($linha) ? (string) $linha['senha_hash'] : self::HASH_FICTICIO;
        if (!password_verify($senha, $hash) || !is_array($linha)) {
            $this->registrarFalha($chave, $ip);
            throw new ErroHttp(401, 'Usuário ou senha incorretos.');
        }
        if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
            $novo = $this->pdo->prepare('UPDATE usuarios SET senha_hash = :hash WHERE id = :id');
            $novo->execute([':hash' => password_hash($senha, PASSWORD_DEFAULT), ':id' => $linha['id']]);
        }
        $limpar = $this->pdo->prepare('DELETE FROM tentativas_login WHERE usuario_chave = :chave');
        $limpar->execute([':chave' => $chave]);
        return ['id' => (int) $linha['id'], 'usuario' => (string) $linha['usuario']];
    }

    private function verificarLimite(string $chave, string $ip): void
    {
        $desde = gmdate('Y-m-d H:i:s', time() - self::JANELA_MINUTOS * 60);
        $porUsuario = $this->pdo->prepare('SELECT COUNT(*) FROM tentativas_login WHERE usuario_chave = :chave AND ocorrida_em >= :desde');
        $porUsuario->execute([':chave' => $chave, ':desde' => $desde]);
        $porIp = $this->pdo->prepare('SELECT COUNT(*) FROM tentativas_login WHERE ip = :ip AND ocorrida_em >= :desde');
        $porIp->execute([':ip' => $ip, ':desde' => $desde]);
        if ((int) $porUsuario->fetchColumn() >= self::LIMITE_POR_USUARIO || (int) $porIp->fetchColumn() >= self::LIMITE_POR_IP) {
            throw new ErroHttp(429, 'Muitas tentativas. Espere alguns minutos e tente de novo.');
        }
    }

    private function registrarFalha(string $chave, string $ip): void
    {
        $sql = $this->pdo->prepare('INSERT INTO tentativas_login (usuario_chave, ip, ocorrida_em) VALUES (:chave, :ip, :agora)');
        $sql->execute([':chave' => $chave, ':ip' => $ip, ':agora' => Banco::agora()]);
    }

    private function violouUnicidade(PDOException $erro): bool
    {
        $codigo = (string) $erro->getCode();
        return $codigo === '23000' || $codigo === '23505' || str_contains($erro->getMessage(), 'UNIQUE');
    }
}

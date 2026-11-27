<?php

declare(strict_types=1);

namespace Torre\Api;

/** Sessão por cookie (HttpOnly, SameSite=Lax, Secure em HTTPS) e token CSRF. */
final class Sessao
{
    private const NOME = 'torre_sessao';
    private const DURACAO = 60 * 60 * 24 * 30;

    public function __construct(private readonly Configuracao $config)
    {
    }

    public function iniciar(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.use_trans_sid', '0');
        ini_set('session.gc_maxlifetime', (string) self::DURACAO);
        $pasta = $this->config->texto('SESSAO_PASTA');
        if ($pasta !== '') {
            session_save_path($pasta);
        }
        session_name(self::NOME);
        session_set_cookie_params([
            'lifetime' => self::DURACAO,
            'path' => '/',
            'secure' => $this->config->booleano('SESSAO_SEGURA', $this->config->emProducao()),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
        if (!isset($_SESSION['csrf']) || !is_string($_SESSION['csrf'])) {
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
        }
    }

    public function csrf(): string
    {
        return (string) $_SESSION['csrf'];
    }

    /** Toda requisição que altera algo precisa do token no cabeçalho X-CSRF-Token. */
    public function exigirCsrf(Requisicao $req): void
    {
        $token = $req->cabecalho('x-csrf-token') ?? '';
        if ($token === '' || !hash_equals($this->csrf(), $token)) {
            throw new ErroHttp(403, 'Token CSRF ausente ou inválido. Recarregue a página.');
        }
    }

    public function usuarioId(): ?int
    {
        $id = $_SESSION['usuario_id'] ?? null;
        return is_int($id) ? $id : null;
    }

    public function usuario(): ?string
    {
        $nome = $_SESSION['usuario'] ?? null;
        return is_string($nome) ? $nome : null;
    }

    public function exigirUsuario(): int
    {
        $id = $this->usuarioId();
        if ($id === null) {
            throw new ErroHttp(401, 'Entre na sua conta para continuar.');
        }
        return $id;
    }

    /** Troca o id da sessão e o token CSRF ao entrar (evita fixação de sessão). */
    public function entrar(int $id, string $usuario): void
    {
        session_regenerate_id(true);
        $_SESSION['usuario_id'] = $id;
        $_SESSION['usuario'] = $usuario;
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }

    public function sair(): void
    {
        $_SESSION = [];
        session_regenerate_id(true);
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
}

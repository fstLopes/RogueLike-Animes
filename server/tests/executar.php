<?php

declare(strict_types=1);

// Teste de integração da API: sobe o servidor embutido do PHP com um banco
// SQLite temporário e faz requisições HTTP reais.
//   php server/tests/executar.php
// Para rodar contra MySQL: defina DB_DRIVER=mysql e as variáveis DB_* antes
// (o teste usa o banco informado; use um banco descartável).

$raiz = dirname(__DIR__);
$temp = sys_get_temp_dir() . '/torre-api-teste-' . bin2hex(random_bytes(4));
mkdir($temp);
mkdir($temp . '/sessoes');
$ambiente = [
    'APP_AMBIENTE' => 'desenvolvimento',
    'DB_DRIVER' => getenv('DB_DRIVER') ?: 'sqlite',
    'DB_ARQUIVO' => $temp . '/teste.sqlite',
    'SESSAO_PASTA' => $temp . '/sessoes',
    'SESSAO_SEGURA' => 'false',
    'ORIGENS_PERMITIDAS' => 'http://localhost:5173',
];
foreach (['DB_HOST', 'DB_PORTA', 'DB_NOME', 'DB_USUARIO', 'DB_SENHA'] as $chave) {
    if (getenv($chave) !== false) {
        $ambiente[$chave] = (string) getenv($chave);
    }
}
foreach ($ambiente as $chave => $valor) {
    putenv("$chave=$valor");
}

passthru(PHP_BINARY . ' ' . escapeshellarg($raiz . '/bin/migrar.php'), $codigo);
if ($codigo !== 0) {
    fwrite(STDERR, "As migrações falharam.\n");
    exit(1);
}

$porta = random_int(18000, 18999);
$processo = proc_open(
    [PHP_BINARY, '-S', "127.0.0.1:$porta", '-t', $raiz . '/public', $raiz . '/public/index.php'],
    [1 => ['file', $temp . '/servidor.log', 'a'], 2 => ['file', $temp . '/servidor.log', 'a']],
    $tubos,
    $raiz,
    $ambiente + getenv(),
);
register_shutdown_function(static function () use ($processo, $temp): void {
    proc_terminate($processo);
    exec('rm -rf ' . escapeshellarg($temp));
});
for ($i = 0; $i < 50 && !@fsockopen('127.0.0.1', $porta); $i++) {
    usleep(100_000);
}

/** Cliente HTTP mínimo com cookie de sessão. */
final class Cliente
{
    public string $cookie = '';
    public string $csrf = '';

    public function __construct(private readonly string $base)
    {
    }

    /** @return array{0: int, 1: array<string, mixed>} */
    public function pedir(string $metodo, string $caminho, mixed $corpo = null, array $extras = []): array
    {
        $cabecalhos = ['Accept: application/json'];
        if ($this->cookie !== '') {
            $cabecalhos[] = 'Cookie: ' . $this->cookie;
        }
        if ($metodo !== 'GET' && ($extras['csrf'] ?? true)) {
            $cabecalhos[] = 'X-CSRF-Token: ' . ($extras['token'] ?? $this->csrf);
        }
        if (isset($extras['origem'])) {
            $cabecalhos[] = 'Origin: ' . $extras['origem'];
        }
        $conteudo = '';
        if ($corpo !== null) {
            $conteudo = is_string($corpo) ? $corpo : json_encode($corpo);
            $cabecalhos[] = 'Content-Type: ' . ($extras['tipo'] ?? 'application/json');
        }
        $contexto = stream_context_create(['http' => [
            'method' => $metodo,
            'header' => implode("\r\n", $cabecalhos),
            'content' => $conteudo,
            'ignore_errors' => true,
            'timeout' => 10,
        ]]);
        $resposta = file_get_contents($this->base . $caminho, false, $contexto);
        $status = 0;
        foreach ($http_response_header ?? [] as $linha) {
            if (preg_match('#^HTTP/\S+ (\d{3})#', $linha, $m)) {
                $status = (int) $m[1];
            }
            if (preg_match('/^Set-Cookie: (torre_sessao=[^;]*)/i', $linha, $m)) {
                $this->cookie = $m[1];
            }
        }
        $dados = json_decode((string) $resposta, true) ?? [];
        if (isset($dados['csrf'])) {
            $this->csrf = $dados['csrf'];
        }
        return [$status, $dados];
    }
}

$base = "http://127.0.0.1:$porta";
$falhas = 0;
$total = 0;
function confere(bool $condicao, string $descricao): void
{
    global $falhas, $total;
    $total++;
    if ($condicao) {
        echo "ok   $descricao\n";
    } else {
        $falhas++;
        echo "FALHOU $descricao\n";
    }
}
function save(int $andar): array
{
    return ['formato' => 'torre-do-eclipse', 'versao' => 2, 'salvoEm' => gmdate('c'), 'estado' => ['tela' => 'rota', 'andar' => $andar]];
}

// ---- Sessão e CSRF ----
$ana = new Cliente($base);
[$s, $d] = $ana->pedir('GET', '/api/session');
confere($s === 200 && $d['autenticado'] === false && strlen($d['csrf']) === 64, 'GET /api/session sem conta devolve token CSRF');
[$s] = $ana->pedir('POST', '/api/register', ['usuario' => 'ana', 'senha' => 'senha-forte-1'], ['csrf' => false]);
confere($s === 403, 'cadastro sem token CSRF é recusado (403)');
[$s] = $ana->pedir('POST', '/api/register', ['usuario' => 'ana', 'senha' => 'senha-forte-1'], ['token' => str_repeat('a', 64)]);
confere($s === 403, 'cadastro com token CSRF errado é recusado (403)');
[$s] = $ana->pedir('POST', '/api/register', ['usuario' => 'ana', 'senha' => 'senha-forte-1'], ['origem' => 'https://site-malicioso.example']);
confere($s === 403, 'Origin de outro site é recusada (403)');
[$s] = $ana->pedir('POST', '/api/register', 'usuario=ana&senha=x', ['tipo' => 'application/x-www-form-urlencoded']);
confere($s === 415, 'corpo que não é JSON é recusado (415)');

// ---- Validação de entrada ----
[$s, $d] = $ana->pedir('POST', '/api/register', ['usuario' => "a' OR '1'='1", 'senha' => 'senha-forte-1']);
confere($s === 422 && $d['campo'] === 'usuario', 'usuário com caracteres inválidos é recusado (422)');
[$s, $d] = $ana->pedir('POST', '/api/register', ['usuario' => 'ana', 'senha' => 'curta']);
confere($s === 422 && $d['campo'] === 'senha', 'senha curta é recusada (422)');
[$s] = $ana->pedir('POST', '/api/register', ['usuario' => 'ana', 'senha' => str_repeat('x', 73)]);
confere($s === 422, 'senha acima de 72 bytes é recusada (422)');

// ---- Cadastro e save ----
$cookieAnonimo = $ana->cookie;
[$s, $d] = $ana->pedir('POST', '/api/register', ['usuario' => 'Ana', 'senha' => 'senha-forte-1']);
confere($s === 201 && $d['usuario'] === 'Ana', 'cadastro cria a conta e já entra (201)');
confere($ana->cookie !== $cookieAnonimo, 'o id da sessão muda ao entrar (contra fixação de sessão)');
[$s] = (new Cliente($base))->pedir('GET', '/api/save');
confere($s === 401, 'GET /api/save sem sessão é recusado (401)');
$outro = new Cliente($base);
$outro->pedir('GET', '/api/session');
[$s] = $outro->pedir('POST', '/api/register', ['usuario' => 'ANA', 'senha' => 'outra-senha-1']);
confere($s === 409, 'nome de usuário repetido (sem diferenciar maiúsculas) é recusado (409)');

[$s, $d] = $ana->pedir('GET', '/api/save');
confere($s === 200 && $d['save'] === null, 'conta nova começa sem save');
[$s, $d] = $ana->pedir('PUT', '/api/save', ['revisao_base' => null, 'dados' => save(3)]);
confere($s === 200 && $d['revisao'] === 1, 'primeiro save cria a revisão 1');
[$s, $d] = $ana->pedir('PUT', '/api/save', ['revisao_base' => 1, 'dados' => save(4)]);
confere($s === 200 && $d['revisao'] === 2, 'save a partir da revisão atual avança para 2');
[$s, $d] = $ana->pedir('PUT', '/api/save', ['revisao_base' => 1, 'dados' => save(9)]);
confere($s === 409 && $d['atual']['revisao'] === 2 && $d['atual']['dados']['estado']['andar'] === 4, 'save a partir de revisão antiga dá conflito e devolve o atual (409)');
[$s] = $ana->pedir('PUT', '/api/save', ['revisao_base' => null, 'dados' => save(9)]);
confere($s === 409, 'criar de novo um save que já existe dá conflito (409)');
[$s, $d] = $ana->pedir('GET', '/api/save');
confere($d['save']['revisao'] === 2 && $d['save']['dados']['estado']['andar'] === 4, 'o conflito não sobrescreveu o progresso mais novo');
$comVazios = save(4);
$comVazios['estado'] += ['equipados' => new stdClass(), 'itens' => []];
$ana->pedir('PUT', '/api/save', ['revisao_base' => 2, 'dados' => $comVazios]);
$cru = file_get_contents($base . '/api/save', false, stream_context_create(['http' => ['header' => 'Cookie: ' . $ana->cookie]]));
confere(str_contains((string) $cru, '"equipados":{}') && str_contains((string) $cru, '"itens":[]'), 'o servidor preserva {} e [] do save (não troca objeto vazio por lista)');
[$s] = $ana->pedir('PUT', '/api/save', ['revisao_base' => 3, 'dados' => ['formato' => 'outro', 'versao' => 2, 'estado' => []]]);
confere($s === 422, 'save com formato errado é recusado (422)');
[$s] = $ana->pedir('PUT', '/api/save', ['revisao_base' => 3, 'dados' => ['formato' => 'torre-do-eclipse', 'versao' => 2, 'salvoEm' => '', 'estado' => ['x' => str_repeat('a', 270_000)]]]);
confere($s === 413, 'save grande demais é recusado (413)');
[$s] = $ana->pedir('PUT', '/api/save', ['revisao_base' => '2 OR 1=1', 'dados' => save(5)]);
confere($s === 422, 'revisao_base que não é inteiro é recusada (422)');

// ---- Isolamento entre contas ----
$bia = new Cliente($base);
$bia->pedir('GET', '/api/session');
$bia->pedir('POST', '/api/register', ['usuario' => 'bia', 'senha' => 'senha-da-bia']);
[$s, $d] = $bia->pedir('GET', '/api/save');
confere($s === 200 && $d['save'] === null, 'outra conta não vê o save da primeira');
[$s, $d] = $bia->pedir('PUT', '/api/save', ['revisao_base' => 3, 'dados' => save(7)]);
confere($s === 409 && $d['atual'] === null, 'outra conta não consegue gravar sobre o save da primeira');
$bia->pedir('PUT', '/api/save', ['revisao_base' => null, 'dados' => save(7)]);
[, $d] = $ana->pedir('GET', '/api/save');
confere($d['save']['dados']['estado']['andar'] === 4, 'o save da primeira conta continua intacto');

// ---- Logout e login ----
[$s] = $ana->pedir('POST', '/api/logout');
confere($s === 200, 'logout');
[$s] = $ana->pedir('GET', '/api/save');
confere($s === 401, 'depois do logout o save não é acessível (401)');
[$s, $d] = $ana->pedir('POST', '/api/login', ['usuario' => 'ana', 'senha' => 'senha-forte-1']);
confere($s === 200 && $d['usuario'] === 'Ana', 'login com a senha certa (nome sem diferenciar maiúsculas)');
[, $d] = $ana->pedir('GET', '/api/save');
confere($d['save']['revisao'] === 3, 'depois do login, o save da conta volta');
[$s] = (function () use ($base) {
    $c = new Cliente($base);
    $c->pedir('GET', '/api/session');
    return $c->pedir('POST', '/api/login', ['usuario' => 'ana', 'senha' => 'senha-errada']);
})();
confere($s === 401, 'senha errada é recusada (401)');
[$s] = (function () use ($base) {
    $c = new Cliente($base);
    $c->pedir('GET', '/api/session');
    return $c->pedir('POST', '/api/login', ['usuario' => 'ninguem', 'senha' => 'qualquer-coisa']);
})();
confere($s === 401, 'usuário inexistente recebe a mesma resposta (401)');
$atacante = new Cliente($base);
$atacante->pedir('GET', '/api/session');
$ultimo = 0;
for ($i = 0; $i < 10; $i++) {
    [$ultimo] = $atacante->pedir('POST', '/api/login', ['usuario' => 'bia', 'senha' => 'chute-' . $i]);
}
confere($ultimo === 429, 'muitas senhas erradas seguidas bloqueiam o login por um tempo (429)');

// ---- Rotas ----
[$s] = $ana->pedir('DELETE', '/api/save');
confere($s === 405, 'método não permitido (405)');
[$s] = $ana->pedir('GET', '/api/nada');
confere($s === 404, 'rota inexistente (404)');

echo "\n" . ($total - $falhas) . "/$total verificações passaram.\n";
exit($falhas === 0 ? 0 : 1);

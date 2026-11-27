<?php

declare(strict_types=1);

// Aplica as migrações pendentes de server/migrations/<driver>/ em ordem.
//   php server/bin/migrar.php
// Cada arquivo é registrado na tabela `migracoes` e roda uma única vez.

use Torre\Api\Banco;
use Torre\Api\Configuracao;

require dirname(__DIR__) . '/src/inicializar.php';

$config = new Configuracao();
$pdo = Banco::conectar($config);
$driver = Banco::driver($pdo);
$pasta = dirname(__DIR__) . '/migrations/' . ($driver === 'sqlite' ? 'sqlite' : 'mysql');

$pdo->exec(
    $driver === 'sqlite'
        ? 'CREATE TABLE IF NOT EXISTS migracoes (nome TEXT PRIMARY KEY, aplicada_em TEXT NOT NULL)'
        : 'CREATE TABLE IF NOT EXISTS migracoes (nome VARCHAR(190) NOT NULL PRIMARY KEY, aplicada_em DATETIME NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
);
$aplicadas = $pdo->query('SELECT nome FROM migracoes')->fetchAll(PDO::FETCH_COLUMN);

$arquivos = glob($pasta . '/*.sql') ?: [];
sort($arquivos);
$novas = 0;
foreach ($arquivos as $arquivo) {
    $nome = basename($arquivo);
    if (in_array($nome, $aplicadas, true)) {
        continue;
    }
    $sql = (string) file_get_contents($arquivo);
    foreach (preg_split('/;\s*(\r?\n|$)/', $sql) ?: [] as $comando) {
        if (trim($comando) !== '') {
            $pdo->exec($comando);
        }
    }
    $registro = $pdo->prepare('INSERT INTO migracoes (nome, aplicada_em) VALUES (:nome, :agora)');
    $registro->execute([':nome' => $nome, ':agora' => Banco::agora()]);
    echo "aplicada: {$nome}\n";
    $novas++;
}
echo $novas === 0 ? "Banco já está atualizado ({$driver}).\n" : "{$novas} migração(ões) aplicada(s) ({$driver}).\n";

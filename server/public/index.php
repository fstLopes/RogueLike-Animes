<?php

declare(strict_types=1);

// Ponto de entrada da API. Em desenvolvimento:
//   php -S localhost:8080 -t server/public server/public/index.php
// Em produção, aponte o servidor web para server/public e encaminhe /api/* para este arquivo.

use Torre\Api\Api;
use Torre\Api\Configuracao;
use Torre\Api\Requisicao;
use Torre\Api\Sessao;

require dirname(__DIR__) . '/src/inicializar.php';

$requisicao = Requisicao::atual();

// Fora de /api, o servidor embutido entrega arquivos estáticos (se houver).
if (PHP_SAPI === 'cli-server' && !str_starts_with($requisicao->caminho, '/api')) {
    return false;
}

$config = new Configuracao();
(new Api($config, new Sessao($config)))->atender($requisicao);

<?php

declare(strict_types=1);

namespace Torre\Api;

use PDO;
use PDOException;

/**
 * Save de cada conta, com controle de revisão: uma gravação só é aceita se partir
 * da revisão atual do servidor. Assim um aparelho desatualizado não apaga o
 * progresso mais novo de outro.
 */
final class Saves
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /** @return array{revisao: int, dados: mixed, atualizado_em: string}|null */
    public function ler(int $usuarioId): ?array
    {
        $sql = $this->pdo->prepare('SELECT revisao, dados, atualizado_em FROM saves WHERE usuario_id = :id');
        $sql->execute([':id' => $usuarioId]);
        $linha = $sql->fetch();
        if (!is_array($linha)) {
            return null;
        }
        return [
            'revisao' => (int) $linha['revisao'],
            'dados' => json_decode((string) $linha['dados'], false, 512, JSON_THROW_ON_ERROR),
            'atualizado_em' => Banco::iso((string) $linha['atualizado_em']),
        ];
    }

    /** @return array{revisao: int, atualizado_em: string} */
    public function gravar(int $usuarioId, ?int $revisaoBase, string $json): array
    {
        $agora = Banco::agora();
        if ($revisaoBase === null) {
            try {
                $sql = $this->pdo->prepare('INSERT INTO saves (usuario_id, revisao, dados, atualizado_em) VALUES (:id, 1, :dados, :agora)');
                $sql->execute([':id' => $usuarioId, ':dados' => $json, ':agora' => $agora]);
                return ['revisao' => 1, 'atualizado_em' => Banco::iso($agora)];
            } catch (PDOException $erro) {
                if (!in_array((string) $erro->getCode(), ['23000', '23505'], true) && !str_contains($erro->getMessage(), 'UNIQUE')) {
                    throw $erro;
                }
                $this->conflito($usuarioId);
            }
        }
        $sql = $this->pdo->prepare(
            'UPDATE saves SET revisao = revisao + 1, dados = :dados, atualizado_em = :agora WHERE usuario_id = :id AND revisao = :base',
        );
        $sql->execute([':dados' => $json, ':agora' => $agora, ':id' => $usuarioId, ':base' => $revisaoBase]);
        if ($sql->rowCount() !== 1) {
            $this->conflito($usuarioId);
        }
        return ['revisao' => (int) $revisaoBase + 1, 'atualizado_em' => Banco::iso($agora)];
    }

    /** @return never */
    private function conflito(int $usuarioId): void
    {
        $atual = $this->ler($usuarioId);
        throw new ErroHttp(409, 'O servidor tem um progresso mais novo ou diferente deste aparelho.', ['atual' => $atual]);
    }
}

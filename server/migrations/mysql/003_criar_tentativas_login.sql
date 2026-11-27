CREATE TABLE tentativas_login (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_chave VARCHAR(32) NOT NULL,
  ip VARCHAR(45) NOT NULL,
  ocorrida_em DATETIME NOT NULL,
  KEY ix_tentativas_usuario (usuario_chave, ocorrida_em),
  KEY ix_tentativas_ip (ip, ocorrida_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tentativas_login (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_chave TEXT NOT NULL,
  ip TEXT NOT NULL,
  ocorrida_em TEXT NOT NULL
);
CREATE INDEX ix_tentativas_usuario ON tentativas_login (usuario_chave, ocorrida_em);
CREATE INDEX ix_tentativas_ip ON tentativas_login (ip, ocorrida_em);

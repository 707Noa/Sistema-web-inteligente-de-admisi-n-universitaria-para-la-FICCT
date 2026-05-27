-- auditorias
CREATE TABLE IF NOT EXISTS auditorias (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  accion VARCHAR(191),
  modulo VARCHAR(191),
  ip VARCHAR(45),
  created_at TIMESTAMP DEFAULT now()
);

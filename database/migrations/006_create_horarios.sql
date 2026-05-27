-- horarios
CREATE TABLE IF NOT EXISTS horarios (
  id SERIAL PRIMARY KEY,
  dia VARCHAR(20),
  hora_inicio TIME,
  hora_fin TIME,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

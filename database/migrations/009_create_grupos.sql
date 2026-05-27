-- grupos
CREATE TABLE IF NOT EXISTS grupos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(191),
  capacidad INT DEFAULT 70,
  aula_id INT REFERENCES aulas(id),
  horario_id INT REFERENCES horarios(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

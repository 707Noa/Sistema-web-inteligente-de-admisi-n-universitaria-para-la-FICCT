-- postulantes
CREATE TABLE IF NOT EXISTS postulantes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  nombre VARCHAR(191) NOT NULL,
  dni VARCHAR(20) NOT NULL UNIQUE,
  foto VARCHAR(255),
  opcion_1 INT REFERENCES carreras(id),
  opcion_2 INT REFERENCES carreras(id),
  carrera_adjudicada INT REFERENCES carreras(id),
  creado_en TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

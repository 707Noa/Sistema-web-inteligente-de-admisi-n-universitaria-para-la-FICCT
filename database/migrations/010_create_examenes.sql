-- examenes
CREATE TABLE IF NOT EXISTS examenes (
  id SERIAL PRIMARY KEY,
  postulante_id UUID REFERENCES postulantes(id),
  materia_id INT REFERENCES materias(id),
  nota_1 NUMERIC(5,2) DEFAULT 0,
  nota_2 NUMERIC(5,2) DEFAULT 0,
  nota_3 NUMERIC(5,2) DEFAULT 0,
  promedio NUMERIC(5,2) GENERATED ALWAYS AS ((nota_1+nota_2+nota_3)/3) STORED,
  estado VARCHAR(20) DEFAULT 'pendiente',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

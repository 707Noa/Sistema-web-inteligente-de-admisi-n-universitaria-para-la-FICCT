-- pagos
CREATE TABLE IF NOT EXISTS pagos (
  id SERIAL PRIMARY KEY,
  postulante_id UUID REFERENCES postulantes(id),
  monto NUMERIC(10,2),
  fecha TIMESTAMP DEFAULT now(),
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- grupo_postulante (pivot)
CREATE TABLE IF NOT EXISTS grupo_postulante (
  grupo_id INT REFERENCES grupos(id),
  postulante_id UUID REFERENCES postulantes(id),
  PRIMARY KEY (grupo_id, postulante_id)
);

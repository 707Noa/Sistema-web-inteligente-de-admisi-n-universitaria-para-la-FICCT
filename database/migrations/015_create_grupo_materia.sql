-- grupo_materia (pivot)
CREATE TABLE IF NOT EXISTS grupo_materia (
  grupo_id INT REFERENCES grupos(id),
  materia_id INT REFERENCES materias(id),
  PRIMARY KEY (grupo_id, materia_id)
);

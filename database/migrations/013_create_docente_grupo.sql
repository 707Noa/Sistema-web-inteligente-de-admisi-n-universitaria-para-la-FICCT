-- docente_grupo (pivot)
CREATE TABLE IF NOT EXISTS docente_grupo (
  docente_id UUID REFERENCES docentes(id),
  grupo_id INT REFERENCES grupos(id),
  PRIMARY KEY (docente_id, grupo_id)
);

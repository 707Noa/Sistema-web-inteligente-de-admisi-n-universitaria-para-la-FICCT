<?php

namespace Modules\P4_ReportesMonitoreoAuditoria\Services;

class ReporteCatalogoService
{
    public static function catalogo(): array
    {
        return [
            'postulantes_inscritos' => [
                'titulo' => 'Postulantes Inscritos',
                'descripcion' => 'Listado de todos los postulantes inscritos en el sistema',
                'columnas' => ['CI', 'Apellidos', 'Nombres', 'Carrera Postulada', 'Estado', 'Grupo'],
                'keywords' => ['postulantes inscritos', 'listado de postulantes', 'todos los postulantes', 'postulantes'],
                'filtros_disponibles' => ['grupo', 'carrera'],
            ],
            'aprobados' => [
                'titulo' => 'Postulantes Aprobados',
                'descripcion' => 'Listado de postulantes que aprobaron el proceso de admisión',
                'columnas' => ['CI', 'Apellidos', 'Nombres', 'Materia', 'Promedio'],
                'keywords' => ['aprobados', 'aprobaron', 'aprobado'],
                'filtros_disponibles' => ['grupo', 'materia'],
            ],
            'reprobados' => [
                'titulo' => 'Postulantes Reprobados',
                'descripcion' => 'Listado de postulantes que reprobaron el proceso de admisión',
                'columnas' => ['CI', 'Apellidos', 'Nombres', 'Materia', 'Promedio'],
                'keywords' => ['reprobados', 'reprobaron', 'reprobado'],
                'filtros_disponibles' => ['grupo', 'materia'],
            ],
            'promedios_generales' => [
                'titulo' => 'Promedios Generales',
                'descripcion' => 'Promedios de calificaciones de todos los postulantes',
                'columnas' => ['CI', 'Apellidos', 'Nombres', 'Materia', 'Promedio', 'Estado'],
                'keywords' => ['promedios generales', 'calificaciones generales', 'notas generales', 'todos los promedios'],
                'filtros_disponibles' => ['grupo'],
            ],
            'promedios_por_materia' => [
                'titulo' => 'Promedios por Materia',
                'descripcion' => 'Resumen estadístico de promedios agrupados por materia',
                'columnas' => ['Materia', 'Total Alumnos', 'Promedio', 'Aprobados', 'Reprobados'],
                'keywords' => ['promedios por materia', 'promedio materia', 'notas por materia', 'exporta promedios por materia', 'promedios materia'],
                'filtros_disponibles' => [],
            ],
            'promedios_por_grupo' => [
                'titulo' => 'Promedios por Grupo',
                'descripcion' => 'Resumen estadístico de promedios agrupados por grupo',
                'columnas' => ['Grupo', 'Total Alumnos', 'Promedio', 'Aprobados', 'Reprobados'],
                'keywords' => ['promedios por grupo', 'promedio grupo', 'notas por grupo', 'promedios grupo'],
                'filtros_disponibles' => [],
            ],
            'docentes_asignados' => [
                'titulo' => 'Docentes Asignados',
                'descripcion' => 'Listado de docentes asignados a grupos con sus materias y horarios',
                'columnas' => ['Nombre Docente', 'CI', 'Materia', 'Grupo', 'Turno', 'Horario'],
                'keywords' => ['docentes asignados', 'docentes', 'profesores asignados', 'asignacion docentes', 'dame un reporte de docentes', 'reporte de docentes'],
                'filtros_disponibles' => ['grupo', 'turno'],
            ],
            'grupos_habilitados' => [
                'titulo' => 'Grupos Habilitados',
                'descripcion' => 'Listado de todos los grupos académicos habilitados',
                'columnas' => ['Código', 'Gestión', 'Turno', 'Aula', 'Ocupación', 'Cupo Máximo', 'Estado'],
                'keywords' => ['grupos habilitados', 'grupos activos', 'todos los grupos', 'reporte de grupos habilitados', 'grupos'],
                'filtros_disponibles' => ['turno', 'gestion'],
            ],
            'ocupacion_por_grupo' => [
                'titulo' => 'Ocupación por Grupo',
                'descripcion' => 'Estadísticas de ocupación y cupos disponibles por grupo',
                'columnas' => ['Código', 'Turno', 'Ocupación', 'Cupo Máximo', 'Disponible', '% Ocupación'],
                'keywords' => ['ocupacion', 'cupos', 'ocupacion de cupos', 'cupos por grupo', 'ocupacion de grupos', 'muestra la ocupacion', 'ocupacion cupos'],
                'filtros_disponibles' => ['turno'],
            ],
            'cupos_por_carrera' => [
                'titulo' => 'Cupos por Carrera',
                'descripcion' => 'Distribución de postulantes y cupos por carrera',
                'columnas' => ['Carrera', 'Total Postulantes', 'Grupos', 'Promedio por Grupo'],
                'keywords' => ['cupos por carrera', 'carrera cupos', 'postulantes por carrera', 'cupos carrera'],
                'filtros_disponibles' => [],
            ],
            'admitidos_primera_carrera' => [
                'titulo' => 'Admitidos — Primera Carrera',
                'descripcion' => 'Postulantes admitidos para su primera opción de carrera',
                'columnas' => ['CI', 'Apellidos', 'Nombres', 'Carrera', 'Estado Admisión'],
                'keywords' => ['admitidos primera carrera', 'primera carrera', 'admitidos primera opcion', 'primera opcion', 'admitidos por primera'],
                'filtros_disponibles' => [],
            ],
            'admitidos_segunda_carrera' => [
                'titulo' => 'Admitidos — Segunda Carrera',
                'descripcion' => 'Postulantes admitidos para su segunda opción de carrera',
                'columnas' => ['CI', 'Apellidos', 'Nombres', 'Carrera', 'Estado Admisión'],
                'keywords' => ['admitidos segunda carrera', 'segunda carrera', 'admitidos segunda opcion', 'segunda opcion', 'admitidos por segunda', 'reporte de estudiantes admitidos por segunda carrera'],
                'filtros_disponibles' => [],
            ],
            'grupos_sin_docente' => [
                'titulo' => 'Grupos sin Docente',
                'descripcion' => 'Grupos activos que no tienen docente asignado',
                'columnas' => ['Código', 'Turno', 'Gestión', 'Aula', 'Ocupación'],
                'keywords' => ['grupos sin docente', 'sin docente', 'grupos sin profesor', 'reporte de grupos sin docente'],
                'filtros_disponibles' => [],
            ],
            'grupos_sin_aula' => [
                'titulo' => 'Grupos sin Aula',
                'descripcion' => 'Grupos activos que no tienen aula asignada',
                'columnas' => ['Código', 'Turno', 'Gestión', 'Ocupación'],
                'keywords' => ['grupos sin aula', 'sin aula', 'grupos sin salon', 'reporte de grupos sin aula'],
                'filtros_disponibles' => [],
            ],
            'inconsistencias_horarios' => [
                'titulo' => 'Inconsistencias de Horarios',
                'descripcion' => 'Grupos con posibles conflictos o datos incompletos en horarios',
                'columnas' => ['Grupo', 'Tipo Inconsistencia', 'Detalle'],
                'keywords' => ['inconsistencias horarios', 'problemas horarios', 'conflictos horarios', 'horarios inconsistentes', 'inconsistencias de horarios'],
                'filtros_disponibles' => [],
            ],
            'materias_con_mas_reprobados' => [
                'titulo' => 'Materias con más Reprobados',
                'descripcion' => 'Ranking de materias ordenadas por cantidad de reprobados',
                'columnas' => ['Materia', 'Total Reprobados', 'Total Exámenes', '% Reprobados'],
                'keywords' => ['materias con mas reprobados', 'materias reprobadas', 'materia con reprobados', 'reporte de materias con mas reprobados'],
                'filtros_disponibles' => [],
            ],
            'grupos_con_mas_aprobados' => [
                'titulo' => 'Grupos con más Aprobados',
                'descripcion' => 'Ranking de grupos ordenados por porcentaje de aprobación',
                'columnas' => ['Grupo', 'Total Aprobados', 'Total Alumnos', '% Aprobados'],
                'keywords' => ['grupos con mas aprobados', 'grupos aprobados', 'mejor grupo', 'grupos mejores', 'grupos con aprobados'],
                'filtros_disponibles' => [],
            ],
        ];
    }

    public static function existe(string $tipo): bool
    {
        return array_key_exists($tipo, self::catalogo());
    }

    public static function get(string $tipo): ?array
    {
        return self::catalogo()[$tipo] ?? null;
    }
}

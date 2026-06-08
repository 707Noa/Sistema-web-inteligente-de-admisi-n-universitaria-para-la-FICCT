<?php

namespace Modules\P3_EvaluacionResultados\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Asistencia;
use App\Models\DocenteGrupoAsignacion;
use App\Models\Examen;
use App\Models\Grupo;
use App\Models\Aviso;
use App\Models\Tarea;
use App\Models\Tema;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\P4_ReportesMonitoreoAuditoria\Services\AuditoriaService;

class DocenteAcademicoController extends Controller
{
    // ── Mi Perfil ─────────────────────────────────────────────────────────────

    public function perfil(Request $request): JsonResponse
    {
        $user = $request->user()->load('especialidadDocente.materia');

        return response()->json([
            'id'      => $user->id,
            'name'    => $user->name,
            'email'   => $user->email,
            'ci'      => $user->ci,
            'codigo'  => $user->codigo,
            'role'    => 'Docente',
            'materia' => $user->especialidadDocente?->materia?->nombre,
        ]);
    }

    // ── Mi Horario ────────────────────────────────────────────────────────────

    public function horario(Request $request): JsonResponse
    {
        $rows = DocenteGrupoAsignacion::with(['grupo', 'materia'])
            ->where('docente_user_id', $request->user()->id)
            ->where('estado', 'activo')
            ->orderBy('hora_inicio')
            ->get()
            ->map(fn($a) => [
                'grupo_codigo' => $a->grupo?->codigo,
                'materia'      => $a->materia?->nombre,
                'dia'          => $a->dia,
                'turno'        => $a->turno,
                'hora_inicio'  => substr($a->hora_inicio, 0, 5),
                'hora_fin'     => substr($a->hora_fin, 0, 5),
                'aula'         => $a->grupo?->aula,
            ]);

        return response()->json($rows);
    }

    // ── Mis Grupos ────────────────────────────────────────────────────────────

    public function grupos(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $grupoIds = DocenteGrupoAsignacion::where('docente_user_id', $userId)
            ->where('estado', 'activo')
            ->pluck('grupo_id')
            ->unique()
            ->values();

        $grupos = Grupo::with([
            'postulantes',
            'asignaciones' => fn($q) => $q
                ->where('docente_user_id', $userId)
                ->where('estado', 'activo')
                ->with('materia'),
        ])->whereIn('id', $grupoIds)->orderBy('codigo')->get();

        $data = $grupos->map(function ($grupo) {
            $asignacion = $grupo->asignaciones->first();

            return [
                'id'          => $grupo->id,
                'codigo'      => $grupo->codigo,
                'materia'     => $asignacion?->materia?->nombre,
                'aula'        => $grupo->aula,
                'turno'       => $grupo->turno,
                'hora_inicio' => $asignacion ? substr($asignacion->hora_inicio, 0, 5) : null,
                'hora_fin'    => $asignacion ? substr($asignacion->hora_fin, 0, 5) : null,
                'estudiantes' => $grupo->postulantes->count(),
            ];
        });

        return response()->json($data);
    }

    // ── Estudiantes de un grupo (con notas) ───────────────────────────────────

    public function estudiantesGrupo(Request $request, int $grupoId): JsonResponse
    {
        $userId = $request->user()->id;

        $asignacion = DocenteGrupoAsignacion::where('docente_user_id', $userId)
            ->where('grupo_id', $grupoId)
            ->where('estado', 'activo')
            ->firstOrFail();

        $grupo = Grupo::with('postulantes')->findOrFail($grupoId);
        $materiaId = $asignacion->materia_id;

        $estudiantes = $grupo->postulantes->sortBy(fn($p) => $p->apellidos . ' ' . $p->nombres)
            ->map(function ($p) use ($materiaId) {
                $examen = Examen::where('postulante_id', $p->id)
                    ->where('materia_id', $materiaId)
                    ->first();

                $promedio = $examen?->promedio;
                $estadoNota = 'Sin notas';
                if ($examen) {
                    if ($promedio !== null) {
                        $estadoNota = $promedio >= 60 ? 'APROBADO' : 'REPROBADO';
                    } else {
                        $estadoNota = 'Pendiente';
                    }
                }

                return [
                    'id'          => $p->id,
                    'nombre'      => trim($p->nombres . ' ' . $p->apellidos),
                    'ci'          => $p->ci,
                    'examen_id'   => $examen?->id,
                    'nota_1'      => $examen?->nota_1,
                    'nota_2'      => $examen?->nota_2,
                    'nota_3'      => $examen?->nota_3,
                    'promedio'    => $promedio,
                    'estado_nota' => $estadoNota,
                ];
            })->values();

        return response()->json([
            'grupo_id'     => $grupoId,
            'grupo_codigo' => $grupo->codigo,
            'materia_id'   => $materiaId,
            'estudiantes'  => $estudiantes,
        ]);
    }

    // ── Listar asistencia ─────────────────────────────────────────────────────

    public function listarAsistencia(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $query = Asistencia::with(['postulante', 'grupo', 'materia'])
            ->where('docente_user_id', $userId);

        if ($request->filled('grupo_id')) {
            $query->where('grupo_id', $request->grupo_id);
        }
        if ($request->filled('fecha')) {
            $query->where('fecha', $request->fecha);
        }
        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        $registros = $query->orderBy('fecha', 'desc')
            ->orderBy('postulante_id')
            ->get()
            ->map(fn($a) => [
                'id'              => $a->id,
                'postulante_id'   => $a->postulante_id,
                'postulante_nombre' => trim(($a->postulante?->nombres ?? '') . ' ' . ($a->postulante?->apellidos ?? '')),
                'ci'              => $a->postulante?->ci,
                'grupo_codigo'    => $a->grupo?->codigo,
                'materia_nombre'  => $a->materia?->nombre,
                'fecha'           => $a->fecha?->format('Y-m-d'),
                'estado'          => $a->estado,
            ]);

        return response()->json($registros);
    }

    // ── Guardar asistencia (lote) ─────────────────────────────────────────────

    public function guardarAsistencia(Request $request): JsonResponse
    {
        $request->validate([
            'grupo_id'                  => 'required|exists:grupos,id',
            'fecha'                     => 'required|date',
            'registros'                 => 'required|array|min:1',
            'registros.*.postulante_id' => 'required|exists:postulantes,id',
            'registros.*.estado'        => 'required|in:presente,ausente,licencia',
        ]);

        $userId = $request->user()->id;

        $asignacion = DocenteGrupoAsignacion::where('docente_user_id', $userId)
            ->where('grupo_id', $request->grupo_id)
            ->where('estado', 'activo')
            ->firstOrFail();

        $count = 0;
        foreach ($request->registros as $reg) {
            Asistencia::updateOrCreate(
                [
                    'grupo_id'      => $request->grupo_id,
                    'materia_id'    => $asignacion->materia_id,
                    'postulante_id' => $reg['postulante_id'],
                    'fecha'         => $request->fecha,
                ],
                [
                    'docente_user_id' => $userId,
                    'estado'          => $reg['estado'],
                ]
            );
            $count++;
        }

        AuditoriaService::registrar(
            $userId,
            'Registró asistencia',
            'Asistencia',
            $request,
            "Grupo ID: {$request->grupo_id} | Fecha: {$request->fecha} | Registros: {$count}"
        );

        return response()->json(['message' => 'Asistencia guardada.', 'registrados' => $count]);
    }

    // ── Guardar calificación (un estudiante) ──────────────────────────────────

    public function guardarCalificacion(Request $request): JsonResponse
    {
        $request->validate([
            'postulante_id' => 'required|exists:postulantes,id',
            'grupo_id'      => 'required|exists:grupos,id',
            'nota_1'        => 'nullable|numeric|min:0|max:100',
            'nota_2'        => 'nullable|numeric|min:0|max:100',
            'nota_3'        => 'nullable|numeric|min:0|max:100',
        ]);

        $userId = $request->user()->id;

        $asignacion = DocenteGrupoAsignacion::where('docente_user_id', $userId)
            ->where('grupo_id', $request->grupo_id)
            ->where('estado', 'activo')
            ->firstOrFail();

        $enGrupo = DB::table('grupo_postulante')
            ->where('grupo_id', $request->grupo_id)
            ->where('postulante_id', $request->postulante_id)
            ->exists();

        if (!$enGrupo) {
            return response()->json(['message' => 'El estudiante no pertenece a este grupo.'], 422);
        }

        $examen = Examen::firstOrNew([
            'postulante_id' => $request->postulante_id,
            'materia_id'    => $asignacion->materia_id,
        ]);

        $examen->fill($request->only(['nota_1', 'nota_2', 'nota_3']));

        // Threshold 60 para el rol docente
        if ($examen->nota_1 !== null && $examen->nota_2 !== null && $examen->nota_3 !== null) {
            $examen->promedio = round(((float)$examen->nota_1 + (float)$examen->nota_2 + (float)$examen->nota_3) / 3, 2);
            $examen->estado   = $examen->promedio >= 60 ? 'aprobado' : 'reprobado';
        } else {
            $examen->promedio = null;
            $examen->estado   = 'pendiente';
        }

        $examen->save();

        AuditoriaService::registrar(
            $userId,
            'Registró calificaciones',
            'Calificaciones',
            $request,
            "Postulante ID: {$request->postulante_id} | Materia ID: {$asignacion->materia_id}"
        );

        return response()->json([
            'examen_id'   => $examen->id,
            'nota_1'      => $examen->nota_1,
            'nota_2'      => $examen->nota_2,
            'nota_3'      => $examen->nota_3,
            'promedio'    => $examen->promedio,
            'estado_nota' => $examen->promedio !== null ? ($examen->promedio >= 60 ? 'APROBADO' : 'REPROBADO') : 'Pendiente',
        ]);
    }

    // ── Guardar calificaciones masivas (varios estudiantes) ───────────────────

    public function guardarCalificacionesMasivas(Request $request): JsonResponse
    {
        $request->validate([
            'grupo_id' => 'required|exists:grupos,id',
            'calificaciones' => 'required|array',
            'calificaciones.*.postulante_id' => 'required|exists:postulantes,id',
            'calificaciones.*.nota_1' => 'nullable|numeric|min:0|max:100',
            'calificaciones.*.nota_2' => 'nullable|numeric|min:0|max:100',
            'calificaciones.*.nota_3' => 'nullable|numeric|min:0|max:100',
        ]);

        $userId = $request->user()->id;
        $grupoId = $request->grupo_id;

        $asignacion = DocenteGrupoAsignacion::where('docente_user_id', $userId)
            ->where('grupo_id', $grupoId)
            ->where('estado', 'activo')
            ->first();

        if (!$asignacion) {
            return response()->json(['message' => 'No tienes asignado este grupo.'], 403);
        }

        $materiaId = $asignacion->materia_id;
        $grupoPostulanteIds = DB::table('grupo_postulante')
            ->where('grupo_id', $grupoId)
            ->pluck('postulante_id')
            ->toArray();

        DB::beginTransaction();
        try {
            $count = 0;
            foreach ($request->calificaciones as $item) {
                $pid = $item['postulante_id'];
                if (!in_array($pid, $grupoPostulanteIds)) {
                    throw new \Exception("El estudiante con ID {$pid} no pertenece al grupo.");
                }

                $examen = Examen::firstOrNew([
                    'postulante_id' => $pid,
                    'materia_id'    => $materiaId,
                ]);

                // Validaciones adicionales por si acaso
                foreach (['nota_1', 'nota_2', 'nota_3'] as $notaField) {
                    if (isset($item[$notaField]) && $item[$notaField] !== null && $item[$notaField] !== '') {
                        $val = $item[$notaField];
                        if (!is_numeric($val) || floatval($val) < 0 || floatval($val) > 100) {
                            throw new \Exception("Las notas deben ser valores numéricos entre 0 y 100.");
                        }
                    }
                }

                $examen->nota_1 = isset($item['nota_1']) && $item['nota_1'] !== '' && $item['nota_1'] !== null ? floatval($item['nota_1']) : null;
                $examen->nota_2 = isset($item['nota_2']) && $item['nota_2'] !== '' && $item['nota_2'] !== null ? floatval($item['nota_2']) : null;
                $examen->nota_3 = isset($item['nota_3']) && $item['nota_3'] !== '' && $item['nota_3'] !== null ? floatval($item['nota_3']) : null;

                if ($examen->nota_1 !== null && $examen->nota_2 !== null && $examen->nota_3 !== null) {
                    $examen->promedio = round(($examen->nota_1 + $examen->nota_2 + $examen->nota_3) / 3, 2);
                    $examen->estado = $examen->promedio >= 60 ? 'aprobado' : 'reprobado';
                } else {
                    $examen->promedio = null;
                    $examen->estado = 'pendiente';
                }

                $examen->save();
                $count++;
            }

            DB::commit();

            AuditoriaService::registrar(
                $userId,
                'Registró calificaciones masivas',
                'Calificaciones',
                $request,
                "Grupo ID: {$grupoId} | Materia ID: {$materiaId} | Registros actualizados: {$count}"
            );

            return response()->json([
                'message' => "Calificaciones guardadas correctamente. Se actualizaron {$count} registros.",
                'count' => $count
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al guardar las notas: ' . $e->getMessage()], 422);
        }
    }

    // ── Mis Grupos completo (para la vista fusionada) ────────────────────────

    public function misGruposCompleto(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $user   = $request->user()->load('especialidadDocente.materia');

        // Todas las asignaciones activas del docente
        $asignaciones = DocenteGrupoAsignacion::with(['grupo.postulantes', 'materia'])
            ->where('docente_user_id', $userId)
            ->where('estado', 'activo')
            ->orderBy('hora_inicio')
            ->get();

        // Grupos únicos con sus días (un mismo grupo puede tener varias filas: una por día)
        $gruposMap = [];
        foreach ($asignaciones as $a) {
            $gid = $a->grupo_id;
            if (!isset($gruposMap[$gid])) {
                $gruposMap[$gid] = [
                    'id'          => $a->grupo->id,
                    'codigo'      => $a->grupo->codigo,
                    'materia_id'  => $a->materia_id,
                    'materia'     => $a->materia?->nombre,
                    'turno'       => $a->turno,
                    'aula'        => $a->grupo->aula,
                    'hora_inicio' => substr($a->hora_inicio, 0, 5),
                    'hora_fin'    => substr($a->hora_fin, 0, 5),
                    'estudiantes' => $a->grupo->postulantes->count(),
                    'dias'        => [],
                ];
            }
            if (!in_array($a->dia, $gruposMap[$gid]['dias'])) {
                $gruposMap[$gid]['dias'][] = $a->dia;
            }
        }

        // Tabla de horario semanal: cada slot único (hora_inicio|hora_fin) → días
        $slots = [];
        foreach ($asignaciones as $a) {
            $inicio = substr($a->hora_inicio, 0, 5);
            $fin    = substr($a->hora_fin, 0, 5);
            $key    = $inicio . '|' . $fin;

            if (!isset($slots[$key])) {
                $slots[$key] = [
                    'hora_inicio' => $inicio,
                    'hora_fin'    => $fin,
                    'lunes'       => null,
                    'martes'      => null,
                    'miercoles'   => null,
                    'jueves'      => null,
                    'viernes'     => null,
                    'sabado'      => null,
                ];
            }

            $slots[$key][$a->dia] = [
                'codigo' => $a->grupo->codigo,
                'aula'   => $a->grupo->aula,
            ];
        }

        ksort($slots);

        return response()->json([
            'docente' => [
                'name'    => $user->name,
                'materia' => $user->especialidadDocente?->materia?->nombre,
            ],
            'grupos'          => array_values($gruposMap),
            'horario_semanal' => array_values($slots),
        ]);
    }

    // ── CRUD de Temas ─────────────────────────────────────────────────────────

    public function crearTema(Request $request): JsonResponse
    {
        $request->validate([
            'materia_id' => 'required|exists:materias,id',
            'titulo' => 'required|string|max:191',
            'numero' => 'required|integer',
            'descripcion' => 'nullable|string',
        ]);

        $userId = $request->user()->id;
        $assigned = DocenteGrupoAsignacion::where('docente_user_id', $userId)
            ->where('materia_id', $request->materia_id)
            ->where('estado', 'activo')
            ->exists();

        if (!$assigned) {
            return response()->json(['message' => 'No tienes asignada esta materia.'], 403);
        }

        $tema = Tema::create([
            'materia_id' => $request->materia_id,
            'titulo' => $request->titulo,
            'numero' => $request->numero,
            'descripcion' => $request->descripcion,
        ]);

        AuditoriaService::registrar($userId, 'Creó tema de materia', 'Temas', $request, "Materia ID: {$request->materia_id} | Tema: {$tema->titulo}");

        return response()->json($tema, 201);
    }

    public function actualizarTema(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'titulo' => 'required|string|max:191',
            'numero' => 'required|integer',
            'descripcion' => 'nullable|string',
        ]);

        $tema = Tema::findOrFail($id);
        $userId = $request->user()->id;
        
        $assigned = DocenteGrupoAsignacion::where('docente_user_id', $userId)
            ->where('materia_id', $tema->materia_id)
            ->where('estado', 'activo')
            ->exists();

        if (!$assigned) {
            return response()->json(['message' => 'No tienes asignada esta materia.'], 403);
        }

        $tema->update($request->only(['titulo', 'numero', 'descripcion']));

        AuditoriaService::registrar($userId, 'Actualizó tema de materia', 'Temas', $request, "Tema ID: {$id} | Título: {$tema->titulo}");

        return response()->json($tema);
    }

    public function eliminarTema(Request $request, int $id): JsonResponse
    {
        $tema = Tema::findOrFail($id);
        $userId = $request->user()->id;

        $assigned = DocenteGrupoAsignacion::where('docente_user_id', $userId)
            ->where('materia_id', $tema->materia_id)
            ->where('estado', 'activo')
            ->exists();

        if (!$assigned) {
            return response()->json(['message' => 'No tienes asignada esta materia.'], 403);
        }

        $tema->delete();

        AuditoriaService::registrar($userId, 'Eliminó tema de materia', 'Temas', $request, "Tema ID: {$id}");

        return response()->json(['message' => 'Tema eliminado correctamente.']);
    }

    // ── CRUD de Avisos ────────────────────────────────────────────────────────

    public function getAvisos(Request $request, int $grupoId, int $materiaId): JsonResponse
    {
        $userId = $request->user()->id;
        $assigned = DocenteGrupoAsignacion::where('docente_user_id', $userId)
            ->where('grupo_id', $grupoId)
            ->where('materia_id', $materiaId)
            ->where('estado', 'activo')
            ->exists();

        if (!$assigned) {
            return response()->json(['message' => 'No tienes asignado este grupo/materia.'], 403);
        }

        $avisos = Aviso::where('grupo_id', $grupoId)
            ->where('materia_id', $materiaId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($avisos);
    }

    public function crearAviso(Request $request): JsonResponse
    {
        $request->validate([
            'grupo_id'   => 'required|exists:grupos,id',
            'materia_id' => 'required|exists:materias,id',
            'titulo'     => 'required|string|max:191',
            'contenido'  => 'required|string',
        ]);

        $userId = $request->user()->id;
        $assigned = DocenteGrupoAsignacion::where('docente_user_id', $userId)
            ->where('grupo_id', $request->grupo_id)
            ->where('materia_id', $request->materia_id)
            ->where('estado', 'activo')
            ->exists();

        if (!$assigned) {
            return response()->json(['message' => 'No tienes asignado este grupo/materia.'], 403);
        }

        $aviso = Aviso::create([
            'docente_user_id' => $userId,
            'grupo_id'        => $request->grupo_id,
            'materia_id'      => $request->materia_id,
            'titulo'          => $request->titulo,
            'contenido'       => $request->contenido,
        ]);

        AuditoriaService::registrar($userId, 'Creó aviso', 'Avisos', $request, "Grupo ID: {$request->grupo_id} | Título: {$aviso->titulo}");

        return response()->json($aviso, 201);
    }

    public function actualizarAviso(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'titulo'    => 'required|string|max:191',
            'contenido' => 'required|string',
        ]);

        $aviso = Aviso::findOrFail($id);
        $userId = $request->user()->id;

        if ($aviso->docente_user_id !== $userId) {
            return response()->json(['message' => 'No puedes editar un aviso de otro docente.'], 403);
        }

        $aviso->update($request->only(['titulo', 'contenido']));

        AuditoriaService::registrar($userId, 'Actualizó aviso', 'Avisos', $request, "Aviso ID: {$id} | Título: {$aviso->titulo}");

        return response()->json($aviso);
    }

    public function eliminarAviso(Request $request, int $id): JsonResponse
    {
        $aviso = Aviso::findOrFail($id);
        $userId = $request->user()->id;

        if ($aviso->docente_user_id !== $userId) {
            return response()->json(['message' => 'No puedes eliminar un aviso de otro docente.'], 403);
        }

        $aviso->delete();

        AuditoriaService::registrar($userId, 'Eliminó aviso', 'Avisos', $request, "Aviso ID: {$id}");

        return response()->json(['message' => 'Aviso eliminado correctamente.']);
    }

    // ── CRUD de Tareas ────────────────────────────────────────────────────────

    public function getTareas(Request $request, int $grupoId, int $materiaId): JsonResponse
    {
        $userId = $request->user()->id;
        $assigned = DocenteGrupoAsignacion::where('docente_user_id', $userId)
            ->where('grupo_id', $grupoId)
            ->where('materia_id', $materiaId)
            ->where('estado', 'activo')
            ->exists();

        if (!$assigned) {
            return response()->json(['message' => 'No tienes asignado este grupo/materia.'], 403);
        }

        $tareas = Tarea::where('grupo_id', $grupoId)
            ->where('materia_id', $materiaId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($tareas);
    }

    public function crearTarea(Request $request): JsonResponse
    {
        $request->validate([
            'grupo_id'          => 'required|exists:grupos,id',
            'materia_id'        => 'required|exists:materias,id',
            'gestion'           => 'required|string|max:50',
            'titulo'            => 'required|string|max:191',
            'descripcion'       => 'required|string',
            'fecha_publicacion' => 'required|date',
            'fecha_limite'      => 'required|date|after_or_equal:fecha_publicacion',
            'estado'            => 'required|in:activa,inactiva',
            'archivo'           => 'nullable|file|max:5120', // Max 5MB
        ]);

        $userId = $request->user()->id;
        $assigned = DocenteGrupoAsignacion::where('docente_user_id', $userId)
            ->where('grupo_id', $request->grupo_id)
            ->where('materia_id', $request->materia_id)
            ->where('estado', 'activo')
            ->exists();

        if (!$assigned) {
            return response()->json(['message' => 'No tienes asignado este grupo/materia.'], 403);
        }

        $archivoPath = null;
        if ($request->hasFile('archivo')) {
            $archivoPath = $request->file('archivo')->store('tareas/archivos', 'public');
        }

        $tarea = Tarea::create([
            'docente_user_id'   => $userId,
            'grupo_id'          => $request->grupo_id,
            'materia_id'        => $request->materia_id,
            'gestion'           => $request->gestion,
            'titulo'            => $request->titulo,
            'descripcion'       => $request->descripcion,
            'fecha_publicacion' => $request->fecha_publicacion,
            'fecha_limite'      => $request->fecha_limite,
            'estado'            => $request->estado,
            'archivo_path'      => $archivoPath,
        ]);

        AuditoriaService::registrar($userId, 'Creó tarea', 'Tareas', $request, "Grupo ID: {$request->grupo_id} | Título: {$tarea->titulo}");

        return response()->json($tarea, 201);
    }

    public function actualizarTarea(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'titulo'            => 'required|string|max:191',
            'descripcion'       => 'required|string',
            'fecha_publicacion' => 'required|date',
            'fecha_limite'      => 'required|date|after_or_equal:fecha_publicacion',
            'estado'            => 'required|in:activa,inactiva',
            'archivo'           => 'nullable|file|max:5120',
        ]);

        $tarea = Tarea::findOrFail($id);
        $userId = $request->user()->id;

        if ($tarea->docente_user_id !== $userId) {
            return response()->json(['message' => 'No puedes editar una tarea de otro docente.'], 403);
        }

        $data = $request->only(['titulo', 'descripcion', 'fecha_publicacion', 'fecha_limite', 'estado']);

        if ($request->hasFile('archivo')) {
            if ($tarea->archivo_path) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($tarea->archivo_path);
            }
            $data['archivo_path'] = $request->file('archivo')->store('tareas/archivos', 'public');
        }

        $tarea->update($data);

        AuditoriaService::registrar($userId, 'Actualizó tarea', 'Tareas', $request, "Tarea ID: {$id} | Título: {$tarea->titulo}");

        return response()->json($tarea);
    }

    public function eliminarTarea(Request $request, int $id): JsonResponse
    {
        $tarea = Tarea::findOrFail($id);
        $userId = $request->user()->id;

        if ($tarea->docente_user_id !== $userId) {
            return response()->json(['message' => 'No puedes eliminar una tarea de otro docente.'], 403);
        }

        if ($tarea->archivo_path) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($tarea->archivo_path);
        }

        $tarea->delete();

        AuditoriaService::registrar($userId, 'Eliminó tarea', 'Tareas', $request, "Tarea ID: {$id}");

        return response()->json(['message' => 'Tarea eliminada correctamente.']);
    }

    // ── Importación de Calificaciones por CSV ──────────────────────────────────

    public function previsualizarCalificacionesCsv(Request $request): JsonResponse
    {
        $request->validate([
            'grupo_id' => 'required|exists:grupos,id',
            'file'     => 'required|file|mimes:csv,txt'
        ]);

        $userId = $request->user()->id;
        $grupoId = $request->grupo_id;

        $asignacion = DocenteGrupoAsignacion::where('docente_user_id', $userId)
            ->where('grupo_id', $grupoId)
            ->where('estado', 'activo')
            ->first();

        if (!$asignacion) {
            return response()->json(['message' => 'No tienes asignado este grupo.'], 403);
        }

        $materiaId = $asignacion->materia_id;
        $grupo = Grupo::with('postulantes')->findOrFail($grupoId);
        $grupoEstudiantes = $grupo->postulantes;
        $grupoCis = $grupoEstudiantes->pluck('ci')->toArray();
        $estudiantesMap = $grupoEstudiantes->keyBy('ci');

        $path = $request->file('file')->getRealPath();
        $file = fopen($path, 'r');

        // Detectar separador
        $firstLine = fgets($file);
        rewind($file);
        $separator = ',';
        if (strpos($firstLine, ';') !== false && strpos($firstLine, ',') === false) {
            $separator = ';';
        }

        $headers = fgetcsv($file, 0, $separator);
        if (!$headers) {
            fclose($file);
            return response()->json(['message' => 'Archivo CSV vacío o inválido.'], 422);
        }

        // Normalizar cabeceras
        $headers = array_map(function($h) {
            $h = preg_replace('/[\x{FEFF}]/u', '', $h); // Quitar BOM
            return strtolower(trim($h));
        }, $headers);

        $allowedHeaders = ['ci', 'examen_1', 'examen_2', 'examen_3', 'estudiante'];
        foreach ($headers as $h) {
            if (!in_array($h, $allowedHeaders)) {
                fclose($file);
                return response()->json(['message' => 'El archivo CSV contiene columnas no permitidas.'], 422);
            }
        }

        $ciIdx = array_search('ci', $headers);
        $e1Idx = array_search('examen_1', $headers);
        $e2Idx = array_search('examen_2', $headers);
        $e3Idx = array_search('examen_3', $headers);

        if ($ciIdx === false || $e1Idx === false || $e2Idx === false || $e3Idx === false) {
            fclose($file);
            return response()->json(['message' => 'Las columnas ci, examen_1, examen_2 y examen_3 son obligatorias.'], 422);
        }

        $totalRows = 0;
        $validRows = 0;
        $invalidRows = 0;
        $errors = [];
        $updates = [];

        while (($row = fgetcsv($file, 0, $separator)) !== false) {
            if (empty($row) || count($row) < 4) continue;
            $totalRows++;

            $ci = trim($row[$ciIdx]);
            $n1 = trim($row[$e1Idx]);
            $n2 = trim($row[$e2Idx]);
            $n3 = trim($row[$e3Idx]);

            $rowError = null;

            if (!in_array($ci, $grupoCis)) {
                $existsGeneral = \App\Models\Postulante::where('ci', $ci)->exists();
                if ($existsGeneral) {
                    $rowError = "El CI {$ci} no pertenece al grupo {$grupo->codigo}.";
                } else {
                    $rowError = "El CI {$ci} no existe.";
                }
            } else {
                foreach ([1 => $n1, 2 => $n2, 3 => $n3] as $idx => $n) {
                    if ($n !== '') {
                        if (!is_numeric($n) || floatval($n) < 0 || floatval($n) > 100) {
                            $rowError = "La nota de examen_{$idx} debe estar entre 0 y 100.";
                            break;
                        }
                    }
                }
            }

            if ($rowError) {
                $invalidRows++;
                $errors[] = [
                    'row' => $totalRows + 1,
                    'error' => $rowError
                ];
            } else {
                $validRows++;
                $postulante = $estudiantesMap[$ci];
                
                $examen = Examen::where('postulante_id', $postulante->id)
                    ->where('materia_id', $materiaId)
                    ->first();

                $n1Val = $n1 !== '' ? floatval($n1) : null;
                $n2Val = $n2 !== '' ? floatval($n2) : null;
                $n3Val = $n3 !== '' ? floatval($n3) : null;

                $promedio = null;
                $estado = 'Pendiente';
                if ($n1Val !== null && $n2Val !== null && $n3Val !== null) {
                    $promedio = round(($n1Val + $n2Val + $n3Val) / 3, 2);
                    $estado = $promedio >= 60 ? 'APROBADO' : 'REPROBADO';
                }

                $updates[] = [
                    'postulante_id' => $postulante->id,
                    'nombre' => trim($postulante->nombres . ' ' . $postulante->apellidos),
                    'ci' => $ci,
                    'nota_1' => $n1Val,
                    'nota_2' => $n2Val,
                    'nota_3' => $n3Val,
                    'promedio' => $promedio,
                    'estado_nota' => $estado,
                    'nota_1_old' => $examen?->nota_1,
                    'nota_2_old' => $examen?->nota_2,
                    'nota_3_old' => $examen?->nota_3,
                    'sobreescribir' => ($examen !== null),
                ];
            }
        }

        fclose($file);

        return response()->json([
            'total_rows' => $totalRows,
            'valid_rows' => $validRows,
            'invalid_rows' => $invalidRows,
            'errors' => $errors,
            'updates' => $updates,
        ]);
    }

    public function importarCalificacionesCsv(Request $request): JsonResponse
    {
        $request->validate([
            'grupo_id' => 'required|exists:grupos,id',
            'updates' => 'required|array',
            'updates.*.postulante_id' => 'required|exists:postulantes,id',
            'updates.*.nota_1' => 'nullable|numeric|min:0|max:100',
            'updates.*.nota_2' => 'nullable|numeric|min:0|max:100',
            'updates.*.nota_3' => 'nullable|numeric|min:0|max:100',
        ]);

        $userId = $request->user()->id;
        $grupoId = $request->grupo_id;

        $asignacion = DocenteGrupoAsignacion::where('docente_user_id', $userId)
            ->where('grupo_id', $grupoId)
            ->where('estado', 'activo')
            ->first();

        if (!$asignacion) {
            return response()->json(['message' => 'No tienes asignado este grupo.'], 403);
        }

        $materiaId = $asignacion->materia_id;
        $grupo = Grupo::findOrFail($grupoId);
        $grupoPostulanteIds = DB::table('grupo_postulante')
            ->where('grupo_id', $grupoId)
            ->pluck('postulante_id')
            ->toArray();

        DB::beginTransaction();
        try {
            $count = 0;
            foreach ($request->updates as $item) {
                $pid = $item['postulante_id'];
                if (!in_array($pid, $grupoPostulanteIds)) {
                    throw new \Exception("El estudiante con ID {$pid} no pertenece al grupo.");
                }

                $examen = Examen::firstOrNew([
                    'postulante_id' => $pid,
                    'materia_id'    => $materiaId,
                ]);

                $examen->nota_1 = isset($item['nota_1']) && $item['nota_1'] !== '' ? floatval($item['nota_1']) : null;
                $examen->nota_2 = isset($item['nota_2']) && $item['nota_2'] !== '' ? floatval($item['nota_2']) : null;
                $examen->nota_3 = isset($item['nota_3']) && $item['nota_3'] !== '' ? floatval($item['nota_3']) : null;

                if ($examen->nota_1 !== null && $examen->nota_2 !== null && $examen->nota_3 !== null) {
                    $examen->promedio = round(($examen->nota_1 + $examen->nota_2 + $examen->nota_3) / 3, 2);
                    $examen->estado = $examen->promedio >= 60 ? 'aprobado' : 'reprobado';
                } else {
                    $examen->promedio = null;
                    $examen->estado = 'pendiente';
                }

                $examen->save();
                $count++;
            }

            DB::commit();

            AuditoriaService::registrar(
                $userId,
                'Importó calificaciones por CSV',
                'Calificaciones',
                $request,
                "Grupo ID: {$grupoId} | Materia ID: {$materiaId} | Registros actualizados: {$count}"
            );

            return response()->json(['message' => "Notas importadas correctamente. Se actualizaron {$count} registros."]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al guardar las notas: ' . $e->getMessage()], 422);
        }
    }

}

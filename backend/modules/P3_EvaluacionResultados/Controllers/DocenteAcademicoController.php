<?php

namespace Modules\P3_EvaluacionResultados\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Asistencia;
use App\Models\DocenteGrupoAsignacion;
use App\Models\Examen;
use App\Models\Grupo;
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

    // ── Mis Grupos completo (para la vista fusionada) ────────────────────────

    public function misGruposCompleto(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $user   = $request->user()->load('especialidadDocente.materia');

        // Todas las asignaciones activas del docente
        $asignaciones = DocenteGrupoAsignacion::with(['grupo.postulantes'])
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

}

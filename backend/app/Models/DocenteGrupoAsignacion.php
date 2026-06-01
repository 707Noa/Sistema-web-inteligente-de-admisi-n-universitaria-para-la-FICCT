<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocenteGrupoAsignacion extends Model
{
    protected $table = 'docente_grupo_asignaciones';

    protected $fillable = [
        'docente_user_id', 'grupo_id', 'materia_id',
        'dia', 'turno', 'hora_inicio', 'hora_fin', 'estado',
    ];

    public function docente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'docente_user_id');
    }

    public function grupo(): BelongsTo
    {
        return $this->belongsTo(Grupo::class);
    }

    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class);
    }
}

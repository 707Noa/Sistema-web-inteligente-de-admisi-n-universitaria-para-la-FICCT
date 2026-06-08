<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Tarea extends Model
{
    protected $table = 'tareas';

    protected $fillable = [
        'docente_user_id',
        'grupo_id',
        'materia_id',
        'gestion',
        'titulo',
        'descripcion',
        'fecha_publicacion',
        'fecha_limite',
        'estado',
        'archivo_path',
    ];

    protected $casts = [
        'fecha_publicacion' => 'datetime',
        'fecha_limite'      => 'datetime',
    ];

    public function docente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'docente_user_id');
    }

    public function grupo(): BelongsTo
    {
        return $this->belongsTo(Grupo::class, 'grupo_id');
    }

    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class, 'materia_id');
    }
}

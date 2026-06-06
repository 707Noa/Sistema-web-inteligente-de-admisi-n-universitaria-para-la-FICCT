<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Asistencia extends Model
{
    protected $table = 'asistencias';

    protected $fillable = [
        'grupo_id', 'materia_id', 'docente_user_id',
        'postulante_id', 'fecha', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'fecha' => 'date',
        ];
    }

    public function grupo(): BelongsTo
    {
        return $this->belongsTo(Grupo::class);
    }

    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class);
    }

    public function docente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'docente_user_id');
    }

    public function postulante(): BelongsTo
    {
        return $this->belongsTo(Postulante::class);
    }
}

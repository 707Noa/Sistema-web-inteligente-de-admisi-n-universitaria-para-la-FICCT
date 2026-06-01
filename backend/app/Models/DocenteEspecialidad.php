<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocenteEspecialidad extends Model
{
    protected $table = 'docente_especialidades';

    protected $fillable = ['user_id', 'materia_id', 'estado'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class);
    }
}

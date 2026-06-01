<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GrupoHorario extends Model
{
    protected $table = 'grupo_horarios';

    protected $fillable = ['grupo_id', 'materia_id', 'dia', 'hora_inicio', 'hora_fin'];

    protected function casts(): array
    {
        return [
            'hora_inicio' => 'string',
            'hora_fin'    => 'string',
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
}

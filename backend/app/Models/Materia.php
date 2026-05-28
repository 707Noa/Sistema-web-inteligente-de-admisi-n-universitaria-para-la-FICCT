<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Materia extends Model
{
    protected $fillable = ['nombre', 'codigo', 'descripcion', 'estado'];

    public function grupos(): HasMany
    {
        return $this->hasMany(Grupo::class, 'materia_id');
    }

    public function examenes(): HasMany
    {
        return $this->hasMany(Examen::class, 'materia_id');
    }
}

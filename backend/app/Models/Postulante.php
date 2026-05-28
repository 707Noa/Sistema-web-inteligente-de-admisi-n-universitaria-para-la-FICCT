<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Postulante extends Model
{
    protected $fillable = [
        'user_id', 'nombres', 'apellidos', 'ci', 'genero',
        'fecha_nacimiento', 'celular', 'segundo_celular', 'email',
        'direccion', 'carrera_postulada', 'foto', 'codigo_qr', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'fecha_nacimiento' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function grupos(): BelongsToMany
    {
        return $this->belongsToMany(Grupo::class, 'grupo_postulante')
                    ->withTimestamps();
    }

    public function examenes(): HasMany
    {
        return $this->hasMany(Examen::class, 'postulante_id');
    }
}

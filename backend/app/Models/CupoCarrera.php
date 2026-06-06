<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CupoCarrera extends Model
{
    protected $table = 'cupos_carrera';

    protected $fillable = ['carrera', 'gestion', 'cupo_maximo', 'estado'];
}

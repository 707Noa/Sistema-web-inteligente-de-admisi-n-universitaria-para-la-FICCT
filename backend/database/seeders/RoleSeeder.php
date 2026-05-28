<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'administrador', 'description' => 'Administrador del sistema'],
            ['name' => 'coordinador', 'description' => 'Coordinador Académico'],
            ['name' => 'autoridad', 'description' => 'Autoridad Académica'],
            ['name' => 'docente', 'description' => 'Docente del curso'],
            ['name' => 'postulante', 'description' => 'Postulante al curso preuniversitario'],
        ];

        foreach ($roles as $role) {
            DB::table('roles')->updateOrInsert(
                ['name' => $role['name']],
                array_merge($role, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}

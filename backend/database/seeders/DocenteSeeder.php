<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DocenteSeeder extends Seeder
{
    public function run(): void
    {
        $roleDocente = DB::table('roles')->where('name', 'docente')->first();

        if (!$roleDocente) {
            return;
        }

        $ci = '1234567';
        $email = 'docente@sistema.com';
        $codigo = '2026' . strrev($ci); // 20267654321

        // Actualiza si ya existe, inserta si no
        $existingUser = DB::table('users')->where('email', $email)->orWhere('ci', $ci)->first();
        if ($existingUser) {
            DB::table('users')->where('id', $existingUser->id)->update([
                'password'             => Hash::make($ci),
                'must_change_password' => true,
                'updated_at'           => now(),
            ]);
            $userId = $existingUser->id;
        } else {
            $userId = DB::table('users')->insertGetId([
                'role_id'              => $roleDocente->id,
                'name'                 => 'Docente de Prueba',
                'email'                => $email,
                'ci'                   => $ci,
                'password'             => Hash::make($ci),
                'estado'               => 'activo',
                'codigo'               => $codigo,
                'must_change_password' => true,
                'created_at'           => now(),
                'updated_at'           => now(),
            ]);
        }

        // 2. Crear el registro en docentes
        DB::table('docentes')->updateOrInsert(
            ['ci' => $ci],
            [
                'user_id'         => $userId,
                'nombres'         => 'Docente',
                'apellidos'       => 'de Prueba',
                'ci'              => $ci,
                'email'           => $email,
                'celular'         => '76543210',
                'profesion'       => 'Licenciado en Informática',
                'tiene_maestria'  => true,
                'tiene_diplomado' => true,
                'estado'          => 'activo',
                'created_at'      => now(),
                'updated_at'      => now(),
            ]
        );
    }
}

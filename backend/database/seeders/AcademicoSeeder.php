<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AcademicoSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Coordinador
        $roleCoordinador = DB::table('roles')->where('name', 'coordinador')->first();
        if ($roleCoordinador) {
            $ci = '20000001';
            $email = 'coordinador@sistema.com';
            $password = Hash::make($ci);

            $existing = DB::table('users')->where('email', $email)->orWhere('ci', $ci)->first();
            if (!$existing) {
                DB::table('users')->insert([
                    'role_id' => $roleCoordinador->id,
                    'name' => 'Coordinador Académico',
                    'email' => $email,
                    'ci' => $ci,
                    'password' => $password,
                    'estado' => 'activo',
                    'codigo' => 'COORD001',
                    'must_change_password' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // 2. Autoridad
        $roleAutoridad = DB::table('roles')->where('name', 'autoridad')->first();
        if ($roleAutoridad) {
            $ci = '30000001';
            $email = 'autoridad@sistema.com';
            $password = Hash::make($ci);

            $existing = DB::table('users')->where('email', $email)->orWhere('ci', $ci)->first();
            if (!$existing) {
                DB::table('users')->insert([
                    'role_id' => $roleAutoridad->id,
                    'name' => 'Autoridad Académica',
                    'email' => $email,
                    'ci' => $ci,
                    'password' => $password,
                    'estado' => 'activo',
                    'codigo' => 'AUTOR001',
                    'must_change_password' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
}

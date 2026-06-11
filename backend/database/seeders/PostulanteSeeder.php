<?php
 
namespace Database\Seeders;
 
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\Postulante;
use App\Models\User;
use App\Models\Role;
use App\Models\Carrera;
 
class PostulanteSeeder extends Seeder
{
    public function run(): void
    {
        $rolePostulante = Role::where('name', 'postulante')->first();
        if (!$rolePostulante) {
            return;
        }
 
        $carreras = Carrera::all();
        if ($carreras->isEmpty()) {
            return;
        }
 
        // 1. Postulante fijo 1 (must_change_password = true, para probar primer acceso)
        $ci1 = '9000001';
        $email1 = 'postulante1@sistema.com';
        $codigo1 = '2026' . strrev($ci1);
        $post1 = Postulante::updateOrCreate([
            'email' => $email1,
        ], [
            'nombres'             => 'Pedro',
            'apellidos'           => 'Postulante Uno',
            'ci'                  => $ci1,
            'celular'             => '71111111',
            'carrera_postulada'   => $carreras->first()->nombre,
            'colegio_procedencia' => 'Colegio Nacional Uno',
            'ciudad'              => 'Santa Cruz',
            'estado_tramite'      => 'INSCRITO',
            'estado'              => 'activo',
            'pago_estado'         => 'PAGADO',
            'pago_metodo'         => 'TRANSFERENCIA',
            'codigo_usuario'      => $codigo1,
            'requisitos_completos'=> true,
            'preferencia_turno'   => 'manana',
        ]);
 
        $user1 = User::updateOrCreate([
            'email' => $email1,
        ], [
            'name'                 => 'Pedro Postulante Uno',
            'ci'                   => $ci1,
            'password'             => Hash::make($ci1), // Contraseña inicial es el CI
            'role_id'              => $rolePostulante->id,
            'estado'               => 'activo',
            'codigo'               => $codigo1,
            'must_change_password' => true,
        ]);
        $post1->user_id = $user1->id;
        $post1->save();
 
        // 2. Postulante fijo 2 (must_change_password = false, para probar acceso directo)
        $ci2 = '9000002';
        $email2 = 'postulante2@sistema.com';
        $codigo2 = '2026' . strrev($ci2);
        $post2 = Postulante::updateOrCreate([
            'email' => $email2,
        ], [
            'nombres'             => 'Ana',
            'apellidos'           => 'Postulante Dos',
            'ci'                  => $ci2,
            'celular'             => '72222222',
            'carrera_postulada'   => $carreras->skip(1)->first()?->nombre ?? $carreras->first()->nombre,
            'colegio_procedencia' => 'Colegio Nacional Dos',
            'ciudad'              => 'Santa Cruz',
            'estado_tramite'      => 'INSCRITO',
            'estado'              => 'activo',
            'pago_estado'         => 'PAGADO',
            'pago_metodo'         => 'TRANSFERENCIA',
            'codigo_usuario'      => $codigo2,
            'requisitos_completos'=> true,
            'preferencia_turno'   => 'tarde',
        ]);
 
        $user2 = User::updateOrCreate([
            'email' => $email2,
        ], [
            'name'                 => 'Ana Postulante Dos',
            'ci'                   => $ci2,
            'password'             => Hash::make($ci2), // Contraseña inicial es el CI
            'role_id'              => $rolePostulante->id,
            'estado'               => 'activo',
            'codigo'               => $codigo2,
            'must_change_password' => true,
        ]);
        $post2->user_id = $user2->id;
        $post2->save();
 
        // 3. Generar otros 148 postulantes aleatorios
        $nombresLista = ['Juan', 'María', 'Pedro', 'Ana', 'Luis', 'Carmen', 'Carlos', 'Laura', 'José', 'Elena', 'Miguel', 'Sofía', 'David', 'Lucía', 'Jorge', 'Isabel'];
        $apellidosLista = ['Gómez', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'García', 'Romero', 'Torres', 'Ruiz', 'Díaz', 'Álvarez'];
        $turnos = ['manana', 'tarde', 'noche'];
 
        for ($i = 3; $i <= 150; $i++) {
            $nombres = $nombresLista[array_rand($nombresLista)] . ' ' . $nombresLista[array_rand($nombresLista)];
            $apellidos = $apellidosLista[array_rand($apellidosLista)] . ' ' . $apellidosLista[array_rand($apellidosLista)];
            $ci = (string)(9000000 + $i);
            $email = strtolower(str_replace(' ', '', $nombresLista[array_rand($nombresLista)])) . $i . '@sistema.com';
            $celular = (string)(70000000 + $i);
            $carrera = $carreras->random()->nombre;
            $preferencia_turno = $turnos[array_rand($turnos)];
            $codigo_usuario = '2026' . strrev($ci);
 
            $post = Postulante::updateOrCreate([
                'email' => $email,
            ], [
                'nombres'             => $nombres,
                'apellidos'           => $apellidos,
                'ci'                  => $ci,
                'celular'             => $celular,
                'carrera_postulada'   => $carrera,
                'colegio_procedencia' => 'Colegio Nacional ' . $i,
                'ciudad'              => 'Santa Cruz',
                'estado_tramite'      => 'INSCRITO',
                'estado'              => 'activo',
                'pago_estado'         => 'PAGADO',
                'pago_metodo'         => 'TRANSFERENCIA',
                'codigo_usuario'      => $codigo_usuario,
                'requisitos_completos'=> true,
                'preferencia_turno'   => $preferencia_turno,
            ]);
 
            $user = User::updateOrCreate([
                'email' => $email,
            ], [
                'name'                 => trim($nombres . ' ' . $apellidos),
                'ci'                   => $ci,
                'password'             => Hash::make($ci),
                'role_id'              => $rolePostulante->id,
                'estado'               => 'activo',
                'codigo'               => $codigo_usuario,
                'must_change_password' => true,
            ]);
 
            $post->user_id = $user->id;
            $post->save();
        }
    }
}

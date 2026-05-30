<?php
namespace Modules\P1_SeguridadAdministracion\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize() { return true; }
    public function rules() { return ['email' => 'required|email', 'password' => 'required']; }
}

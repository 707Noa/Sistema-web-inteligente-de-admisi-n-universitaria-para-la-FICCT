<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CuentaUsuarioMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $nombreCompleto;
    public string $perfil;
    public string $codigoUsuario;
    public string $ci;
    public string $urlLogin;

    /**
     * Create a new message instance.
     */
    public function __construct(string $nombreCompleto, string $perfil, string $codigoUsuario, string $ci, string $urlLogin)
    {
        $this->nombreCompleto = $nombreCompleto;
        $this->perfil = $perfil;
        $this->codigoUsuario = $codigoUsuario;
        $this->ci = $ci;
        $this->urlLogin = $urlLogin;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Cuenta de acceso - Portal de Cursos Preuniversitarios',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.cuenta-usuario',
            with: [
                'nombreCompleto' => $this->nombreCompleto,
                'perfil' => $this->perfil,
                'codigoUsuario' => $this->codigoUsuario,
                'ci' => $this->ci,
                'urlLogin' => $this->urlLogin,
            ]
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}

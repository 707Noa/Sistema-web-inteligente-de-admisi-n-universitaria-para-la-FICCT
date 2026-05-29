<?php

namespace App\Mail;

use App\Models\Postulante;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CuentaPostulanteMail extends Mailable
{
    use Queueable, SerializesModels;

    public Postulante $postulante;
    public string $codigo;

    /**
     * Create a new message instance.
     */
    public function __construct(Postulante $postulante, string $codigo)
    {
        $this->postulante = $postulante;
        $this->codigo = $codigo;
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
            view: 'emails.cuenta-postulante',
            with: [
                'nombres' => $this->postulante->nombres,
                'apellidos' => $this->postulante->apellidos,
                'ci' => $this->postulante->ci,
                'codigo' => $this->codigo,
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

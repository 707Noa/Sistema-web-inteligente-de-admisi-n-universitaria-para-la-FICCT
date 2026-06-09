import { useState, useRef, useCallback, useEffect } from 'react'

const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition || null
    : null

export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState(null)

  // shouldListenRef = intención del usuario. Se apaga ANTES de llamar .stop()
  // para que onend no relance el reconocedor.
  const shouldListenRef = useRef(false)
  const recognitionRef = useRef(null)
  const restartTimerRef = useRef(null)

  const supported = Boolean(SpeechRecognitionAPI)

  // Crear la instancia UNA SOLA VEZ. Los handlers usan la misma instancia
  // mediante la variable local `r`, evitando el patrón recursivo de createRecognition().
  useEffect(() => {
    if (!supported) return

    const r = new SpeechRecognitionAPI()
    r.lang = 'es-ES'        // es-BO no tiene servidor en Google Speech; es-ES es el fallback
    r.interimResults = true
    r.continuous = true     // mantiene el reconocedor activo sin disparar onend tras cada frase
    r.maxAlternatives = 1

    r.onstart = () => {
      setIsListening(true)
      setError(null)
    }

    r.onresult = (event) => {
      let final = ''
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }
      if (final) {
        setTranscript((prev) => {
          const base = prev.trim()
          return base ? base + ' ' + final.trim() : final.trim()
        })
        setInterimTranscript('')
      } else {
        setInterimTranscript(interim)
      }
    }

    r.onerror = (event) => {
      const code = event.error
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        shouldListenRef.current = false
        setIsListening(false)
        setError('Permiso de micrófono denegado. Habilítalo en el candado de la barra de direcciones.')
        return
      }
      if (code === 'audio-capture') {
        shouldListenRef.current = false
        setIsListening(false)
        setError('No se detectó un micrófono disponible en este dispositivo.')
        return
      }
      // aborted, network, no-speech: no mostrar error; onend manejará el reinicio si corresponde
    }

    r.onend = () => {
      setIsListening(false)
      setInterimTranscript('')
      // Solo reiniciar si el usuario todavía quiere escuchar (shouldListenRef no fue apagado por stop())
      if (shouldListenRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (shouldListenRef.current) {
            try {
              r.start()  // reiniciar LA MISMA instancia, no crear una nueva
            } catch (_) {
              // InvalidStateError: ya activo — ignorar
            }
          }
        }, 250)
      }
    }

    recognitionRef.current = r

    return () => {
      shouldListenRef.current = false
      clearTimeout(restartTimerRef.current)
      try { r.abort() } catch (_) {}
      recognitionRef.current = null
    }
  }, [supported])

  const start = useCallback(() => {
    if (!supported) {
      setError('Tu navegador no soporta dictado por voz. Usa Chrome o Edge, o escribe la solicitud manualmente.')
      return
    }
    if (shouldListenRef.current) return // ya está activo, evitar doble start

    if (!recognitionRef.current) {
      setError('No se pudo iniciar el dictado. Recarga la página e intenta nuevamente.')
      return
    }

    clearTimeout(restartTimerRef.current)
    shouldListenRef.current = true
    setError(null)

    try {
      recognitionRef.current.start()
    } catch (e) {
      if (e.name === 'InvalidStateError') {
        // Ya estaba corriendo (p.ej. StrictMode), simplemente marcar como activo
        setIsListening(true)
      } else {
        shouldListenRef.current = false
        setError('No se pudo iniciar el dictado. Verifica los permisos del micrófono.')
      }
    }
  }, [supported])

  const stop = useCallback(() => {
    // Apagar la bandera PRIMERO para que onend no relance el reconocedor
    shouldListenRef.current = false
    clearTimeout(restartTimerRef.current)
    setInterimTranscript('')
    setIsListening(false)
    try {
      recognitionRef.current?.stop()
    } catch (_) {}
  }, [])

  const reset = useCallback(() => {
    shouldListenRef.current = false
    clearTimeout(restartTimerRef.current)
    try { recognitionRef.current?.abort() } catch (_) {}
    setTranscript('')
    setInterimTranscript('')
    setIsListening(false)
    setError(null)
  }, [])

  return {
    transcript,
    interimTranscript,
    isListening,
    error,
    supported,
    start,
    stop,
    reset,
    setTranscript,
  }
}

import { useState, useRef, useCallback } from 'react'

export default function AudioRecorder({ onRecordingComplete, disabled }) {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState('')
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  const startRecording = useCallback(async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        if (chunksRef.current.length === 0) {
          setError('No audio captured. Please try again and allow microphone access.')
          return
        }
        onRecordingComplete?.(new Blob(chunksRef.current, { type: 'audio/webm' }))
      }
      // Request data every 1s so browsers flush chunks reliably (avoids empty recording on stop)
      mediaRecorder.start(1000)
      setIsRecording(true)
    } catch (err) {
      setError('Microphone access denied or unavailable')
    }
  }, [onRecordingComplete])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [])

  return (
    <div className="flex flex-col items-center gap-2">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {isRecording ? (
        <button onClick={stopRecording} disabled={disabled} className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-red-500 text-white font-semibold recording-pulse hover:bg-red-600 disabled:opacity-50">
          <span className="w-3 h-3 rounded-full bg-white animate-pulse" /> Stop Recording
        </button>
      ) : (
        <button onClick={startRecording} disabled={disabled} className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50">
          <span className="w-3 h-3 rounded-full bg-white" /> Start Ambient AI
        </button>
      )}
    </div>
  )
}

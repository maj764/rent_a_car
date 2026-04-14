import { useState, useCallback } from 'react'
import { ToastMsg } from '../components/Toast'

export function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([])

  const toast = useCallback((message: string, type: ToastMsg['type'] = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, toast, remove }
}
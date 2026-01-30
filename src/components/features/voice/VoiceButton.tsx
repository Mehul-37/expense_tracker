import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, X, Check, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useVoiceStore } from '@/stores'
import { useSpeechRecognition } from '@/hooks'
import { processVoiceCommand, type ParsedExpense } from '@/services/ai'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { CATEGORIES } from '@/constants'

interface VoiceButtonProps {
  onExpenseConfirm?: (expense: ParsedExpense) => Promise<void>
}

export default function VoiceButton({ onExpenseConfirm }: VoiceButtonProps) {
  const { isActive, setActive, reset } = useVoiceStore()

  const handleClick = () => {
    if (isActive) {
      reset()
    } else {
      setActive(true)
    }
  }

  return (
    <>
      {/* Floating Voice Button */}
      <motion.button
        className={cn(
          'fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-colors',
          isActive
            ? 'bg-danger hover:bg-danger/90'
            : 'bg-primary hover:bg-primary-hover'
        )}
        onClick={handleClick}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {isActive ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <>
            <Mic className="h-6 w-6 text-white" />
            {/* Pulse animation */}
            <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-25" />
          </>
        )}
      </motion.button>

      {/* Voice Overlay */}
      <AnimatePresence>
        {isActive && (
          <VoiceOverlay onClose={reset} onExpenseConfirm={onExpenseConfirm} />
        )}
      </AnimatePresence>
    </>
  )
}

interface VoiceOverlayProps {
  onClose: () => void
  onExpenseConfirm?: (expense: ParsedExpense) => Promise<void>
}

function VoiceOverlay({ onClose, onExpenseConfirm }: VoiceOverlayProps) {
  const [state, setState] = useState<
    'idle' | 'listening' | 'processing' | 'confirming' | 'error' | 'success'
  >('idle')
  const [parsedExpense, setParsedExpense] = useState<ParsedExpense | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    language: 'en-IN',
    continuous: true,
    interimResults: true,
  })

  const handleStartListening = useCallback(() => {
    if (!isSupported) {
      setErrorMessage('Speech recognition not supported in this browser')
      setState('error')
      return
    }

    resetTranscript()
    setErrorMessage(null)
    setParsedExpense(null)
    startListening()
    setState('listening')
  }, [isSupported, startListening, resetTranscript])

  const handleStopAndProcess = useCallback(async () => {
    stopListening()

    const fullTranscript = transcript || interimTranscript
    if (!fullTranscript.trim()) {
      setErrorMessage('No speech detected. Please try again.')
      setState('error')
      return
    }

    setState('processing')

    try {
      const result = await processVoiceCommand(fullTranscript)

      if (result.type === 'add_expense' && result.data) {
        setParsedExpense(result.data)
        setState('confirming')
      } else if (result.response) {
        setErrorMessage(result.response)
        setState('error')
      } else {
        setErrorMessage("I couldn't understand that. Please try again.")
        setState('error')
      }
    } catch (err) {
      setErrorMessage('Failed to process your request. Please try again.')
      setState('error')
    }
  }, [stopListening, transcript, interimTranscript])

  const handleConfirm = async () => {
    if (!parsedExpense || !onExpenseConfirm) return

    setIsSubmitting(true)
    try {
      await onExpenseConfirm(parsedExpense)
      setState('success')
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setErrorMessage('Failed to add expense. Please try again.')
      setState('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetry = () => {
    resetTranscript()
    setErrorMessage(null)
    setParsedExpense(null)
    setState('idle')
  }

  // Auto-start listening when overlay opens
  useEffect(() => {
    if (state === 'idle') {
      const timer = setTimeout(handleStartListening, 500)
      return () => clearTimeout(timer)
    }
  }, [state, handleStartListening])

  // Update state based on listening status
  useEffect(() => {
    if (isListening && state === 'idle') {
      setState('listening')
    }
  }, [isListening, state])

  const getCategoryInfo = (categoryId: string) => {
    return CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[7]
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Close button */}
      <button
        className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-hover"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </button>

      {/* Voice Visualizer */}
      <div className="flex flex-col items-center gap-6 max-w-sm w-full">
        {/* Animated circles */}
        <div className="relative">
          <motion.div
            className={cn(
              'h-32 w-32 rounded-full flex items-center justify-center',
              state === 'listening' && 'bg-primary/20',
              state === 'processing' && 'bg-warning/20',
              state === 'confirming' && 'bg-success/20',
              state === 'error' && 'bg-danger/20',
              state === 'success' && 'bg-success/20',
              state === 'idle' && 'bg-primary/20'
            )}
            animate={{
              scale: state === 'listening' ? [1, 1.1, 1] : 1,
            }}
            transition={{
              duration: 1,
              repeat: state === 'listening' ? Infinity : 0,
            }}
          >
            <motion.div
              className={cn(
                'h-24 w-24 rounded-full flex items-center justify-center',
                state === 'listening' && 'bg-primary/40',
                state === 'processing' && 'bg-warning/40',
                state === 'confirming' && 'bg-success/40',
                state === 'error' && 'bg-danger/40',
                state === 'success' && 'bg-success/40',
                state === 'idle' && 'bg-primary/40'
              )}
              animate={{
                scale: state === 'listening' ? [1, 1.15, 1] : 1,
              }}
              transition={{
                duration: 1,
                repeat: state === 'listening' ? Infinity : 0,
                delay: 0.1,
              }}
            >
              <motion.div
                className={cn(
                  'h-16 w-16 rounded-full flex items-center justify-center',
                  state === 'listening' && 'bg-primary',
                  state === 'processing' && 'bg-warning',
                  state === 'confirming' && 'bg-success',
                  state === 'error' && 'bg-danger',
                  state === 'success' && 'bg-success',
                  state === 'idle' && 'bg-primary'
                )}
              >
                {state === 'listening' && <Mic className="h-8 w-8 text-white" />}
                {state === 'processing' && (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                )}
                {state === 'confirming' && <Check className="h-8 w-8 text-white" />}
                {state === 'error' && <AlertCircle className="h-8 w-8 text-white" />}
                {state === 'success' && <Check className="h-8 w-8 text-white" />}
                {state === 'idle' && <Mic className="h-8 w-8 text-white" />}
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* State text */}
        <div className="text-center">
          <h2 className="text-xl font-semibold">
            {state === 'listening' && 'Listening...'}
            {state === 'processing' && 'Processing...'}
            {state === 'confirming' && 'Confirm Expense'}
            {state === 'error' && 'Oops!'}
            {state === 'success' && 'Added!'}
            {state === 'idle' && 'Tap to speak'}
          </h2>
          <p className="text-muted-foreground mt-2">
            {state === 'listening' && 'Say something like "Add 500 for dinner"'}
            {state === 'processing' && 'Understanding your request...'}
            {state === 'confirming' && 'Is this correct?'}
            {state === 'error' && errorMessage}
            {state === 'success' && 'Expense added successfully'}
          </p>
        </div>

        {/* Transcript */}
        {(state === 'listening' || state === 'processing') &&
          (transcript || interimTranscript) && (
            <div className="bg-surface rounded-lg p-4 max-w-sm text-center w-full">
              <p className="text-foreground">
                {transcript}
                <span className="text-muted-foreground">{interimTranscript}</span>
              </p>
            </div>
          )}

        {/* Parsed Expense Confirmation */}
        {state === 'confirming' && parsedExpense && (
          <motion.div
            className="bg-surface rounded-lg p-4 w-full space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="text-2xl font-bold">
                {formatCurrency(parsedExpense.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Description</span>
              <span className="font-medium">{parsedExpense.description}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Category</span>
              {(() => {
                const catInfo = getCategoryInfo(parsedExpense.category)
                const CategoryIcon = catInfo.icon
                return (
                  <div
                    className="flex items-center gap-2 px-2 py-1 rounded-full text-sm"
                    style={{
                      backgroundColor: `${catInfo.color}20`,
                      color: catInfo.color,
                    }}
                  >
                    <CategoryIcon className="h-4 w-4" />
                    {catInfo.label}
                  </div>
                )
              })()}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Split</span>
              <span className="font-medium capitalize">{parsedExpense.splitType}</span>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 w-full">
          {state === 'listening' && (
            <Button className="flex-1" onClick={handleStopAndProcess}>
              Done Speaking
            </Button>
          )}

          {state === 'confirming' && (
            <>
              <Button variant="outline" className="flex-1" onClick={handleRetry}>
                Try Again
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Confirm
              </Button>
            </>
          )}

          {state === 'error' && (
            <Button className="flex-1" onClick={handleRetry}>
              Try Again
            </Button>
          )}

          {state === 'idle' && (
            <Button className="flex-1" onClick={handleStartListening}>
              <Mic className="h-4 w-4 mr-2" />
              Start Listening
            </Button>
          )}
        </div>

        {/* Quick suggestions */}
        {state === 'idle' && (
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              'Add 500 for dinner',
              'Split 1000 for groceries',
              'Paid 200 for snacks',
            ].map((suggestion) => (
              <button
                key={suggestion}
                className="px-3 py-1.5 rounded-full bg-surface hover:bg-surface-hover text-sm transition-colors"
                onClick={handleStartListening}
              >
                "{suggestion}"
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

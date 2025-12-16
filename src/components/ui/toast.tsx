import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { cn } from '../../lib/utils'
import { X } from 'lucide-react'

const ToastProvider = ToastPrimitive.Provider

export type ToastMessage = {
  title: string
  description: string
  variant: ToastVariant
}

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      'bg-transparent fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]',
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitive.Viewport.displayName

type ToastVariant = 'neutral' | 'success' | 'error'

interface ToastProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> {
  variant?: ToastVariant
}

const toastVariants: Record<ToastVariant, string> = {
  neutral: 'bg-yellow-500 text-white',
  success: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white'
}

const Toast = React.forwardRef<React.ElementRef<typeof ToastPrimitive.Root>, ToastProps>(
  ({ className, variant = 'neutral', ...props }, ref) => (
    <ToastPrimitive.Root
      ref={ref}
      className={cn(
        'group fixed top-4 left-4 z-50 w-auto max-w-sm px-4 py-2 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom',
        toastVariants[variant],
        className
      )}
      {...props}
    />
  )
)
Toast.displayName = ToastPrimitive.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Action
    ref={ref}
    className={cn('text-xs font-medium text-white hover:opacity-90', className)}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitive.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn('absolute top-2 right-2 text-white opacity-70 hover:opacity-100', className)}
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitive.Close>
))
ToastClose.displayName = ToastPrimitive.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title ref={ref} className={cn('font-semibold text-sm', className)} {...props} />
))
ToastTitle.displayName = ToastPrimitive.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={cn('text-xs opacity-90', className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitive.Description.displayName

export type { ToastProps }
export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastAction,
  ToastClose,
  ToastTitle,
  ToastDescription
}

// Simple Toast Manager
import { useState, useEffect } from 'react'

const listeners: Array<(state: any) => void> = []
let memoryState: { toasts: any[] } = { toasts: [] }

function dispatch(action: any) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ActionType = {
  type: 'ADD_TOAST'
  toast: any
} | {
  type: 'UPDATE_TOAST'
  toast: any
} | {
  type: 'DISMISS_TOAST'
  toastId?: string
} | {
  type: 'REMOVE_TOAST'
  toastId?: string
}

const reducer = (state: any, action: ActionType) => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }
    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t: any) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }
    case 'DISMISS_TOAST':
      const { toastId } = action
      if (toastId) {
        return {
          ...state,
          toasts: state.toasts.map((t: any) =>
            t.id === toastId ? { ...t, open: false } : t
          ),
        }
      }
      return {
        ...state,
        toasts: state.toasts.map((t: any) => ({ ...t, open: false })),
      }
    case 'REMOVE_TOAST':
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t: any) => t.id !== action.toastId),
      }
  }
}

let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

export function useToast() {
  const [state, setState] = useState<{ toasts: any[] }>(memoryState)

  useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast: (props: Omit<ToastMessage, 'id'> & { variant?: 'neutral' | 'success' | 'error' | 'destructive' }) => {
      const id = genId()
      const update = (props: any) =>
        dispatch({
          type: 'UPDATE_TOAST',
          toast: { ...props, id },
        })
      const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toastId: id })

      dispatch({
        type: 'ADD_TOAST',
        toast: {
          ...props,
          id,
          open: true,
          onOpenChange: (open: boolean) => {
            if (!open) dismiss()
          },
        },
      })

      return {
        id,
        dismiss,
        update,
      }
    },
    dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
  }
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // Map 'destructive' to 'error' for our variant system if needed, or update variants
        const finalVariant = variant === 'destructive' ? 'error' : variant || 'neutral'

        return (
          <Toast key={id} {...props} variant={finalVariant}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

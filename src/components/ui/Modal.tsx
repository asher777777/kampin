import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface ModalContextValue {
  isOpen: boolean
  close: () => void
  getTriggerProps: <T extends React.HTMLAttributes<HTMLElement>>(props?: T) => T & {
    "aria-haspopup": "dialog"
    "aria-expanded": boolean
    onClick: React.MouseEventHandler
  }
  getCloseProps: <T extends React.HTMLAttributes<HTMLElement>>(props?: T) => T & {
    onClick: React.MouseEventHandler
    "aria-label": string
  }
}

const ModalContext = React.createContext<ModalContextValue | undefined>(undefined)

function useModalContext() {
  const context = React.useContext(ModalContext)
  if (!context) {
    throw new Error("Modal components must be wrapped in <Modal />")
  }
  return context
}

export function Modal({ children, isOpen, onClose }: { children: React.ReactNode, isOpen: boolean, onClose: () => void }) {
  const getTriggerProps = React.useCallback(
    <T extends React.HTMLAttributes<HTMLElement>>(props: T = {} as T) => ({
      ...props,
      "aria-haspopup": "dialog" as const,
      "aria-expanded": isOpen,
      onClick: (e: React.MouseEvent) => {
        ;(props as any).onClick?.(e)
      }
    }),
    [isOpen]
  )

  const getCloseProps = React.useCallback(
    <T extends React.HTMLAttributes<HTMLElement>>(props: T = {} as T) => ({
      ...props,
      onClick: (e: React.MouseEvent) => {
        ;(props as any).onClick?.(e)
        onClose()
      },
      "aria-label": "Close dialog"
    }),
    [onClose]
  )

  const value = React.useMemo(() => ({ isOpen, close: onClose, getTriggerProps, getCloseProps }), [isOpen, onClose, getTriggerProps, getCloseProps])

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
}

Modal.Content = function ModalContent({ children, className }: { children: React.ReactNode, className?: string }) {
  const { isOpen } = useModalContext()
  
  // Only run on client
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => { document.body.style.overflow = "unset" }
  }, [isOpen])

  if (!mounted || !isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={cn(
          "relative w-full max-w-lg rounded-2xl bg-background p-0 shadow-xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden max-h-[90vh]",
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

Modal.Header = function ModalHeader({ title, description, className }: { title: string, description?: string, className?: string }) {
  return (
    <div className={cn("p-6 pb-4 border-b border-slate-100 shrink-0", className)}>
      <h2 className="text-xl font-bold leading-none tracking-tight text-slate-800">{title}</h2>
      {description && <p className="text-sm text-slate-500 mt-2">{description}</p>}
    </div>
  )
}

Modal.Body = function ModalBody({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("p-6 overflow-y-auto flex-1 custom-scrollbar", className)}>
      {children}
    </div>
  )
}

Modal.Close = function ModalClose({ className }: { className?: string }) {
  const { getCloseProps } = useModalContext()
  return (
    <button
      {...getCloseProps()}
      className={cn(
        "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none",
        className
      )}
    >
      <X className="h-4 w-4" />
    </button>
  )
}

Modal.Footer = function ModalFooter({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={cn("p-4 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50/50 shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2", className)}>{children}</div>
}

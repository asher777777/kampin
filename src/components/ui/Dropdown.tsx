import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

interface DropdownContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  getTriggerProps: <T extends React.HTMLAttributes<HTMLElement>>(props?: T) => T & {
    "aria-haspopup": "menu"
    "aria-expanded": boolean
    onClick: React.MouseEventHandler
  }
}

const DropdownContext = React.createContext<DropdownContextValue | undefined>(undefined)

function useDropdownContext() {
  const context = React.useContext(DropdownContext)
  if (!context) {
    throw new Error("Dropdown components must be wrapped in <Dropdown />")
  }
  return context
}

export function Dropdown({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const getTriggerProps = React.useCallback(
    <T extends React.HTMLAttributes<HTMLElement>>(props: T = {} as T) => ({
      ...props,
      onClick: (e: React.MouseEvent) => {
        ;(props as any).onClick?.(e)
        setIsOpen(!isOpen)
      },
      "aria-haspopup": "menu" as const,
      "aria-expanded": isOpen,
    }),
    [isOpen]
  )

  const value = React.useMemo(() => ({ isOpen, setIsOpen, getTriggerProps }), [isOpen, setIsOpen, getTriggerProps])

  return (
    <DropdownContext.Provider value={value}>
      <div className="relative inline-block text-left" ref={containerRef}>
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

Dropdown.Trigger = function DropdownTrigger({ children, className }: { children: React.ReactNode, className?: string }) {
  const { getTriggerProps } = useDropdownContext()
  return (
    <button
      {...getTriggerProps()}
      className={cn(
        "inline-flex justify-center w-full rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring transition-all",
        className
      )}
    >
      {children}
      <ChevronDown className="ml-2 h-4 w-4" />
    </button>
  )
}

Dropdown.Menu = function DropdownMenu({ children, className }: { children: React.ReactNode, className?: string }) {
  const { isOpen } = useDropdownContext()
  
  if (!isOpen) return null

  return (
    <div
      className={cn(
        "absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-background shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none animate-in zoom-in-95 duration-100",
        className
      )}
      role="menu"
      aria-orientation="vertical"
    >
      <div className="py-1" role="none">
        {children}
      </div>
    </div>
  )
}

Dropdown.Item = function DropdownItem({ children, onClick, className }: { children: React.ReactNode, onClick?: () => void, className?: string }) {
  const { setIsOpen } = useDropdownContext()
  return (
    <button
      onClick={() => {
        onClick?.()
        setIsOpen(false)
      }}
      className={cn(
        "block w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
        className
      )}
      role="menuitem"
    >
      {children}
    </button>
  )
}

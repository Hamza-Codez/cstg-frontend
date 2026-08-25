import * as React from "react"

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  indeterminate?: boolean
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement>(null)

    React.useEffect(() => {
      if (innerRef.current) {
        innerRef.current.indeterminate = indeterminate ?? false
      }
    }, [indeterminate])

    return (
      <input
        type="checkbox"
        ref={(node) => {
          innerRef.current = node
          if (typeof ref === "function") {
            ref(node)
          } else if (ref) {
            ref.current = node
          }
        }}
        className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 ${className || ""}`}
        {...props}
      />
    )
  }
)

Checkbox.displayName = "Checkbox"

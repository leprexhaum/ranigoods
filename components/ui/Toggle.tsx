'use client'

interface ToggleProps {
  checked:   boolean
  onChange:  (checked: boolean) => void
  disabled?: boolean
  label?:    string   // para acessibilidade (sr-only)
}

export function Toggle({ checked, onChange, disabled = false, label }: ToggleProps) {
  return (
    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        disabled={disabled}
        aria-label={label}
        className="sr-only peer"
      />
      <div className="w-9 h-5 bg-ep-overlay rounded-full peer peer-checked:bg-ep-accent transition-colors peer-disabled:opacity-50 peer-disabled:cursor-not-allowed" />
      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-ep-base rounded-full shadow transition-all peer-checked:translate-x-4 peer-disabled:opacity-50" />
    </label>
  )
}

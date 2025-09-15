'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  label?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  compact?: boolean
}

export function Select({
  value,
  onChange,
  options,
  label,
  placeholder = "Select an option",
  className = "",
  disabled = false,
  compact = false
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const selectRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(option => option.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is outside both the select and the dropdown portal
      if (selectRef.current && !selectRef.current.contains(target)) {
        // Also check if the click is not on a dropdown option
        const dropdownElement = document.querySelector('.fixed.z-\\[99999\\]');
        if (!dropdownElement || !dropdownElement.contains(target)) {
          console.log('Clicking outside, closing dropdown');
          setIsOpen(false);
          setIsFocused(false);
        }
      }
    }

    const updatePosition = () => {
      if (selectRef.current && isOpen) {
        const rect = selectRef.current.getBoundingClientRect()
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width
        })
      }
    }

    if (isOpen) {
      updatePosition()
      window.addEventListener('scroll', updatePosition)
      window.addEventListener('resize', updatePosition)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen])

  const handleSelect = (optionValue: string) => {
    console.log('handleSelect called with:', optionValue, 'Current value:', value);
    onChange(optionValue);
    setTimeout(() => {
      setIsOpen(false);
      setIsFocused(false);
    }, 10);
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        setIsOpen(!isOpen)
        break
      case 'Escape':
        setIsOpen(false)
        setIsFocused(false)
        break
      case 'ArrowDown':
        event.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          const currentIndex = options.findIndex(opt => opt.value === value)
          const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0
          onChange(options[nextIndex].value)
        }
        break
      case 'ArrowUp':
        event.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          const currentIndex = options.findIndex(opt => opt.value === value)
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1
          onChange(options[prevIndex].value)
        }
        break
    }
  }

  return (
    <div className={`relative ${className}`} ref={selectRef}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-foreground mb-2">
          {label}
        </label>
      )}

      {/* Select Button */}
      <div
        className={`
          relative w-full ${compact ? 'min-h-[44px] px-3 py-2' : 'min-h-[56px] px-4 py-3'}
          bg-input border ${compact ? 'border' : 'border-2'} rounded-3xl cursor-pointer
          transition-all duration-200 ease-in-out
          ${disabled 
            ? 'opacity-50 cursor-not-allowed border-border' 
            : isOpen || isFocused
              ? 'border-primary shadow-lg shadow-primary/20' 
              : 'border-border hover:border-primary/50'
          }
        `}
        onClick={(e) => {
          e.preventDefault();
          if (!disabled) {
            console.log('Select button clicked, current isOpen:', isOpen);
            setIsOpen(!isOpen);
          }
        }}
        onFocus={() => !disabled && setIsFocused(true)}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {/* Selected Value or Placeholder */}
        <div className="flex items-center justify-between h-full gap-1">
          <div className="flex flex-col justify-center flex-1 pl-1">
            {/* Floating Label */}
            {label && !compact && (
              <span 
                className={`
                  absolute transition-all duration-200 ease-in-out pointer-events-none
                  ${selectedOption || isFocused
                    ? 'text-xs text-primary -translate-y-2 top-2'
                    : 'text-sm text-muted-foreground top-1/2 -translate-y-1/2'
                  }
                `}
              >
                {label}
              </span>
            )}
            
            {/* Selected Value */}
            <span 
              className={`
                ${compact ? 'text-base font-medium' : 'text-sm'} transition-all duration-200 text-center
                ${selectedOption 
                  ? 'text-foreground' 
                  : 'text-muted-foreground'
                }
                ${label && !compact ? 'mt-2' : ''}
              `}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>

          {/* Chevron Icon */}
          <ChevronDown 
            className={`
              ${compact ? 'w-4 h-4' : 'w-5 h-5'} text-muted-foreground transition-transform duration-200 mr-2 flex-shrink-0
              ${isOpen ? 'rotate-180' : ''}
            `}
          />
        </div>
      </div>

      {/* Dropdown Options */}
      {isOpen && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed z-[99999]"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width
          }}
        >
          <div className="bg-popover border border-border rounded-2xl shadow-xl max-h-60 overflow-y-auto">
            {options.map((option, index) => (
              <div
                key={option.value}
                className={`
                  px-4 py-3 cursor-pointer transition-colors duration-150
                  ${option.value === value 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-popover-foreground hover:bg-accent'
                  }
                  ${index === 0 ? 'rounded-t-2xl' : ''}
                  ${index === options.length - 1 ? 'rounded-b-2xl' : ''}
                `}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Option clicked:', option.value);
                  handleSelect(option.value);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  console.log('Option mouse down:', option.value);
                }}
                role="option"
                aria-selected={option.value === value}
              >
                {option.label}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
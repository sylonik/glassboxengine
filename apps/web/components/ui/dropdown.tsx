"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

export interface DropdownOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  disabled?: boolean;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: ReactNode;
  label?: ReactNode;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
}

export function Dropdown({
  value,
  options,
  onChange,
  placeholder = "Select",
  label,
  className = "",
  style,
  disabled = false,
}: DropdownProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedIndex = useMemo(
    () => options.findIndex((option) => option.value === value),
    [options, value]
  );
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;
  const [activeIndex, setActiveIndex] = useState(
    selectedIndex >= 0 ? selectedIndex : 0
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const enabledOptions = options.filter((option) => !option.disabled);

  const moveActive = (direction: 1 | -1) => {
    if (enabledOptions.length === 0) return;

    const currentValue = options[activeIndex]?.value;
    const currentEnabledIndex = Math.max(
      0,
      enabledOptions.findIndex((option) => option.value === currentValue)
    );
    const nextEnabledIndex =
      (currentEnabledIndex + direction + enabledOptions.length) %
      enabledOptions.length;
    const nextIndex = options.findIndex(
      (option) => option.value === enabledOptions[nextEnabledIndex]?.value
    );
    if (nextIndex >= 0) setActiveIndex(nextIndex);
  };

  const selectOption = (option: DropdownOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
  };

  const toggleMenu = () => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen((open) => !open);
  };

  return (
    <div className={`gb-dropdown ${className}`} style={style} ref={rootRef}>
      {label && (
        <label className="gb-dropdown-label" htmlFor={`${id}-button`}>
          {label}
        </label>
      )}
      <button
        id={`${id}-button`}
        type="button"
        className="gb-dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-listbox`}
        disabled={disabled}
        onClick={toggleMenu}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
            moveActive(1);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setIsOpen(true);
            moveActive(-1);
          } else if (event.key === "Enter" && isOpen) {
            event.preventDefault();
            const option = options[activeIndex];
            if (option) selectOption(option);
          }
        }}
      >
        <span className="gb-dropdown-value">
          {selectedOption?.leading}
          <span className="gb-dropdown-text">
            {selectedOption?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown
          size={14}
          strokeWidth={1.8}
          className="gb-dropdown-chevron"
          data-open={isOpen}
        />
      </button>

      {isOpen && (
        <div
          id={`${id}-listbox`}
          className="gb-dropdown-menu animate-fade-in"
          role="listbox"
          aria-activedescendant={`${id}-option-${activeIndex}`}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;

            return (
              <button
                key={option.value}
                id={`${id}-option-${index}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                className={`gb-dropdown-option ${
                  isSelected ? "gb-dropdown-option-selected" : ""
                } ${isActive ? "gb-dropdown-option-active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
              >
                {option.leading && (
                  <span className="gb-dropdown-option-leading">
                    {option.leading}
                  </span>
                )}
                <span className="gb-dropdown-option-body">
                  <span className="gb-dropdown-option-label">
                    {option.label}
                  </span>
                  {option.description && (
                    <span className="gb-dropdown-option-description">
                      {option.description}
                    </span>
                  )}
                </span>
                {isSelected && (
                  <Check
                    size={14}
                    strokeWidth={2.2}
                    className="gb-dropdown-check"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        .gb-dropdown {
          position: relative;
          min-width: 0;
        }
        .gb-dropdown-label {
          display: block;
          color: var(--color-text-muted);
          font-size: var(--text-xs);
          font-weight: var(--font-medium);
          letter-spacing: 0.08em;
          margin-bottom: var(--space-2);
          text-transform: uppercase;
        }
        .gb-dropdown-trigger {
          align-items: center;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          color: var(--color-text);
          cursor: pointer;
          display: flex;
          font-family: var(--font-body);
          font-size: var(--text-sm);
          gap: var(--space-2);
          height: 36px;
          justify-content: space-between;
          min-width: 0;
          padding: 0 var(--space-2-5);
          transition: all var(--transition-fast);
          width: 100%;
        }
        .gb-dropdown-trigger:hover {
          border-color: var(--color-border-hover);
          background: var(--color-surface-hover);
        }
        .gb-dropdown-trigger:focus-visible {
          border-color: var(--color-border-focus);
          box-shadow: 0 0 0 3px var(--color-accent-subtle);
          outline: none;
        }
        .gb-dropdown-trigger:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }
        .gb-dropdown-value {
          align-items: center;
          display: flex;
          gap: var(--space-2);
          min-width: 0;
        }
        .gb-dropdown-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .gb-dropdown-chevron {
          color: var(--color-text-muted);
          flex-shrink: 0;
          transition: transform var(--transition-fast);
        }
        .gb-dropdown-chevron[data-open="true"] {
          transform: rotate(180deg);
        }
        .gb-dropdown-menu {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          left: 0;
          margin-top: var(--space-2);
          max-height: 260px;
          overflow-y: auto;
          padding: var(--space-1);
          position: absolute;
          right: 0;
          top: 100%;
          z-index: var(--z-popover);
        }
        .gb-dropdown-option {
          align-items: center;
          background: transparent;
          border: 0;
          border-radius: var(--radius-sm);
          color: var(--color-text-secondary);
          cursor: pointer;
          display: flex;
          font-family: var(--font-body);
          font-size: var(--text-sm);
          gap: var(--space-2);
          min-height: 34px;
          padding: var(--space-2) var(--space-2-5);
          text-align: left;
          transition: background var(--transition-fast), color var(--transition-fast);
          width: 100%;
        }
        .gb-dropdown-option:hover,
        .gb-dropdown-option-active {
          background: var(--color-surface-hover);
          color: var(--color-text);
        }
        .gb-dropdown-option-selected {
          background: var(--color-accent-subtle);
          color: var(--color-text);
        }
        .gb-dropdown-option:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        .gb-dropdown-option-leading {
          display: inline-flex;
          flex-shrink: 0;
        }
        .gb-dropdown-option-body {
          display: flex;
          flex: 1;
          flex-direction: column;
          min-width: 0;
        }
        .gb-dropdown-option-label,
        .gb-dropdown-option-description {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .gb-dropdown-option-label {
          color: inherit;
          font-weight: var(--font-medium);
        }
        .gb-dropdown-option-description {
          color: var(--color-text-muted);
          font-size: var(--text-xs);
          font-weight: var(--font-normal);
          margin-top: var(--space-0-5);
        }
        .gb-dropdown-check {
          color: var(--color-accent);
          flex-shrink: 0;
          margin-left: auto;
        }
      `}</style>
    </div>
  );
}

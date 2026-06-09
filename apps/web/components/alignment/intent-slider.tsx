"use client";

interface IntentSliderProps {
  name: string;
  value: number;
  onChange: (value: number) => void;
  label: string;
  description: string;
  color: string;
}

export function IntentSlider({
  name,
  value,
  onChange,
  label,
  description,
  color,
}: IntentSliderProps) {
  return (
    <div className="mb-5">
      <div className="flex items-start justify-between mb-1.5">
        <div>
          <div className="text-sm font-medium text-foreground">{label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        </div>
        <span
          className="font-mono text-sm font-semibold min-w-[40px] text-right"
          style={{ color }}
        >
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      <div className="relative h-1.5 mt-2">
        <input
          type="range"
          min="0"
          max="100"
          value={value * 100}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="slider-input absolute inset-0 w-full h-1.5 appearance-none bg-surface-raised rounded-full outline-none z-[2] cursor-pointer"
          id={`slider-${name}`}
          style={{ "--slider-color": color } as React.CSSProperties}
        />
        <div
          className="absolute top-0 left-0 h-1.5 rounded-full z-[1] pointer-events-none transition-all duration-300"
          style={{ width: `${value * 100}%`, background: color, opacity: 0.8 }}
        />
      </div>

      <style>{`
        .slider-input::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; width: 14px; height: 14px;
          border-radius: 9999px; background: var(--slider-color, var(--color-accent));
          border: 2px solid var(--color-bg); cursor: pointer;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--slider-color, var(--color-accent)) 20%, transparent);
          transition: box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .slider-input::-webkit-slider-thumb:hover {
          box-shadow: 0 0 0 5px color-mix(in srgb, var(--slider-color, var(--color-accent)) 30%, transparent);
          transform: scale(1.1);
        }
        .slider-input::-webkit-slider-thumb:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
}

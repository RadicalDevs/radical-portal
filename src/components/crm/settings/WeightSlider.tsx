"use client";

interface WeightSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

export function WeightSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  suffix = "",
}: WeightSliderProps) {
  return (
    <div className="flex items-center gap-3">
      <label className="w-36 text-sm text-muted shrink-0">
        {label}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-smaragd bg-surface-secondary"
      />
      <span className="w-16 text-right text-sm font-mono font-medium text-heading">
        {value.toFixed(step < 0.1 ? 2 : 1)}{suffix}
      </span>
    </div>
  );
}

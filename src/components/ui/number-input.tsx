// src/components/ui/number-input.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    className?: string;
}

export function NumberInput({
    value,
    onChange,
    min,
    max,
    step = 1,
    className,
    disabled = false,
    ...props
}: NumberInputProps) {
    const [localValue, setLocalValue] = useState<string>(value?.toString() || '');

    //Update local value when the prop changes
    useEffect(() => {
        if (value !== undefined) {
            setLocalValue(value.toString());
        }
    }, [value]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        if (disabled) return;

        const numValue = Number(newValue);
        if (!isNaN(numValue)) {
            let finalValue = numValue;
            if (min !== undefined && finalValue < min) finalValue = min;
            if (max !== undefined && finalValue > max) finalValue = max;
            onChange(finalValue);
            setLocalValue(finalValue.toString());
        }
    };


    return (
        <Input
            type="number"
            inputMode="numeric"
            value={localValue}
            onChange={handleChange}
            disabled={disabled}
            className={className}
            {...props}
        />
    );
}
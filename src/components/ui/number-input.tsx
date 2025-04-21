// src/components/ui/number-input.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Input } from './input';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    containerClassName?: string;
}

export function NumberInput({
    value,
    onChange,
    min,
    max,
    step = 1,
    containerClassName,
    disabled = false,
    ...props
}: NumberInputProps) {
    const [localValue, setLocalValue] = useState<string>(value?.toString() || '');
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    //Update local value when the prop changes
    useEffect(() => {
        if (value !== undefined) {
            setLocalValue(value.toString());
        }
    }, [value]);

    //Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        //Allow empty input or only numbers
        const newValue = e.target.value;
        setLocalValue(newValue);

        //If disabled, don't process changes
        if (disabled) return;

        //Clear any pending updates
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        //Only send updates for valid numbers
        const numValue = Number(newValue);
        if (!isNaN(numValue)) {
            //Debounce the update to avoid too many re-renders while typing
            timeoutRef.current = setTimeout(() => {
                let finalValue = numValue;
                if (min !== undefined && finalValue < min) finalValue = min;
                if (max !== undefined && finalValue > max) finalValue = max;
                onChange(finalValue);
            }, 300);
        }
    };

    const handleBlur = () => {
        //If disabled, don't process changes
        if (disabled) return;

        //When field is blurred, validate and convert to number
        let numValue: number;

        if (localValue === '') {
            numValue = min !== undefined ? min : 0;
        } else {
            numValue = Number(localValue);

            //Apply constraints
            if (!isNaN(numValue)) {
                if (min !== undefined && numValue < min) numValue = min;
                if (max !== undefined && numValue > max) numValue = max;
            } else {
                numValue = value || (min !== undefined ? min : 0);
            }
        }

        //Update both local and parent state
        setLocalValue(numValue.toString());
        onChange(numValue);
    };

    return (
        <div className={containerClassName}>
            <Input
                type="text"
                inputMode="numeric"
                value={localValue}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={disabled}
                {...props}
            />
        </div>
    );
}
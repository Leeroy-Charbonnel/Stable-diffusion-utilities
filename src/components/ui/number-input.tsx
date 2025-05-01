// src/components/ui/number-input.tsx
import React, { useState, useEffect, ChangeEvent } from 'react';
import { Input } from './input';

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

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        if (disabled) return;

        setLocalValue(newValue);

        //Allow any value to be entered, including empty string
        if (newValue === '') {
            //Don't trigger onChange for empty string
            return;
        }

        //Only report a valid number to parent if not empty
        const numValue = Number(newValue);
        if (!isNaN(numValue)) {
            onChange(numValue);
        }
    };

    //Handle blur to ensure valid value when focus leaves
    const handleBlur = () => {
        //If input is empty, set to default or min value
        if (localValue === '') {
            const defaultValue = min !== undefined ? min : 0;
            setLocalValue(defaultValue.toString());
            onChange(defaultValue);
            return;
        }

        const numValue = Number(localValue);

        if (isNaN(numValue)) {
            //Reset to default value if input is not a valid number
            const defaultValue = value || (min !== undefined ? min : 0);
            setLocalValue(defaultValue.toString());
            onChange(defaultValue);
            return;
        }

        let finalValue = numValue;

        //Apply constraints only on blur
        if (min !== undefined && finalValue < min) {
            finalValue = min;
            setLocalValue(min.toString());
        }

        if (max !== undefined && finalValue > max) {
            finalValue = max;
            setLocalValue(max.toString());
        }

        onChange(finalValue);
    };

    //Handle key press to apply constraints on Enter
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleBlur(); //Apply the same constraints as blur
        }
    };

    return (
        <Input
            type="number"
            inputMode="numeric"
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={className}
            step={step}
            {...props}
        />
    );
}
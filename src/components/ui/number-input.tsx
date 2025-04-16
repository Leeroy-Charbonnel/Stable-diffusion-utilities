import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';

interface NumberInputProps {
    id?: string;
    min?: number;
    max?: number;
    step?: number;
    value?: number;
    onChange?: (value: number) => void;
    className?: string; // for the input
    containerClassName?: string; // <- NEW
    required?: boolean;
}

const NumberInput = ({
    id = 'number-input',
    min = 0,
    max = 100,
    step = 1,
    value = 0,
    onChange,
    className = '',
    containerClassName = '',
    required = false,
}: NumberInputProps) => {
    const [currentValue, setCurrentValue] = useState(value);

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    const updateValue = (newValue: number) => {
        if (!isNaN(newValue) && newValue >= min && newValue <= max) {
            setCurrentValue(newValue);
            onChange?.(newValue);
        }
    };

    const handleIncrement = () => {
        if (currentValue < max) {
            updateValue(Math.min(currentValue + step, max));
        }
    };

    const handleDecrement = () => {
        if (currentValue > min) {
            updateValue(Math.max(currentValue - step, min));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = Number(e.target.value);
        updateValue(newValue);
    };

    return (
        <div className={`relative flex items-center ${containerClassName}`}>
            <Input
                id={id}
                value={currentValue}
                onChange={handleChange}
                min={min}
                max={max}
                step={step}
                type="number"
                required={required}
                className={`pr-12 ${className}`}
            />
            <div className="absolute right-0 h-full flex flex-col">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-1/2 w-10 rounded-none rounded-tr-md border-l border-b"
                    onClick={handleIncrement}
                    disabled={currentValue >= max}
                >
                    <Plus className="h-3 w-3" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-1/2 w-10 rounded-none rounded-br-md border-l"
                    onClick={handleDecrement}
                    disabled={currentValue <= min}
                >
                    <Minus className="h-3 w-3" />
                </Button>
            </div>
        </div>
    );
};

export { NumberInput };

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TypeaheadItem {
    id: string;
    name: string;
    category?: string;
}

interface TypeaheadInputProps {
    placeholder?: string;
    suggestions: TypeaheadItem[];
    isLoading?: boolean;
    onSearch: (query: string) => void;
    onSelect: (item: TypeaheadItem) => void;
    onCreateNew?: (name: string) => void;
    value?: string;
    onChange?: (value: string) => void;
    disabled?: boolean;
    className?: string;
}

export function TypeaheadInput({
    placeholder,
    suggestions,
    isLoading,
    onSearch,
    onSelect,
    onCreateNew,
    value: controlledValue,
    onChange: controlledOnChange,
    disabled,
    className,
}: TypeaheadInputProps) {
    const [internalValue, setInternalValue] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const value = controlledValue ?? internalValue;
    const setValue = controlledOnChange ?? setInternalValue;

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const v = e.target.value;
            setValue(v);
            onSearch(v);
            setIsOpen(v.length >= 2);
            setHighlightIndex(-1);
        },
        [setValue, onSearch]
    );

    const handleSelect = useCallback(
        (item: TypeaheadItem) => {
            onSelect(item);
            setValue("");
            setIsOpen(false);
            setHighlightIndex(-1);
        },
        [onSelect, setValue]
    );

    const handleCreateNew = useCallback(() => {
        if (onCreateNew && value.trim()) {
            onCreateNew(value.trim());
            setValue("");
            setIsOpen(false);
        }
    }, [onCreateNew, value, setValue]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (!isOpen) {
                if (e.key === "Enter" && value.trim() && onCreateNew) {
                    e.preventDefault();
                    handleCreateNew();
                }
                return;
            }

            const totalItems = suggestions.length + (onCreateNew && value.trim() ? 1 : 0);

            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setHighlightIndex((prev) => Math.min(prev + 1, totalItems - 1));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setHighlightIndex((prev) => Math.max(prev - 1, -1));
                    break;
                case "Enter":
                    e.preventDefault();
                    if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
                        handleSelect(suggestions[highlightIndex]);
                    } else if (highlightIndex === suggestions.length && onCreateNew) {
                        handleCreateNew();
                    } else if (onCreateNew && value.trim()) {
                        handleCreateNew();
                    }
                    break;
                case "Escape":
                    setIsOpen(false);
                    setHighlightIndex(-1);
                    break;
            }
        },
        [isOpen, suggestions, highlightIndex, value, onCreateNew, handleSelect, handleCreateNew]
    );

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                listRef.current &&
                !listRef.current.contains(e.target as Node) &&
                !inputRef.current?.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div className="relative">
            <Input
                ref={inputRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => value.length >= 2 && setIsOpen(true)}
                placeholder={placeholder}
                disabled={disabled}
                className={className}
                autoComplete="off"
            />
            {isOpen && (suggestions.length > 0 || (onCreateNew && value.trim())) && (
                <div
                    ref={listRef}
                    className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto"
                >
                    {suggestions.map((item, i) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelect(item)}
                            className={cn(
                                "w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between",
                                i === highlightIndex && "bg-blue-50"
                            )}
                        >
                            <span className="font-medium text-gray-900">{item.name}</span>
                            {item.category && (
                                <span className="text-xs text-gray-400">{item.category}</span>
                            )}
                        </button>
                    ))}
                    {onCreateNew && value.trim() && (
                        <button
                            type="button"
                            onClick={handleCreateNew}
                            className={cn(
                                "w-full text-left px-3 py-2 text-sm hover:bg-green-50 transition-colors border-t border-gray-100",
                                highlightIndex === suggestions.length && "bg-green-50"
                            )}
                        >
                            <span className="text-green-700 font-medium">
                                + Create "{value.trim()}"
                            </span>
                        </button>
                    )}
                    {isLoading && (
                        <div className="px-3 py-2 text-xs text-gray-400 text-center">
                            Loading...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

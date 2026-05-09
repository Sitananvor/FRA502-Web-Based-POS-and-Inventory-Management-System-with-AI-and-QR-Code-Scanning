"use client";

import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, X } from "lucide-react";

interface SearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchComponent({
  value: initialValue,
  onChange,
  placeholder = "Search...",
}: SearchProps) {
  const [displayValue, setDisplayValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const isMounted = useRef(false);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    const timer = setTimeout(() => {
      onChangeRef.current(displayValue); 
    }, 500);
    return () => clearTimeout(timer);
  }, [displayValue]); 

  useEffect(() => {
    setDisplayValue(initialValue);
  }, [initialValue]);

  return (
    <div
      className={`relative flex items-center w-72 rounded-xl border transition-all duration-200 bg-white
        ${isFocused
          ? "border-[#0F4C81] shadow-[0_0_0_3px_rgba(15,76,129,0.05)]"
          : "border-[#DBEAFE] shadow-sm hover:border-[#93C5FD]"
        }`}
    >
      <SearchIcon
        size={15}
        className={`absolute left-3 transition-colors duration-200 ${isFocused ? "text-[#0F4C81]" : "text-[#93C5FD]"}`}
      />
      <input
        type="text"
        value={displayValue}
        onChange={(e) => setDisplayValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2.5 text-sm bg-transparent text-gray-700 placeholder:text-[#93C5FD] focus:outline-none rounded-xl"
      />
      {displayValue && (
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setDisplayValue("")}
          className="absolute right-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-[#DBEAFE] hover:bg-[#BFDBFE] transition-colors duration-150"
        >
          <X size={11} className="text-[#0F4C81]" />
        </button>
      )}
    </div>
  );
}
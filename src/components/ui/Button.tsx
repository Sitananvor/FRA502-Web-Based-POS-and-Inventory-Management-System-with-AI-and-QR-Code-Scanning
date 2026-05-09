"use client";

interface ButtonProps {
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "danger" | "secondary";
  className?: string;
  type?: "button" | "submit" | "reset";
}

export default function Button({
  label = "Submit",
  onClick,
  disabled,
  variant = "primary",
  className = "",
  type = "button",
}: ButtonProps) {
  const variants = {
    primary:   "bg-[#1767AD] hover:bg-[#0F4C81] text-white shadow-sm",
    danger:    "bg-red-500 hover:bg-red-600 text-white shadow-sm",
    secondary: "bg-[#EBF4FF] hover:bg-[#BFDBFE] text-[#0F4C81] border border-[#BFDBFE]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {label}
    </button>
  );
}
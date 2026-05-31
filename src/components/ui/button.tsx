/** @format */

import { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  animatedArrow?: boolean;
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  fullWidth = false,
  animatedArrow = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    "group inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

  const sizeClasses = {
    sm: "h-10 px-4 text-sm",
    md: "h-12 px-5 text-sm",
    lg: "h-14 px-6 text-base",
  };

  const variantClasses = {
    primary:
      "bg-teal-400 text-slate-950 shadow-lg shadow-teal-500/20 hover:-translate-y-0.5 hover:bg-teal-300",
    secondary:
      "border border-white/10 bg-slate-800 text-white hover:-translate-y-0.5 hover:bg-slate-700",
    ghost: "bg-transparent text-white hover:bg-white/5",
    outline:
      "border border-white/15 bg-transparent text-white hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/5",
  };

  const renderRightIcon = () => {
    if (animatedArrow) {
      return (
        <span className="flex items-center">
          <svg
            className="h-6 w-8 overflow-visible"
            viewBox="0 0 32 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M14 3L20 8L14 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-300 ease-out group-hover:translate-x-1"
            />
          </svg>
        </span>
      );
    }

    if (rightIcon) {
      return <span className="shrink-0">{rightIcon}</span>;
    }

    return null;
  };

  return (
    <button
      disabled={disabled}
      className={clsx(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      <span>{children}</span>
      {renderRightIcon()}
    </button>
  );
}

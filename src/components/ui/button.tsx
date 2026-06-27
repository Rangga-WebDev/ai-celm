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
  loading?: boolean;
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  fullWidth = false,
  animatedArrow = false,
  loading = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    "group inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

  const sizeClasses = {
    sm: "h-10 px-4 text-sm",
    md: "h-12 px-5 text-base",
    lg: "h-14 px-7 text-base",
  };

  const variantClasses = {
    primary:
      "bg-teal-600 text-white shadow-sm shadow-teal-600/20 hover:-translate-y-0.5 hover:bg-teal-700",
    secondary:
      "border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
    outline:
      "border border-slate-300 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700",
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
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? (
        <svg
          className="h-5 w-5 shrink-0 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-90"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!loading && renderRightIcon()}
    </button>
  );
}

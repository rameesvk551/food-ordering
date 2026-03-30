import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-semibold text-[#d9ccb8]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-2.5 rounded-xl border bg-[#11161e] text-[#f6ede0]
            placeholder:text-[#7f7467] text-sm transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-[#f2a63a]/25 focus:border-[#f2a63a]
            ${error ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500' : 'border-[#394250]'}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;

import React from 'react';

interface ClinicLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const ClinicLogo: React.FC<ClinicLogoProps> = ({
  className = '',
  size = 48,
  showText = false,
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/logo.jpg"
        alt="Logo Phòng khám"
        width={size}
        height={size}
        className="shrink-0 select-none drop-shadow-sm object-contain rounded-full"
      />
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-slate-800 text-sm">Y Dược Nhã Uyên</span>
          <span className="text-xs text-slate-500">Cà Mau</span>
        </div>
      )}
    </div>
  );
};
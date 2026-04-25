import React from 'react';

/**
 * Simple brand header that uses the pkfokam.png file from public/
 * Place <BrandHeader /> near the top of your layout (App.js or Layout component).
 */
export default function BrandHeader({ compact = false }) {
  const sizeClass = compact ? 'w-8 h-8' : 'w-12 h-12';
  return (
    <header className="flex items-center gap-4 p-4">
      <img
        src={process.env.PUBLIC_URL + '/pkfokam.png'}
        alt="PKFConnect logo"
        className={`${sizeClass} rounded ${compact ? '' : 'rounded-2xl'} object-cover`}
      />
      <div>
        <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
          PKFI<span className="text-blue-600">E-Hub</span>
        </div>
        {!compact && (
          <div className="text-xs text-slate-500 dark:text-slate-400 -mt-1">
            Student & Faculty Portal
          </div>
        )}
      </div>
    </header>
  );
}
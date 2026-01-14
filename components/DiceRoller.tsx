
import React, { useState } from 'react';

interface DiceRollerProps {
  onRoll: (result: number) => void;
  label?: string;
  disabled?: boolean;
}

const DiceRoller: React.FC<DiceRollerProps> = ({ onRoll, label, disabled }) => {
  const [isRolling, setIsRolling] = useState(false);
  const [displayValue, setDisplayValue] = useState(20);

  const handleRoll = () => {
    if (disabled || isRolling) return;
    
    setIsRolling(true);
    let rolls = 0;
    const interval = setInterval(() => {
      setDisplayValue(Math.floor(Math.random() * 20) + 1);
      rolls++;
      if (rolls > 15) {
        clearInterval(interval);
        const finalValue = Math.floor(Math.random() * 20) + 1;
        setDisplayValue(finalValue);
        setIsRolling(false);
        onRoll(finalValue);
      }
    }, 60);
  };

  return (
    <div className="flex flex-col items-center p-4 bg-stone-900/90 rounded-xl border-2 border-amber-600/40 shadow-2xl relative w-full max-w-[180px] mx-auto">
      {label && <p className="text-amber-500 text-[10px] font-black mb-3 uppercase tracking-tighter text-center">{label}</p>}
      
      <button
        onClick={handleRoll}
        disabled={disabled || isRolling}
        className={`relative w-20 h-20 flex items-center justify-center transition-all duration-300 ${isRolling ? 'scale-110' : 'hover:scale-105'} ${disabled ? 'opacity-30 grayscale' : ''}`}
      >
        <div className={`absolute inset-0 bg-amber-500/10 rounded-full blur-xl transition-opacity ${isRolling ? 'opacity-100' : 'opacity-0'}`}></div>
        
        <svg viewBox="0 0 100 100" className={`absolute inset-0 w-full h-full text-amber-700 fill-current drop-shadow-2xl ${isRolling ? 'animate-pulse' : ''}`}>
          <path d="M50 2 L98 25 L98 75 L50 98 L2 75 L2 25 Z" />
          <path d="M50 2 L50 98 M2 25 L98 25 M2 75 L98 75 M50 2 L2 25 M50 2 L98 25 M50 98 L2 75 M50 98 L98 75" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" />
        </svg>
        
        <span className="relative z-10 text-3xl font-black text-amber-50 drop-shadow-[0_2px_1px_rgba(0,0,0,0.9)]">
          {displayValue}
        </span>
      </button>
      
      <p className="mt-2 text-[8px] text-amber-600/60 font-bold uppercase tracking-widest text-center">
        {isRolling ? "Rolando..." : "Lançar Sorte"}
      </p>
    </div>
  );
};

export default DiceRoller;

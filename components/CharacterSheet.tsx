
import React, { useState } from 'react';
import { Character } from '../types';

interface CharacterSheetProps {
  character: Character;
}

const CharacterSheet: React.FC<CharacterSheetProps> = ({ character }) => {
  const [tab, setTab] = useState<'stats' | 'inv'>('stats');
  const hpPercentage = (character.hp / character.maxHp) * 100;

  const statLabels: Record<string, string> = {
    forca: 'FOR',
    destreza: 'DES',
    constituicao: 'CON',
    inteligencia: 'INT',
    sabedoria: 'SAB',
    carisma: 'CAR'
  };

  return (
    <div className="parchment-bg p-4 rounded-sm shadow-2xl relative overflow-hidden flex flex-col min-h-[300px]">
      <div className="flex justify-around mb-2 border-b border-stone-400">
        <button 
          onClick={() => setTab('stats')}
          className={`pb-1 text-[10px] font-black uppercase transition-colors ${tab === 'stats' ? 'text-amber-900 border-b-2 border-amber-900' : 'text-stone-500'}`}
        >
          Atributos
        </button>
        <button 
          onClick={() => setTab('inv')}
          className={`pb-1 text-[10px] font-black uppercase transition-colors ${tab === 'inv' ? 'text-amber-900 border-b-2 border-amber-900' : 'text-stone-500'}`}
        >
          Inventário ({character.inventory?.length || 0})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {tab === 'stats' ? (
          <div className="animate-in fade-in duration-300">
            <h2 className="fantasy-font text-lg text-stone-900 mb-3 text-center font-bold uppercase">{character.name}</h2>
            <div className="mb-3 text-[10px] space-y-1">
              <div className="flex justify-between border-b border-stone-300">
                <span className="font-bold text-stone-600 uppercase">Classe:</span>
                <span className="font-bold text-stone-900">{character.class}</span>
              </div>
              <div className="flex justify-between border-b border-stone-300">
                <span className="font-bold text-stone-600 uppercase">Raça:</span>
                <span className="font-bold text-stone-900">{character.race}</span>
              </div>
              <div className="flex justify-between border-b border-stone-300">
                <span className="font-bold text-stone-600 uppercase">Vida (PV):</span>
                <span className="font-bold text-red-900">{character.hp}/{character.maxHp}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {/* Added explicit type casting to [string, number][] to ensure 'value' is recognized as a number for arithmetic operations */}
              {(Object.entries(character.stats) as [string, number][]).map(([stat, value]) => (
                <div key={stat} className="flex flex-col items-center bg-stone-400/20 p-1 border border-stone-400/50 rounded">
                  <span className="text-[8px] uppercase text-stone-600 font-black">{statLabels[stat] || stat.slice(0, 3).toUpperCase()}</span>
                  <span className="text-sm font-bold text-stone-900">{value}</span>
                  <div className="text-[8px] font-bold text-stone-600">
                    {Math.floor((value - 10) / 2) >= 0 ? '+' : ''}{Math.floor((value - 10) / 2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-right-2 duration-300 space-y-2 py-2">
            {character.inventory?.length > 0 ? (
              character.inventory.map(item => (
                <div key={item.id} className="bg-stone-800/10 p-2 rounded border border-stone-500/20 text-xs">
                  <p className="font-black text-amber-900 uppercase">{item.name}</p>
                  <p className="text-[10px] text-stone-700 italic">{item.description}</p>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-center text-stone-500 italic mt-10">Sua mochila está vazia...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterSheet;

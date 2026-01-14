
import React, { useState, useEffect, useRef } from 'react';
import { GameState, Character, GameLog, Item } from './types';
import * as geminiService from './services/geminiService';
import CharacterSheet from './components/CharacterSheet';
import DiceRoller from './components/DiceRoller';

const GENRES = ["Fantasia Medieval", "Cyberpunk", "Horror Cósmico", "Steampunk", "Pós-Apocalíptico"];
const RACES = ["Humano", "Elfo", "Anão", "Halfling", "Meio-Orc", "Draconato"];
const CLASSES = ["Guerreiro", "Mago", "Ladino", "Clérigo", "Bardo", "Patrulheiro"];

const STORAGE_KEYS = {
  LOGS: 'rpg_logs_v1',
  PARTY: 'rpg_party_v1',
  STATE: 'rpg_state_v1',
  OPTIONS: 'rpg_options_v1',
  PENDING_ROLL: 'rpg_roll_v1',
  ACTIVE_CHAR: 'rpg_active_char_v1'
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.LANDING);
  const [party, setParty] = useState<Character[]>([]);
  const [activeCharIndex, setActiveCharIndex] = useState(0);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [pendingRoll, setPendingRoll] = useState<{ type: string } | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(true);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [showKeyInfo, setShowKeyInfo] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [charSetup, setCharSetup] = useState({
    name: '', 
    genre: '', 
    race: '', 
    class: '',
    stats: { 
      forca: 10, 
      destreza: 10, 
      constituicao: 10, 
      inteligencia: 10, 
      sabedoria: 10, 
      carisma: 10 
    }
  });

  const [showCustom, setShowCustom] = useState({
    genre: false,
    race: false,
    class: false
  });

  // Check for saved game on mount
  useEffect(() => {
    const savedLogs = localStorage.getItem(STORAGE_KEYS.LOGS);
    const savedParty = localStorage.getItem(STORAGE_KEYS.PARTY);
    if (savedLogs && savedParty) {
      setHasSavedGame(true);
    }
  }, []);

  // Persistent saving of all relevant game states
  useEffect(() => {
    if (gameState === GameState.PLAYING || gameState === GameState.CHARACTER_CREATION) {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
      localStorage.setItem(STORAGE_KEYS.PARTY, JSON.stringify(party));
      localStorage.setItem(STORAGE_KEYS.STATE, gameState);
      localStorage.setItem(STORAGE_KEYS.OPTIONS, JSON.stringify(currentOptions));
      localStorage.setItem(STORAGE_KEYS.PENDING_ROLL, JSON.stringify(pendingRoll));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAR, activeCharIndex.toString());
    }
  }, [logs, party, gameState, currentOptions, pendingRoll, activeCharIndex]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs, isTyping]);

  const handleSelectKey = async () => {
    try {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setShowKeyInfo(false);
    } catch (e) {
      console.error("Erro ao abrir seletor de chave", e);
    }
  };

  const startJourney = (continueGame: boolean) => {
    if (continueGame) {
      const savedLogs = localStorage.getItem(STORAGE_KEYS.LOGS);
      const savedParty = localStorage.getItem(STORAGE_KEYS.PARTY);
      const savedState = localStorage.getItem(STORAGE_KEYS.STATE);
      const savedOptions = localStorage.getItem(STORAGE_KEYS.OPTIONS);
      const savedRoll = localStorage.getItem(STORAGE_KEYS.PENDING_ROLL);
      const savedActiveChar = localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAR);

      if (savedLogs && savedParty) {
        try {
          setLogs(JSON.parse(savedLogs));
          setParty(JSON.parse(savedParty));
          setGameState((savedState as GameState) || GameState.PLAYING);
          if (savedOptions) setCurrentOptions(JSON.parse(savedOptions));
          if (savedRoll) setPendingRoll(JSON.parse(savedRoll));
          if (savedActiveChar) setActiveCharIndex(parseInt(savedActiveChar, 10));
        } catch (e) {
          console.error("Erro ao restaurar jogo:", e);
          initNewGame();
        }
      }
    } else {
      Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
      initNewGame();
    }
  };

  const initNewGame = async () => {
    setGameState(GameState.INITIALIZING);
    try {
      const greeting = await geminiService.startNewGame();
      setLogs([{ id: '1', sender: 'dm', text: greeting, timestamp: Date.now() }]);
      setGameState(GameState.CHARACTER_CREATION);
    } catch (err) { 
      console.error(err);
      setGameState(GameState.LANDING);
      alert("Certifique-se de que sua chave de API está configurada corretamente.");
    }
  };

  const addLog = (log: Omit<GameLog, 'id' | 'timestamp'>) => {
    setLogs(prev => [...prev, { ...log, id: Math.random().toString(36).substr(2, 9), timestamp: Date.now() }]);
  };

  const handleAddCharacter = () => {
    if (!charSetup.name || !charSetup.genre || !charSetup.race || !charSetup.class) {
      return alert("Por favor, preencha todos os campos do seu herói!");
    }
    const newChar: Character = { ...charSetup, level: 1, hp: 20, maxHp: 20, inventory: [] };
    setParty(prev => [...prev, newChar]);
    setIsCreatingNew(false);
    setCharSetup(prev => ({ ...prev, name: '', race: '', class: '' }));
  };

  const handleFinishParty = () => {
    if (party.length === 0) return alert("Crie pelo menos um personagem!");
    setGameState(GameState.PLAYING);
    
    const partyDesc = party.map(c => 
      `${c.name} (${c.race} ${c.class}, FOR ${c.stats.forca}, DES ${c.stats.destreza}, CON ${c.stats.constituicao}, INT ${c.stats.inteligencia}, SAB ${c.stats.sabedoria}, CAR ${c.stats.carisma})`
    ).join(', ');

    processPlayerAction(`Iniciamos nossa jornada! O gênero da aventura é ${party[0].genre}. Nossa equipe é composta por: ${partyDesc}. Mestre, pode começar a história!`);
  };

  const processPlayerAction = async (text: string) => {
    if (!text.trim()) return;
    addLog({ sender: 'player', text });
    setInputValue('');
    setIsTyping(true);
    setCurrentOptions([]);
    
    const history = logs.slice(-10).map(l => ({
      role: (l.sender === 'dm' ? 'model' : 'user') as 'user' | 'model',
      parts: [{ text: l.text }]
    }));

    try {
      const response = await geminiService.sendMessageToDM(text, history);
      let sceneImage;
      if (response.text.length > 150) {
        sceneImage = await geminiService.generateSceneImage(response.text);
      }

      setIsTyping(false);
      addLog({ 
        sender: 'dm', 
        text: response.text, 
        options: response.options,
        sceneImageUrl: sceneImage 
      });
      setCurrentOptions(response.options);
      if (response.requiresRoll) {
        setPendingRoll(response.requiresRoll);
        if (window.innerWidth < 768) setIsSheetOpen(true);
      }
    } catch (err: any) {
      setIsTyping(false);
      if (err.message?.includes("Requested entity was not found")) {
        addLog({ sender: 'dm', text: "A conexão com o Oráculo falhou. Por favor, selecione uma chave de API válida." });
        setShowKeyInfo(true);
      } else {
        addLog({ sender: 'dm', text: "A névoa impede sua visão. O oráculo está temporariamente inacessível." });
      }
    }
  };

  const updateStat = (stat: string, val: number) => {
    setCharSetup(p => ({ 
      ...p, 
      stats: { ...p.stats, [stat as keyof typeof p.stats]: Math.max(8, Math.min(18, val)) } 
    }));
  };

  const handleSelection = (field: 'genre' | 'race' | 'class', value: string) => {
    if (value === "Outro...") {
      setShowCustom({ ...showCustom, [field]: true });
      setCharSetup({ ...charSetup, [field]: '' });
    } else {
      setShowCustom({ ...showCustom, [field]: false });
      setCharSetup({ ...charSetup, [field]: value });
    }
  };

  const statNames: Record<string, string> = {
    forca: 'Força',
    destreza: 'Destreza',
    constituicao: 'Const.',
    inteligencia: 'Int.',
    sabedoria: 'Sab.',
    carisma: 'Carisma'
  };

  const renderSelectionGroup = (label: string, field: 'genre' | 'race' | 'class', options: string[]) => (
    <div className="flex flex-col gap-1">
      <label className="text-[9px] font-black text-stone-500 uppercase px-1">{label}</label>
      <div className="relative">
        <select 
          className="w-full bg-stone-300/40 border-b border-stone-400 p-1.5 px-2 rounded-t text-xs font-bold text-stone-900 outline-none focus:border-amber-800 appearance-none transition-all"
          onChange={(e) => handleSelection(field, e.target.value)}
          value={showCustom[field] ? "Outro..." : (charSetup[field] || "")}
        >
          <option value="" disabled>Selecione...</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
          <option value="Outro...">Personalizado...</option>
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {showCustom[field] && (
        <input 
          placeholder={`Qual seu ${label.toLowerCase()}?`}
          className="w-full bg-amber-50/50 border-b-2 border-amber-800 p-1.5 px-2 text-xs font-bold outline-none animate-in fade-in"
          value={charSetup[field]}
          onChange={e => setCharSetup({...charSetup, [field]: e.target.value})}
          autoFocus
        />
      )}
    </div>
  );

  if (gameState === GameState.LANDING) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#0a0a0a]">
        <div className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&q=80&w=1920')] bg-cover bg-center opacity-20 scale-105 blur-[3px]"></div>
        
        <div className="z-10 text-center max-w-4xl animate-in fade-in zoom-in duration-1000 flex flex-col items-center">
          <h1 className="fantasy-font text-6xl md:text-9xl font-black text-amber-500 gold-shadow mb-6 tracking-wider leading-none uppercase pt-12">
            MESTRE GEMINI
          </h1>
          
          <p className="story-font text-xl md:text-3xl text-amber-100/90 mb-14 italic max-w-3xl px-4 leading-relaxed font-light">
            "Entre em um mundo onde cada escolha molda o destino e a inteligência artificial tece as lendas mais profundas."
          </p>
          
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center w-full max-w-lg mb-8">
            {hasSavedGame && (
              <button 
                onClick={() => startJourney(true)}
                className="group relative w-full md:w-auto px-10 py-5 bg-amber-700/80 hover:bg-amber-600 border-2 border-amber-900 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-[0_0_30px_rgba(180,120,0,0.3)] flex items-center justify-center gap-3 overflow-hidden"
              >
                <span className="fantasy-font text-xl text-black font-black uppercase tracking-widest relative z-10">Continuar Jornada</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </button>
            )}
            
            <button 
              onClick={() => startJourney(false)}
              className="group relative w-full md:w-auto px-10 py-5 bg-stone-900/90 hover:bg-black border-2 border-amber-600 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-[0_0_20px_rgba(0,0,0,0.6)] flex items-center justify-center gap-3"
            >
              <span className="fantasy-font text-xl text-amber-500 font-black uppercase tracking-widest">
                {hasSavedGame ? "Nova Aventura" : "Iniciar Jornada"}
              </span>
              <svg className="w-5 h-5 text-amber-600 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          <div className="mt-8">
            <button 
              onClick={() => setShowKeyInfo(true)}
              className="text-[10px] text-amber-600/60 font-black uppercase tracking-[0.3em] hover:text-amber-500 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Configurar Chave de API
            </button>
          </div>
        </div>
        
        {showKeyInfo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="parchment-bg max-w-lg w-full p-8 rounded shadow-2xl relative border-2 border-amber-900/30">
              <button onClick={() => setShowKeyInfo(false)} className="absolute top-4 right-4 text-stone-500 hover:text-stone-900">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              
              <h2 className="fantasy-font text-2xl font-black text-stone-900 mb-6 border-b-2 border-amber-900/20 pb-2">O ORÁCULO DE GEMINI</h2>
              
              <div className="story-font text-stone-800 space-y-4 text-sm md:text-base leading-relaxed mb-8">
                <p>Para que o Mestre possa narrar sua jornada sem custos, você deve vincular sua própria chave de API gratuita.</p>
                <ol className="list-decimal list-inside space-y-3 font-bold">
                  <li>Acesse o <a href="https://aistudio.google.com/" target="_blank" className="text-amber-800 underline" rel="noreferrer">Google AI Studio</a>.</li>
                  <li>Clique em "Get API key".</li>
                  <li>Crie uma chave em um novo projeto (é gratuito).</li>
                  <li>Clique no botão abaixo para vincular sua chave a este jogo.</li>
                </ol>
                <p className="text-[10px] text-stone-600 mt-4">
                  Nota: Usuários devem selecionar uma chave de um projeto com faturamento ativado para modelos avançados. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline" rel="noreferrer">Saiba mais aqui</a>.
                </p>
              </div>
              
              <button 
                onClick={handleSelectKey}
                className="w-full bg-stone-900 text-amber-500 py-4 rounded font-black border-2 border-amber-600 hover:bg-amber-600 hover:text-black transition-all uppercase tracking-widest text-sm shadow-xl"
              >
                Selecionar Minha Chave de API
              </button>
            </div>
          </div>
        )}

        <div className="absolute bottom-8 text-[10px] font-bold text-stone-600 uppercase tracking-[0.5em] animate-pulse">
          — Tecido nas estrelas pelo Gemini AI —
        </div>
      </div>
    );
  }

  const activeChar = party[activeCharIndex];

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden text-slate-200">
      <button 
        onClick={() => setIsSheetOpen(!isSheetOpen)} 
        className="md:hidden fixed top-4 right-4 z-50 bg-amber-600 p-2 rounded-full border-2 border-amber-900 shadow-xl"
      >
        <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSheetOpen ? "M6 18L18 6M6 6l12 12" : "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"} />
        </svg>
      </button>

      <aside className={`fixed inset-y-0 left-0 z-40 w-full md:relative md:w-80 lg:w-96 flex flex-col p-4 bg-black/80 md:bg-black/40 backdrop-blur-md border-r border-amber-900/30 transition-transform ${isSheetOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="text-center mb-6">
          <h1 className="fantasy-font text-2xl font-black text-amber-500 gold-shadow leading-tight">MESTRE GEMINI</h1>
          <div className="flex justify-center gap-4 mt-2">
            <button onClick={() => { if(confirm("Reiniciar aventura e equipe? Isso apagará seu progresso salvo.")) { Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k)); window.location.reload(); } }} className="text-[9px] text-red-500 font-bold uppercase hover:text-red-400">Reiniciar</button>
            <button onClick={() => setShowKeyInfo(true)} className="text-[9px] text-amber-600 font-bold uppercase hover:text-amber-500">Chave API</button>
          </div>
        </div>
        
        {party.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1">
            {party.map((c, i) => (
              <button 
                key={i} 
                onClick={() => setActiveCharIndex(i)}
                className={`flex-1 min-w-[60px] text-[9px] font-black py-1 px-2 rounded border transition-all truncate uppercase ${activeCharIndex === i ? 'bg-amber-600 text-black border-amber-900' : 'bg-stone-800 text-stone-400 border-stone-700 hover:bg-stone-700'}`}
              >
                {c.name || `Herói ${i+1}`}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-hide">
          {activeChar && <CharacterSheet character={activeChar} />}
          <div className="pt-2">
            <DiceRoller 
              onRoll={(res) => {
                if (!activeChar) return;
                processPlayerAction(`${activeChar.name} rolou um d20 para ${pendingRoll?.type || 'Sorte'} e tirou: **${res}**`);
                setPendingRoll(null);
                if (window.innerWidth < 768) setIsSheetOpen(false);
              }} 
              label={pendingRoll ? `Teste de ${pendingRoll.type} (${activeChar?.name || 'Equipe'})` : "Lançar Sorte"} 
              disabled={!pendingRoll || !activeChar} 
            />
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-transparent overflow-hidden relative">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-hide">
          {logs.map((log) => (
            <div key={log.id} className={`flex ${log.sender === 'dm' ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`relative w-full md:max-w-[85%] ${log.sender === 'dm' ? 'parchment-bg p-4 md:p-6 rounded shadow-2xl text-stone-900 border-l-4 border-amber-800' : 'text-amber-500 text-right'}`}>
                {log.sceneImageUrl && <img src={log.sceneImageUrl} alt="Cena" className="w-full h-48 md:h-64 object-cover rounded mb-4 border-2 border-amber-900/30 shadow-inner" />}
                {log.sender === 'dm' && <span className="block text-[10px] font-black text-amber-900/50 uppercase mb-1">Mestre</span>}
                <div className={`${log.sender === 'dm' ? 'story-font' : 'fantasy-font'} text-sm md:text-lg leading-relaxed whitespace-pre-wrap`}>
                  {log.text.split('**').map((p, i) => i % 2 === 1 ? <strong key={i} className="text-amber-950 font-black">{p}</strong> : p)}
                </div>
              </div>
            </div>
          ))}
          {isTyping && <div className="text-[10px] text-amber-600/70 font-bold italic animate-pulse">O Mestre está tecendo os fios do destino...</div>}
          {gameState === GameState.INITIALIZING && <div className="text-center p-12"><div className="fantasy-font text-amber-500 animate-pulse text-2xl">Conectando-se ao Plano Astral...</div></div>}
        </div>

        <div className="p-4 md:p-6 bg-black/70 border-t-2 border-amber-900/40 backdrop-blur-xl">
          {gameState === GameState.CHARACTER_CREATION ? (
            <div className="max-w-xl mx-auto parchment-bg p-4 md:p-6 rounded shadow-2xl border-2 border-amber-900/20 overflow-y-auto max-h-[85vh] scrollbar-hide">
              <h2 className="fantasy-font text-center mb-4 font-black text-stone-900 border-b border-stone-400 pb-1 uppercase text-sm tracking-widest">
                {isCreatingNew ? `NOVO HERÓI (#${party.length + 1})` : "SUA EQUIPE"}
              </h2>
              
              {isCreatingNew ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black text-stone-500 uppercase px-1">Nome do Herói</label>
                      <input 
                        className="bg-stone-300/40 p-1.5 px-2 text-xs font-bold border-b border-stone-400 rounded-t outline-none focus:border-amber-800 transition-all text-stone-900" 
                        value={charSetup.name} 
                        onChange={e => setCharSetup({...charSetup, name: e.target.value})} 
                        placeholder="Ex: Arwen"
                      />
                    </div>
                    {renderSelectionGroup("Gênero da Aventura", "genre", GENRES)}
                    {renderSelectionGroup("Raça", "race", RACES)}
                    {renderSelectionGroup("Classe", "class", CLASSES)}
                  </div>

                  <div className="pt-2 mt-2 border-t border-stone-300">
                    <label className="text-[9px] font-black text-stone-500 uppercase block text-center mb-2">Atributos (8-18)</label>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
                      {Object.entries(charSetup.stats).map(([s, v]) => (
                        <div key={s} className="flex flex-col items-center bg-stone-900/90 text-amber-500 p-1.5 rounded border border-amber-900/30">
                          <span className="text-[8px] font-black uppercase mb-1">{statNames[s] || s}</span>
                          <span className="text-xs font-black mb-1">{v as any}</span>
                          <div className="flex gap-1">
                            <button onClick={() => updateStat(s, (v as number)-1)} className="w-4 h-4 flex items-center justify-center bg-stone-800 border border-amber-700 rounded-sm hover:bg-amber-700 hover:text-black text-[10px]">-</button>
                            <button onClick={() => updateStat(s, (v as number)+1)} className="w-4 h-4 flex items-center justify-center bg-stone-800 border border-amber-700 rounded-sm hover:bg-amber-700 hover:text-black text-[10px]">+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <button onClick={handleAddCharacter} className="flex-1 bg-stone-900 text-amber-500 py-2.5 rounded font-black border-2 border-amber-600 hover:bg-amber-600 hover:text-black transition-all uppercase tracking-widest text-[10px] shadow-lg">
                      Confirmar Herói
                    </button>
                    {party.length > 0 && (
                      <button onClick={() => setIsCreatingNew(false)} className="px-4 bg-stone-200 text-stone-700 rounded font-black border border-stone-400 hover:bg-stone-300 transition-all uppercase text-[9px]">
                        Voltar
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    {party.map((c, i) => (
                      <div key={i} className="flex items-center justify-between bg-stone-200/60 p-2 px-3 rounded border border-stone-400/50 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-amber-800 text-white flex items-center justify-center text-[10px] font-black">{i+1}</div>
                          <div>
                            <p className="font-black text-amber-950 text-[11px] uppercase leading-none">{c.name}</p>
                            <p className="text-[9px] text-stone-600 font-bold uppercase">{c.race} {c.class}</p>
                          </div>
                        </div>
                        <button onClick={() => setParty(party.filter((_, idx) => idx !== i))} className="text-red-700 hover:text-red-950 p-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex flex-col gap-2 mt-4">
                    <button onClick={() => setIsCreatingNew(true)} className="w-full bg-stone-50/50 text-stone-700 py-2 rounded font-black border border-stone-400 border-dashed hover:bg-stone-200 transition-all uppercase tracking-widest text-[9px]">
                      + Adicionar Outro Herói
                    </button>
                    <button onClick={handleFinishParty} className="w-full bg-stone-900 text-amber-500 py-3 rounded font-black border-2 border-amber-600 hover:bg-amber-600 hover:text-black transition-all uppercase tracking-widest text-xs shadow-xl mt-2">
                      Iniciar Aventura com {party.length} Heróis
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {currentOptions.length > 0 && !pendingRoll && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {currentOptions.map((opt, i) => (
                    <button key={i} onClick={() => processPlayerAction(opt)} className="bg-amber-900/40 hover:bg-amber-600 border border-amber-600/50 text-amber-400 hover:text-black px-4 py-1.5 rounded-full text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-tighter">
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              <div className="relative">
                <input 
                  placeholder={pendingRoll ? `O destino de ${activeChar?.name || 'seu herói'} aguarda...` : `Ação de ${activeChar?.name || 'herói'}...`} 
                  className="w-full bg-stone-900/80 border-2 border-amber-900/40 p-3 px-4 rounded-xl text-amber-100 text-base outline-none focus:border-amber-500 transition-all disabled:opacity-30"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && !pendingRoll && processPlayerAction(`${activeChar?.name || 'Jogador'}: ${inputValue}`)}
                  disabled={!!pendingRoll || isTyping}
                />
                <button onClick={() => processPlayerAction(`${activeChar?.name || 'Jogador'}: ${inputValue}`)} disabled={!inputValue.trim() || !!pendingRoll || isTyping} className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-600 hover:text-amber-400 transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;

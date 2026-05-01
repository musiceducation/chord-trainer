import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Check, SkipForward, Volume2, VolumeX, Flame, Settings, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

const NOTE_TO_PC = { 'C':0, 'C#':1, 'Db':1, 'D':2, 'D#':3, 'Eb':3, 'E':4, 'F':5, 'F#':6, 'Gb':6, 'G':7, 'G#':8, 'Ab':8, 'A':9, 'A#':10, 'Bb':10, 'B':11 };
const PC_TO_NOTE = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

const CHORD_FORMULAS = {
  '':       { intervals: [0, 4, 7],          label: 'Major' },
  'm':      { intervals: [0, 3, 7],          label: 'Minor' },
  'dim':    { intervals: [0, 3, 6],          label: 'Diminished' },
  'aug':    { intervals: [0, 4, 8],          label: 'Augmented' },
  'sus2':   { intervals: [0, 2, 7],          label: 'Sus2' },
  'sus4':   { intervals: [0, 5, 7],          label: 'Sus4' },
  'maj7':   { intervals: [0, 4, 7, 11],      label: 'Major 7th' },
  'm7':     { intervals: [0, 3, 7, 10],      label: 'Minor 7th' },
  '7':      { intervals: [0, 4, 7, 10],      label: 'Dominant 7th' },
  'm7b5':   { intervals: [0, 3, 6, 10],      label: 'Half-Diminished' },
  'dim7':   { intervals: [0, 3, 6, 9],       label: 'Diminished 7th' },
  '7b9':    { intervals: [0, 4, 7, 10, 1],   label: 'Dom 7♭9' },
  '9':      { intervals: [0, 4, 7, 10, 2],   label: 'Dominant 9th' },
  'maj9':   { intervals: [0, 4, 7, 11, 2],   label: 'Major 9th' },
};

const ROOTS = ['C','D','E','F','G','A','B','C#','Eb','F#','Ab','Bb'];

const DIFFICULTY_LEVELS = {
  basic:    { name: '三和弦', en: 'Triads',    types: ['', 'm', 'dim', 'aug', 'sus2', 'sus4'] },
  seventh:  { name: '七和弦', en: 'Sevenths',  types: ['maj7', 'm7', '7', 'm7b5', 'dim7'] },
  extended: { name: '延伸',   en: 'Extended',  types: ['7b9', '9', 'maj9'] },
};

const FULL_START = 36; // C2
const FULL_END = 84;   // C6
const ALL_KEYS = [];
for (let m = FULL_START; m <= FULL_END; m++) {
  const pc = m % 12;
  ALL_KEYS.push({ midi: m, pc, name: PC_TO_NOTE[pc], isBlack: [1,3,6,8,10].includes(pc), octave: Math.floor(m/12) - 1 });
}

const VISIBLE_WHITE_KEYS = 8;

function getChordPitchClasses(rootName, chordType) {
  const root = NOTE_TO_PC[rootName];
  return new Set(CHORD_FORMULAS[chordType].intervals.map(i => (root + i) % 12));
}

function isCorrectNote(midi, targetPCs) {
  return targetPCs.has(midi % 12);
}

function generateQuestion(difficulty, lastName) {
  const types = DIFFICULTY_LEVELS[difficulty].types;
  let q;
  do {
    const root = ROOTS[Math.floor(Math.random() * ROOTS.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    q = { root, type, name: root + type, pcs: getChordPitchClasses(root, type) };
  } while (q.name === lastName);
  return q;
}

function usePiano(enabled) {
  const ctxRef = useRef(null);
  const ensureCtx = () => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  };

  const playOne = useCallback((ctx, midi, startOffset = 0, sustain = 1.4, vol = 0.16) => {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const start = ctx.currentTime + startOffset;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, start + sustain);
    gain.connect(ctx.destination);
    [1, 2, 3].forEach((h, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.value = freq * h;
      const hg = ctx.createGain();
      hg.gain.value = 1 / (h * 1.8);
      osc.connect(hg).connect(gain);
      osc.start(start);
      osc.stop(start + sustain);
    });
  }, []);

  const playNote = useCallback((midi) => {
    if (!enabled) return;
    playOne(ensureCtx(), midi);
  }, [enabled, playOne]);

  // Play multiple notes as a chord — slight strum (subtle, like a real piano)
  const playChord = useCallback((midis) => {
    if (!enabled) return;
    const ctx = ensureCtx();
    const sorted = [...midis].sort((a, b) => a - b);
    sorted.forEach((m, i) => {
      // Tiny stagger (15ms each) for natural feel; slightly longer sustain
      playOne(ctx, m, i * 0.015, 2.2, 0.14);
    });
  }, [enabled, playOne]);

  return { playNote, playChord };
}

export default function ChordTrainer() {
  const [difficulty, setDifficulty] = useState('basic');
  const [question, setQuestion] = useState(() => generateQuestion('basic', null));
  const [pressed, setPressed] = useState(new Set());
  const [lockedCorrect, setLockedCorrect] = useState(new Set());
  const [wrongFlash, setWrongFlash] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [soundOn, setSoundOn] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [keyboardStart, setKeyboardStart] = useState(48);
  const { playNote, playChord } = usePiano(soundOn);

  const visibleKeys = useMemo(() => {
    const whites = ALL_KEYS.filter(k => !k.isBlack && k.midi >= keyboardStart);
    const start = whites[0]?.midi ?? keyboardStart;
    const endWhite = whites[VISIBLE_WHITE_KEYS - 1];
    if (!endWhite) return ALL_KEYS.filter(k => k.midi >= start);
    const end = endWhite.midi;
    return ALL_KEYS.filter(k => k.midi >= start && k.midi <= end);
  }, [keyboardStart]);

  const visibleWhites = visibleKeys.filter(k => !k.isBlack);

  useEffect(() => {
    if (feedback) return;
    if (lockedCorrect.size === question.pcs.size && lockedCorrect.size > 0) {
      const allMatch = [...question.pcs].every(pc => lockedCorrect.has(pc));
      if (allMatch) {
        setFeedback('correct');
        // Play the full chord (all the notes the user actually pressed)
        playChord([...pressed]);
        setStreak(s => {
          const ns = s + 1;
          setBestStreak(b => Math.max(b, ns));
          return ns;
        });
        setScore(s => ({ correct: s.correct + 1, total: s.total + 1 }));
        setTimeout(() => {
          setQuestion(q => generateQuestion(difficulty, q.name));
          setPressed(new Set());
          setLockedCorrect(new Set());
          setFeedback(null);
        }, 1400);
      }
    }
  }, [lockedCorrect, question, feedback, difficulty, pressed, playChord]);

  const handleKey = (midi) => {
    if (feedback === 'correct') return;
    playNote(midi);
    const pc = midi % 12;

    if (isCorrectNote(midi, question.pcs)) {
      setLockedCorrect(prev => {
        if (prev.has(pc)) return prev;
        const next = new Set(prev);
        next.add(pc);
        return next;
      });
      setPressed(prev => {
        const next = new Set(prev);
        next.add(midi);
        return next;
      });
    } else {
      setWrongFlash(midi);
      setTimeout(() => setWrongFlash(prev => prev === midi ? null : prev), 350);
      setStreak(0);
    }
  };

  const skip = () => {
    setStreak(0);
    setScore(s => ({ ...s, total: s.total + 1 }));
    setQuestion(q => generateQuestion(difficulty, q.name));
    setPressed(new Set());
    setLockedCorrect(new Set());
    setFeedback(null);
  };

  const changeDifficulty = (d) => {
    setDifficulty(d);
    setQuestion(generateQuestion(d, null));
    setPressed(new Set());
    setLockedCorrect(new Set());
    setFeedback(null);
    setStreak(0);
  };

  const shiftKeyboard = (dir) => {
    const newStart = keyboardStart + (dir * 12);
    if (newStart >= FULL_START && newStart + 12 <= FULL_END) {
      setKeyboardStart(newStart);
    }
  };

  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
  const formatChord = (name) => name.replace(/b/g, '♭').replace(/#/g, '♯');
  const isKeyLocked = (midi) => lockedCorrect.has(midi % 12) && pressed.has(midi);

  return (
    <div className="min-h-screen w-full text-slate-200 select-none overflow-hidden relative" style={{
      background: '#070912',
      fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:opsz,wght@9..144,300;9..144,600;9..144,900&display=swap');

        @keyframes slideIn { from { opacity: 0; transform: translateY(-16px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes wrongShake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
        @keyframes sparkle { 0%, 100% { opacity: 0.3; transform: scale(1) rotate(0deg); } 50% { opacity: 1; transform: scale(1.3) rotate(180deg); } }
        @keyframes lockGlowWhite {
          0%, 100% { box-shadow: 0 0 30px rgba(122, 220, 200, 0.7), inset 0 0 20px rgba(122, 220, 200, 0.4), 0 0 60px rgba(122, 220, 200, 0.3); }
          50%      { box-shadow: 0 0 45px rgba(122, 220, 200, 0.9), inset 0 0 28px rgba(122, 220, 200, 0.5), 0 0 80px rgba(122, 220, 200, 0.45); }
        }
        @keyframes lockGlowBlack {
          0%, 100% { box-shadow: 0 0 25px rgba(122, 220, 200, 0.8), inset 0 -2px 4px rgba(0,0,0,0.5), 0 0 50px rgba(122, 220, 200, 0.4); }
          50%      { box-shadow: 0 0 38px rgba(122, 220, 200, 1), inset 0 -2px 4px rgba(0,0,0,0.5), 0 0 70px rgba(122, 220, 200, 0.55); }
        }
        @keyframes ambient { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
        @keyframes float { 0%, 100% { transform: translateY(0) translateX(0); } 33% { transform: translateY(-20px) translateX(10px); } 66% { transform: translateY(10px) translateX(-15px); } }

        @keyframes successPulse {
          0%   {
            transform: scale(1);
            color: #C0CAF5;
            text-shadow:
              0 0 20px rgba(122,162,247,0.4);
          }
          30%  {
            transform: scale(1.08);
            color: #ECFFF6;
            text-shadow:
              0 0 8px rgba(255,255,255,0.95),
              0 0 18px rgba(184,242,216,0.95),
              0 0 36px rgba(184,242,216,0.8),
              0 0 64px rgba(122,162,247,0.7),
              0 0 110px rgba(187,154,247,0.5);
          }
          100% {
            transform: scale(1);
            color: #DCE7FF;
            text-shadow:
              0 0 12px rgba(184,242,216,0.7),
              0 0 32px rgba(122,162,247,0.55),
              0 0 60px rgba(187,154,247,0.35);
          }
        }
        @keyframes idleGlow {
          0%, 100% { text-shadow: 0 0 24px rgba(122,162,247,0.35), 0 0 48px rgba(187,154,247,0.2); }
          50%      { text-shadow: 0 0 30px rgba(122,162,247,0.45), 0 0 60px rgba(187,154,247,0.28); }
        }

        .chord-name { animation: slideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .chord-success { animation: successPulse 1.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .chord-idle { animation: idleGlow 3s ease-in-out infinite; }
        .wrong-shake { animation: wrongShake 0.3s ease-in-out; }
        .sparkle-anim { animation: sparkle 1.6s ease-in-out infinite; }
        .ambient-glow { animation: ambient 4s ease-in-out infinite; }
        .float-orb { animation: float 12s ease-in-out infinite; }
        .key-locked-white { animation: lockGlowWhite 1.8s ease-in-out infinite; }
        .key-locked-black { animation: lockGlowBlack 1.8s ease-in-out infinite; }

        .display-font { font-family: 'Fraunces', serif; font-feature-settings: 'ss01'; }
        .mono-font { font-variant-numeric: tabular-nums; }
      `}</style>

      {/* Ambient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full ambient-glow float-orb pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(122,162,247,0.18) 0%, transparent 70%)', filter: 'blur(40px)',
      }} />
      <div className="absolute bottom-[-30%] right-[-15%] w-[600px] h-[600px] rounded-full ambient-glow float-orb pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(187,154,247,0.15) 0%, transparent 70%)', filter: 'blur(50px)', animationDelay: '2s',
      }} />
      <div className="absolute top-[40%] right-[10%] w-[300px] h-[300px] rounded-full ambient-glow pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(122,220,200,0.1) 0%, transparent 70%)', filter: 'blur(40px)', animationDelay: '1s',
      }} />

      <div className="relative max-w-2xl mx-auto px-5 py-5 flex flex-col h-screen z-10">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md" style={{
              background: 'rgba(20, 24, 36, 0.6)', border: '1px solid rgba(122, 162, 247, 0.15)',
            }}>
              <Flame size={12} className="text-orange-400" />
              <span className="font-bold mono-font text-sm text-slate-100">{streak}</span>
              <span className="text-slate-600 text-xs mono-font">/ {bestStreak}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md" style={{
              background: 'rgba(20, 24, 36, 0.6)', border: '1px solid rgba(187, 154, 247, 0.15)',
            }}>
              <Sparkles size={12} className="text-purple-300" />
              <span className="font-bold mono-font text-sm text-slate-100">{accuracy}<span className="text-xs text-slate-500">%</span></span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setSoundOn(s => !s)} className="p-2 rounded-full backdrop-blur-md transition hover:scale-105" style={{
              background: 'rgba(20, 24, 36, 0.6)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              {soundOn ? <Volume2 size={13} className="text-slate-300" /> : <VolumeX size={13} className="text-slate-600" />}
            </button>
            <button onClick={() => setShowSettings(s => !s)} className="p-2 rounded-full backdrop-blur-md transition hover:scale-105" style={{
              background: showSettings ? 'rgba(122, 162, 247, 0.15)' : 'rgba(20, 24, 36, 0.6)',
              border: `1px solid ${showSettings ? 'rgba(122, 162, 247, 0.4)' : 'rgba(255,255,255,0.06)'}`,
            }}>
              <Settings size={13} className={showSettings ? 'text-blue-300' : 'text-slate-300'} />
            </button>
          </div>
        </div>

        {/* Difficulty panel */}
        {showSettings && (
          <div className="mt-2 mb-1 p-3 rounded-2xl chord-name backdrop-blur-md" style={{
            background: 'rgba(20, 24, 36, 0.5)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mb-2.5 font-semibold">Difficulty</div>
            <div className="flex gap-1.5">
              {Object.entries(DIFFICULTY_LEVELS).map(([key, val]) => {
                const active = difficulty === key;
                return (
                  <button
                    key={key}
                    onClick={() => changeDifficulty(key)}
                    className="flex-1 py-2.5 rounded-xl text-sm transition-all"
                    style={{
                      background: active
                        ? 'linear-gradient(135deg, rgba(122,162,247,0.25), rgba(122,162,247,0.1))'
                        : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${active ? 'rgba(122,162,247,0.5)' : 'rgba(255,255,255,0.05)'}`,
                      color: active ? '#C0CAF5' : '#565F89',
                      fontWeight: active ? 700 : 500,
                      boxShadow: active ? '0 4px 20px rgba(122,162,247,0.2), inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
                    }}
                  >
                    <div>{val.name}</div>
                    <div className="text-[9px] tracking-wider mt-0.5 opacity-60">{val.en}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Centerpiece chord display */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative">
          <div key={question.name} className="chord-name text-center relative">
            <div className="text-[10px] tracking-[0.5em] text-slate-500 uppercase mb-3 font-medium">
              {CHORD_FORMULAS[question.type].label}
            </div>

            <div
              className={`display-font font-black leading-[0.85] tracking-tighter relative ${feedback === 'correct' ? 'chord-success' : 'chord-idle'}`}
              style={{
                fontSize: 'clamp(88px, 22vw, 168px)',
                color: '#DCE7FF',
              }}
            >
              {formatChord(question.name)}
            </div>

            {feedback === 'correct' && (
              <>
                <div className="absolute -top-3 -right-1 sparkle-anim"><Sparkles size={22} className="text-emerald-200" style={{ filter: 'drop-shadow(0 0 8px rgba(184,242,216,0.8))' }} /></div>
                <div className="absolute -bottom-1 -left-3 sparkle-anim" style={{ animationDelay: '0.3s' }}><Sparkles size={16} className="text-purple-200" style={{ filter: 'drop-shadow(0 0 6px rgba(187,154,247,0.8))' }} /></div>
                <div className="absolute top-1/2 -right-8 sparkle-anim" style={{ animationDelay: '0.5s' }}><Sparkles size={12} className="text-blue-200" style={{ filter: 'drop-shadow(0 0 6px rgba(122,162,247,0.8))' }} /></div>
              </>
            )}
          </div>

          {/* Progress dots */}
          <div className="mt-7 flex items-center gap-2.5">
            {[...Array(question.pcs.size)].map((_, i) => {
              const filled = i < lockedCorrect.size;
              return (
                <div key={i} className="rounded-full transition-all duration-500"
                  style={{
                    width: filled ? '28px' : '8px', height: '8px',
                    background: filled
                      ? (feedback === 'correct'
                        ? 'linear-gradient(90deg, #7ADCC8, #4FB8A0)'
                        : 'linear-gradient(90deg, #7AA2F7, #BB9AF7)')
                      : 'rgba(255,255,255,0.08)',
                    boxShadow: filled ? '0 0 12px rgba(122,162,247,0.5)' : 'none',
                  }} />
              );
            })}
          </div>

          <div className="mt-4 h-5 text-xs tracking-wider">
            {feedback === 'correct' ? (
              <div className="flex items-center gap-1.5 text-emerald-300 font-semibold uppercase">
                <Check size={12} /><span>Perfect</span>
              </div>
            ) : (
              <div className="text-slate-600 uppercase">
                {lockedCorrect.size} / {question.pcs.size} notes
              </div>
            )}
          </div>
        </div>

        {/* Octave nav */}
        <div className="flex items-center justify-between mb-3 px-1">
          <button onClick={() => shiftKeyboard(-1)} disabled={keyboardStart <= FULL_START}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full transition disabled:opacity-30"
            style={{ background: 'rgba(20, 24, 36, 0.6)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)' }}>
            <ChevronLeft size={12} className="text-slate-400" />
            <span className="text-[10px] text-slate-500 tracking-wider uppercase">Lower</span>
          </button>
          <div className="text-[10px] tracking-[0.3em] text-slate-600 uppercase font-medium">
            Octave {Math.floor(keyboardStart / 12) - 1} – {Math.floor((keyboardStart + 12) / 12) - 1}
          </div>
          <button onClick={() => shiftKeyboard(1)} disabled={keyboardStart + 12 >= FULL_END - 11}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full transition disabled:opacity-30"
            style={{ background: 'rgba(20, 24, 36, 0.6)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)' }}>
            <span className="text-[10px] text-slate-500 tracking-wider uppercase">Higher</span>
            <ChevronRight size={12} className="text-slate-400" />
          </button>
        </div>

        {/* Keyboard */}
        <div className="relative w-full mb-4" style={{ height: '220px' }}>
          <div className="absolute inset-0 rounded-2xl p-2.5" style={{
            background: 'linear-gradient(180deg, #1A1D2E 0%, #0E1018 100%)',
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}>
            <div className="relative w-full h-full flex">
              {visibleWhites.map((key) => {
                const locked = isKeyLocked(key.midi);
                const isWrong = wrongFlash === key.midi;
                return (
                  <button
                    key={key.midi}
                    onMouseDown={() => handleKey(key.midi)}
                    onTouchStart={(e) => { e.preventDefault(); handleKey(key.midi); }}
                    className={`flex-1 relative rounded-b-xl transition-all duration-100 ${locked ? 'key-locked-white' : ''} ${isWrong ? 'wrong-shake' : ''}`}
                    style={{
                      background: isWrong
                        ? 'linear-gradient(180deg, #F7768E 0%, #c44e64 100%)'
                        : locked
                        ? 'linear-gradient(180deg, #B8F2D8 0%, #7ADCC8 60%, #4FB8A0 100%)'
                        : 'linear-gradient(180deg, #F0EEE8 0%, #D8D4CA 95%, #B8B4AA 100%)',
                      border: locked ? '1px solid rgba(122,220,200,0.6)' : '1px solid rgba(0,0,0,0.4)',
                      borderTop: locked ? '1px solid rgba(184,242,216,0.8)' : '1px solid rgba(255,255,255,0.5)',
                      marginRight: '2px',
                      boxShadow: locked ? undefined : 'inset 0 -8px 0 rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.3)',
                    }}
                  >
                    <div className="absolute inset-x-0 bottom-0 h-1/3 rounded-b-xl pointer-events-none" style={{
                      background: locked
                        ? 'linear-gradient(180deg, transparent 0%, rgba(79,184,160,0.3) 100%)'
                        : 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.06) 100%)',
                    }} />
                  </button>
                );
              })}

              <div className="absolute inset-0 flex pointer-events-none">
                {visibleWhites.map((wk, i) => {
                  const blackKey = ALL_KEYS.find(k => k.isBlack && k.midi === wk.midi + 1);
                  const inRange = blackKey && visibleKeys.some(v => v.midi === blackKey.midi);
                  const isLast = i === visibleWhites.length - 1;
                  if (!blackKey || !inRange || isLast) return <div key={wk.midi} className="flex-1" />;
                  const locked = isKeyLocked(blackKey.midi);
                  const isWrong = wrongFlash === blackKey.midi;
                  return (
                    <div key={wk.midi} className="flex-1 relative">
                      <button
                        onMouseDown={() => handleKey(blackKey.midi)}
                        onTouchStart={(e) => { e.preventDefault(); handleKey(blackKey.midi); }}
                        className={`absolute pointer-events-auto rounded-b-lg transition-all duration-100 ${locked ? 'key-locked-black' : ''} ${isWrong ? 'wrong-shake' : ''}`}
                        style={{
                          width: '64%', height: '63%', right: '-32%', top: 0, zIndex: 10,
                          background: isWrong
                            ? 'linear-gradient(180deg, #F7768E 0%, #8a3d4f 100%)'
                            : locked
                            ? 'linear-gradient(180deg, #7ADCC8 0%, #3a9080 60%, #1f5e54 100%)'
                            : 'linear-gradient(180deg, #2A2D38 0%, #15171F 50%, #08090E 100%)',
                          border: locked ? '1px solid rgba(122,220,200,0.6)' : '1px solid rgba(0,0,0,0.8)',
                          borderTop: locked ? '1px solid rgba(184,242,216,0.5)' : '1px solid rgba(255,255,255,0.08)',
                          boxShadow: locked ? undefined : 'inset 0 -3px 0 rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08), 0 3px 6px rgba(0,0,0,0.7)',
                        }}
                      >
                        <div className="absolute inset-x-0 top-0 h-1/3 rounded-t-md pointer-events-none" style={{
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)',
                        }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Skip */}
        <div className="flex justify-center pb-2">
          <button onClick={skip} className="flex items-center gap-2 px-6 py-2.5 rounded-full transition-all hover:scale-105"
            style={{ background: 'rgba(20, 24, 36, 0.6)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)' }}>
            <SkipForward size={13} className="text-slate-400" />
            <span className="text-xs text-slate-400 tracking-wider uppercase font-medium">Skip</span>
          </button>
        </div>
      </div>
    </div>
  );
}

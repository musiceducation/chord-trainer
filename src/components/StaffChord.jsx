/**
 * Treble staff, key signature, and a stacked chord.
 * Plain SVG so it renders in iOS WKWebView without a notation library.
 */

const LINE = 12;
const HALF = LINE / 2;
const STAFF_TOP = 58;
const VIEW_W = 360;
const COLOR = '#E8EEF9';

function yOf(position) {
  return STAFF_TOP + (10 - position) * HALF;
}

function Accidental({ kind, x, y }) {
  if (kind === '#') {
    return (
      <g transform={`translate(${x} ${y})`} fill="none" stroke={COLOR} strokeLinecap="round">
        <line x1="-3.1" y1="-8.4" x2="-3.1" y2="8.2" strokeWidth="1.15" />
        <line x1="2.7" y1="-7.5" x2="2.7" y2="9.1" strokeWidth="1.15" />
        <line x1="-5.6" y1="-1.15" x2="5.3" y2="-4.35" strokeWidth="2.2" />
        <line x1="-5.6" y1="4.55" x2="5.3" y2="1.35" strokeWidth="2.2" />
      </g>
    );
  }
  if (kind === 'b') {
    return (
      <path
        d={`M ${x} ${y - 13.2} V ${y + 3.6} C ${x + 6.4} ${y + 3.2} ${x + 7.3} ${y - 5.4} ${x + 0.2} ${y - 1.15} Z`}
        fill={COLOR}
      />
    );
  }
  return (
    <g transform={`translate(${x} ${y})`} fill="none" stroke={COLOR} strokeLinecap="butt">
      <line x1="-3.1" y1="-7.4" x2="-3.1" y2="3.4" strokeWidth="1.25" />
      <line x1="3.1" y1="-3.4" x2="3.1" y2="7.4" strokeWidth="1.25" />
      <line x1="-3.1" y1="-1.7" x2="3.1" y2="-4.5" strokeWidth="2.3" />
      <line x1="-3.1" y1="4.5" x2="3.1" y2="1.7" strokeWidth="2.3" />
    </g>
  );
}

function TrebleClef({ x, yG }) {
  return (
    <path
      fill={COLOR}
      transform={`translate(${x} ${yG}) scale(1.08 1.2)`}
      d="M2.2 1.2
        C2.2 6.2-1.6 9.4-6.2 9.4
        C-12.2 9.4-16.4 4.6-16.2-1.2
        C-16-7.4-10.6-12.2-4.2-12
        C1.6-11.8 6.4-7.2 6.8-1.4
        C7.2 4.6 3.4 9.2-1.6 9.6
        C-4.8 9.8-7.4 7.6-7.2 4.6
        C-7 1.8-4.4-0.2-1.6 0
        C-0.2 0.1 0.8 1 0.6 2.2
        C0.4 3.2-0.4 4-1.4 3.8
        C-2.6 3.6-3.2 2.4-2.6 1.4
        C-1.6-0.4 0.6-0.8 2.2 0.2
        C4.2 1.4 5.2 4 4.4 6.6
        C3.4 9.8 0.2 12-3.2 11.6
        C-8.2 11-11.8 6.6-11.4 1.4
        C-11-4.2-6.6-8.2-1.2-8
        C2.6-7.8 5.6-5 6 1.2
        L7.2 28.4
        C7.4 32.6 5.2 35.6 1.6 34.6
        C-1.2 33.8-2.8 31.2-2.2 28.4
        C-1.6 26-0.2 24.6 1.6 25.2
        C3 25.6 3.8 27 3.4 28.2
        C3 29.4 1.8 30.2 0.8 29.6
        C-0.6 28.8-1.2 27.4-0.6 26
        C0.4 23.6 3.4 22.6 5.6 24.2
        C8.2 26 9.2 30 7.4 33.2
        C5.2 37 0.6 38.4-2.6 36
        C-6.2 33.2-7.2 28.2-5.2 24.2
        L-4.2-22.6
        C-4-27.4-1.2-31.2 2.8-30.2
        C6.6-29.2 8.6-25.6 7.6-21.8
        C6.8-18.6 4-16.6 1-17.4
        C-1.2-18-2.4-19.8-2-21.8
        C-1.6-23.6 0-24.6 1.6-24
        C2.6-23.6 3.2-22.6 2.8-21.6
        C2.4-20.6 1.2-20.2 0.4-20.6
        C-1.2-21.4-2.2-23.2-1.2-25
        C0.2-27.6 3.6-28.6 5.8-26.6
        C8.2-24.4 8.6-20.2 6.4-17.6
        C4.4-15.2 1.2-14.6-1.2-16.2
        C-3.8-18-4.8-21.6-3.6-25
        L-2.4-2.2
        C-2.2 1.4-0.4 3.6 2.2 3.2
        C4.2 2.8 5.4 0.8 4.8-1.2
        C4.2-3.2 2.2-4.6 0.2-4
        C-1.6-3.4-2.6-1.8-2.2 0
        Z"
    />
  );
}

export function StaffChord({ question, label }) {
  const notes = question?.notes || [];
  const signature = question?.signature;
  const positions = signature?.positions || [];
  const sigKind = signature?.kind === 'flat' ? 'b' : '#';
  const clefX = 28;
  const sigStart = 54;
  const sigStep = sigKind === 'b' ? 13 : 15;
  const chordX = sigStart + positions.length * sigStep + 36;
  const hasSecond = notes.some((note) => note.column === 1);
  const headRx = 7.1;

  const yTop = notes.length ? yOf(Math.max(...notes.map((note) => note.position))) : yOf(10);
  const yBottom = notes.length ? yOf(Math.min(...notes.map((note) => note.position))) : yOf(2);
  const stemExtra = LINE * 2.7;
  const stemX = question?.stemDown ? chordX - headRx + 0.4 : chordX + headRx - 0.4;
  const stemY1 = question?.stemDown ? yTop + 0.4 : yBottom - 0.4;
  const stemY2 = question?.stemDown ? yBottom + stemExtra : yTop - stemExtra;
  const yG = yOf(4);
  const contentTop = Math.min(yG - 38, Math.min(stemY1, stemY2) - 6, STAFF_TOP - 4);
  const contentBottom = Math.max(yG + 44, Math.max(stemY1, stemY2) + 6, STAFF_TOP + 4 * LINE + 8);
  const vbY = Math.max(0, contentTop);
  const vbH = Math.max(96, contentBottom - vbY);

  const ledgerLeft = chordX - 16;
  const ledgerRight = chordX + (hasSecond ? 24 : 16);

  let accidentalSlot = 0;
  let lastAccidentalPos = -99;
  const accidentalSlots = notes.map((note) => {
    if (!note.glyph) return 0;
    if (note.position - lastAccidentalPos < 4) accidentalSlot += 1;
    else accidentalSlot = 0;
    lastAccidentalPos = note.position;
    return accidentalSlot;
  });

  return (
    <svg
      viewBox={`0 ${vbY} ${VIEW_W} ${vbH}`}
      className="w-full h-auto max-h-[148px]"
      role="img"
      aria-label={label}
      data-testid="read-staff"
    >
      {[0, 1, 2, 3, 4].map((line) => (
        <line
          key={line}
          x1="8"
          x2={VIEW_W - 8}
          y1={STAFF_TOP + line * LINE}
          y2={STAFF_TOP + line * LINE}
          stroke={COLOR}
          strokeWidth="1.15"
          opacity="0.9"
        />
      ))}
      <line
        x1="12"
        x2="12"
        y1={STAFF_TOP}
        y2={STAFF_TOP + 4 * LINE}
        stroke={COLOR}
        strokeWidth="1.4"
      />
      <TrebleClef x={clefX} yG={yOf(4)} />
      {positions.map((position, index) => (
        <Accidental
          key={`sig-${position}-${index}`}
          kind={sigKind}
          x={sigStart + index * sigStep}
          y={yOf(position)}
        />
      ))}
      {(question?.ledgers || []).map((position) => (
        <line
          key={`ledger-${position}`}
          x1={ledgerLeft}
          x2={ledgerRight}
          y1={yOf(position)}
          y2={yOf(position)}
          stroke={COLOR}
          strokeWidth="1.2"
        />
      ))}
      {notes.length > 0 && (
        <line
          x1={stemX}
          x2={stemX}
          y1={stemY1}
          y2={stemY2}
          stroke={COLOR}
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      )}
      {notes.map((note) => {
        const cx = chordX + (note.column === 1 ? headRx * 2 : 0);
        const cy = yOf(note.position);
        return (
          <ellipse
            key={`${note.name}-${note.octave}`}
            cx={cx}
            cy={cy}
            rx={headRx}
            ry="5"
            transform={`rotate(-20 ${cx} ${cy})`}
            fill={COLOR}
          />
        );
      })}
      {notes.map((note, index) => {
        if (!note.glyph) return null;
        const cx = chordX + (note.column === 1 ? headRx * 2 : 0);
        const slot = accidentalSlots[index];
        return (
          <Accidental
            key={`acc-${note.name}-${note.octave}`}
            kind={note.glyph}
            x={cx - 16 - slot * 12}
            y={yOf(note.position)}
          />
        );
      })}
    </svg>
  );
}

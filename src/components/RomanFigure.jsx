import { splitRomanFigure } from '../lib/abrsm.js';

/** Stacked figured-bass digits, so ⁶₄ stays aligned instead of riding the font baseline. */
export function RomanFigure({ text }) {
  const { body, stack } = splitRomanFigure(text);
  return (
    <span className="roman-figure" aria-label={text || ''}>
      <span className="roman-figure-body">{body}</span>
      {stack.length > 0 && (
        <span className="roman-figure-stack" aria-hidden="true">
          {stack.map((digit, index) => (
            <span key={`${digit}-${index}`} className="roman-figure-digit">{digit}</span>
          ))}
        </span>
      )}
    </span>
  );
}

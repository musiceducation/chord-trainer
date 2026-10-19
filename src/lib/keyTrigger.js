/**
 * One piano-key attack per press.
 *
 * iOS WKWebView plays the note on touchstart, then on finger lift synthesizes
 * mousedown → mouseup → click. React 18 registers touchstart as a passive
 * listener, so preventDefault() there does not cancel that mouse event.
 * Binding both touchstart and mousedown therefore starts a second sample
 * on lift. pointerdown fires once for touch and mouse; cancelling it also
 * suppresses the compatibility mouse events. pointerup, touchend, and click
 * must not start a note — the sounding voice keeps its sustain envelope.
 */
export function pressPianoKey(event, play) {
  if (!event || event.type !== 'pointerdown') return false;
  if (typeof event.button === 'number' && event.button !== 0) return false;
  if (typeof event.preventDefault === 'function') event.preventDefault();
  play();
  return true;
}

import { Keyboard } from './Keyboard.jsx';
import { NoteNamePad } from './NoteNamePad.jsx';

/** Shared Identify / Train / Roman input: piano keyboard or tappable note names. */
export function AnswerSurface({ surface = 'keyboard', ...props }) {
  if (surface === 'noteNames') return <NoteNamePad {...props} />;
  return <Keyboard {...props} />;
}

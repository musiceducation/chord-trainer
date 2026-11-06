import { useEffect, useState } from 'react';
import { isAudioPlaying, subscribeAudioPlaying } from '../lib/audioActivity.js';

export function useAudioPlaying() {
  const [playing, setPlaying] = useState(() => isAudioPlaying());
  useEffect(() => subscribeAudioPlaying(setPlaying), []);
  return playing;
}

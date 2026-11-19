/** Select an installed English speech voice for English WHO/CPCB evidence.
 * This never claims that reviewed English evidence has been translated.
 */
export type DeviceVoice={identifier:string;language:string};
export function selectEnglishVoice<T extends DeviceVoice>(voices:readonly T[]):T|null{
  const english=voices.filter(voice=>Boolean(voice.identifier)&&/^en(?:[-_]|$)/i.test(voice.language));
  return english.find(voice=>/^en[-_]IN$/i.test(voice.language))||english[0]||null;
}

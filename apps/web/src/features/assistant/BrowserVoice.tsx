import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { LANGUAGES,t } from "../language/locale";
import type { Locale } from "../language/locale";

type RecognitionResult = {results: ArrayLike<{0:{transcript:string}}>};
type RecognitionInstance = {
  lang:string;interimResults:boolean;continuous:boolean;
  onresult:((event:RecognitionResult)=>void)|null;
  onerror:((event:{error:string})=>void)|null;
  onend:(()=>void)|null;
  start:()=>void;stop:()=>void;abort:()=>void;
};
type VoiceWindow=Window & {
  SpeechRecognition?:new()=>RecognitionInstance;
  webkitSpeechRecognition?:new()=>RecognitionInstance;
};
export function BrowserVoice({
  locale,onTranscribe,answer,
}:{
  locale:Locale;onTranscribe:(text:string)=>void;answer:string;
}){
  const ref=useRef<RecognitionInstance|null>(null);
  const [listening,setListening]=useState(false);
  const [speaking,setSpeaking]=useState(false);
  const [error,setError]=useState("");
  const possible=typeof window!=="undefined"&&
    Boolean((window as VoiceWindow).SpeechRecognition||(window as VoiceWindow).webkitSpeechRecognition);
  const textToSpeech=typeof window!=="undefined"&&"speechSynthesis" in window;
  useEffect(()=>()=>{ref.current?.abort();window.speechSynthesis?.cancel();},[]);
  function toggleMic(){
    setError("");
    if(listening){ref.current?.stop();return;}
    const Voice=(window as VoiceWindow).SpeechRecognition||(window as VoiceWindow).webkitSpeechRecognition;
    if(!Voice){setError("Speech recognition is unavailable in this browser.");return;}
    const recognition=new Voice();
    ref.current=recognition;
    recognition.lang=LANGUAGES[locale].tag;
    recognition.interimResults=false;recognition.continuous=false;
    recognition.onresult=(event)=>{const text=event.results[0]?.[0]?.transcript?.trim();if(text)onTranscribe(text.slice(0,400));};
    recognition.onerror=(event)=>{setError(event.error==="not-allowed"?"Microphone permission was denied.":"Could not recognize speech. Type your question instead.");setListening(false);};
    recognition.onend=()=>setListening(false);
    try{recognition.start();setListening(true);}catch{setListening(false);setError("Speech recognition could not start.");}
  }
  function toggleSpeech(){
    if(!textToSpeech){setError("Text-to-speech is unavailable.");return;}
    if(speaking){window.speechSynthesis.cancel();setSpeaking(false);return;}
    if(!answer)return;
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(answer.slice(0,1800));
    utterance.lang="en-IN"; // WHO/CPCB citations are reviewed in English; never mislabel as translated
    utterance.rate=.93;
    utterance.onend=()=>setSpeaking(false);
    utterance.onerror=()=>setSpeaking(false);
    window.speechSynthesis.speak(utterance);setSpeaking(true);
  }
  return <div className="browser-voice">
    <button type="button" disabled={!possible} onClick={toggleMic} aria-pressed={listening}
      aria-label={listening?"Stop listening":t(locale,"listen")}>
      {listening?<MicOff size={16}/>:<Mic size={16}/>} {listening?"Stop microphone":t(locale,"listen")}
    </button>
    <button type="button" disabled={!textToSpeech||!answer} onClick={toggleSpeech} aria-pressed={speaking}>
      {speaking?<VolumeX size={16}/>:<Volume2 size={16}/>} {speaking?"Stop reading":t(locale,"speak")}
    </button>
    <span>Microphone uses your browser's speech service only after permission. Recognized text is submitted to AI only when you press Ask.</span>
    {!possible&&<span role="status">Speech input is unavailable here. Use the keyboard microphone where supported.</span>}
    {error&&<span role="alert">{error}</span>}
  </div>;
}

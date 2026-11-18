import {useEffect,useState} from "react";
import type {ReactNode} from "react";
import {Alert,Linking,Pressable,SafeAreaView,ScrollView,StatusBar,Text,TextInput,View} from "react-native";
import {getLocales} from "expo-localization";
import * as SecureStore from "expo-secure-store";
import * as Speech from "expo-speech";
import {styles,COLORS} from "./src/styles";
import {LANGUAGES,chooseLocale,translate} from "./src/i18n";
import type {Locale} from "./src/i18n";
import {API,CITIES,REPORT_TYPES,ask,community,getAir,officialURL} from "./src/api";
import type {Air,Assistant,Challenge,Report,ReportType,AlertStatus,AlertPref} from "./src/api";

type Tab="home"|"assistant"|"community"|"challenges"|"alerts";
const TABS:Tab[]=["home","assistant","community","challenges","alerts"];
const LOCALE_KEY="winter-smog-mobile-locale-v1";
const failure=(error:unknown)=>error instanceof Error?error.message:"Service temporarily unavailable.";
function Action({label,onPress,disabled=false,secondary=false}:{
  label:string;onPress:()=>void;disabled?:boolean;secondary?:boolean;
}){
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={[secondary?styles.buttonAlt:styles.button,disabled&&styles.disabled]}>
    <Text style={secondary?styles.buttonAltText:styles.buttonText}>{label}</Text>
  </Pressable>;
}
function Card({children,title}:{children:ReactNode;title?:string}){
  return <View style={styles.card}>
    {title?<Text style={styles.cardTitle}>{title}</Text>:null}
    {children}
  </View>;
}
function Info({text}:{text:string}){return <Text style={styles.muted}>{text}</Text>;}
function ChoiceRow({options,value,onChange}:{
  options:{value:string;label:string}[];value:string;onChange:(value:string)=>void;
}){
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
    {options.map(c=><Pressable key={c.value} accessibilityRole="button"
      accessibilityState={{selected:value===c.value}}
      onPress={()=>onChange(c.value)}
      style={[styles.chip,value===c.value&&styles.selectedChip]}>
      <Text style={[styles.chipText,value===c.value&&styles.selectedChipText]}>{c.label}</Text>
    </Pressable>)}
  </ScrollView>;
}

export default function App(){
  const [locale,setLocale]=useState<Locale>(chooseLocale(getLocales()[0]?.languageCode));
  const [tab,setTab]=useState<Tab>("home");
  const [city,setCity]=useState("Bengaluru");
  const [air,setAir]=useState<Air|null>(null);
  const [question,setQuestion]=useState("");
  const [answer,setAnswer]=useState<Assistant|null>(null);
  const [reports,setReports]=useState<Report[]>([]);
  const [myReports,setMyReports]=useState<Report[]>([]);
  const [reportType,setReportType]=useState<ReportType>("garbage_burning");
  const [reportText,setReportText]=useState("");
  const [challenges,setChallenges]=useState<Challenge[]>([]);
  const [challengeDays,setChallengeDays]=useState<Record<string,number>>({});
  const [alertPrefs,setAlertPrefs]=useState<AlertPref>({enabled:false,city:"Bengaluru",threshold:150});
  const [alertResult,setAlertResult]=useState<AlertStatus|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const tr=(key:Parameters<typeof translate>[1])=>translate(locale,key);
  useEffect(()=>{
    void SecureStore.getItemAsync(LOCALE_KEY).then(value=>{
      if(value)setLocale(chooseLocale(value));
    }).catch(()=>{/*Device storage can be unavailable*/});
  },[]);
  function changeLocale(value:string){
    const next=chooseLocale(value);setLocale(next);
    void SecureStore.setItemAsync(LOCALE_KEY,next).catch(()=>setNotice("Language selection could not be saved."));
  }
  async function run<T>(fn:()=>Promise<T>,done:(data:T)=>void){
    setBusy(true);setError("");setNotice("");
    try{done(await fn());}
    catch(e){setError(failure(e));}
    finally{setBusy(false);}
  }
  async function refreshAir(location=city){
    await run(()=>getAir(location),setAir);
  }
  useEffect(()=>{void refreshAir(city);},[city]);
  async function refreshCommunity(location=city){
    await run(async()=>{
      const [feed,mine]=await Promise.all([
        community<{reports:Report[]}>("/reports?city="+encodeURIComponent(location)),
        community<{reports:Report[]}>("/my/reports")]);
      return {feed,mine};
    },result=>{setReports(result.feed.reports);setMyReports(result.mine.reports);});
  }
  async function refreshChallenges(){
    await run(async()=>{
      const [list,state]=await Promise.all([
        community<{challenges:Challenge[]}>("/challenges"),
        community<{progress:{challenge_id:string;completed_days:number}[]}>("/my/challenges"),
      ]);
      return {list,state};
    },r=>{
      setChallenges(r.list.challenges);
      setChallengeDays(Object.fromEntries(r.state.progress.map(x=>[x.challenge_id,x.completed_days])));
    });
  }
  async function refreshAlertPreferences(){
    await run(()=>community<{preferences:AlertPref}>("/alerts/preferences"),
      result=>setAlertPrefs({...result.preferences,enabled:Boolean(result.preferences.enabled)}));
  }
  useEffect(()=>{
    if(tab==="community")void refreshCommunity();
    if(tab==="challenges")void refreshChallenges();
    if(tab==="alerts")void refreshAlertPreferences();
  },[tab,city]);

  async function askAI(){
    await run(()=>ask(question),result=>{
      setAnswer(result);setQuestion("");
    });
  }
  function readAnswer(){
    if(!answer?.answer)return;
    Speech.stop();
    Speech.speak(answer.answer.slice(0,2000),{language:"en-IN",rate:.92});
  }
  async function submitReport(){
    await run(()=>community("/reports","POST",{city,category:reportType,description:reportText}),()=>{
      setReportText("");
      setNotice(tr("pending")+". Reports are not official measurements.");
      void refreshCommunity();
    });
  }
  async function deleteReport(id:string){
    await run(()=>community("/my/reports/"+id,"DELETE"),()=>{
      setNotice("Report removed.");
      void refreshCommunity();
    });
  }
  async function challengeAction(id:string,joined:boolean){
    await run(()=>community("/challenges/"+id+(joined?"/checkin":"/join"),"POST"),()=>{
      setNotice(joined?"Today's self-reported activity was counted once.":"Challenge joined.");
      void refreshChallenges();
    });
  }
  async function saveAlerts(){
    await run(()=>community("/alerts/preferences","POST",alertPrefs),()=>{
      setNotice("Saved. Check air while the app is open. Background push is not configured.");
    });
  }
  async function checkAlerts(){
    await run(()=>community<AlertStatus>("/alerts/check"),result=>{
      setAlertResult(result);
      if(result.triggered)Alert.alert("Modelled US AQI advisory",
        (result.city||"Your city")+" reached the selected threshold. Check official alerts.");
    });
  }
  const cityOptions=Object.keys(CITIES).map(value=>({value,label:value}));
  const typeOptions=Object.entries(REPORT_TYPES).map(([value,label])=>({value,label}));
  return <SafeAreaView style={styles.root}>
    <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg}/>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <Text style={styles.brand}>WINTER SMOG ASSISTANT</Text>
        <Text style={styles.title}>A clearer day starts here.</Text>
        <Text style={styles.heroSub}>{tr("aqiNotice")} WHO/CPCB-backed education, no guaranteed safe outdoor period.</Text>
      </View>
      <Text style={styles.label}>{tr("language")}</Text>
      <ChoiceRow value={locale} onChange={changeLocale}
        options={Object.entries(LANGUAGES).map(([value,info])=>({value,label:info.label}))}/>
      <ChoiceRow value={tab} onChange={value=>setTab(value as Tab)}
        options={TABS.map(value=>({value,label:tr(value)}))}/>
      {error?<View style={styles.caution}><Text accessibilityRole="alert" style={styles.warningText}>{error}</Text></View>:null}
      {notice?<View style={styles.status}><Text style={styles.statusText}>{notice}</Text></View>:null}

      {tab==="home"?<>
        <Text style={styles.sectionTitle}>{tr("home")}</Text>
        <Text style={styles.label}>{tr("city")}</Text>
        <ChoiceRow value={city} onChange={setCity} options={cityOptions}/>
        <Card title={city+" · modelled US AQI"}>
          {air?<><Text style={styles.large}>{Math.round(air.current.us_aqi)}</Text>
            <Text style={styles.cardTitle}>{air.category.level}</Text>
            <Text style={styles.text}>{air.category.advice}</Text>
            <Info text={"Data freshness: "+air.freshness+" · not official CPCB AQI"}/>
            <Info text={"PM2.5: "+(air.current.pm25_ug_m3??"unknown")+" µg/m³"}/>
          </>:<Info text={tr("unavailable")}/>}
          <Action label={tr("refresh")} onPress={()=>void refreshAir()} disabled={busy}/>
        </Card>
        <Card title="Understand your risk"><Text style={styles.text}>
          Lower modelled AQI may help with planning. Sensitive people should follow clinician guidance
          and official local advisories. A single outdoor measurement does not describe indoor air.
        </Text></Card>
      </>:null}
      {tab==="assistant"?<>
        <Text style={styles.sectionTitle}>{tr("assistant")}</Text>
        <Card title="Ask about WHO/CPCB air pollution guidance">
          <Info text="Answers and reviewed source excerpts are in English. Do not share identifying or medical details."/>
          <Info text="Use your phone keyboard microphone for dictation if supported; questions are sent only when you tap Ask."/>
          <TextInput style={[styles.input,styles.multiline]} multiline maxLength={400}
            value={question} onChangeText={setQuestion} placeholder={tr("askHint")}
            accessibilityLabel={tr("askHint")}/>
          <Action label={busy?"Checking…":tr("ask")} disabled={busy||question.trim().length<5}
            onPress={()=>void askAI()}/>
        </Card>
        {answer?<Card title={answer.mode==="generated"?"AI paraphrase — verify citations":
          answer.mode==="evidence_only"?"Reviewed source wording":"Could not verify / urgent safety"}>
          <Text style={styles.text}>{answer.answer}</Text>
          <Action label={tr("speak")} onPress={readAnswer} secondary/>
          <Action label="Stop reading" onPress={()=>Speech.stop()} secondary/>
          <Text style={styles.label}>{tr("source")}</Text>
          {answer.citations.map(c=><View key={c.id} style={styles.smallCard}>
            <Text style={styles.text}>{c.publisher}: {c.section}</Text>
            {c.reviewed_summary?<Text style={styles.muted}>{c.reviewed_summary}</Text>:null}
            <Text style={styles.link} accessibilityRole="link" onPress={()=>{
              const official=officialURL(c.url);
              if(official)void Linking.openURL(official);
            }}>{officialURL(c.url)?"Read original source":"Source link unavailable"}</Text>
          </View>)}
          <Info text={answer.disclaimer}/>
        </Card>:null}
      </>:null}
      {tab==="community"?<>
        <Text style={styles.sectionTitle}>{tr("community")}</Text>
        <Text style={styles.label}>{tr("city")}</Text>
        <ChoiceRow value={city} onChange={setCity} options={cityOptions}/>
        <Card title="New air concern">
          <Info text={tr("privacy")+" Reports require human moderation and are not official readings."}/>
          <ChoiceRow value={reportType} onChange={value=>setReportType(value as ReportType)}
            options={typeOptions}/>
          <TextInput style={[styles.input,styles.multiline]} multiline maxLength={500} value={reportText}
            onChangeText={setReportText} accessibilityLabel="Community concern description"/>
          <Action label={tr("report")} disabled={busy||reportText.trim().length<25}
            onPress={()=>void submitReport()}/>
        </Card>
        <Card title={tr("myReports")}>
          {myReports.length===0?<Info text="No reports from this device."/>:null}
          {myReports.filter(r=>r.status!=="deleted").map(r=><View key={r.id} style={styles.smallCard}>
            <Text style={styles.label}>{r.city} · {r.status}</Text>
            <Text style={styles.text}>{r.description}</Text>
            <Action secondary label="Remove" disabled={busy} onPress={()=>void deleteReport(r.id)}/>
          </View>)}
        </Card>
        <Card title="Moderator-approved observations">
          {reports.length===0?<Info text="No approved reports for this city."/>:null}
          {reports.map(r=><View style={styles.smallCard} key={r.id}>
            <Text style={styles.label}>{REPORT_TYPES[r.category]} · {r.city}</Text>
            <Text style={styles.text}>{r.description}</Text>
          </View>)}
          <Action secondary label={tr("refresh")} disabled={busy} onPress={()=>void refreshCommunity()}/>
        </Card>
      </>:null}
      {tab==="challenges"?<>
        <Text style={styles.sectionTitle}>{tr("challenges")}</Text>
        <Info text="One self-reported check-in per day; this does not prove measured CO₂ or health savings."/>
        {challenges.map(c=>{
          const days=challengeDays[c.id],joined=days!==undefined;
          return <Card title={c.title} key={c.id}>
            <Text style={styles.text}>{c.description}</Text>
            <Info text={joined?String(days)+" / "+c.target_days+" days":"Not joined"}/>
            <Action label={!joined?tr("join"):days>=c.target_days?"Completed":tr("checkIn")}
              disabled={busy||joined&&days>=c.target_days}
              onPress={()=>void challengeAction(c.id,joined)}/>
          </Card>;
        })}
      </>:null}
      {tab==="alerts"?<>
        <Text style={styles.sectionTitle}>{tr("alerts")}</Text>
        <Card title="Opt-in modelled AQI advisory">
          <Info text="Foreground checks only. No background push or official CPCB emergency notifications."/>
          <Action label={alertPrefs.enabled?"Alerts: ON":"Alerts: OFF"}
            secondary onPress={()=>setAlertPrefs(p=>({...p,enabled:!p.enabled}))}/>
          <Text style={styles.label}>{tr("city")}</Text>
          <ChoiceRow value={alertPrefs.city} options={cityOptions}
            onChange={value=>setAlertPrefs(p=>({...p,city:value}))}/>
          <Text style={styles.label}>{tr("threshold")}</Text>
          <ChoiceRow value={String(alertPrefs.threshold)}
            options={[100,150,200,250,300,400].map(value=>({value:String(value),label:String(value)}))}
            onChange={value=>setAlertPrefs(p=>({...p,threshold:Number(value)}))}/>
          <Action label={tr("save")} disabled={busy} onPress={()=>void saveAlerts()}/>
          <Action label={tr("check")} disabled={busy} secondary onPress={()=>void checkAlerts()}/>
          {alertResult?<View style={alertResult.triggered?styles.caution:styles.status}>
            <Text style={alertResult.triggered?styles.warningText:styles.statusText}>
              {alertResult.triggered?"Modelled US AQI threshold reached. Check official advisories.":
              alertResult.notice||"No confirmed threshold alert."}
            </Text>
          </View>:null}
        </Card>
      </>:null}
      <Text style={styles.footer}>Winter Smog Assistant · Preview. Community sessions live in device secure storage.
        Voice answers use device text-to-speech; speech input relies on the keyboard microphone.
        Regional UI labels require native-speaker review before a final public release.
        Do not use this application for emergency decisions.</Text>
    </ScrollView>
  </SafeAreaView>;
}

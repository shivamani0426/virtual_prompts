import {useEffect,useState} from "react";
import type {ReactNode} from "react";
import {Alert,Linking,Pressable,ScrollView,StatusBar,Text,TextInput,View,useWindowDimensions} from "react-native";
import {SafeAreaProvider,SafeAreaView} from "react-native-safe-area-context";
import {getLocales} from "expo-localization";
import * as SecureStore from "expo-secure-store";
import * as Speech from "expo-speech";
import * as Location from "expo-location";
import {styles} from "./src/styles";
import {selectEnglishVoice} from "./src/voice";
import {approximateCoordinates,placeLabel} from "./src/places";
import type {Place} from "./src/places";
import {LANGUAGES,chooseLocale,translate} from "./src/i18n";
import type {Locale} from "./src/i18n";
import {CITIES,REPORT_TYPES,ask,community,getAir,officialURL,searchCities} from "./src/api";
import type {Air,Assistant,Challenge,Report,ReportType,AlertStatus,AlertPref} from "./src/api";

type Tab="home"|"assistant"|"community"|"challenges"|"alerts";
const TABS:Tab[]=["home","assistant","community","challenges","alerts"];
const LOCALE_KEY="winter-smog-mobile-locale-v1";
const failure=(error:unknown)=>error instanceof Error?error.message:"Service temporarily unavailable.";
const INITIAL_AIR_PLACE:Place={name:"Bengaluru",admin1:"Karnataka",country:"India",
  latitude:CITIES.Bengaluru.lat,longitude:CITIES.Bengaluru.lon};
function locationWithTimeout<T>(promise:Promise<T>,ms=15000):Promise<T>{
  return new Promise<T>((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error("Location timed out. Search for a city instead.")),ms);
    void promise.then(
      value=>{clearTimeout(timer);resolve(value);},
      error=>{clearTimeout(timer);reject(error);}
    );
  });
}
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
function ChoiceRow({options,value,onChange,wrap=false}:{
  options:{value:string;label:string}[];value:string;onChange:(value:string)=>void;wrap?:boolean;
}){
  const choices=options.map(c=><Pressable key={c.value} accessibilityRole="button"
    accessibilityState={{selected:value===c.value}}
    accessibilityLabel={c.label}
    onPress={()=>onChange(c.value)}
    style={[styles.chip,value===c.value&&styles.selectedChip]}>
    <Text style={[styles.chipText,value===c.value&&styles.selectedChipText]}>{c.label}</Text>
  </Pressable>);
  return wrap?<View style={styles.chipsWrap}>{choices}</View>:
    <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}>{choices}</ScrollView>;
}

export default function App(){
  const {width}=useWindowDimensions();
  const compact=width<480;
  const [locale,setLocale]=useState<Locale>(chooseLocale(getLocales()[0]?.languageCode));
  const [tab,setTab]=useState<Tab>("home");
  // Community reporting still uses moderated preset cities; AQI can use any geocoded town.
  const [city,setCity]=useState("Bengaluru");
  const [airPlace,setAirPlace]=useState<Place>(INITIAL_AIR_PLACE);
  const [cityQuery,setCityQuery]=useState("");
  const [cityMatches,setCityMatches]=useState<Place[]>([]);
  const [citySearchError,setCitySearchError]=useState("");
  const [citySearching,setCitySearching]=useState(false);
  const [locating,setLocating]=useState(false);
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
  const [speaking,setSpeaking]=useState(false);
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
  async function refreshAir(){
    await run(()=>getAir(airPlace),setAir);
  }
  useEffect(()=>{
    let active=true;
    setAir(null);
    setError("");
    setBusy(true);
    void getAir(airPlace).then(data=>{if(active)setAir(data);})
      .catch(e=>{if(active)setError(failure(e));})
      .finally(()=>{if(active)setBusy(false);});
    return()=>{active=false;};
  },[airPlace]);
  async function findCity(){
    setCityMatches([]);
    setCitySearchError("");
    setCitySearching(true);
    try{
      const found=await searchCities(cityQuery);
      setCityMatches(found);
      if(!found.length)setCitySearchError(tr("noMatches"));
    }catch(e){setCitySearchError(failure(e));}
    finally{setCitySearching(false);}
  }
  function selectAirPlace(place:Place){
    setAirPlace(place);
    setCityQuery("");
    setCityMatches([]);
    setCitySearchError("");
  }
  async function useMyLocation(){
    setLocating(true);
    setNotice("");
    try{
      // Never prompt for location on app launch; only after this button is tapped.
      const permission=await Location.requestForegroundPermissionsAsync();
      if(!permission.granted){
        setNotice(tr("locationDenied"));
        return;
      }
      if(!await Location.hasServicesEnabledAsync()){
        setNotice(tr("locationUnavailable"));
        return;
      }
      const position=await locationWithTimeout(
        Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced})
      );
      const coords=approximateCoordinates(position.coords.latitude,position.coords.longitude);
      // Reverse geocoding is best-effort. AQI works from the rounded coordinates alone.
      const addresses=await locationWithTimeout(
        Location.reverseGeocodeAsync(coords).catch(()=>[]),5000
      ).catch(()=>[]);
      const address=addresses[0];
      const locality=address?.city||address?.subregion||address?.region;
      selectAirPlace({name:locality||tr("nearMe"),...coords});
      setNotice(tr("locationApproximate"));
    }catch(e){
      setNotice(failure(e));
    }finally{setLocating(false);}
  }
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
    await stopReading();
    await run(()=>ask(question),result=>{
      setAnswer(result);setQuestion("");
    });
  }
  async function stopReading(){
    try{await Speech.stop();}
    catch{setNotice("Could not stop speech playback on this device.");}
    finally{setSpeaking(false);}
  }
  useEffect(()=>()=>{void Speech.stop();},[]);
  useEffect(()=>{
    if(tab!=="assistant"){void Speech.stop();setSpeaking(false);}
  },[tab]);
  async function readAnswer(){
    if(!answer?.answer)return;
    if(speaking){await stopReading();return;}
    try{
      await Speech.stop();
      const voices=await Speech.getAvailableVoicesAsync();
      const selected=selectEnglishVoice(voices);
      if(voices.length>0&&!selected){
        setNotice("No English text-to-speech voice is installed. Enable an English voice in Android speech settings.");
        return;
      }
      if(voices.length===0)setNotice("Voice availability could not be verified. Device speech settings may be needed.");
      Speech.speak(answer.answer.slice(0,1800),{
        language:selected?.language||"en-IN",
        ...(selected?{voice:selected.identifier}:{}),
        rate:.92,
        onDone:()=>setSpeaking(false),
        onStopped:()=>setSpeaking(false),
        onError:()=>{setSpeaking(false);setNotice("Speech playback failed. Read the answer on screen.");},
      });
      setSpeaking(true);
    }catch{
      setSpeaking(false);setNotice("Speech playback is unavailable. Read the answer on screen.");
    }
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
  return <SafeAreaProvider><SafeAreaView style={styles.root} edges={["top","bottom","left","right"]}>
    <StatusBar barStyle="dark-content"/>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={styles.hero}>
        <Text style={styles.brand}>WINTER SMOG ASSISTANT</Text>
        <Text style={[styles.title,compact&&styles.titleCompact]}>A clearer day starts here.</Text>
        <Text style={styles.heroSub}>{tr("aqiNotice")} WHO/CPCB-backed education, no guaranteed safe outdoor period.</Text>
      </View>
      <Text style={styles.label}>{tr("language")}</Text>
      <ChoiceRow value={locale} onChange={changeLocale}
        options={Object.entries(LANGUAGES).map(([value,info])=>({value,label:info.label}))}/>
      <ChoiceRow value={tab} onChange={value=>setTab(value as Tab)} wrap={compact}
        options={TABS.map(value=>({value,label:tr(value)}))}/>
      {error?<View style={styles.caution}><Text accessibilityRole="alert" style={styles.warningText}>{error}</Text></View>:null}
      {notice?<View style={styles.status}><Text style={styles.statusText}>{notice}</Text></View>:null}

      {tab==="home"?<>
        <Text style={styles.sectionTitle}>{tr("home")}</Text>
        <Text style={styles.label}>{tr("city")}</Text>
        <Info text={tr("showing")+": "+placeLabel(airPlace)}/>
        <TextInput style={styles.input} maxLength={80} value={cityQuery}
          onChangeText={value=>{setCityQuery(value);setCityMatches([]);setCitySearchError("");}}
          placeholder={tr("searchHint")} accessibilityLabel={tr("searchHint")}
          autoCapitalize="words" autoCorrect={false} returnKeyType="search"
          onSubmitEditing={()=>{if(cityQuery.trim().length>=2)void findCity();}}/>
        <Action label={citySearching?"Searching…":tr("searchCity")} secondary
          onPress={()=>void findCity()} disabled={citySearching||locating||cityQuery.trim().length<2}/>
        <Action label={locating?"Locating…":tr("useLocation")} secondary
          onPress={()=>void useMyLocation()} disabled={citySearching||locating}/>
        {citySearchError?<Text accessibilityRole="alert" style={styles.warningText}>{citySearchError}</Text>:null}
        {cityMatches.map((place,index)=><Pressable key={place.name+":"+place.latitude+":"+place.longitude+":"+index}
          accessibilityRole="button" accessibilityLabel={placeLabel(place)}
          onPress={()=>selectAirPlace(place)} style={styles.searchResult}>
          <Text style={styles.text}>{placeLabel(place)}</Text>
        </Pressable>)}
        <Card title={placeLabel(airPlace)+" · modelled US AQI"}>
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
          <Info text="Speech reads English source evidence, not translated medical advice."/>
          <Action label={speaking?"Stop reading":tr("speak")} onPress={()=>void readAnswer()} secondary/>
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
  </SafeAreaView></SafeAreaProvider>;
}

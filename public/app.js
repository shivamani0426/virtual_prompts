/* ClearSkies AI - browser-only profile storage; no third-party client trackers. */
(function(){
  "use strict";
  const $=(id)=>document.getElementById(id);
  const defaults={people:[],commute:"public",home:"none"};
  let profile=defaults,reading=null,place={label:"Delhi, India",lat:28.6139,lon:77.2090},example=true,requestId=0;
  function load(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}}
  function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
  const stored=load("clearskies-profile",defaults);
  if(stored&&typeof stored==="object"){
    profile={people:Array.isArray(stored.people)?stored.people.filter(x=>["children","older","respiratory"].includes(x)):[],commute:["public","car","bike","walk","home"].includes(stored.commute)?stored.commute:"public",home:stored.home==="hepa"?"hepa":"none"};
  }
  const storedPlace=load("clearskies-place",null);
  if(storedPlace&&typeof storedPlace.lat==="number"&&typeof storedPlace.lon==="number"&&typeof storedPlace.label==="string"){place=storedPlace;example=false;}
  function text(id,value){$(id).textContent=value;}
  function notice(message){const n=$("global-message");n.textContent=message;n.hidden=!message;}
  function num(v,digits){return typeof v==="number"&&Number.isFinite(v)?v.toFixed(digits||0):"—";}
  function aqiClass(v){if(v===null||!Number.isFinite(v))return ["Unavailable","unknown","Air-quality data is unavailable. Check your local official source."];if(v<=50)return ["Good","good","Air quality is generally satisfactory."];if(v<=100)return ["Moderate","moderate","Sensitive people may want to limit heavy outdoor activity."];if(v<=150)return ["Unhealthy for sensitive groups","sensitive","Sensitive groups should reduce prolonged outdoor exertion."];if(v<=200)return ["Unhealthy","unhealthy","Everyone should reduce outdoor exertion."];if(v<=300)return ["Very unhealthy","severe","Avoid outdoor exertion where possible."];return ["Hazardous","hazardous","Avoid outdoor activity and follow official alerts."];}
  function syncPlace(){const node=$("current-city");node.textContent=place.label+" ";if(example){const tag=document.createElement("span");tag.className="sample-pill";tag.textContent="Example";node.append(tag);}}
  async function api(path,options){const response=await fetch(path,options);let data;try{data=await response.json();}catch{throw new Error("Service returned an invalid response.");}if(!response.ok)throw new Error(data.error||"Service unavailable");return data;}
  function setupProfile(){
    document.querySelectorAll('input[name="people"]').forEach(el=>{el.checked=profile.people.includes(el.value);el.addEventListener("change",updateProfile);});
    $("commute").value=profile.commute;$("home-filter").value=profile.home;
    $("commute").addEventListener("change",updateProfile);$("home-filter").addEventListener("change",updateProfile);
    $("refresh-plan").addEventListener("click",()=>{updateProfile();document.querySelector(".plan-heading").scrollIntoView({behavior:"smooth",block:"center"});});
  }
  function updateProfile(){
    profile={people:[...document.querySelectorAll('input[name="people"]:checked')].map(x=>x.value),commute:$("commute").value,home:$("home-filter").value};
    save("clearskies-profile",profile);renderPlan();
  }
  function advice(){
    const aqi=reading&&reading.current?reading.current.aqi:null,bad=aqi!==null&&aqi>100,veryBad=aqi!==null&&aqi>150;
    const sensitive=profile.people.length>0;
    const list=[
      {icon:"🏡",title:veryBad?"Create a cleaner indoor space":"Make your home air-friendlier",detail:"Limit windows opening during high outdoor pollution. Avoid smoking, incense, candles and other indoor combustion."+(profile.home==="hepa"?" Run your appropriately sized HEPA purifier as recommended.":" If available, a correctly sized HEPA purifier can help remove particles."),impact:"Can lower indoor particle sources and exposure; results depend on your home and filtration."},
      {icon:"🌤️",title:bad?"Bring the workout indoors":"Pick the lower-pollution hours",detail:bad?"Skip intense outdoor exercise while levels are high. Do indoor activities and check forecasts before essential trips.":"Plan errands and exercise when the hourly air forecast is lower, and check conditions before leaving.",impact:"Can reduce breathing polluted outdoor air. It does not directly reduce city emissions."},
      {icon:"🚌",title:"Rethink one journey",detail:profile.commute==="car"?"Avoid engine idling, combine stops and share car trips where feasible.":profile.commute==="walk"?"Prefer less-trafficked routes when conditions allow; use indoor alternatives if air is unhealthy.":"Choose shared transport, combine errands or work remotely where practical.",impact:"Reducing unnecessary vehicle travel can lower transport emissions; savings depend on each journey."},
      {icon:"🍳",title:"Cook with cleaner air in mind",detail:"Use an exhaust vented outdoors where available. Consider induction/electric cooking and avoid burning waste or other materials.",impact:"Can reduce pollutants produced indoors and from fuel combustion; actual results vary."}
    ];
    if(sensitive)list.unshift({icon:"💚",title:"Take extra care of loved ones",detail:"Children, older adults, and anyone with breathing sensitivities may need shorter necessary outings. Use individual care plans and professional advice.",impact:"Prioritizes exposure reduction and protection; no health outcome is guaranteed."});
    return list;
  }
  function renderPlan(){
    const items=advice(),root=$("plan-cards");root.replaceChildren();text("plan-status",items.length+" suggestions");
    items.forEach(item=>{const card=document.createElement("article");card.className="plan-card";
      const icon=document.createElement("span");icon.className="plan-ico";icon.textContent=item.icon;
      const body=document.createElement("div");const title=document.createElement("h3");title.textContent=item.title;const p=document.createElement("p");p.textContent=item.detail;
      const impact=document.createElement("div");impact.className="plan-impact";const bold=document.createElement("b");bold.textContent="Why it helps: ";impact.append(bold,document.createTextNode(item.impact));body.append(title,p,impact);card.append(icon,body);root.append(card);});
  }
  function renderForecast(items){
    const root=$("forecast-graph");root.replaceChildren();
    const entries=Array.isArray(items)?items.slice(0,12).filter(x=>typeof x.aqi==="number"):[];
    if(!entries.length){const p=document.createElement("p");p.className="empty-graph";p.textContent="Hourly forecast unavailable";root.append(p);return;}
    const max=Math.max(120,...entries.map(x=>x.aqi));
    entries.forEach(entry=>{const col=document.createElement("div");col.className="graph-col";col.title="US AQI "+Math.round(entry.aqi)+" at "+entry.time;
      const wrap=document.createElement("div");wrap.className="graph-bar-wrap";
      const bar=document.createElement("div");bar.className="graph-bar"+(entry.aqi>100?" high":"");bar.style.height=Math.max(7,entry.aqi/max*100)+"%";
      const label=document.createElement("div");label.className="graph-hour";const hour=entry.time.split("T")[1]||"";label.textContent=hour.slice(0,2)+":00";
      wrap.append(bar);col.append(wrap,label);root.append(col);});
  }
  async function loadAir(){
    const current=++requestId;notice("");
    text("aqi-number","—");text("aqi-label","Loading air quality");text("aqi-message","Checking the modelled air-quality forecast.");text("source-tag","● Connecting");text("aqi-time","Checking forecast...");
    reading=null;["pm25","pm10","no2","ozone"].forEach(x=>text(x,"—"));renderPlan();renderForecast([]);
    try{
      const result=await api("/api/air?lat="+encodeURIComponent(place.lat)+"&lon="+encodeURIComponent(place.lon));
      if(current!==requestId)return;
      reading=result;
      const v=result.current.aqi,cls=aqiClass(v);
      text("aqi-number",v===null?"—":Math.round(v));text("aqi-label",cls[0]);text("aqi-message",cls[2]);
      text("source-tag","● Modelled forecast");text("pm25",num(result.current.pm25,1));text("pm10",num(result.current.pm10,1));text("no2",num(result.current.no2,1));text("ozone",num(result.current.ozone,1));
      text("aqi-time",result.updated?"Updated "+result.updated.replace("T"," ")+" (local)":"Time unavailable");
      $("aqi-pointer").style.left=(v===null?0:Math.min(99,Math.max(0,v/500*100)))+"%";
      renderForecast(result.forecast);renderPlan();
    }catch(e){if(current!==requestId)return;text("aqi-label","Data unavailable");text("aqi-message","We couldn't retrieve the forecast. No values are being guessed.");text("source-tag","● Unavailable");notice(e.message);renderForecast([]);renderPlan();}
  }
  function chooseCity(item){
    place={label:item.name+(item.admin1?", "+item.admin1:"")+(item.country?", "+item.country:""),lat:item.latitude,lon:item.longitude};
    example=false;save("clearskies-place",place);syncPlace();$("city-results").hidden=true;$("city-search").value="";loadAir();
  }
  async function searchCity(){
    const q=$("city-search").value.trim();if(q.length<2){notice("Please enter at least two characters to search for a city.");return;}
    const root=$("city-results");root.hidden=false;root.replaceChildren();const load=document.createElement("div");load.style.padding="12px";load.textContent="Searching cities...";root.append(load);
    try{const result=await api("/api/places?q="+encodeURIComponent(q));root.replaceChildren();
      if(!result.results.length){const p=document.createElement("div");p.style.padding="12px";p.textContent="No cities found. Try another spelling.";root.append(p);return;}
      result.results.forEach(city=>{const button=document.createElement("button");button.type="button";button.setAttribute("role","option");button.textContent=city.name+(city.admin1?", "+city.admin1:"")+(city.country?", "+city.country:"");button.addEventListener("click",()=>chooseCity(city));root.append(button);});
    }catch(e){root.hidden=true;notice(e.message);}
  }
  function setupLocation(){
    $("find-city").addEventListener("click",searchCity);$("city-search").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();searchCity();}if(e.key==="Escape")$("city-results").hidden=true;});
    document.addEventListener("click",e=>{if(!e.target.closest(".search-wrap"))$("city-results").hidden=true;});
    $("use-location").addEventListener("click",()=>{if(!navigator.geolocation){notice("Your browser doesn't support location access.");return;}
      notice("Asking your browser for permission to use your location...");
      navigator.geolocation.getCurrentPosition(pos=>{place={label:"Your approximate location",lat:Number(pos.coords.latitude.toFixed(2)),lon:Number(pos.coords.longitude.toFixed(2))};example=false;save("clearskies-place",place);syncPlace();loadAir();},
      ()=>notice("Location permission wasn't granted. Search by city instead."),{enableHighAccuracy:false,timeout:10000,maximumAge:600000});});
  }
  function setupImpact(){
    const saved=load("clearskies-habits",{});const checks=[...document.querySelectorAll("[data-habit]")];
    checks.forEach(check=>{check.checked=Boolean(saved[check.dataset.habit]);check.addEventListener("change",()=>{const state={};checks.forEach(c=>state[c.dataset.habit]=c.checked);save("clearskies-habits",state);renderImpact();});});
    function renderImpact(){const count=checks.filter(x=>x.checked).length;text("impact-count",count+" / "+checks.length);$("impact-fill").style.width=(count/checks.length*100)+"%";}
    renderImpact();
  }
  function appendChat(role,message){
    const root=$("chat-messages"),item=document.createElement("div");item.className="chat-msg "+role;
    if(role==="bot"){const icon=document.createElement("span");icon.className="message-icon";icon.textContent="✳";item.append(icon);}
    const p=document.createElement("p");p.textContent=message;item.append(p);root.append(item);root.scrollTop=root.scrollHeight;return p;
  }
  async function askAI(question){
    appendChat("user",question);const reply=appendChat("bot","Thinking through a practical plan for you…");const send=$("chat-send");send.disabled=true;text("ai-mode","Thinking...");
    try{
      const result=await api("/api/assist",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({question,location:place.label,aqi:reading?reading.current.aqi:null,profile})});
      reply.textContent=result.answer;
      text("ai-mode",result.mode==="ai"?"✦ AI response":"Guided fallback");
    }catch(e){reply.textContent="Sorry, I couldn't reach the assistant right now. Try again shortly. "+e.message;text("ai-mode","Unavailable");}
    finally{send.disabled=false;$("chat-input").focus();}
  }
  function setupChat(){
    $("chat-form").addEventListener("submit",e=>{e.preventDefault();const input=$("chat-input"),question=input.value.trim();if(question.length<3)return;input.value="";askAI(question);});
    document.querySelectorAll(".prompt-chip").forEach(button=>button.addEventListener("click",()=>askAI(button.textContent)));
  }
  setupProfile();setupImpact();setupLocation();setupChat();syncPlace();renderPlan();loadAir();
})();
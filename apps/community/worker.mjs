/**
 * Winter Smog Assistant community API, isolated D1 datastore.
 *
 * Every report remains pending until a GitHub-authorized moderator approves it.
 * Challenge achievements are explicitly self-reported. Alerts are advisory
 * modelled US AQI and are checked in the foreground, never official CPCB.
 */
const FRONTEND = "https://winter-smog-web.1nc24cs197.workers.dev";
const CATEGORIES = new Set(["garbage_burning", "construction_dust", "traffic_smoke", "other"]);
const CITIES = {
  Bengaluru: [12.97, 77.59],
  Delhi: [28.61, 77.21],
  Mumbai: [19.08, 72.88],
  Hyderabad: [17.39, 78.49],
  Chennai: [13.08, 80.27],
  Pune: [18.52, 73.86],
  Kolkata: [22.57, 88.36],
  "Chikkaballapur": [13.43, 77.73],
};
const CHALLENGES = [
  { id: "smoke-free-home", title: "Smoke-free home week", description: "Practice one smoke-reduction habit on three different days.", category: "indoor", target_days: 3 },
  { id: "thoughtful-travel", title: "Thoughtful travel", description: "Record a practical shared, combined, or avoided trip on three separate days.", category: "commute", target_days: 3 },
  { id: "less-idling", title: "Less engine idling", description: "Notice and avoid unnecessary engine idling on five different days.", category: "transport", target_days: 5 },
];
const MAX_BODY = 1800;
function cors(origin) {
  const isAllowed = origin === FRONTEND || origin === "http://localhost:5173";
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer", "X-Frame-Options": "DENY",
    "Vary": "Origin",
    ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Max-Age": "600",
  };
}
function respond(data, status, headers) {
  return new Response(JSON.stringify(data), {status, headers});
}
function validationError(message, headers) { return respond({ error: message }, 422, headers); }
function isoNow() { return new Date().toISOString(); }
function today() { return new Date().toISOString().slice(0, 10); }
async function digest(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function cleanText(value, min, max) {
  if (typeof value !== "string" || value.length > max || value.trim().length < min) return null;
  const result = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (result.length < min || result.length > max) return null;
  // No personal contacts, links, exact addresses, phone numbers, html, doxxing.
  if (/(https?:\/\/|www\.|@|[<>]|\+?\d[\d -]{8,}\d)/i.test(result)) return null;
  return result;
}
async function parseBody(request, headers) {
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY) return null;
  let raw;
  try { raw = await request.text(); } catch { return null; }
  if (raw.length > MAX_BODY) return null;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch { return null; }
}
async function authorize(request, db) {
  const auth = request.headers.get("Authorization") || "";
  if (!/^Bearer [a-f0-9]{64}$/.test(auth)) return null;
  const hash = await digest(auth.slice(7));
  const row = await db.prepare("SELECT id, expires_at FROM community_sessions WHERE token_hash=?").bind(hash).first();
  if (!row || row.expires_at < isoNow()) return null;
  return row.id;
}
async function throttle(db, identity, action, max, periodMinutes) {
  const until = new Date(Date.now() - periodMinutes * 60_000).toISOString();
  const count = await db.prepare("SELECT COUNT(*) AS n FROM community_events WHERE session_id=? AND action=? AND created_at>=?")
    .bind(identity, action, until).first();
  if (Number(count.n) >= max) return false;
  await db.prepare("INSERT INTO community_events(id,session_id,action,created_at) VALUES(?,?,?,?)")
    .bind(crypto.randomUUID(), identity, action, isoNow()).run();
  return true;
}
async function createSession(db) {
  const token = randomToken(), id = crypto.randomUUID();
  const now = isoNow();
  const expires = new Date(Date.now() + 30 * 86_400_000).toISOString();
  await db.prepare("INSERT INTO community_sessions(id,token_hash,created_at,expires_at) VALUES(?,?,?,?)")
    .bind(id, await digest(token), now, expires).run();
  return { token, expires_at: expires, notice: "Pseudonymous browser session. No account recovery or cross-device sync." };
}
async function makeReport(db, identity, body, headers) {
  const city = body.city;
  const category = body.category;
  const description = cleanText(body.description, 25, 500);
  if (!Object.hasOwn(CITIES, city) || !CATEGORIES.has(category) || !description)
    return validationError("Choose a supported city, category and non-identifying description (25–500 characters).", headers);
  if (!await throttle(db, identity, "report", 3, 1440))
    return respond({error:"Daily report limit reached (3)."}, 429, headers);
  const id = crypto.randomUUID(), now = isoNow();
  await db.prepare("INSERT INTO community_reports(id,session_id,city,category,description,status,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?)")
    .bind(id, identity, city, category, description, "pending", now, new Date(Date.now() + 14 * 86_400_000).toISOString()).run();
  return respond({id,status:"pending",city,category,created_at:now,notice:"Your report is pending human review. It is not an official pollution reading."}, 201, headers);
}
async function fetchAqi(city) {
  if (!Object.hasOwn(CITIES, city)) return null;
  const [lat, lon] = CITIES[city];
  const url = new URL("https://winter-smog-fastapi.onrender.com/api/v1/air-quality");
  url.searchParams.set("lat", String(lat)); url.searchParams.set("lon", String(lon));
  try {
    const response = await fetch(url, {signal:AbortSignal.timeout(12000)});
    if (!response.ok) return null;
    const data = await response.json();
    if (data.aqi_scale !== "US_AQI" || data.official_cpcb_aqi !== false ||
        !Number.isFinite(data.current?.us_aqi)) return null;
    return {aqi: data.current.us_aqi, freshness: data.freshness, fetched_at: data.fetched_at,
      observed_at: data.observed_at, modelled: true, scale: "US_AQI",
      note:"Modelled US AQI, not official CPCB data. Do not interpret this as a health guarantee."};
  } catch { return null; }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url), path = url.pathname, headers = cors(request.headers.get("Origin"));
    if (request.method === "OPTIONS") return new Response(null, {status:204,headers});
    if (!env.DB) return respond({error:"Community database unavailable"},503,headers);
    if (path === "/health" && request.method === "GET") {
      try { await env.DB.prepare("SELECT 1 AS ok").first(); return respond({ok:true,storage:"D1",service:"Winter Smog community"},200,headers); }
      catch { return respond({ok:false,storage:"unavailable"},503,headers); }
    }
    try {
      if (path === "/cities" && request.method === "GET")
        return respond({cities:Object.keys(CITIES)},200,headers);
      if (path === "/challenges" && request.method === "GET")
        return respond({challenges:CHALLENGES,notice:"Participation is self-reported, not independently verified."},200,headers);
      if (path === "/reports" && request.method === "GET") {
        const city = url.searchParams.get("city");
        if (!Object.hasOwn(CITIES, city)) return validationError("Unsupported city",headers);
        const result = await env.DB.prepare("SELECT id,city,category,description,created_at FROM community_reports WHERE city=? AND status='approved' AND expires_at>? ORDER BY created_at DESC LIMIT 30")
          .bind(city,isoNow()).all();
        return respond({reports:result.results,notice:"Community reports are reviewed submissions, not verified sensor measurements or official complaints."},200,headers);
      }
      if (path === "/session" && request.method === "POST") {
        if (request.headers.get("Origin") && !("Access-Control-Allow-Origin" in headers)) return respond({error:"Origin forbidden"},403,headers);
        if(!env.SESSION_LIMIT)return respond({error:"Missing anti-abuse protection"},503,headers);
        const limited=await env.SESSION_LIMIT.limit({key:request.headers.get("CF-Connecting-IP")||"unknown"});
        if(!limited.success)return respond({error:"Session limit reached. Please try later."},429,headers);
        return respond(await createSession(env.DB),201,headers);
      }
      const sessionId = await authorize(request,env.DB);
      if (!sessionId) return respond({error:"Start or renew your community session."},401,headers);
      if (path === "/reports" && request.method === "POST") {
        if(!env.REPORT_LIMIT)return respond({error:"Missing anti-abuse protection"},503,headers);
        const limited=await env.REPORT_LIMIT.limit({key:request.headers.get("CF-Connecting-IP")||"unknown"});
        if(!limited.success)return respond({error:"Report submission limit reached."},429,headers);
        const body = await parseBody(request,headers);
        if (!body) return validationError("Invalid or oversized report.",headers);
        return makeReport(env.DB,sessionId,body,headers);
      }
      if (path === "/my/reports" && request.method === "GET") {
        const results = await env.DB.prepare("SELECT id,city,category,description,status,created_at FROM community_reports WHERE session_id=? ORDER BY created_at DESC LIMIT 30")
          .bind(sessionId).all();
        return respond({reports:results.results},200,headers);
      }
      if (path.startsWith("/my/reports/") && request.method === "DELETE") {
        const id = path.slice("/my/reports/".length);
        if (!/^[a-f0-9-]{36}$/.test(id)) return validationError("Invalid report id",headers);
        const result = await env.DB.prepare("UPDATE community_reports SET status='deleted' WHERE id=? AND session_id=? AND status IN ('pending','approved','rejected')")
          .bind(id,sessionId).run();
        return respond({deleted:result.meta.changes === 1},200,headers);
      }
      if (path.startsWith("/challenges/") && path.endsWith("/join") && request.method === "POST") {
        const id = path.split("/")[2], challenge = CHALLENGES.find((x) => x.id === id);
        if (!challenge) return respond({error:"Challenge not found"},404,headers);
        await env.DB.prepare("INSERT OR IGNORE INTO challenge_members(session_id,challenge_id,joined_at) VALUES(?,?,?)")
          .bind(sessionId,id,isoNow()).run();
        return respond({joined:true,challenge_id:id},200,headers);
      }
      if (path.startsWith("/challenges/") && path.endsWith("/checkin") && request.method === "POST") {
        const id = path.split("/")[2], challenge = CHALLENGES.find((x) => x.id === id);
        if (!challenge) return respond({error:"Challenge not found"},404,headers);
        const member=await env.DB.prepare("SELECT 1 AS ok FROM challenge_members WHERE session_id=? AND challenge_id=?")
          .bind(sessionId,id).first();
        if (!member) return respond({error:"Join the challenge first"},403,headers);
        const day=today();
        await env.DB.prepare("INSERT OR IGNORE INTO challenge_checkins(session_id,challenge_id,day) VALUES(?,?,?)")
          .bind(sessionId,id,day).run();
        const result=await env.DB.prepare("SELECT COUNT(*) AS days FROM challenge_checkins WHERE session_id=? AND challenge_id=?")
          .bind(sessionId,id).first();
        return respond({challenge_id:id,completed_days:Math.min(Number(result.days),challenge.target_days),target_days:challenge.target_days,completed:Number(result.days)>=challenge.target_days,self_reported:true},200,headers);
      }
      if (path === "/my/challenges" && request.method === "GET") {
        const r=await env.DB.prepare("SELECT m.challenge_id,COUNT(c.day) AS completed_days FROM challenge_members m LEFT JOIN challenge_checkins c ON c.session_id=m.session_id AND c.challenge_id=m.challenge_id WHERE m.session_id=? GROUP BY m.challenge_id")
          .bind(sessionId).all();
        return respond({progress:r.results},200,headers);
      }
      if (path === "/alerts/preferences" && request.method === "GET") {
        const row=await env.DB.prepare("SELECT city,threshold,enabled,updated_at FROM alert_preferences WHERE session_id=?")
          .bind(sessionId).first();
        return respond({preferences:row||{city:"Bengaluru",threshold:150,enabled:0}},200,headers);
      }
      if (path === "/alerts/preferences" && request.method === "POST") {
        const body=await parseBody(request,headers);
        if (!body || !Object.hasOwn(CITIES,body.city) || !Number.isInteger(body.threshold) ||
            body.threshold<51 || body.threshold>400 || typeof body.enabled!=="boolean")
          return validationError("Supported city, numeric US AQI threshold 51–400 and explicit enabled toggle required.",headers);
        await env.DB.prepare("INSERT INTO alert_preferences(session_id,city,threshold,enabled,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(session_id) DO UPDATE SET city=excluded.city,threshold=excluded.threshold,enabled=excluded.enabled,updated_at=excluded.updated_at")
          .bind(sessionId,body.city,body.threshold,body.enabled?1:0,isoNow()).run();
        return respond({saved:true},200,headers);
      }
      if (path === "/alerts/check" && request.method === "GET") {
        const pref=await env.DB.prepare("SELECT city,threshold,enabled FROM alert_preferences WHERE session_id=?")
          .bind(sessionId).first();
        if (!pref || !pref.enabled) return respond({enabled:false,triggered:false,notice:"Alerts are opt-in."},200,headers);
        if (!await throttle(env.DB,sessionId,"alert-check",12,60))
          return respond({error:"Too many alert checks"},429,headers);
        const snapshot=await fetchAqi(pref.city);
        if (!snapshot || snapshot.freshness==="stale") return respond({enabled:true,triggered:false,available:false,notice:"Fresh modelled AQI unavailable; no alert decision made."},200,headers);
        return respond({enabled:true,available:true,triggered:snapshot.aqi>=pref.threshold,city:pref.city,threshold:pref.threshold,snapshot,notice:"Advisory only; modelled US AQI and not an official CPCB alert."},200,headers);
      }
      return respond({error:"Not found"},404,headers);
    } catch (error) {
      // No SQL, authentication header or private details in public errors.
      console.error("community request failure", String(error?.name||"error"));
      return respond({error:"Community service unavailable. Try later."},503,headers);
    }
  },
};

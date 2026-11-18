/** Minimal-data retention plan. Parameters are supplied at execution time. */
export function retentionStatements(now=new Date()){
  const nowIso=now.toISOString();
  const eventsBefore=new Date(now.getTime()-48*60*60*1000).toISOString();
  return [
    {sql:"DELETE FROM community_reports WHERE expires_at <= ? OR session_id IN (SELECT id FROM community_sessions WHERE expires_at <= ?)",params:[nowIso,nowIso]},
    {sql:"DELETE FROM challenge_checkins WHERE session_id IN (SELECT id FROM community_sessions WHERE expires_at <= ?)",params:[nowIso]},
    {sql:"DELETE FROM challenge_members WHERE session_id IN (SELECT id FROM community_sessions WHERE expires_at <= ?)",params:[nowIso]},
    {sql:"DELETE FROM alert_preferences WHERE session_id IN (SELECT id FROM community_sessions WHERE expires_at <= ?)",params:[nowIso]},
    {sql:"DELETE FROM community_events WHERE created_at <= ? OR session_id IN (SELECT id FROM community_sessions WHERE expires_at <= ?)",params:[eventsBefore,nowIso]},
    {sql:"DELETE FROM community_sessions WHERE expires_at <= ?",params:[nowIso]},
  ];
}

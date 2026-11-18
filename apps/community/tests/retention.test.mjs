import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {retentionStatements} from "../retention.mjs";
test("Community data-retention SQL removes expired private records but preserves active sessions",()=>{
  const db=new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../schema.sql",import.meta.url),"utf8"));
  const insert=(sql,...args)=>db.prepare(sql).run(...args);
  insert("INSERT INTO community_sessions VALUES(?,?,?,?)","expired","h1","2026-01-01T00:00:00Z","2026-02-01T00:00:00Z");
  insert("INSERT INTO community_sessions VALUES(?,?,?,?)","current","h2","2026-11-18T00:00:00Z","2026-12-18T00:00:00Z");
  for(const owner of ["expired","current"]){
    insert("INSERT INTO community_reports VALUES(?,?,?,?,?,?,?,?)",owner,owner,"Bengaluru","other",
      "A general non-identifying report with enough words.", "pending","2026-11-18T00:00:00Z",
      owner==="expired"?"2026-11-20T00:00:00Z":"2026-12-01T00:00:00Z");
    insert("INSERT INTO challenge_members VALUES(?,?,?)",owner,"smoke-free-home","2026-11-18T00:00:00Z");
    insert("INSERT INTO challenge_checkins VALUES(?,?,?)",owner,"smoke-free-home","2026-11-18");
    insert("INSERT INTO alert_preferences VALUES(?,?,?,?,?)",owner,"Bengaluru",150,1,"2026-11-18T00:00:00Z");
    insert("INSERT INTO community_events VALUES(?,?,?,?)",owner,owner,"report","2026-11-18T00:00:00Z");
  }
  for(const item of retentionStatements(new Date("2026-11-19T09:00:00Z"))){
    db.prepare(item.sql).run(...item.params);
  }
  for(const table of ["community_sessions","community_reports","challenge_members",
    "challenge_checkins","alert_preferences","community_events"]){
    const current=db.prepare("SELECT * FROM "+table+" WHERE "+(table==="community_sessions"?"id":"session_id")+"=?").get("current");
    const expired=db.prepare("SELECT * FROM "+table+" WHERE "+(table==="community_sessions"?"id":"session_id")+"=?").get("expired");
    assert.ok(current,"Active data should remain in "+table);
    assert.equal(expired,undefined,"Expired data should be erased from "+table);
  }
  db.close();
});

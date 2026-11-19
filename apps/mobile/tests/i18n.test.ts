import {test} from "node:test";
import assert from "node:assert/strict";
import {LANGUAGES,chooseLocale,translate} from "../src/i18n";

test("All seven language entries and every core interface key resolve",()=>{
  const keys=["home","assistant","community","challenges","alerts","language","city","refresh","ask","askHint","speak","source","report","pending","join","checkIn","enableAlerts","save","check","aqiNotice","privacy","unavailable","threshold","myReports"] as const;
  assert.equal(Object.keys(LANGUAGES).length,7);
  for(const key of Object.keys(LANGUAGES) as Array<keyof typeof LANGUAGES>){
    assert.ok(LANGUAGES[key].label);
    assert.match(LANGUAGES[key].tag,/^[a-z]{2}-IN$/);
    for(const stringKey of keys)assert.ok(translate(key,stringKey).length>0);
  }
});
test("Unknown locales fall back to English, regional locales preserve locale prefix",()=>{
  assert.equal(chooseLocale("kn-IN"),"kn");
  assert.equal(chooseLocale("te"),"te");
  assert.equal(chooseLocale("fr-FR"),"en");
  assert.equal(chooseLocale(""),"en");
});
test("The India CPCB vs US AQI modelled-data disclaimer is never omitted",()=>{
  for(const l of Object.keys(LANGUAGES) as Array<keyof typeof LANGUAGES>){
    assert.match(translate(l,"aqiNotice"),/US AQI|अमेरिकी AQI/);
    assert.match(translate(l,"aqiNotice"),/CPCB/);
  }
});

test("Regional interface keys are translated, not silently replaced by English",()=>{
  const keySet=["home","assistant","city","refresh","ask","askHint","myReports",
    "speak","source","privacy","pending","unavailable"] as const;
  for(const locale of Object.keys(LANGUAGES) as Array<keyof typeof LANGUAGES>){
    if(locale==="en")continue;
    for(const key of keySet){
      const translated=translate(locale,key);
      assert.notEqual(translated,translate("en",key),locale+" missing "+key);
    }
  }
});
test("Every supported locale uses a consistent spoken-input language tag",()=>{
  for(const [locale,entry] of Object.entries(LANGUAGES)){
    assert.equal(entry.tag,locale+"-IN");
    assert.equal(chooseLocale(entry.tag),locale);
  }
});

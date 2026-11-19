import {test} from "node:test";
import assert from "node:assert/strict";
import {selectEnglishVoice} from "../src/voice";

test("English evidence selects an installed en-IN voice before others",()=>{
  const voices=[
    {identifier:"hindi",language:"hi-IN"},
    {identifier:"us",language:"en-US"},
    {identifier:"india",language:"en-IN"},
  ];
  assert.equal(selectEnglishVoice(voices)?.identifier,"india");
});
test("Uses an installed English fallback if en-IN is unavailable",()=>{
  assert.equal(selectEnglishVoice([{identifier:"british",language:"en-GB"}])?.language,"en-GB");
  assert.equal(selectEnglishVoice([{identifier:"underscore",language:"en_US"}])?.identifier,"underscore");
});
test("Never sends reviewed English text to a regional-language voice",()=>{
  assert.equal(selectEnglishVoice([{identifier:"telugu",language:"te-IN"}]),null);
  assert.equal(selectEnglishVoice([]),null);
  assert.equal(selectEnglishVoice([{identifier:"",language:"en-IN"}]),null);
});

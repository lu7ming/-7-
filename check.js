#!/usr/bin/env node
/**
 * 鹿7铭 · 人生工作台 兼容性检查脚本
 * 用法：node check.js
 * 每次改完代码后运行，检测 JS 语法、分区完整性、跨层危险调用
 */

const fs = require("fs");
const vm = require("vm");
const path = require("path");

const FILE = path.join(__dirname, "life.html");
const html = fs.readFileSync(FILE, "utf8");

let errors = 0, warnings = 0, passed = 0;
function err(msg) { console.error("  ❌ " + msg); errors++; }
function warn(msg) { console.warn("  ⚠️  " + msg); warnings++; }
function ok(msg) { console.log("  ✅ " + msg); passed++; }

console.log("🔍 鹿7铭 · 人生工作台 兼容性检查\n");

// 1. JS 语法
console.log("📋 [1/5] JavaScript 语法检查");
const r = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let m, scripts = [];
while ((m = r.exec(html)) !== null) scripts.push(m[1]);
let synErr = 0;
scripts.forEach((s, i) => {
  try { new vm.Script(s); } catch (e) { err(`脚本块${i+1}: ${e.message}`); synErr++; }
});
if (synErr === 0) ok(`全部 ${scripts.length} 个脚本块语法正确`);

// 2. 分区标记
console.log("\n📋 [2/5] 分区标记完整性");
const PART_IDS = [
  "CSS 1.1","CSS 1.2","CSS 1.3","CSS 1.4","CSS 1.5","CSS 1.6","CSS 1.7",
  "JS 3.1","JS 3.2","JS 3.3","JS 3.4","JS 3.5",
  "JS 4.1","JS 4.2","JS 4.3","JS 4.4","JS 4.5","JS 4.6","JS 4.7",
  "JS 5.1","JS 5.2","JS 5.3","JS 5.4","JS 5.5","JS 5.6",
  "JS 6.1","JS 6.2","JS 6.3","JS 6.4",
];
let partMiss = 0;
PART_IDS.forEach(id => {
  if (!html.includes(`[${id}]`)) { err(`分区标记缺失: ${id}`); partMiss++; }
});
if (partMiss === 0) ok(`全部 ${PART_IDS.length} 个分区标记完整`);

// 3. JS 内容分析
console.log("\n📋 [3/5] 函数定义分析");
const jsContent = scripts.join("\n");

// 找分区位置
const partRanges = [];
PART_IDS.forEach(id => {
  const idx = jsContent.indexOf(`[${id}]`);
  if (idx >= 0) partRanges.push({ id, start: idx });
});
partRanges.sort((a, b) => a.start - b.start);
for (let i = 0; i < partRanges.length; i++)
  partRanges[i].end = i + 1 < partRanges.length ? partRanges[i + 1].start : jsContent.length;
function findPart(pos) {
  for (let i = partRanges.length - 1; i >= 0; i--)
    if (pos >= partRanges[i].start) return partRanges[i].id;
  return "未知";
}

// 提取顶层函数定义
const funcDefs = new Map();
// function name / async function name
const funcRe = /(?:^|[\n;{])\s*(?:async\s+)?function\s+(\w+)/gm;
while ((m = funcRe.exec(jsContent)) !== null) {
  const name = m[1]; if (!name || name.length < 3) continue;
  const line = jsContent.slice(0, m.index).split("\n").length;
  funcDefs.set(name, { part: findPart(m.index), line });
}
// const/let/var name = (async) function
const assignRe = /(?:^|\n)\s*(?:let|var|const)\s+(\w{3,})\s*=\s*(?:async\s+)?function/gm;
while ((m = assignRe.exec(jsContent)) !== null) {
  const name = m[1];
  funcDefs.set(name, { part: findPart(m.index), line: jsContent.slice(0, m.index).split("\n").length });
}
// const/let/var name = (async) (...) => ...
const arrowRe = /(?:^|\n)\s*(?:let|var|const)\s+(\w{3,})\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/gm;
while ((m = arrowRe.exec(jsContent)) !== null) {
  const name = m[1];
  if (!funcDefs.has(name)) funcDefs.set(name, { part: findPart(m.index), line: jsContent.slice(0, m.index).split("\n").length });
}
// window.__name = function / window.__name = () =>
const winRe = /window\.__(\w{3,})\s*=\s*(?:function|\([^)]*\)\s*=>)/gm;
while ((m = winRe.exec(jsContent)) !== null) {
  const name = m[1];
  funcDefs.set(name, { part: findPart(m.index), line: jsContent.slice(0, m.index).split("\n").length });
}

// 内置/常见 DOM 属性黑名单（不作为自定义函数）
const NOT_FUNCS = new Set([
  "function","var","let","const","return","if","for","while","switch",
  "typeof","new","throw","catch","else","case","break","continue",
  "async","await","true","false","null","undefined","this","super",
  "console","document","window","localStorage","sessionStorage",
  "navigator","Math","Date","JSON","Array","Object","String",
  "Number","Boolean","Map","Set","Promise","RegExp","Error",
  "setTimeout","setInterval","clearTimeout","clearInterval",
  "requestAnimationFrame","cancelAnimationFrame",
  "fetch","alert","confirm","prompt","parseInt","parseFloat",
  "isNaN","isFinite","encodeURIComponent","decodeURIComponent",
  "getComputedStyle","matchMedia","addEventListener","removeEventListener",
  "dispatchEvent","getElementById","querySelector","querySelectorAll",
  "closest","classList","appendChild","createElement","removeChild",
  "innerHTML","textContent","style","setAttribute","getAttribute",
  "Notification","Image","Blob","FileReader","FormData",
  "Uint8Array","Int32Array","crypto","TextEncoder","TextDecoder",
  "location","history","performance","screen","Worker",
  "SpeechRecognition","webkitSpeechRecognition","SpeechSynthesisUtterance",
  "AudioContext","webkitAudioContext","CanvasRenderingContext2D",
  "indexedDB","IDBKeyRange","openDatabase","atob","btoa",
  "Event","CustomEvent","MouseEvent","TouchEvent","KeyboardEvent",
  "onclick","onload","onerror","oninput","onchange","onkeydown","onscroll",
  "onstart","onend","onresult","onsuccess","onupgradeneeded","oncomplete",
  "slice","push","pop","shift","unshift","splice","concat","join",
  "map","filter","reduce","forEach","find","sort","reverse","includes",
  "indexOf","lastIndexOf","keys","values","entries","split","replace",
  "trim","toUpperCase","toLowerCase","charAt","charCodeAt","substring",
  "substr","slice","startsWith","endsWith","padStart","padEnd","repeat",
  "match","test","exec","toString","valueOf","toFixed","toPrecision",
  "parse","stringify","apply","call","bind","then","catch","finally",
  "has","get","set","delete","clear","add","from","of","now","floor",
  "ceil","round","abs","max","min","random","sqrt","pow","log","exp",
  "cos","sin","tan","atan2","PI","E","LN2","LN10",
]);

ok(`共识别 ${funcDefs.size} 个自定义函数/方法`);

// 4. 危险跨层调用检测
console.log("\n📋 [4/5] 危险跨层调用检测");

const LAYER = { "JS 3": 1, "JS 4": 2, "JS 5": 3, "JS 6": 4 };
function getLayer(part) {
  for (const [k, v] of Object.entries(LAYER)) if (part.startsWith(k)) return v;
  return 0;
}

// 检查 JS 6.x 是否直接调用 JS 4.x 的函数（危险）
const dangerRefs = [];
for (const [name, def] of funcDefs) {
  const defLayer = getLayer(def.part);
  if (defLayer !== 2) continue; // 只看第4层的函数
  
  // 在整个 JS 中搜索对这个函数的调用
  const callRe = new RegExp(`\\b${name}\\s*\\(`, 'g');
  while ((m = callRe.exec(jsContent)) !== null) {
    const callerPart = findPart(m.index);
    const callerLayer = getLayer(callerPart);
    if (callerLayer >= 3) { // 第5层或第6层调用第4层
      dangerRefs.push({ caller: callerPart, callee: name, calleePart: def.part, line: jsContent.slice(0, m.index).split("\n").length });
    }
  }
}

// 去重
const seen = new Set();
const uniqueDangers = dangerRefs.filter(r => {
  const k = `${r.caller}->${r.callee}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

// 只报告真正的危险（排除公共接口如 round2, esc, fmtDate 等已在3.1定义的）
const SAFE_INTERFACE = new Set([
  "round2","esc","fmtDate","fmtMonth","parseDate","addDays","uid","debounce",
  "setPath","diffDays","getDay","streakDays","longestStreak","weekStats",
  "weekRange","weekKey","save","load","saveSettings","render","renderTop",
  "toast","appConfirm","appPrompt","showAppModal",
  "updateFinanceKpi","recalcFinanceBalance","updateSoundIndicator",
  "openAIPanel","aiSend","aiReport","deerBubble","deerSet",
]);

const realDangers = uniqueDangers.filter(r => !SAFE_INTERFACE.has(r.callee));

if (realDangers.length > 0) {
  warn(`发现 ${realDangers.length} 处需要审查的跨层调用：`);
  realDangers.forEach(r => warn(`  ${r.caller} → ${r.calleePart} 的 ${r.callee}()`));
} else {
  ok("无危险跨层调用");
}

// 5. 关键全局变量完整性
console.log("\n📋 [5/5] 关键全局变量/函数完整性");
const CRITICAL = [
  "state","settings","currentDate","activeNav",
  "fmtDate","esc","uid","save","load","getDay","streakDays",
  "render","renderTop","toast","bind","onClick",
  "deerEl","deerSet","deerBubble","bindDeer","deerReminders",
  "openAIPanel","aiSend","aiAddMsg","collectContextData",
  "applyTheme","toggleTheme","saveSettings",
  "startPomo","pausePomo","resetPomo",
  "initAlarms","initNotifications",
];
let critMiss = 0;
CRITICAL.forEach(name => {
  if (!funcDefs.has(name) && !new RegExp(`\\b(?:let|var|const)\\s+${name}\\b`).test(jsContent)) {
    err(`关键标识缺失: ${name}`);
    critMiss++;
  }
});
if (critMiss === 0) ok(`全部 ${CRITICAL.length} 个关键标识完整`);

// 结果
console.log("\n" + "═".repeat(60));
console.log(`📊 结果: ${errors} 错误, ${warnings} 警告, ${passed} 通过`);
console.log("═".repeat(60));
if (errors > 0) { console.log("\n❌ 有错误，请修复后再提交！"); process.exit(1); }
else if (warnings > 0) { console.log("\n⚠️  有警告，建议审查后再提交。"); process.exit(0); }
else { console.log("\n✅ 全部通过，可以安全提交。"); process.exit(0); }

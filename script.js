const $=id=>document.getElementById(id);
const FRUIT=["🍎","🍌","🍇","🍊","🍉","🍓","🍍","🥝","🍐","🍒","🥭","🍑","🍋","🍈","🫐","🥥","🍏","🍅","🫒","🍆"];
const CARS=["🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🛵","🏍️","🚲","🚂","🚃","🚄"];
let lastSpoken="";
function speakChinese(text){
 if(!text||!window.speechSynthesis)return;
 speechSynthesis.cancel();
 const utterance=new SpeechSynthesisUtterance(text);
 utterance.lang="zh-CN";utterance.rate=0.85;
 const voices=speechSynthesis.getVoices();
 const voice=voices.find(v=>v.lang.toLowerCase().startsWith("zh-cn"))||voices.find(v=>v.lang.toLowerCase().startsWith("zh"));
 if(voice)utterance.voice=voice;
 speechSynthesis.speak(utterance);
}
let deck=[],selected=[],players=[],turn=0,opened=[],lock=false,active=false,errors=0,elapsed=0,timer=null,finishTimeout=null,config={};
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function format(n){return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0")}
function updateNames(){let n=Number($("playerCount").value),old=[...$("names").querySelectorAll("input")].map(x=>x.value);$("names").replaceChildren();for(let i=0;i<n;i++){let x=document.createElement("input");x.placeholder="ผู้เล่น "+(i+1);x.maxLength=20;x.value=old[i]||"";$("names").append(x)}}
function updateMode(){$("iconTypeLabel").classList.toggle("hidden",$("mode").value==="hsk");$("voiceSetting").classList.toggle("hidden",$("mode").value!=="hsk");$("voiceActions").classList.toggle("hidden",$("mode").value!=="hsk")}
function makeSelection(){
 let pool;
 if(config.mode==="hsk")pool=HSK1.map(([hanzi,pinyin,english])=>({hanzi,pinyin,english}));
 else {
  let icons=config.iconType==="fruit"?FRUIT:config.iconType==="car"?CARS:shuffle([...FRUIT,...CARS]);
  pool=icons.map(icon=>({icon}));
 }
 return shuffle(pool).slice(0,config.count);
}
function showScores(){
 $("scores").replaceChildren();
 players.forEach((p,i)=>{let el=document.createElement("div");el.className="score"+(active&&i===turn?" active":"");el.textContent=p.name+": "+p.score+" คะแนน"+(active&&i===turn?" 👈":"");$("scores").append(el)});
}
function renderCard(btn,card){
 btn.replaceChildren();
 if(config.mode==="hsk"){
  for(let [text,cls] of [[card.item.hanzi,"hanzi"],[card.item.pinyin,"pinyin"],[card.item.english,"english"]]){
   let span=document.createElement("span");span.className=cls;span.textContent=text;btn.append(span)
  }
 }else btn.textContent=card.item.icon;
}
function start(reuse=false){
 clearInterval(timer);clearTimeout(finishTimeout);if(window.speechSynthesis)speechSynthesis.cancel();lastSpoken="";$("repeatVoice").disabled=true;
 if(!reuse){
  config={mode:$("mode").value,iconType:$("iconType").value,count:Number($("pairCount").value),minutes:Number($("minutes").value)};
  players=[...$("names").querySelectorAll("input")].map((x,i)=>({name:x.value.trim()||"ผู้เล่น "+(i+1),score:0}));
  selected=makeSelection();
 }else players.forEach(p=>p.score=0);
 deck=shuffle(selected.flatMap((item,id)=>[{item,id,done:false},{item,id,done:false}]));
 turn=0;opened=[];lock=false;active=true;errors=0;elapsed=0;
 $("clock").textContent="00:00";$("errors").textContent="0";$("endActions").classList.add("hidden");
 $("board").replaceChildren();
 deck.forEach((c,i)=>{let b=document.createElement("button");b.className="card";b.textContent="?";b.setAttribute("aria-label","การ์ด "+(i+1));b.addEventListener("click",()=>flip(i));$("board").append(b)});
 $("status").textContent="ตาของ "+players[turn].name;showScores();
 timer=setInterval(()=>{elapsed++;$("clock").textContent=format(elapsed);if(elapsed>=config.minutes*60)end("หมดเวลา")},1000);
}
function flip(i){
 if(!active||lock||opened.includes(i)||deck[i].done)return;
 let b=$("board").children[i];b.classList.add("revealed");renderCard(b,deck[i]);opened.push(i);
 if(config.mode==="hsk"){lastSpoken=deck[i].item.hanzi;$("repeatVoice").disabled=false;if($("voiceOn").checked)speakChinese(lastSpoken)}
 if(opened.length!==2)return;
 lock=true;
 let [a,c]=opened,correct=deck[a].id===deck[c].id;
 if(correct){
  finishTimeout=setTimeout(()=>{
   if(!active)return;
   for(let idx of opened){deck[idx].done=true;let el=$("board").children[idx];el.classList.add("matched");el.disabled=true}
   players[turn].score++;opened=[];lock=false;showScores();
   if(deck.every(x=>x.done))end("จับคู่ครบแล้ว!");
   else $("status").textContent=players[turn].name+" จับคู่ถูก! ได้เล่นต่อ";
  },400);
 }else{
  errors++;$("errors").textContent=errors;
  finishTimeout=setTimeout(()=>{
   if(!active)return;
   for(let idx of opened){let el=$("board").children[idx];el.classList.remove("revealed");el.textContent="?"}
   opened=[];turn=(turn+1)%players.length;lock=false;
   $("status").textContent="ตาของ "+players[turn].name;showScores();
  },1050);
 }
}
function end(reason){
 clearInterval(timer);clearTimeout(finishTimeout);timer=null;active=false;lock=true;
 const max=Math.max(...players.map(p=>p.score)),winners=players.filter(p=>p.score===max).map(p=>p.name);
 $("status").textContent=reason+" • "+(winners.length>1?"เสมอ: ":"ผู้ชนะ: ")+winners.join(", ")+" ("+max+" คะแนน)";
 showScores();$("endActions").classList.remove("hidden");
}
$("playerCount").addEventListener("change",updateNames);
$("mode").addEventListener("change",updateMode);
$("newGame").addEventListener("click",()=>start(false));
$("repeatVoice").addEventListener("click",()=>speakChinese(lastSpoken));
$("voiceOn").addEventListener("change",()=>{if(!$("voiceOn").checked&&window.speechSynthesis)speechSynthesis.cancel()});
$("replay").addEventListener("click",()=>start(true));
$("fresh").addEventListener("click",()=>start(false));
updateNames();updateMode();

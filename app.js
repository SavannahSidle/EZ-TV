const views={overview:document.querySelector("#overviewView"),resident:document.querySelector("#residentView"),caregiver:document.querySelector("#caregiverView"),facility:document.querySelector("#facilityView"),plans:document.querySelector("#plansView")};
const residentHome=document.querySelector("#residentHome");
const player=document.querySelector("#player");
const playerContent=document.querySelector("#playerContent");
const residentMain=document.querySelector(".resident-main");
const toast=document.querySelector("#toast");
const themeToggle=document.querySelector("#themeToggle");
let currentMedia="photos";
let isPlaying=true;

function setTheme(theme){
  const light=theme==="light";
  document.body.classList.toggle("light-mode",light);
  themeToggle.setAttribute("aria-pressed",String(light));
  themeToggle.textContent=light?"☾ Dark mode":"☀ Light mode";
  localStorage.setItem("eztv-theme",light?"light":"dark");
}

setTheme(localStorage.getItem("eztv-theme")==="light"?"light":"dark");
themeToggle.addEventListener("click",()=>setTheme(document.body.classList.contains("light-mode")?"dark":"light"));

function setView(name){
  Object.entries(views).forEach(([key,view])=>view.classList.toggle("active-view",key===name));
  document.querySelectorAll(".view-option").forEach(button=>button.classList.toggle("active",button.dataset.view===name));
  window.scrollTo({top:0,behavior:"smooth"});
}

function showToast(message){
  toast.textContent=message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout=window.setTimeout(()=>toast.classList.remove("show"),2300);
}

function mediaMarkup(type){
  if(type==="photos")return `<div class="player-photos"><div class="player-photo"><span>MH</span></div><div class="player-photo"><span>DS</span></div><div class="player-photo"><span>LP</span></div></div><span class="playing-label">FAMILY PHOTOS</span><h2>Your family</h2><p>Photo 7 of 18</p>`;
  if(type==="television")return `<div class="player-show"><span>THE COAST ROAD</span></div><span class="playing-label">FAVOURITE SHOW</span><h2>The Coast Road</h2><p>Season 2 · Episode 4</p>`;
  const bars=[74,125,190,238,280,238,190,125,74].map((height,index)=>`<i style="--h:${height}px;--d:${index*-.08}s"></i>`).join("");
  return `<div class="player-music">${bars}</div><span class="playing-label">RELAXING MUSIC</span><h2>Morning favourites</h2><p>Frank Sinatra · Playing now</p>`;
}

function openMedia(type){
  currentMedia=type;isPlaying=true;playerContent.innerHTML=mediaMarkup(type);
  residentMain.classList.add("playing");
  player.classList.add("active");
  document.querySelector("#playPauseButton").textContent="Ⅱ";
  document.querySelectorAll(".media-choice").forEach(button=>{
    const selected=button.dataset.media===type;
    button.classList.toggle("active",selected);
    button.setAttribute("aria-pressed",String(selected));
  });
}

function returnHome(){
  currentMedia="photos";isPlaying=true;
  residentMain.classList.remove("playing");
  player.classList.remove("active");
  document.querySelectorAll(".media-choice").forEach(button=>{
    button.classList.remove("active");
    button.setAttribute("aria-pressed","false");
  });
}

function updateClock(){
  const now=new Date();
  document.querySelector("#clockTime").textContent=now.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
  document.querySelector("#clockDate").textContent=now.toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"}).toUpperCase().replace(","," ·");
}

document.querySelectorAll(".view-option").forEach(button=>button.addEventListener("click",()=>setView(button.dataset.view)));
document.querySelectorAll(".media-choice").forEach(button=>button.addEventListener("click",()=>openMedia(button.dataset.media)));
document.querySelector("[data-action='home']").addEventListener("click",()=>{setView("overview");returnHome()});
document.querySelector("#playPauseButton").addEventListener("click",event=>{isPlaying=!isPlaying;event.currentTarget.textContent=isPlaying?"Ⅱ":"▶";showToast(isPlaying?"Playing":"Paused")});
document.querySelector("#previousButton").addEventListener("click",()=>showToast(currentMedia==="photos"?"Previous photograph":"Previous item"));
document.querySelector("#nextButton").addEventListener("click",()=>showToast(currentMedia==="photos"?"Next photograph":"Next item"));
document.querySelector("#residentBackButton").addEventListener("click",returnHome);

document.querySelector("#voiceControl").addEventListener("click",event=>{
  const control=event.currentTarget,title=document.querySelector("#voiceTitle"),instruction=document.querySelector("#voiceInstruction");
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition){
    title.textContent="Voice is unavailable here";
    instruction.textContent="Please use one of the three choices";
    showToast("This browser does not support voice recognition");
    window.setTimeout(()=>{title.textContent="Use your voice";instruction.textContent='Say “photos,” “show,” or “music”'},3000);
    return;
  }
  const recognition=new Recognition();
  recognition.lang="en-CA";
  recognition.continuous=false;
  recognition.interimResults=false;
  recognition.maxAlternatives=3;
  let handled=false;
  recognition.onstart=()=>{control.classList.add("listening");control.setAttribute("aria-pressed","true");title.textContent="Listening";instruction.textContent="Say photos, show, or music"};
  recognition.onresult=result=>{
    const words=Array.from(result.results[0]).map(option=>option.transcript.toLowerCase()).join(" ");
    const match=words.match(/photo|picture|family/)?"photos":words.match(/show|television|tv/)?"television":words.match(/music|song/)?"music":null;
    if(match){
      handled=true;
      const labels={photos:"photos",television:"show",music:"music"};
      title.textContent=`Opening ${labels[match]}`;
      instruction.textContent="Voice command recognized";
      window.setTimeout(()=>{resetVoice();openMedia(match)},450);
    }else{
      title.textContent="I did not recognize that";
      instruction.textContent="Try photos, show, or music";
    }
  };
  recognition.onerror=error=>{
    const denied=error.error==="not-allowed"||error.error==="service-not-allowed";
    title.textContent=denied?"Microphone permission is off":"I could not hear that";
    instruction.textContent=denied?"Allow microphone access or use a choice":"Try again or use one of the choices";
  };
  recognition.onend=()=>{if(!handled){control.classList.remove("listening");control.setAttribute("aria-pressed","false")}};
  function resetVoice(){control.classList.remove("listening");control.setAttribute("aria-pressed","false");title.textContent="Use your voice";instruction.textContent='Say “photos,” “show,” or “music”'}
  try{recognition.start()}catch(error){showToast("Voice recognition is already listening")}
});

const supportPanel=document.querySelector("#supportPanel");
document.querySelector("#helpControl").addEventListener("click",()=>supportPanel.classList.add("open"));
document.querySelector("#closeSupport").addEventListener("click",()=>supportPanel.classList.remove("open"));
document.querySelector("#supportMusic").addEventListener("click",()=>{supportPanel.classList.remove("open");openMedia("music")});

document.querySelectorAll(".care-tab").forEach(button=>button.addEventListener("click",()=>{
  document.querySelectorAll(".care-tab").forEach(tab=>tab.classList.toggle("active",tab===button));
  document.querySelectorAll(".care-page").forEach(page=>page.classList.toggle("active-page",page.dataset.page===button.dataset.tab));
}));

document.querySelectorAll("[data-send]").forEach(button=>button.addEventListener("click",()=>{
  const type=button.dataset.send;
  if(type==="home"){showToast("Home screen sent to the TV");returnHome();return}
  currentMedia=type;
  const names={photos:"Family photographs",television:"The Coast Road",music:"Morning favourites"};
  const symbols={photos:"MH",television:"▶",music:"♪"};
  document.querySelector("#miniTv").innerHTML=`<span class="mini-label">NOW PLAYING</span><div class="mini-photos"><i>${symbols[type]}</i></div><b>${names[type]}</b><small>Sent from caregiver view</small>`;
  showToast(`${names[type]} sent to the TV`);
}));

document.querySelectorAll(".library-filters button").forEach(button=>button.addEventListener("click",()=>{
  document.querySelectorAll(".library-filters button").forEach(filter=>{
    const selected=filter===button;
    filter.classList.toggle("active",selected);
    filter.setAttribute("aria-pressed",String(selected));
  });
  const cards=[...document.querySelectorAll(".library-card")];
  cards.forEach(card=>card.hidden=button.dataset.filter!=="all"&&card.dataset.type!==button.dataset.filter);
  const visible=cards.filter(card=>!card.hidden).length;
  const label=button.dataset.filter==="all"?"all":button.textContent.toLowerCase();
  document.querySelector("#libraryStatus").textContent=`Showing ${visible} ${label} ${visible===1?"collection":"collections"}.`;
  document.querySelector("#libraryDetails").hidden=true;
}));

let selectedLibraryType="photos";
document.querySelectorAll(".library-open").forEach(button=>button.addEventListener("click",()=>{
  const card=button.closest(".library-card");
  selectedLibraryType=card.dataset.type;
  document.querySelector("#libraryDetailType").textContent=card.dataset.type.toUpperCase();
  document.querySelector("#libraryDetailTitle").textContent=card.dataset.title;
  document.querySelector("#libraryDetailMeta").textContent=card.dataset.meta;
  document.querySelector("#libraryDetailCopy").textContent=card.dataset.detail;
  document.querySelector("#libraryDetails").hidden=false;
}));
document.querySelector("#librarySendButton").addEventListener("click",()=>{
  setView("resident");
  openMedia(selectedLibraryType);
  showToast("Media sent to the TV view");
});

const routineModal=document.querySelector("#routineModal");
document.querySelector("[data-modal='routineModal']").addEventListener("click",()=>routineModal.showModal());
document.querySelector("#routineForm").addEventListener("submit",event=>{
  event.preventDefault();
  const name=document.querySelector("#routineMedia").value;
  const [hours,minutes]=document.querySelector("#routineTime").value.split(":").map(Number);
  const displayHour=hours%12||12,period=hours>=12?"PM":"AM";
  const item=document.createElement("article");
  item.className="schedule-item";
  item.innerHTML=`<time>${displayHour}:${String(minutes).padStart(2,"0")}<small>${period}</small></time><span class="schedule-line"><i></i></span><div class="schedule-icon">+</div><div><b>${name}</b><small>${document.querySelector("#routineRepeat").checked?"Repeats every day":"Scheduled today"}</small></div><button class="item-menu" aria-label="Schedule options">•••</button>`;
  document.querySelector("#scheduleList").append(item);routineModal.close();showToast(`${name} added to today`);
});

document.querySelector("#addMediaButton").addEventListener("click",()=>showToast("Media upload is represented in this prototype"));
document.querySelector("#addPersonButton").addEventListener("click",()=>showToast("Person setup is represented in this prototype"));

document.querySelector("#exportUsbButton").addEventListener("click",()=>{
  const update={
    format:"EZ-TV update prototype",
    created:new Date().toISOString(),
    profile:"Wanda",
    media:["Our family","Morning favourites","Quiet evening","The Coast Road"],
    routines:[{time:"09:00",media:"Morning favourites"},{time:"13:30",media:"Our family"},{time:"18:00",media:"The Coast Road"}],
    note:"Demo data only. Production packages will be encrypted."
  };
  const blob=new Blob([JSON.stringify(update,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;link.download="EZ-TV-demo-update.json";link.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  showToast("Demo USB update created");
});

document.querySelector("#importUsbInput").addEventListener("change",event=>{
  const file=event.target.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.addEventListener("load",()=>{
    try{
      const update=JSON.parse(reader.result);
      if(update.format!=="EZ-TV update prototype")throw new Error("Unknown package");
      showToast(`Update for ${update.profile||"resident"} is ready to import`);
    }catch(error){showToast("That is not a valid EZ-TV update")}
    event.target.value="";
  });
  reader.readAsText(file);
});

document.querySelector("#facilityUsbButton").addEventListener("click",()=>showToast("USB updates prepared for one resident"));
document.querySelector("#addResidentButton").addEventListener("click",()=>showToast("Resident setup opened in the full product"));
const residentModal=document.querySelector("#residentModal");
document.querySelectorAll(".facility-row[data-resident]").forEach(row=>row.addEventListener("click",()=>{
  document.querySelector("#residentModalName").textContent=row.dataset.resident;
  document.querySelector("#residentModalRoom").textContent=row.dataset.room;
  document.querySelector("#residentModalMode").textContent=row.dataset.mode;
  document.querySelector("#residentModalStatus").textContent=row.dataset.status;
  document.querySelector("#residentModalUpdated").textContent=row.dataset.updated;
  document.querySelector("#residentModalRoutine").textContent=row.dataset.routine;
  document.querySelector("#residentModalMedia").textContent=row.dataset.media;
  residentModal.showModal();
}));
document.querySelector("#residentModalClose").addEventListener("click",()=>residentModal.close());
document.querySelector("#residentPrepareUpdate").addEventListener("click",()=>showToast("Resident update package prepared"));
document.querySelector("#residentOpenTv").addEventListener("click",()=>{residentModal.close();setView("resident")});
document.querySelectorAll("[data-plan]").forEach(button=>button.addEventListener("click",()=>showToast(`${button.dataset.plan} plan selected for this prototype`)));
document.querySelectorAll("[data-view-jump]").forEach(button=>button.addEventListener("click",()=>setView(button.dataset.viewJump)));
const aboutModal=document.querySelector("#aboutModal");
document.querySelector("#aboutButton").addEventListener("click",()=>aboutModal.showModal());
document.querySelector("#aboutClose").addEventListener("click",()=>aboutModal.close());
returnHome();updateClock();window.setInterval(updateClock,30000);

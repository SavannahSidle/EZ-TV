const views={overview:document.querySelector("#overviewView"),difference:document.querySelector("#differenceView"),resident:document.querySelector("#residentView"),caregiver:document.querySelector("#caregiverView"),facility:document.querySelector("#facilityView"),plans:document.querySelector("#plansView")};
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

const residentView=document.querySelector("#residentView");
const caregiverView=document.querySelector("#caregiverView");
const facilityView=document.querySelector("#facilityView");
const plansView=document.querySelector("#plansView");
const differenceView=document.querySelector("#differenceView");
const overviewView=document.querySelector("#overviewView");
const appearanceButtons=document.querySelectorAll("[data-interface-theme],[data-resident-theme],[data-caregiver-theme]");

function appearanceValue(button){
  return button.dataset.interfaceTheme||button.dataset.residentTheme||button.dataset.caregiverTheme;
}

function setInterfaceAppearance(theme){
  const selected=["original","warm","garden"].includes(theme)?theme:"original";
  document.body.dataset.interfaceTheme=selected;
  overviewView.dataset.overviewTheme=selected;
  residentView.dataset.residentTheme=selected;
  caregiverView.dataset.caregiverTheme=selected;
  facilityView.dataset.facilityTheme=selected;
  plansView.dataset.plansTheme=selected;
  differenceView.dataset.differenceTheme=selected;
  appearanceButtons.forEach(button=>{
    const active=appearanceValue(button)===selected;
    button.classList.toggle("active",active);
    button.setAttribute("aria-pressed",String(active));
  });
  localStorage.setItem("eztv-interface-theme",selected);
  localStorage.setItem("eztv-resident-theme",selected);
  localStorage.setItem("eztv-dashboard-theme",selected);
}
appearanceButtons.forEach(button=>button.addEventListener("click",()=>setInterfaceAppearance(appearanceValue(button))));
setInterfaceAppearance(localStorage.getItem("eztv-interface-theme")||localStorage.getItem("eztv-resident-theme")||localStorage.getItem("eztv-dashboard-theme")||localStorage.getItem("eztv-caregiver-theme")||"original");

function setView(name){
  if(name==="resident")returnHome();
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

const demoMedia={
  photos:[
    {title:"Garden afternoon",detail:"A sunny visit together",src:"assets/memories/garden-afternoon.jpg",tone:"garden"},
    {title:"Birthday cake",detail:"A familiar family celebration",src:"assets/memories/birthday-cake.jpg",tone:"birthday"},
    {title:"Lake day",detail:"A quiet summer memory",src:"assets/memories/lake-day.jpg",tone:"lake"}
  ],
  television:[
    {title:"The Coast Road",detail:"Season 2 · Episode 4",tone:"harbour"},
    {title:"The Garden Hour",detail:"Episode 7 · Spring flowers",tone:"garden-show"},
    {title:"Sunday Matinee",detail:"A gentle classic comedy",tone:"matinee"}
  ],
  music:[
    {title:"Morning favourites",detail:"Three familiar demo tracks · Playing now",tone:"sunday"},
    {title:"Quiet evening",detail:"Soft instrumentals · Playing now",tone:"piano"},
    {title:"Kitchen sing-along",detail:"Familiar favourites · Playing now",tone:"kitchen"}
  ]
};
const mediaIndex={photos:0,television:0,music:0};

function mediaMarkup(type){
  const items=demoMedia[type],index=mediaIndex[type],item=items[index];
  if(type==="photos"){
    const cards=[-1,0,1].map(offset=>{
      const memory=items[(index+offset+items.length)%items.length];
      return `<div class="player-photo memory-card ${memory.tone}"><img src="${memory.src}" alt=""><small>${memory.title}</small></div>`;
    }).join("");
    return `<div class="player-photos demo-memory-stack" aria-label="Illustrated demo family memories">${cards}</div><span class="playing-label">FAMILY PHOTOS · FICTIONAL DEMO</span><h2>${item.title}</h2><p>${item.detail} · Photo ${index+1} of ${items.length}</p>`;
  }
  if(type==="television")return `<div class="player-show demo-show ${item.tone}" aria-label="Fictional programme preview"><div class="show-landscape"><i></i><b></b></div><small>FICTIONAL DEMO PROGRAMME</small></div><span class="playing-label">FAVOURITE SHOW</span><h2>${item.title}</h2><p>${item.detail}</p>`;
  const bars=[74,125,190,238,280,238,190,125,74].map((height,barIndex)=>`<i style="--h:${height}px;--d:${barIndex*-.08}s"></i>`).join("");
  return `<div class="player-music demo-album ${item.tone}" aria-label="Fictional music collection"><div class="album-mark">♪</div><div class="music-bars">${bars}</div></div><span class="playing-label">RELAXING MUSIC · FICTIONAL DEMO</span><h2>${item.title}</h2><p>${item.detail}</p>`;
}

function stepMedia(direction){
  const items=demoMedia[currentMedia];
  mediaIndex[currentMedia]=(mediaIndex[currentMedia]+direction+items.length)%items.length;
  playerContent.innerHTML=mediaMarkup(currentMedia);
  showToast(direction>0?"Next item":"Previous item");
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
document.querySelector("#previousButton").addEventListener("click",()=>stepMedia(-1));
document.querySelector("#nextButton").addEventListener("click",()=>stepMedia(1));
document.querySelector("#residentBackButton").addEventListener("click",returnHome);

const residentChoices=[...document.querySelectorAll(".media-choice")];
let residentChoiceIndex=0;
function selectResidentChoice(index){
  residentChoiceIndex=(index+residentChoices.length)%residentChoices.length;
  residentChoices.forEach((button,buttonIndex)=>{
    const selected=buttonIndex===residentChoiceIndex;
    button.classList.toggle("active",selected);
    button.setAttribute("aria-pressed",String(selected));
  });
  residentChoices[residentChoiceIndex].focus({preventScroll:true});
}
document.addEventListener("keydown",event=>{
  if(!views.resident.classList.contains("active-view")||event.altKey||event.ctrlKey||event.metaKey)return;
  if(event.target.matches("input,select,textarea"))return;
  if(player.classList.contains("active")){
    if(event.key==="ArrowLeft"){event.preventDefault();stepMedia(-1)}
    if(event.key==="ArrowRight"){event.preventDefault();stepMedia(1)}
    if(event.key==="Escape"){event.preventDefault();returnHome();selectResidentChoice(residentChoiceIndex)}
    return;
  }
  if(event.key==="ArrowLeft"||event.key==="ArrowUp"){event.preventDefault();selectResidentChoice(residentChoiceIndex-1)}
  if(event.key==="ArrowRight"||event.key==="ArrowDown"){event.preventDefault();selectResidentChoice(residentChoiceIndex+1)}
  if(event.key==="Enter"&&!event.target.matches("button")){event.preventDefault();openMedia(residentChoices[residentChoiceIndex].dataset.media)}
  if(["1","2","3"].includes(event.key)){event.preventDefault();residentChoiceIndex=Number(event.key)-1;openMedia(residentChoices[residentChoiceIndex].dataset.media)}
});

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
  if(type==="home"){
    document.querySelector("#miniTv").innerHTML='<span class="mini-label">WANDA’S TV</span><b>Home choices restored</b><small>Photos · Show · Music</small>';
    showToast("Wanda’s home choices restored");
    return;
  }
  currentMedia=type;
  const names={photos:"Family photographs",television:"The Coast Road",music:"Morning favourites"};
  const visuals={
    photos:'<div class="mini-photos"><i><img src="assets/memories/garden-afternoon.jpg" alt=""></i><i><img src="assets/memories/birthday-cake.jpg" alt=""></i><i><img src="assets/memories/lake-day.jpg" alt=""></i></div>',
    television:'<div class="mini-photos"><i>▶</i></div>',
    music:'<div class="mini-photos"><i>♪</i></div>'
  };
  const action=type==="photos"?"SHOWING ON WANDA’S TV":"PLAYING ON WANDA’S TV";
  document.querySelector("#miniTv").innerHTML=`<span class="mini-label">${action}</span>${visuals[type]}<b>${names[type]}</b><small>Started from Caregiver View</small>`;
  showToast(`${names[type]} started on Wanda’s TV preview`);
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
let selectedLibraryTitle="Our family";
document.querySelectorAll(".library-open").forEach(button=>button.addEventListener("click",()=>{
  const card=button.closest(".library-card");
  selectedLibraryType=card.dataset.type;
  selectedLibraryTitle=card.dataset.title;
  document.querySelector("#libraryDetailType").textContent=card.dataset.type.toUpperCase();
  document.querySelector("#libraryDetailTitle").textContent=card.dataset.title;
  document.querySelector("#libraryDetailMeta").textContent=card.dataset.meta;
  document.querySelector("#libraryDetailCopy").textContent=card.dataset.detail;
  document.querySelector("#libraryDetails").hidden=false;
}));
document.querySelector("#librarySendButton").addEventListener("click",()=>{
  const match=demoMedia[selectedLibraryType]?.findIndex(item=>item.title===selectedLibraryTitle)??-1;
  if(match>=0)mediaIndex[selectedLibraryType]=match;
  setView("resident");
  openMedia(selectedLibraryType);
  showToast("Previewing what Wanda would see");
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
const residentModal=document.querySelector("#residentModal");
function openResidentDetails(row){
  document.querySelector("#residentModalName").textContent=row.dataset.resident;
  document.querySelector("#residentModalRoom").textContent=row.dataset.room;
  document.querySelector("#residentModalMode").textContent=row.dataset.mode;
  document.querySelector("#residentModalStatus").textContent=row.dataset.status;
  document.querySelector("#residentModalUpdated").textContent=row.dataset.updated;
  document.querySelector("#residentModalRoutine").textContent=row.dataset.routine;
  document.querySelector("#residentModalMedia").textContent=row.dataset.media;
  residentModal.showModal();
}
document.querySelector(".facility-table").addEventListener("click",event=>{
  const row=event.target.closest(".facility-row[data-resident]");
  if(row)openResidentDetails(row);
});

const addResidentModal=document.querySelector("#addResidentModal");
document.querySelector("#addResidentButton").addEventListener("click",()=>addResidentModal.showModal());
document.querySelector("#addResidentClose").addEventListener("click",()=>addResidentModal.close());
document.querySelector("#addResidentForm").addEventListener("submit",event=>{
  event.preventDefault();
  const name=document.querySelector("#newResidentName").value.trim();
  const room=document.querySelector("#newResidentRoom").value.trim();
  const mode=document.querySelector("#newResidentMode").value;
  const initials=name.split(/\s+/).map(part=>part[0]||"").join("").slice(0,2).toUpperCase();
  const safe=value=>value.replace(/[&<>"']/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]));
  const row=document.createElement("button");
  row.className="facility-row";
  row.type="button";
  row.setAttribute("role","row");
  row.dataset.resident=name;
  row.dataset.room=room;
  row.dataset.mode=mode;
  row.dataset.updated="Just added";
  row.dataset.status=mode==="Connected"?"Ready":"Offline ready";
  row.dataset.routine="No routine scheduled yet";
  row.dataset.media="No private media added yet";
  row.innerHTML=`<span><i class="resident-initials aqua">${safe(initials)}</i><b>${safe(name)}</b></span><span>${safe(room)}</span><span>${safe(mode)}</span><span>Just added</span><span class="status-pill ${mode==="Connected"?"online":"local"}">${mode==="Connected"?"Ready":"Offline ready"}</span>`;
  document.querySelector(".facility-table").append(row);
  const total=document.querySelectorAll(".facility-row[data-resident]").length;
  document.querySelector(".resident-status-panel .panel-heading span").textContent=`${total} PROFILES`;
  addResidentModal.close();
  showToast(`${name} added to this demonstration`);
});

const sharedButton=document.querySelector("#sharedMemoriesToggle");
sharedButton.addEventListener("click",()=>{
  const panel=document.querySelector("#sharedMemories");
  const active=panel.classList.toggle("demo-active");
  document.querySelector("#sharedMemoryStatus").textContent=active?"Demo running":"Demo off";
  sharedButton.textContent=active?"Turn off demo":"Turn on demo";
  sharedButton.setAttribute("aria-pressed",String(active));
  showToast(active?"Shared-screen demo started with anonymous images":"Shared-screen demo stopped");
});
document.querySelector("#residentModalClose").addEventListener("click",()=>residentModal.close());
document.querySelector("#residentPrepareUpdate").addEventListener("click",()=>showToast("Resident update package prepared"));
document.querySelector("#residentOpenTv").addEventListener("click",()=>{residentModal.close();setView("resident")});
document.querySelectorAll("[data-plan]").forEach(button=>button.addEventListener("click",()=>showToast(`${button.dataset.plan} plan selected for this prototype`)));
document.querySelectorAll("[data-view-jump]").forEach(button=>button.addEventListener("click",()=>setView(button.dataset.viewJump)));
document.querySelectorAll("[data-overview-media]").forEach(button=>button.addEventListener("click",()=>{
  setView("resident");
  openMedia(button.dataset.overviewMedia);
}));
document.querySelectorAll("[data-overview-target]").forEach(button=>button.addEventListener("click",()=>{
  setView("plans");
  window.setTimeout(()=>document.querySelector("#"+button.dataset.overviewTarget)?.scrollIntoView({behavior:"smooth",block:"center"}),250);
}));
let selectedSetupScreen="smart";
let selectedSetupInternet="yes";
const setupRecommendations={
  smart:{title:"Use the existing screen first",summary:"Run EZ-TV full-screen on the compatible device already available. No EZ-TV hardware is needed for the pilot.",resident:"The same three-choice EZ-TV screen.",caregiver:"Checks compatibility, opens EZ-TV, pairs the screen, and approves the life profile."},
  older:{title:"Add a preconfigured companion device",summary:"Connect an ordinary, preconfigured HDMI streaming device to the existing television. The resident never handles its menus.",resident:"The same three-choice EZ-TV screen, controlled with a simple remote or by a caregiver.",caregiver:"Connects power and HDMI once, or chooses managed installation."},
  none:{title:"Start with a tablet or Ready Screen bundle",summary:"Use a tablet for the fastest pilot. For everyday room viewing, choose an inexpensive television or monitor with a preconfigured companion device and simple remote.",resident:"A personal tablet or a larger room screen with the same three choices.",caregiver:"Chooses the screen size and placement. EZ-TV or a partner can prepare and install the bundle."}
};
function updateSetupRecommendation(){
  const recommendation=setupRecommendations[selectedSetupScreen];
  document.querySelector("#setupResultTitle").textContent=recommendation.title;
  document.querySelector("#setupResultSummary").textContent=recommendation.summary;
  document.querySelector("#setupResident").textContent=recommendation.resident;
  document.querySelector("#setupCaregiver").textContent=recommendation.caregiver;
  document.querySelector("#setupAutomation").textContent=selectedSetupInternet==="yes"?"Daily programming, local caching, restart recovery, and remote updates.":"Daily programming, local caching, and restart recovery. Remote updates resume when a connection is available.";
  document.querySelector("#setupConnection").textContent=selectedSetupInternet==="yes"?"Use Wi-Fi or Ethernet for remote caregiver changes. Approved core content remains available during an interruption.":"Core content works from local storage. Add separately priced managed cellular when remote updates matter. Use USB only as a manual fallback.";
}
document.querySelectorAll("[data-setup-screen]").forEach(button=>button.addEventListener("click",()=>{
  selectedSetupScreen=button.dataset.setupScreen;
  document.querySelectorAll("[data-setup-screen]").forEach(option=>{const active=option===button;option.classList.toggle("active",active);option.setAttribute("aria-pressed",String(active))});
  updateSetupRecommendation();
}));
document.querySelectorAll("[data-setup-internet]").forEach(button=>button.addEventListener("click",()=>{
  selectedSetupInternet=button.dataset.setupInternet;
  document.querySelectorAll("[data-setup-internet]").forEach(option=>{const active=option===button;option.classList.toggle("active",active);option.setAttribute("aria-pressed",String(active))});
  updateSetupRecommendation();
}));
document.querySelectorAll("[data-facility-target]").forEach(button=>button.addEventListener("click",()=>{
  document.querySelectorAll("[data-facility-target]").forEach(item=>item.classList.toggle("active",item===button));
  const target=document.querySelector("#"+button.dataset.facilityTarget);
  target?.scrollIntoView({behavior:"smooth",block:"center"});
  target?.focus({preventScroll:true});
  const labels={facilityHeading:"Facility overview",residentStatus:"Resident access",facilityStats:"Device status",facilityRhythm:"Today’s schedules"};
  showToast(labels[button.dataset.facilityTarget]);
}));
const aboutModal=document.querySelector("#aboutModal");
document.querySelector("#aboutButton").addEventListener("click",()=>aboutModal.showModal());
document.querySelector("#aboutClose").addEventListener("click",()=>aboutModal.close());
returnHome();updateClock();window.setInterval(updateClock,30000);

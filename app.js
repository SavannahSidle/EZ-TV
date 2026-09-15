const views={resident:document.querySelector("#residentView"),caregiver:document.querySelector("#caregiverView"),facility:document.querySelector("#facilityView"),plans:document.querySelector("#plansView")};
const residentHome=document.querySelector("#residentHome");
const player=document.querySelector("#player");
const playerContent=document.querySelector("#playerContent");
const toast=document.querySelector("#toast");
let currentMedia="photos";
let isPlaying=true;

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
  document.querySelector("#playPauseButton").textContent="Ⅱ";
  residentHome.hidden=true;player.classList.add("active");
  window.scrollTo({top:0,behavior:"auto"});
}

function returnHome(){player.classList.remove("active");residentHome.hidden=false;window.scrollTo({top:0,behavior:"auto"})}

function updateClock(){
  const now=new Date();
  document.querySelector("#clockTime").textContent=now.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
  document.querySelector("#clockDate").textContent=now.toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"}).toUpperCase().replace(","," ·");
}

document.querySelectorAll(".view-option").forEach(button=>button.addEventListener("click",()=>setView(button.dataset.view)));
document.querySelectorAll(".media-choice").forEach(button=>button.addEventListener("click",()=>openMedia(button.dataset.media)));
document.querySelector("#backButton").addEventListener("click",returnHome);
document.querySelector("[data-action='home']").addEventListener("click",()=>{setView("resident");returnHome()});
document.querySelector("#playPauseButton").addEventListener("click",event=>{isPlaying=!isPlaying;event.currentTarget.textContent=isPlaying?"Ⅱ":"▶";showToast(isPlaying?"Playing":"Paused")});
document.querySelector("#previousButton").addEventListener("click",()=>showToast(currentMedia==="photos"?"Previous photograph":"Previous item"));
document.querySelector("#nextButton").addEventListener("click",()=>showToast(currentMedia==="photos"?"Next photograph":"Next item"));

document.querySelector("#voiceControl").addEventListener("click",event=>{
  const control=event.currentTarget,title=document.querySelector("#voiceTitle"),instruction=document.querySelector("#voiceInstruction");
  control.classList.add("listening");title.textContent="Listening";instruction.textContent="You can say one word";
  window.setTimeout(()=>{title.textContent="I heard “music”";instruction.textContent="Opening relaxing music";control.classList.remove("listening")},1000);
  window.setTimeout(()=>{openMedia("music");title.textContent="Use your voice";instruction.textContent='Say “photos,” “show,” or “music”'},1900);
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
  document.querySelectorAll(".library-filters button").forEach(filter=>filter.classList.toggle("active",filter===button));
  document.querySelectorAll(".library-card").forEach(card=>card.hidden=button.dataset.filter!=="all"&&card.dataset.type!==button.dataset.filter);
}));

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
    profile:"Rose",
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
document.querySelectorAll(".facility-row[data-resident]").forEach(row=>row.addEventListener("click",()=>showToast(`${row.dataset.resident} profile selected`)));
document.querySelectorAll("[data-plan]").forEach(button=>button.addEventListener("click",()=>showToast(`${button.dataset.plan} plan selected for this prototype`)));
document.querySelectorAll("[data-view-jump]").forEach(button=>button.addEventListener("click",()=>setView(button.dataset.viewJump)));
const aboutModal=document.querySelector("#aboutModal");
document.querySelector("#aboutButton").addEventListener("click",()=>aboutModal.showModal());
document.querySelector("#aboutClose").addEventListener("click",()=>aboutModal.close());
updateClock();window.setInterval(updateClock,30000);

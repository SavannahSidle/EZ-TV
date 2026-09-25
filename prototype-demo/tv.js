const DB_NAME="eztv-local-prototype";
const STORE_NAME="media";
const tvHome=document.querySelector("#tvHome");
const mediaStage=document.querySelector("#mediaStage");
const mediaContent=document.querySelector("#mediaContent");
const helpStage=document.querySelector("#helpStage");
const quietStatus=document.querySelector("#quietStatus");
let current={profile:{name:"Wanda",help:"You are safe. Someone from your care team is nearby."},photos:[],video:null,audio:null,settings:{theme:"original",interaction_mode:"choose",channel_enabled:false,show_clock:true,show_captions:true,day_plan:{morning:"music",afternoon:"photos",evening:"video"},comfort_plan:{},home_today:null}};
let objectUrls=[];
let tilePhotoUrl=null;
let storyPhotoUrl=null;
let storyPeopleUrls=[];
let photoIndex=0;
let cloudResidentId=null;
let pairingStarted=false;
let channelTimer=null;
let cloudLoadPending=false;
let cloudReloadRequested=false;

function openDatabase(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE_NAME);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function localValue(key){const db=await openDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,"readonly");const request=tx.objectStore(STORE_NAME).get(key);request.onsuccess=()=>{db.close();resolve(request.result)};request.onerror=()=>{db.close();reject(request.error)}})}
async function putLocal(key,value){const db=await openDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,"readwrite");tx.objectStore(STORE_NAME).put(value,key);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
function releaseUrls(){objectUrls.forEach(URL.revokeObjectURL);objectUrls=[]}
function makeUrl(file){const url=URL.createObjectURL(file);objectUrls.push(url);return url}
function emptyMarkup(label){return `<div class="empty-state"><span>+</span><h2>${label} is not ready yet</h2><p>Please choose something else.</p></div>`}
function visiblePhotos(){return current.photos.map((file,index)=>({file,detail:current.settings?.photo_details?.[index]||{}})).filter(item=>item.detail.visible!==false)}
function updatePhotoTile(){
  const image=document.querySelector("#photoTileImage");
  const fallback=document.querySelector("#photoTileFallback");
  if(tilePhotoUrl)URL.revokeObjectURL(tilePhotoUrl);
  tilePhotoUrl=null;
  const photos=visiblePhotos();
  if(photos.length){
    tilePhotoUrl=URL.createObjectURL(photos[0].file);
    image.src=tilePhotoUrl;
    image.hidden=false;
    fallback.hidden=true;
  }else{
    image.removeAttribute("src");
    image.hidden=true;
    fallback.hidden=false;
  }
}
function validHomeToday(){const item=current.settings?.home_today;return item&&new Date(item.expires_at)>new Date()}
function dayPart(){const hour=new Date().getHours();return hour<12?"morning":hour<17?"afternoon":"evening"}
function suggestedType(){return current.settings?.day_plan?.[dayPart()]||"photos"}
function mediaLabel(type){return {photos:"Family photos",video:"Favourite show",audio:"Relaxing music",music:"Relaxing music",quiet:"A quiet screen"}[type]||"Family photos"}
function applyProfile(){
  document.querySelector("#tvResidentName").textContent=current.settings?.life_profile?.preferredName||current.profile.name;
  document.querySelector("#helpText").textContent=current.settings?.comfort_plan?.words||current.profile.help;
  const story=current.settings?.life_profile||{};
  document.querySelector("#tvStoryName").textContent=story.preferredName||current.profile.name;
  document.querySelector("#tvStoryText").textContent=story.lifeStory||"";
  document.querySelector("#tvStoryPlaces").textContent=story.familiarPlaces?`Places I enjoy: ${story.familiarPlaces}`:"";
  const phrase=document.querySelector("#tvPhrase");phrase.hidden=!(story.familiarPhrase&&story.phraseMeaning);
  document.querySelector("#tvPhraseText").textContent=story.familiarPhrase||"";
  document.querySelector("#tvPhraseMeaning").textContent=story.phraseMeaning||"";
  const people=document.querySelector("#tvStoryPeople");people.replaceChildren();storyPeopleUrls.forEach(URL.revokeObjectURL);storyPeopleUrls=[];
  const entries=story.familiarPeople?.length?story.familiarPeople:visiblePhotos().slice(0,5).map(({detail})=>({name:detail.name,relationship:detail.relationship})).filter(person=>person.name);
  entries.forEach(person=>{
    const card=document.createElement("div"),caption=document.createElement("p");card.className="tv-story-person";
    const photo=current.photos[person.photoIndex];
    if(photo&&current.settings?.photo_details?.[person.photoIndex]?.visible!==false){const image=document.createElement("img"),url=URL.createObjectURL(photo);storyPeopleUrls.push(url);image.src=url;image.alt="";card.append(image)}
    caption.textContent=[person.name,person.relationship,person.note].filter(Boolean).join(" · ");card.append(caption);people.append(card);
  });
  if(storyPhotoUrl)URL.revokeObjectURL(storyPhotoUrl);
  const portrait=document.querySelector("#tvStoryImage"),firstPhoto=visiblePhotos()[0];storyPhotoUrl=firstPhoto?URL.createObjectURL(firstPhoto.file):null;
  portrait.hidden=!storyPhotoUrl;if(storyPhotoUrl)portrait.src=storyPhotoUrl;else portrait.removeAttribute("src");
  document.querySelector("#tvStoryButton").hidden=!(story.lifeStory||story.familiarPlaces||people.childElementCount||firstPhoto||!phrase.hidden);
  document.body.dataset.theme=current.settings?.theme||"original";
  const paused=Boolean(current.settings?.paused);
  document.querySelector("#pausedStage").hidden=!paused;
  if(paused){clearTimeout(channelTimer);releaseUrls();document.querySelectorAll("video,audio").forEach(media=>media.pause());mediaStage.hidden=true;helpStage.hidden=true;document.querySelector("#tvStoryStage").hidden=true;tvHome.hidden=true;mediaContent.innerHTML=""}
  else if(mediaStage.hidden&&helpStage.hidden&&document.querySelector("#tvStoryStage").hidden)tvHome.hidden=false;
  document.querySelector(".clock").hidden=current.settings?.show_clock===false;
  const home=document.querySelector("#homeToday");
  home.hidden=!validHomeToday();
  if(!home.hidden){document.querySelector("#homeTodayText").textContent=current.settings.home_today.message;document.querySelector("#homeTodaySender").textContent=`From ${current.settings.home_today.from}`}
  const guide=document.querySelector("#guidePrompt");
  guide.hidden=current.settings?.interaction_mode!=="guide";
  if(!guide.hidden)document.querySelector("#guidePromptText").textContent=mediaLabel(suggestedType());
  updatePhotoTile();if(!paused)scheduleChannel();
}

async function loadLocal(){
  const snapshot=await localValue("snapshot");
  if(snapshot){current=snapshot;applyProfile();return}
  const [profile,photos,video,audio,settings]=await Promise.all([localValue("profile"),localValue("photos"),localValue("video"),localValue("audio"),localValue("settings")]);
  current={profile:profile||current.profile,photos:photos||[],video:video||null,audio:audio||null,settings:settings||current.settings};
  applyProfile();
}

async function loadCloud(){
  if(cloudLoadPending){cloudReloadRequested=true;return}
  cloudLoadPending=true;
  try{
    do{cloudReloadRequested=false;await fetchCloud()}while(cloudReloadRequested);
  }finally{cloudLoadPending=false}
}
async function fetchCloud(){
  const {client}=window.ezCloud;
  const session=(await client.auth.getSession()).data.session||((await client.auth.signInAnonymously()).data.session);
  if(!session)throw new Error("TV sign-in failed");
  const device=await client.from("devices").select("resident_id").eq("auth_user_id",session.user.id).maybeSingle();
  if(device.error)throw device.error;
  if(!device.data?.resident_id){
    document.querySelector("#tvScreen").hidden=true;
    if(!pairingStarted){
      const pairing=await client.rpc("get_or_create_pair_code");
      if(pairing.error)throw pairing.error;
      document.querySelector("#pairCode").textContent=pairing.data;
      pairingStarted=true;
    }
    document.querySelector("#pairScreen").hidden=false;
    window.setTimeout(loadCloud,3500);
    return;
  }
  cloudResidentId=device.data.resident_id;
  pairingStarted=false;
  document.querySelector("#pairScreen").hidden=true;
  document.querySelector("#tvScreen").hidden=false;
  const [residentResult,mediaResult]=await Promise.all([client.from("residents").select("name,help_message").eq("id",cloudResidentId).single(),client.from("media").select("*").eq("resident_id",cloudResidentId).order("sort_order")]);
  if(residentResult.error)throw residentResult.error;
  if(mediaResult.error)throw mediaResult.error;
  const decoded=window.ezCloud.decodeHelpMessage(residentResult.data.help_message);
  const settings=decoded.settings||await window.ezCloud.getSettings(cloudResidentId);
  const next={profile:{name:residentResult.data.name,help:decoded.help},settings:settings||current.settings,photos:[],video:null,audio:null};
  for(const item of window.ezCloud.activeMedia(mediaResult.data,next.settings)){
    const signed=await client.storage.from("resident-media").createSignedUrl(item.storage_path,3600);
    if(signed.error)throw signed.error;
    const response=await fetch(signed.data.signedUrl);
    if(!response.ok)throw new Error("Media unavailable");
    const blob=await response.blob();
    const media=new File([blob],item.title,{type:blob.type||"application/octet-stream"});
    if(item.type==="photo")next.photos.push(media);else next[item.type]=media;
  }
  await putLocal("snapshot",next);
  if(!mediaStage.hidden||!helpStage.hidden)closeMedia();
  current=next;
  applyProfile();
  client.rpc("touch_device").catch(()=>{});
  quietStatus.textContent="Updated";
  setTimeout(()=>quietStatus.textContent="",1200);
}

function mediaUrl(item){return makeUrl(item)}
function openMedia(type){
  if(current.settings?.paused)return;
  if(type==="music")type="audio";
  releaseUrls();photoIndex=0;tvHome.hidden=true;helpStage.hidden=true;mediaStage.hidden=false;
  if(type==="photos"){
    const photos=visiblePhotos();
    if(!photos.length){mediaContent.innerHTML=emptyMarkup("Family photos");return}
    const render=()=>{releaseUrls();const entry=photos[photoIndex];const caption=current.settings?.show_captions===false?"":[entry.detail.name,entry.detail.relationship].filter(Boolean).join(" · ");mediaContent.innerHTML=`<div class="photo-view"><img alt="Family photograph ${photoIndex+1}"><div class="photo-controls"><button id="previousPhoto" aria-label="Previous photograph">←</button><span>${photoIndex+1} of ${photos.length}</span><button id="nextPhoto" aria-label="Next photograph">→</button></div><p class="photo-caption"></p></div>`;mediaContent.querySelector("img").src=mediaUrl(entry.file);mediaContent.querySelector(".photo-caption").textContent=caption;document.querySelector("#previousPhoto").onclick=()=>{photoIndex=(photoIndex-1+photos.length)%photos.length;render()};document.querySelector("#nextPhoto").onclick=()=>{photoIndex=(photoIndex+1)%photos.length;render()}};
    render();return;
  }
  const item=current[type];
  if(!item){mediaContent.innerHTML=emptyMarkup(type==="video"?"Favourite show":"Relaxing music");return}
  const url=mediaUrl(item);
  mediaContent.innerHTML=type==="video"?`<video src="${url}" controls autoplay playsinline></video>`:`<audio src="${url}" controls autoplay></audio>`;
}
function closeMedia(){releaseUrls();document.querySelectorAll("video,audio").forEach(media=>media.pause());mediaStage.hidden=true;helpStage.hidden=true;document.querySelector("#tvStoryStage").hidden=true;tvHome.hidden=Boolean(current.settings?.paused);mediaContent.innerHTML=""}
function openHomeToday(){
  if(current.settings?.paused||!validHomeToday())return;
  clearTimeout(channelTimer);tvHome.hidden=true;helpStage.hidden=true;mediaStage.hidden=false;
  mediaContent.innerHTML=`<div class="home-message"><span>FROM HOME TODAY</span><h2>${escapeHtml(current.settings.home_today.message)}</h2><p>From ${escapeHtml(current.settings.home_today.from)}</p><button class="primary-button" id="closeHomeMessage">Back to choices</button></div>`;
  document.querySelector("#closeHomeMessage").onclick=closeMedia;
}
function escapeHtml(text){const div=document.createElement("div");div.textContent=text||"";return div.innerHTML}
function scheduleChannel(){
  clearTimeout(channelTimer);
  if(current.settings?.paused||current.settings?.interaction_mode!=="channel"||!current.settings?.channel_enabled)return;
  channelTimer=setTimeout(()=>{const type=suggestedType();if(type!=="quiet")openMedia(type)},12000);
}
document.querySelectorAll("[data-media]").forEach(button=>button.addEventListener("click",()=>openMedia(button.dataset.media)));
document.querySelector("#homeToday").addEventListener("click",openHomeToday);
document.querySelector("#tvStoryButton").addEventListener("click",()=>{if(current.settings?.paused)return;clearTimeout(channelTimer);tvHome.hidden=true;mediaStage.hidden=true;helpStage.hidden=true;document.querySelector("#tvStoryStage").hidden=false});
document.querySelector("#tvStoryBack").addEventListener("click",closeMedia);
document.querySelector("#backButton").addEventListener("click",closeMedia);
document.querySelector("#helpButton").addEventListener("click",()=>{if(current.settings?.paused)return;tvHome.hidden=true;mediaStage.hidden=true;helpStage.hidden=false});
document.querySelector("#closeHelp").addEventListener("click",closeMedia);
document.addEventListener("keydown",event=>{
  if(current.settings?.paused)return;
  if(event.key==="Escape"||event.key==="Backspace"||event.key==="Home"){event.preventDefault();closeMedia();return}
  if(!mediaStage.hidden||!helpStage.hidden||!document.querySelector("#tvStoryStage").hidden)return;
  const buttons=[...document.querySelectorAll(".tv-choices button:not([hidden])")];const active=document.activeElement;let index=buttons.indexOf(active);
  if(event.key==="ArrowRight"||event.key==="ArrowDown"){event.preventDefault();buttons[(index+1+buttons.length)%buttons.length]?.focus()}
  if(event.key==="ArrowLeft"||event.key==="ArrowUp"){event.preventDefault();buttons[(index-1+buttons.length)%buttons.length]?.focus()}
});
function updateClock(){const now=new Date();document.querySelector("#clockTime").textContent=now.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});document.querySelector("#clockDate").textContent=now.toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"}).toUpperCase()}
async function start(){
  updateClock();setInterval(updateClock,30000);
  if(window.ezCloud.configured){
    try{await loadCloud();window.ezCloud.client.channel("tv-updates").on("postgres_changes",{event:"*",schema:"public"},()=>loadCloud().catch(()=>{quietStatus.textContent="Using saved content"})).subscribe()}catch(error){quietStatus.textContent="Offline. Using saved content";await loadLocal()}
    setInterval(()=>{if(cloudResidentId)window.ezCloud.client.rpc("touch_device").catch(()=>{})},60000);
    window.addEventListener("online",()=>loadCloud().catch(()=>{quietStatus.textContent="Using saved content"}));
  }else await loadLocal();
  if("serviceWorker" in navigator)navigator.serviceWorker.register("service-worker.js").catch(()=>{});
}
start();

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
let savannahPhotoUrl=null;
let welcomePhotoUrl=null;
let quietPhotoUrl=null;
let photoIndex=0;
let photoGroup="all";
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
function visiblePhotos(){return current.photos.map((file,index)=>({file,index,detail:current.settings?.photo_details?.[index]||{}})).filter(item=>item.detail.visible!==false)}
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
  const phrase=document.querySelector("#tvPhrase");phrase.hidden=true;
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
  document.querySelector("#tvStoryButton").hidden=!(story.lifeStory||story.familiarPlaces||people.childElementCount||firstPhoto);
  if(welcomePhotoUrl)URL.revokeObjectURL(welcomePhotoUrl);
  const welcome=document.querySelector("#welcomePhoto"),familiarFace=visiblePhotos().find(item=>item.detail.category==="people")||firstPhoto;welcomePhotoUrl=familiarFace?URL.createObjectURL(familiarFace.file):null;
  welcome.hidden=!welcomePhotoUrl;if(welcomePhotoUrl)welcome.src=welcomePhotoUrl;else welcome.removeAttribute("src");
  if(quietPhotoUrl)URL.revokeObjectURL(quietPhotoUrl);
  const quiet=document.querySelector("#quietPhoto"),quietChoice=visiblePhotos().find(item=>item.detail.category==="place")||firstPhoto;
  quietPhotoUrl=quietChoice?URL.createObjectURL(quietChoice.file):null;
  quiet.hidden=!quietPhotoUrl;if(quietPhotoUrl)quiet.src=quietPhotoUrl;else quiet.removeAttribute("src");
  document.querySelector("#quietMusic").hidden=!current.audio;
  if(savannahPhotoUrl)URL.revokeObjectURL(savannahPhotoUrl);
  const savannah=story.familiarPeople?.find(person=>/^savannah\b/i.test(person.name||""));
  const familiarPhoto=current.photos[savannah?.photoIndex];
  const savannahImage=document.querySelector("#savannahPhoto");
  savannahPhotoUrl=familiarPhoto&&current.settings?.photo_details?.[savannah.photoIndex]?.visible!==false?URL.createObjectURL(familiarPhoto):null;
  savannahImage.hidden=!savannahPhotoUrl;
  if(savannahPhotoUrl)savannahImage.src=savannahPhotoUrl;else savannahImage.removeAttribute("src");
  document.querySelector("#savannahText").textContent=current.settings?.savannah_note?.text||"You are loved, Wanda.";
  const voice=document.querySelector("#savannahAudio"),recording=current.settings?.savannah_note?.audio||"";
  voice.hidden=!/^data:audio\//.test(recording);
  if(!voice.hidden)voice.src=recording;else voice.removeAttribute("src");
  document.body.dataset.theme=current.settings?.theme||"original";
  const paused=Boolean(current.settings?.paused);
  document.querySelector("#pausedStage").hidden=!paused;
  if(paused){clearTimeout(channelTimer);releaseUrls();document.querySelectorAll("video,audio").forEach(media=>media.pause());mediaStage.hidden=true;helpStage.hidden=true;document.querySelector("#tvStoryStage").hidden=true;document.querySelector("#savannahStage").hidden=true;document.querySelector("#quietStage").hidden=true;tvHome.hidden=true;mediaContent.innerHTML=""}
  else if(mediaStage.hidden&&helpStage.hidden&&document.querySelector("#tvStoryStage").hidden&&document.querySelector("#savannahStage").hidden&&document.querySelector("#quietStage").hidden)tvHome.hidden=false;
  document.querySelector(".clock").hidden=current.settings?.show_clock===false;
  const home=document.querySelector("#homeToday");
  home.hidden=!validHomeToday();
  if(!home.hidden){document.querySelector("#homeTodayText").textContent=current.settings.home_today.message;document.querySelector("#homeTodaySender").textContent=`From ${current.settings.home_today.from}`}
  const guide=document.querySelector("#guidePrompt");
  guide.hidden=current.settings?.interaction_mode!=="guide";
  if(!guide.hidden)document.querySelector("#guidePromptText").textContent=mediaLabel(suggestedType());
  const watch=current.settings?.watch_together;
  document.querySelector("#watchInvite").hidden=!watch||Date.now()-new Date(watch.at).getTime()>10*60*1000;
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
  if(!mediaStage.hidden||!helpStage.hidden||!document.querySelector("#savannahStage").hidden||!document.querySelector("#quietStage").hidden)closeMedia();
  current=next;
  applyProfile();
  client.rpc("touch_device").catch(()=>{});
  quietStatus.textContent="Updated";
  setTimeout(()=>quietStatus.textContent="",1200);
}

function mediaUrl(item){return makeUrl(item)}
function renderPhotoMedia(){
  releaseUrls();
  const all=visiblePhotos();
  const groups=[{key:"all",label:"All photos"},{key:"pet",label:"Princess & pets"},{key:"place",label:"Familiar places"},{key:"smile",label:"Things that make me smile"}].filter(group=>group.key==="all"||all.some(item=>item.detail.category===group.key));
  const photos=photoGroup==="all"?all:all.filter(item=>item.detail.category===photoGroup);
  if(!photos.length){mediaContent.innerHTML=emptyMarkup("Family photos");return}
  photoIndex=Math.min(photoIndex,photos.length-1);
  const entry=photos[photoIndex];
  mediaContent.innerHTML='<div class="photo-view"><div class="photo-groups" role="group" aria-label="Choose photographs"></div><img alt="Family photograph"><p class="photo-caption"></p><div class="photo-story" hidden></div><div class="photo-controls"><button id="previousPhoto" aria-label="Previous photograph">←</button><span></span><button id="nextPhoto" aria-label="Next photograph">→</button></div></div>';
  const view=mediaContent.querySelector(".photo-view");view.querySelector("img").src=mediaUrl(entry.file);
  view.querySelector(".photo-caption").textContent=current.settings?.show_captions===false?"":[entry.detail.name,entry.detail.relationship].filter(Boolean).join(" · ");
  view.querySelector(".photo-controls span").textContent=`${photoIndex+1} of ${photos.length}`;
  groups.forEach(group=>{const button=document.createElement("button");button.type="button";button.textContent=group.label;button.className=photoGroup===group.key?"selected":"";button.setAttribute("aria-pressed",String(photoGroup===group.key));button.addEventListener("click",()=>{photoGroup=group.key;photoIndex=0;renderPhotoMedia()});view.querySelector(".photo-groups").append(button)});
  if(current.video&&current.settings?.video_mood==="smile"){
    const clip=document.createElement("button");clip.type="button";clip.textContent="Funny clip";clip.addEventListener("click",()=>openMedia("video"));view.querySelector(".photo-groups").append(clip);
  }
  const story=view.querySelector(".photo-story");story.hidden=!(entry.detail.story||/^data:audio\//.test(entry.detail.voice||""));
  if(!story.hidden){if(entry.detail.story){const words=document.createElement("p");words.textContent=entry.detail.story;story.append(words)}if(/^data:audio\//.test(entry.detail.voice||"")){const voice=document.createElement("audio");voice.controls=true;voice.src=entry.detail.voice;voice.setAttribute("aria-label","Hear the story behind this photograph");story.append(voice)}}
  view.querySelector("#previousPhoto").onclick=()=>{photoIndex=(photoIndex-1+photos.length)%photos.length;renderPhotoMedia()};
  view.querySelector("#nextPhoto").onclick=()=>{photoIndex=(photoIndex+1)%photos.length;renderPhotoMedia()};
}
function openMedia(type,options={}){
  if(current.settings?.paused)return;
  if(type==="music")type="audio";
  releaseUrls();photoIndex=options.photoIndex??0;photoGroup=options.group||"all";tvHome.hidden=true;helpStage.hidden=true;document.querySelector("#quietStage").hidden=true;mediaStage.hidden=false;
  if(type==="photos"){renderPhotoMedia();return}
  const item=current[type];
  if(!item){mediaContent.innerHTML=emptyMarkup(type==="video"?"Favourite show":"Relaxing music");return}
  const url=mediaUrl(item);
  mediaContent.innerHTML='<div class="repeat-media"><div class="repeat-player"></div><button class="repeat-button" type="button">↺ Play that again</button></div>';
  const media=document.createElement(type==="video"?"video":"audio");media.src=url;media.controls=true;media.playsInline=true;media.autoplay=true;
  mediaContent.querySelector(".repeat-player").append(media);
  mediaContent.querySelector(".repeat-button").addEventListener("click",()=>{media.currentTime=0;media.play().catch(()=>{})});
}
function closeMedia(){releaseUrls();document.querySelectorAll("video,audio").forEach(media=>media.pause());mediaStage.hidden=true;helpStage.hidden=true;document.querySelector("#tvStoryStage").hidden=true;document.querySelector("#savannahStage").hidden=true;document.querySelector("#quietStage").hidden=true;tvHome.hidden=Boolean(current.settings?.paused);mediaContent.innerHTML=""}
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
document.querySelector("#watchInvite").addEventListener("click",()=>{
  const invite=current.settings?.watch_together;
  if(!invite||Date.now()-new Date(invite.at).getTime()>10*60*1000)return;
  const selected=visiblePhotos().findIndex(item=>item.index===invite.photoIndex);
  openMedia(invite.type,{photoIndex:Math.max(0,selected)});
});
document.querySelector("#quietButton").addEventListener("click",()=>{if(current.settings?.paused)return;clearTimeout(channelTimer);tvHome.hidden=true;mediaStage.hidden=true;helpStage.hidden=true;document.querySelector("#quietStage").hidden=false});
document.querySelector("#quietBack").addEventListener("click",closeMedia);
document.querySelector("#quietMusic").addEventListener("click",()=>openMedia("audio"));
document.querySelector("#whereSavannah").addEventListener("click",()=>{if(current.settings?.paused)return;clearTimeout(channelTimer);tvHome.hidden=true;mediaStage.hidden=true;helpStage.hidden=true;document.querySelector("#tvStoryStage").hidden=true;document.querySelector("#replyStatus").textContent="";document.querySelector("#savannahStage").hidden=false});
document.querySelector("#savannahBack").addEventListener("click",closeMedia);
document.querySelector("#replyHeart").addEventListener("click",async()=>{
  const reply={kind:"heart",at:new Date().toISOString()};
  try{await putLocal("resident_reply",reply);document.querySelector("#replyStatus").textContent="A heart for Savannah is saved here. This pilot does not send it to her phone yet."}
  catch{document.querySelector("#replyStatus").textContent="That didn’t save. Please try again."}
});
document.querySelector("#tvStoryButton").addEventListener("click",()=>{if(current.settings?.paused)return;clearTimeout(channelTimer);tvHome.hidden=true;mediaStage.hidden=true;helpStage.hidden=true;document.querySelector("#tvStoryStage").hidden=false});
document.querySelector("#tvStoryBack").addEventListener("click",closeMedia);
document.querySelector("#backButton").addEventListener("click",closeMedia);
document.querySelector("#helpButton").addEventListener("click",()=>{if(current.settings?.paused)return;tvHome.hidden=true;mediaStage.hidden=true;helpStage.hidden=false});
document.querySelector("#closeHelp").addEventListener("click",closeMedia);
document.addEventListener("keydown",event=>{
  if(current.settings?.paused)return;
  if(event.key==="Escape"||event.key==="Backspace"||event.key==="Home"){event.preventDefault();closeMedia();return}
  if(!mediaStage.hidden||!helpStage.hidden||!document.querySelector("#tvStoryStage").hidden||!document.querySelector("#savannahStage").hidden||!document.querySelector("#quietStage").hidden)return;
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
start().catch(()=>{quietStatus.textContent="Using familiar choices";applyProfile()});

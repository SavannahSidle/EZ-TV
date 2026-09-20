const DB_NAME="eztv-local-prototype";
const STORE_NAME="media";
const tvHome=document.querySelector("#tvHome");
const mediaStage=document.querySelector("#mediaStage");
const mediaContent=document.querySelector("#mediaContent");
const helpStage=document.querySelector("#helpStage");
const quietStatus=document.querySelector("#quietStatus");
let current={profile:{name:"Wanda",help:"You are safe. Someone from your care team is nearby."},photos:[],video:null,audio:null};
let objectUrls=[];
let tilePhotoUrl=null;
let photoIndex=0;
let cloudResidentId=null;
let pairingStarted=false;

function openDatabase(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE_NAME);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function localValue(key){const db=await openDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,"readonly");const request=tx.objectStore(STORE_NAME).get(key);request.onsuccess=()=>{db.close();resolve(request.result)};request.onerror=()=>{db.close();reject(request.error)}})}
async function putLocal(key,value){const db=await openDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,"readwrite");tx.objectStore(STORE_NAME).put(value,key);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
function releaseUrls(){objectUrls.forEach(URL.revokeObjectURL);objectUrls=[]}
function makeUrl(file){const url=URL.createObjectURL(file);objectUrls.push(url);return url}
function emptyMarkup(label){return `<div class="empty-state"><span>+</span><h2>${label} is not ready yet</h2><p>Please choose something else.</p></div>`}
function updatePhotoTile(){
  const image=document.querySelector("#photoTileImage");
  const fallback=document.querySelector("#photoTileFallback");
  if(tilePhotoUrl)URL.revokeObjectURL(tilePhotoUrl);
  tilePhotoUrl=null;
  if(current.photos.length){
    tilePhotoUrl=URL.createObjectURL(current.photos[0]);
    image.src=tilePhotoUrl;
    image.hidden=false;
    fallback.hidden=true;
  }else{
    image.removeAttribute("src");
    image.hidden=true;
    fallback.hidden=false;
  }
}
function applyProfile(){document.querySelector("#tvResidentName").textContent=current.profile.name;document.querySelector("#helpText").textContent=current.profile.help;updatePhotoTile()}

async function loadLocal(){
  const [profile,photos,video,audio]=await Promise.all([localValue("profile"),localValue("photos"),localValue("video"),localValue("audio")]);
  current={profile:profile||current.profile,photos:photos||[],video:video||null,audio:audio||null};
  applyProfile();
}

async function loadCloud(){
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
  await client.rpc("touch_device");
  current.profile={name:residentResult.data.name,help:residentResult.data.help_message};
  current.photos=[];current.video=null;current.audio=null;
  for(const item of mediaResult.data){
    const signed=await client.storage.from("resident-media").createSignedUrl(item.storage_path,3600);
    if(signed.error)continue;
    const response=await fetch(signed.data.signedUrl);
    if(!response.ok)continue;
    const blob=await response.blob();
    const media=new File([blob],item.title,{type:blob.type||"application/octet-stream"});
    if(item.type==="photo")current.photos.push(media);else current[item.type]=media;
  }
  await Promise.all([putLocal("profile",current.profile),putLocal("photos",current.photos),putLocal("video",current.video),putLocal("audio",current.audio)]);
  applyProfile();
  quietStatus.textContent="Updated";
  setTimeout(()=>quietStatus.textContent="",1200);
}

function mediaUrl(item){return makeUrl(item)}
function openMedia(type){
  releaseUrls();photoIndex=0;tvHome.hidden=true;helpStage.hidden=true;mediaStage.hidden=false;
  if(type==="photos"){
    if(!current.photos.length){mediaContent.innerHTML=emptyMarkup("Family photos");return}
    const render=()=>{mediaContent.innerHTML=`<div class="photo-view"><img src="${mediaUrl(current.photos[photoIndex])}" alt="Family photograph ${photoIndex+1}"><div class="photo-controls"><button id="previousPhoto" aria-label="Previous photograph">←</button><span>${photoIndex+1} of ${current.photos.length}</span><button id="nextPhoto" aria-label="Next photograph">→</button></div></div>`;document.querySelector("#previousPhoto").onclick=()=>{photoIndex=(photoIndex-1+current.photos.length)%current.photos.length;render()};document.querySelector("#nextPhoto").onclick=()=>{photoIndex=(photoIndex+1)%current.photos.length;render()}};
    render();return;
  }
  const item=current[type];
  if(!item){mediaContent.innerHTML=emptyMarkup(type==="video"?"Favourite show":"Relaxing music");return}
  const url=mediaUrl(item);
  mediaContent.innerHTML=type==="video"?`<video src="${url}" controls autoplay playsinline></video>`:`<audio src="${url}" controls autoplay></audio>`;
}
function closeMedia(){releaseUrls();document.querySelectorAll("video,audio").forEach(media=>media.pause());mediaStage.hidden=true;helpStage.hidden=true;tvHome.hidden=false;mediaContent.innerHTML=""}
document.querySelectorAll("[data-media]").forEach(button=>button.addEventListener("click",()=>openMedia(button.dataset.media)));
document.querySelector("#backButton").addEventListener("click",closeMedia);
document.querySelector("#helpButton").addEventListener("click",()=>{tvHome.hidden=true;mediaStage.hidden=true;helpStage.hidden=false});
document.querySelector("#closeHelp").addEventListener("click",closeMedia);
function updateClock(){const now=new Date();document.querySelector("#clockTime").textContent=now.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});document.querySelector("#clockDate").textContent=now.toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"}).toUpperCase()}
async function start(){
  updateClock();setInterval(updateClock,30000);
  if(window.ezCloud.configured){
    try{await loadCloud();window.ezCloud.client.channel("tv-updates").on("postgres_changes",{event:"*",schema:"public"},()=>loadCloud().catch(()=>{})).subscribe()}catch(error){quietStatus.textContent="Offline. Using saved content";await loadLocal()}
  }else await loadLocal();
  if("serviceWorker" in navigator)navigator.serviceWorker.register("service-worker.js").catch(()=>{});
}
start();

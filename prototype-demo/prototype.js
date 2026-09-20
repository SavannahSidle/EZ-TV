const DB_NAME="eztv-local-prototype";
const STORE_NAME="media";
const screenButtons=[...document.querySelectorAll("[data-screen]")];
const setupScreen=document.querySelector("#setupScreen");
const tvScreen=document.querySelector("#tvScreen");
const mediaStage=document.querySelector("#mediaStage");
const mediaContent=document.querySelector("#mediaContent");
const tvHome=document.querySelector("#tvHome");
const helpStage=document.querySelector("#helpStage");
const toast=document.querySelector("#toast");
let objectUrls=[];
let photoIndex=0;

function openDatabase(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>request.result.createObjectStore(STORE_NAME);
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}

async function putValue(key,value){
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const transaction=db.transaction(STORE_NAME,"readwrite");
    transaction.objectStore(STORE_NAME).put(value,key);
    transaction.oncomplete=()=>{db.close();resolve()};
    transaction.onerror=()=>{db.close();reject(transaction.error)};
  });
}

async function getValue(key){
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const transaction=db.transaction(STORE_NAME,"readonly");
    const request=transaction.objectStore(STORE_NAME).get(key);
    request.onsuccess=()=>{db.close();resolve(request.result)};
    request.onerror=()=>{db.close();reject(request.error)};
  });
}

async function clearDatabase(){
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const transaction=db.transaction(STORE_NAME,"readwrite");
    transaction.objectStore(STORE_NAME).clear();
    transaction.oncomplete=()=>{db.close();resolve()};
    transaction.onerror=()=>{db.close();reject(transaction.error)};
  });
}

function showToast(message){
  toast.textContent=message;
  toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout=setTimeout(()=>toast.classList.remove("show"),2200);
}

function setScreen(name){
  const isSetup=name==="setup";
  setupScreen.classList.toggle("active-screen",isSetup);
  tvScreen.classList.toggle("active-screen",!isSetup);
  screenButtons.forEach(button=>button.classList.toggle("active",button.dataset.screen===name));
  closeMedia();
  if(!isSetup)loadProfile();
}

function updateFileStatus(input,status,multiple=false){
  const files=[...input.files];
  status.textContent=files.length?multiple?`${files.length} photograph${files.length===1?"":"s"} selected.`:files[0].name:status.dataset.empty;
}

async function loadProfile(){
  const profile=await getValue("profile")||{name:"Wanda",help:"You are safe. Someone from your care team is nearby."};
  document.querySelector("#tvResidentName").textContent=profile.name;
  document.querySelector("#helpText").textContent=profile.help;
}

function releaseUrls(){objectUrls.forEach(URL.revokeObjectURL);objectUrls=[]}
function makeUrl(file){const url=URL.createObjectURL(file);objectUrls.push(url);return url}

function emptyMarkup(label){
  return `<div class="empty-state"><span>+</span><h2>No ${label} added yet</h2><p>Add it from Caregiver Setup.</p></div>`;
}

async function openMedia(type){
  releaseUrls();
  photoIndex=0;
  tvHome.hidden=true;
  helpStage.hidden=true;
  mediaStage.hidden=false;
  if(type==="photos"){
    const photos=await getValue("photos")||[];
    if(!photos.length){mediaContent.innerHTML=emptyMarkup("family photos");return}
    const renderPhoto=()=>{
      const url=makeUrl(photos[photoIndex]);
      mediaContent.innerHTML=`<div class="photo-view"><img src="${url}" alt="Family photograph ${photoIndex+1}"><div class="photo-controls"><button id="previousPhoto" aria-label="Previous photograph">←</button><span>${photoIndex+1} of ${photos.length}</span><button id="nextPhoto" aria-label="Next photograph">→</button></div></div>`;
      document.querySelector("#previousPhoto").onclick=()=>{releaseUrls();photoIndex=(photoIndex-1+photos.length)%photos.length;renderPhoto()};
      document.querySelector("#nextPhoto").onclick=()=>{releaseUrls();photoIndex=(photoIndex+1)%photos.length;renderPhoto()};
    };
    renderPhoto();
    return;
  }
  const file=await getValue(type);
  if(!file){mediaContent.innerHTML=emptyMarkup(type==="video"?"favourite show":"relaxing music");return}
  const url=makeUrl(file);
  mediaContent.innerHTML=type==="video"?`<video src="${url}" controls autoplay playsinline></video>`:`<audio src="${url}" controls autoplay></audio>`;
}

function closeMedia(){
  releaseUrls();
  document.querySelectorAll("video,audio").forEach(media=>media.pause());
  mediaStage.hidden=true;
  helpStage.hidden=true;
  tvHome.hidden=false;
  mediaContent.innerHTML="";
}

screenButtons.forEach(button=>button.addEventListener("click",()=>setScreen(button.dataset.screen)));
document.querySelectorAll("[data-media]").forEach(button=>button.addEventListener("click",()=>openMedia(button.dataset.media)));
document.querySelector("#backButton").addEventListener("click",closeMedia);
document.querySelector("#helpButton").addEventListener("click",()=>{tvHome.hidden=true;mediaStage.hidden=true;helpStage.hidden=false});
document.querySelector("#closeHelp").addEventListener("click",closeMedia);

const photoInput=document.querySelector("#photoInput");
const videoInput=document.querySelector("#videoInput");
const audioInput=document.querySelector("#audioInput");
const photoStatus=document.querySelector("#photoStatus");
const videoStatus=document.querySelector("#videoStatus");
const audioStatus=document.querySelector("#audioStatus");
[photoStatus,videoStatus,audioStatus].forEach(element=>element.dataset.empty=element.textContent);
photoInput.addEventListener("change",()=>updateFileStatus(photoInput,photoStatus,true));
videoInput.addEventListener("change",()=>updateFileStatus(videoInput,videoStatus));
audioInput.addEventListener("change",()=>updateFileStatus(audioInput,audioStatus));

document.querySelector("#setupForm").addEventListener("submit",async event=>{
  event.preventDefault();
  const button=event.submitter;
  button.disabled=true;
  button.textContent="Saving…";
  try{
    await putValue("profile",{name:document.querySelector("#residentName").value.trim()||"Wanda",help:document.querySelector("#helpMessage").value.trim()||"You are safe. Someone from your care team is nearby."});
    if(photoInput.files.length)await putValue("photos",[...photoInput.files]);
    if(videoInput.files[0])await putValue("video",videoInput.files[0]);
    if(audioInput.files[0])await putValue("audio",audioInput.files[0]);
    document.querySelector("#saveStatus").textContent="Saved on this device.";
    showToast("Prototype saved");
    setScreen("tv");
  }catch(error){
    showToast("This browser could not save those files");
    document.querySelector("#saveStatus").textContent="Try smaller media files.";
  }finally{
    button.disabled=false;
    button.textContent="Save and open TV view";
  }
});

document.querySelector("#resetButton").addEventListener("click",async()=>{
  if(!confirm("Remove all locally saved prototype content?"))return;
  await clearDatabase();
  document.querySelector("#setupForm").reset();
  document.querySelector("#residentName").value="Wanda";
  document.querySelector("#helpMessage").value="You are safe. Someone from your care team is nearby.";
  [photoStatus,videoStatus,audioStatus].forEach(element=>element.textContent=element.dataset.empty);
  document.querySelector("#saveStatus").textContent="Stored only on this device.";
  showToast("Demo reset");
});

async function hydrateSetup(){
  const profile=await getValue("profile");
  if(profile){document.querySelector("#residentName").value=profile.name;document.querySelector("#helpMessage").value=profile.help}
  const [photos,video,audio]=await Promise.all([getValue("photos"),getValue("video"),getValue("audio")]);
  if(photos?.length)photoStatus.textContent=`${photos.length} saved photograph${photos.length===1?"":"s"}.`;
  if(video)videoStatus.textContent=`Saved: ${video.name}`;
  if(audio)audioStatus.textContent=`Saved: ${audio.name}`;
}

function updateClock(){
  const now=new Date();
  document.querySelector("#clockTime").textContent=now.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
  document.querySelector("#clockDate").textContent=now.toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"}).toUpperCase();
}

hydrateSetup();
loadProfile();
updateClock();
setInterval(updateClock,30000);

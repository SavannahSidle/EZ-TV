const DB_NAME="eztv-local-prototype";
const STORE_NAME="media";
let workingPhotos=[];
let workingVideo=null;
let workingAudio=null;
let thumbnailUrls=[];
let previewUrl=null;
let cloudResident=null;
let cloudSession=null;

const $=selector=>document.querySelector(selector);
const photoInput=$("#photoInput");
const videoInput=$("#videoInput");
const audioInput=$("#audioInput");
const photoStatus=$("#photoStatus");
const videoStatus=$("#videoStatus");
const audioStatus=$("#audioStatus");

function openDatabase(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>request.result.createObjectStore(STORE_NAME);
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
async function putValue(key,value){const db=await openDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,"readwrite");tx.objectStore(STORE_NAME).put(value,key);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
async function getValue(key){const db=await openDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,"readonly");const request=tx.objectStore(STORE_NAME).get(key);request.onsuccess=()=>{db.close();resolve(request.result)};request.onerror=()=>{db.close();reject(request.error)}})}
async function clearDatabase(){const db=await openDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,"readwrite");tx.objectStore(STORE_NAME).clear();tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}

function showToast(message){const toast=$("#toast");toast.textContent=message;toast.classList.add("show");clearTimeout(showToast.timeout);showToast.timeout=setTimeout(()=>toast.classList.remove("show"),2300)}
function setSync(message,attention=false){$("#syncLabel").textContent=message;$("#syncPill").classList.toggle("attention",attention)}
function fileName(file){return file?.name||"Saved media"}

function renderPhotoManager(){
  thumbnailUrls.forEach(URL.revokeObjectURL);thumbnailUrls=[];
  const manager=$("#photoManager");manager.innerHTML="";
  workingPhotos.forEach((photo,index)=>{
    const url=URL.createObjectURL(photo);thumbnailUrls.push(url);
    const item=document.createElement("div");item.className="photo-item";
    item.innerHTML=`<img src="${url}" alt="Photograph ${index+1}"><div class="photo-actions"><button type="button" data-action="left" aria-label="Move photograph ${index+1} left" ${index===0?"disabled":""}>←</button><button type="button" class="delete-photo" data-action="delete" aria-label="Delete photograph ${index+1}">Delete</button><button type="button" data-action="right" aria-label="Move photograph ${index+1} right" ${index===workingPhotos.length-1?"disabled":""}>→</button></div>`;
    item.querySelectorAll("button").forEach(button=>button.addEventListener("click",()=>{
      if(button.dataset.action==="delete")workingPhotos.splice(index,1);
      if(button.dataset.action==="left"&&index>0)[workingPhotos[index-1],workingPhotos[index]]=[workingPhotos[index],workingPhotos[index-1]];
      if(button.dataset.action==="right"&&index<workingPhotos.length-1)[workingPhotos[index+1],workingPhotos[index]]=[workingPhotos[index],workingPhotos[index+1]];
      renderPhotoManager();markUnsaved();
    }));
    manager.append(item);
  });
  $("#photoCount").textContent=`${workingPhotos.length} added`;
  photoStatus.textContent=workingPhotos.length?"Use the arrows to choose the order.":"No personal photos saved yet.";
}

function renderSingleMedia(type){
  const file=type==="video"?workingVideo:workingAudio;
  const preview=$(`#${type}Preview`);
  const remove=$(`#remove${type[0].toUpperCase()+type.slice(1)}`);
  const status=$(`#${type}Status`);
  if(type==="video"&&previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null}
  if(!file){
    preview.innerHTML=type==="video"?"<span>▶</span><p>No show added</p>":"<span>♪</span><p>No song added</p>";
    remove.hidden=true;
    status.textContent=type==="video"?"No video saved yet.":"No music saved yet.";
    return;
  }
  if(type==="video"){
    previewUrl=URL.createObjectURL(file);
    preview.innerHTML=`<video src="${previewUrl}" muted playsinline preload="metadata" aria-label="${fileName(file)}"></video>`;
  }else preview.innerHTML=`<span>♪</span><p>${fileName(file)}</p>`;
  remove.hidden=false;
  status.textContent=`Ready: ${fileName(file)}`;
}

function markUnsaved(){
  $("#saveStatus").textContent=window.ezCloud.configured&&cloudSession?"Changes have not been sent yet.":"Changes have not been saved yet.";
  setSync("Changes waiting");
}

async function saveLocal(){
  const profile={name:$("#residentName").value.trim()||"Wanda",help:$("#helpMessage").value.trim()||"You are safe. Someone from your care team is nearby."};
  await Promise.all([putValue("profile",profile),putValue("photos",workingPhotos),putValue("video",workingVideo),putValue("audio",workingAudio)]);
  return profile;
}

async function hydrateLocal(){
  const [profile,photos,video,audio]=await Promise.all([getValue("profile"),getValue("photos"),getValue("video"),getValue("audio")]);
  if(profile){$("#residentName").value=profile.name;$("#helpMessage").value=profile.help}
  workingPhotos=photos||[];workingVideo=video||null;workingAudio=audio||null;
  renderPhotoManager();renderSingleMedia("video");renderSingleMedia("audio");
}

async function urlToFile(item){
  const response=await fetch(item.url);
  if(!response.ok)throw new Error("Saved media could not be downloaded");
  const blob=await response.blob();
  return new File([blob],item.title||`${item.type}-${item.id}`,{type:blob.type||"application/octet-stream"});
}

async function hydrateCloud(){
  const media=await window.ezCloud.signedMedia(cloudResident.id);
  const files=await Promise.all(media.map(async item=>({...item,file:await urlToFile(item)})));
  $("#residentName").value=cloudResident.name;
  $("#helpMessage").value=cloudResident.help_message;
  workingPhotos=files.filter(item=>item.type==="photo").map(item=>item.file);
  workingVideo=files.find(item=>item.type==="video")?.file||null;
  workingAudio=files.find(item=>item.type==="audio")?.file||null;
  renderPhotoManager();renderSingleMedia("video");renderSingleMedia("audio");
  await saveLocal();
}

async function refreshDevices(){
  if(!cloudResident)return;
  const devices=await window.ezCloud.devices(cloudResident.id);
  const list=$("#deviceList");list.innerHTML="";
  if(!devices.length){list.innerHTML="<p>No screen paired yet.</p>";return}
  devices.forEach((device,index)=>{
    const row=document.createElement("div");row.className="device-row";
    const seen=device.last_seen?new Date(device.last_seen).toLocaleString():"Waiting for first connection";
    row.innerHTML=`<div><b>Resident screen ${index+1}</b><small>Last connected: ${seen}</small></div><button type="button">Disconnect</button>`;
    row.querySelector("button").addEventListener("click",async()=>{
      if(!confirm("Disconnect this Resident View? It will need a new pairing code."))return;
      await window.ezCloud.disconnectDevice(device.id);await refreshDevices();showToast("Screen disconnected");
    });
    list.append(row);
  });
}

photoInput.addEventListener("change",()=>{workingPhotos.push(...photoInput.files);photoInput.value="";renderPhotoManager();markUnsaved()});
videoInput.addEventListener("change",()=>{workingVideo=videoInput.files[0]||null;videoInput.value="";renderSingleMedia("video");markUnsaved()});
audioInput.addEventListener("change",()=>{workingAudio=audioInput.files[0]||null;audioInput.value="";renderSingleMedia("audio");markUnsaved()});
$("#removeVideo").addEventListener("click",()=>{workingVideo=null;renderSingleMedia("video");markUnsaved()});
$("#removeAudio").addEventListener("click",()=>{workingAudio=null;renderSingleMedia("audio");markUnsaved()});
$("#residentName").addEventListener("input",markUnsaved);
$("#helpMessage").addEventListener("input",markUnsaved);

$("#setupForm").addEventListener("submit",async event=>{
  event.preventDefault();const button=event.submitter;button.disabled=true;button.textContent="Sending…";
  try{
    const profile=await saveLocal();
    if(window.ezCloud.configured&&cloudSession&&cloudResident){
      setSync("Sending to TV");$("#saveStatus").textContent="Sending changes securely…";
      await window.ezCloud.uploadResident(cloudResident,profile,workingPhotos,workingVideo,workingAudio);
      cloudResident={...cloudResident,name:profile.name,help_message:profile.help};
      $("#saveStatus").textContent="Wanda’s TV is up to date.";setSync("TV up to date");showToast("Sent to Wanda’s TV");
    }else{$("#saveStatus").textContent="Saved for this browser preview.";setSync("Saved on this device");showToast("Saved on this device")}
  }catch(error){console.error(error);$("#saveStatus").textContent="Changes could not be sent. They remain safe on this device.";setSync("Needs attention",true);showToast("Could not send changes")}
  finally{button.disabled=false;button.textContent="Send to TV"}
});

$("#resetButton").addEventListener("click",async()=>{
  if(!confirm("Remove all content saved on this device?"))return;
  await clearDatabase();workingPhotos=[];workingVideo=null;workingAudio=null;
  $("#residentName").value="Wanda";$("#helpMessage").value="You are safe. Someone from your care team is nearby.";
  renderPhotoManager();renderSingleMedia("video");renderSingleMedia("audio");setSync("Saved on this device");showToast("Local prototype reset");
});

$("#pairButton").addEventListener("click",async()=>{
  const code=$("#pairCodeInput").value.trim();if(!/^\d{6}$/.test(code))return showToast("Enter the six-digit code");
  if(!cloudSession){$("#connectionMessage").textContent="Secure connection is still starting. Try once more.";return}
  const button=$("#pairButton");button.disabled=true;button.textContent="Pairing…";
  const result=await window.ezCloud.client.rpc("claim_pair_code_only",{p_code:code});
  button.disabled=false;button.textContent="Pair screen";
  if(result.error){$("#connectionMessage").textContent=result.error.message;return}
  if(!result.data){$("#connectionMessage").textContent="That code is invalid or expired.";return}
  cloudResident=await window.ezCloud.getResident(cloudSession.user);
  $("#pairCodeInput").value="";$("#connectionMessage").textContent="Resident View connected. The code has expired.";$("#accessSection").hidden=false;await hydrateCloud();await refreshDevices();setSync("TV connected");showToast("Resident View paired");
});

$("#inviteButton").addEventListener("click",async()=>{
  const email=$("#inviteEmail").value.trim();if(!email)return showToast("Enter the family member’s email");
  const result=await window.ezCloud.client.rpc("create_family_invite",{p_email:email,p_resident_id:cloudResident.id});
  if(result.error){$("#connectionMessage").textContent=result.error.message;return}
  const link=`${location.origin}${location.pathname}?invite=${result.data}`;
  await navigator.clipboard.writeText(link);$("#connectionMessage").textContent="Invitation link copied. It expires in seven days.";showToast("Invitation copied");
});

async function initializeCloud(){
  if(!window.ezCloud.configured)return;
  $("#connectionTitle").textContent="Pair with Wanda’s screen";
  $("#connectionCopy").textContent="Enter the six-digit code shown on the Resident View.";
  cloudSession=await window.ezCloud.session();
  if(!cloudSession){const auth=await window.ezCloud.client.auth.signInAnonymously();if(auth.error)throw auth.error;cloudSession=auth.data.session}
  cloudResident=await window.ezCloud.getResident(cloudSession.user);
  $("#pairForm").hidden=false;$("#pairCodeInput").disabled=false;$("#pairButton").disabled=false;$("#accessSection").hidden=!cloudResident;
  $("#connectionMessage").textContent="Ready to pair.";
  if(cloudResident){await hydrateCloud();await refreshDevices();setSync("Securely connected");$("#saveStatus").textContent="Wanda’s TV is up to date."}
  else setSync("Ready to pair");
}

window.addEventListener("offline",()=>setSync("Offline. Changes stay here",true));
window.addEventListener("online",()=>setSync(cloudSession?"Securely connected":"Saved on this device"));
window.addEventListener("beforeunload",()=>{thumbnailUrls.forEach(URL.revokeObjectURL);if(previewUrl)URL.revokeObjectURL(previewUrl)});

(async function start(){
  await hydrateLocal();
  try{await initializeCloud()}catch(error){console.error(error);$("#connectionMessage").textContent="Secure connection needs attention. Local content is still available.";setSync("Needs attention",true)}
  if("serviceWorker" in navigator)navigator.serviceWorker.register("service-worker.js").catch(()=>{});
})();

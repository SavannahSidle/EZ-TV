const DB_NAME="eztv-local-prototype";
const STORE_NAME="media";
let workingPhotos=[];
let photoDetails=[];
let familiarPeople=[];
let workingVideo=null;
let workingAudio=null;
let thumbnailUrls=[];
let previewUrl=null;
let cloudResident=null;
let cloudSession=null;
const DEFAULT_SETTINGS={
  theme:"original",
  interaction_mode:"choose",
  channel_enabled:false,
  show_clock:true,
  show_captions:true,
  paused:false,
  photo_details:[],
  life_profile:{preferredName:"Wanda",lifeStory:"",familiarPlaces:"",pets:"",familiarPhrase:"",phraseMeaning:"",familiarPeople:[],favouriteFoods:"",favouriteShows:"",conversationStarters:"",languages:"",culture:"",interests:"",staffProfileVisible:false},
  comfort_plan:{people:"",words:"You are safe. Savannah knows where you are.",actions:"",avoid:""},
  day_plan:{morning:"music",afternoon:"photos",evening:"video"},
  home_today:null,
  consent:{personalMedia:false,careTeam:false}
};
let workingSettings=structuredClone(DEFAULT_SETTINGS);

const $=selector=>document.querySelector(selector);
const photoInput=$("#photoInput");
const videoInput=$("#videoInput");
const audioInput=$("#audioInput");
const photoStatus=$("#photoStatus");
const videoStatus=$("#videoStatus");
const audioStatus=$("#audioStatus");
$("#useWandaPhrase").addEventListener("click",()=>{$("#familiarPhrase").value="Msit No’kmaq";$("#phraseMeaning").value="All my relations";markUnsaved()});

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

function value(id){return $(id)?.value?.trim?.()||""}
function checked(id){return Boolean($(id)?.checked)}
function radioValue(name,fallback){return document.querySelector(`input[name="${name}"]:checked`)?.value||fallback}
function setRadio(name,value){const input=document.querySelector(`input[name="${name}"][value="${value}"]`);if(input)input.checked=true}

function collectSettings(){
  workingSettings={
    ...workingSettings,
    theme:radioValue("residentTheme","original"),
    interaction_mode:radioValue("interactionMode","choose"),
    channel_enabled:checked("#channelEnabled"),
    show_clock:checked("#showClock"),
    show_captions:checked("#showCaptions"),
    photo_details:photoDetails.map(item=>({...item})),
    paused:Boolean(workingSettings.paused),
    life_profile:{preferredName:value("#preferredName")||value("#residentName")||"Wanda",lifeStory:value("#lifeStory"),familiarPlaces:value("#familiarPlaces"),pets:value("#pets"),familiarPhrase:value("#familiarPhrase"),phraseMeaning:value("#phraseMeaning"),familiarPeople:familiarPeople.map(person=>({...person})),favouriteFoods:value("#favouriteFoods"),favouriteShows:value("#favouriteShows"),conversationStarters:value("#conversationStarters"),languages:value("#languages"),culture:value("#culture"),interests:value("#interests"),staffProfileVisible:checked("#staffProfileVisible")},
    comfort_plan:{people:value("#comfortPeople"),words:value("#comfortWords"),actions:value("#comfortActions"),avoid:value("#comfortAvoid")},
    day_plan:{morning:$("#morningContent")?.value||"music",afternoon:$("#afternoonContent")?.value||"photos",evening:$("#eveningContent")?.value||"video"},
    consent:{personalMedia:checked("#consentPersonalMedia"),careTeam:checked("#consentCareTeam")}
  };
  return workingSettings;
}

function applySettings(settings){
  workingSettings={...structuredClone(DEFAULT_SETTINGS),...(settings||{}),life_profile:{...DEFAULT_SETTINGS.life_profile,...(settings?.life_profile||{})},comfort_plan:{...DEFAULT_SETTINGS.comfort_plan,...(settings?.comfort_plan||{})},day_plan:{...DEFAULT_SETTINGS.day_plan,...(settings?.day_plan||{})},consent:{...DEFAULT_SETTINGS.consent,...(settings?.consent||{})}};
  photoDetails=(workingSettings.photo_details||[]).map(item=>({name:item.name||"",relationship:item.relationship||"",visible:item.visible!==false}));
  setRadio("residentTheme",workingSettings.theme);setRadio("interactionMode",workingSettings.interaction_mode);
  $("#channelEnabled").checked=workingSettings.channel_enabled;$("#showClock").checked=workingSettings.show_clock;$("#showCaptions").checked=workingSettings.show_captions;
  const profile=workingSettings.life_profile;$("#preferredName").value=profile.preferredName||"Wanda";$("#lifeStory").value=profile.lifeStory;$("#familiarPlaces").value=profile.familiarPlaces;$("#pets").value=profile.pets;$("#familiarPhrase").value=profile.familiarPhrase||"";$("#phraseMeaning").value=profile.phraseMeaning||"";familiarPeople=(profile.familiarPeople||[]).map(person=>({...person}));renderPairedPeople();$("#favouriteFoods").value=profile.favouriteFoods;$("#favouriteShows").value=profile.favouriteShows;$("#conversationStarters").value=profile.conversationStarters;$("#languages").value=profile.languages;$("#culture").value=profile.culture;$("#interests").value=profile.interests;$("#staffProfileVisible").checked=profile.staffProfileVisible;
  const comfort=workingSettings.comfort_plan;$("#comfortPeople").value=comfort.people;$("#comfortWords").value=comfort.words;$("#comfortActions").value=comfort.actions;$("#comfortAvoid").value=comfort.avoid;
  $("#morningContent").value=workingSettings.day_plan.morning;$("#afternoonContent").value=workingSettings.day_plan.afternoon;$("#eveningContent").value=workingSettings.day_plan.evening;
  $("#consentPersonalMedia").checked=workingSettings.consent.personalMedia;$("#consentCareTeam").checked=workingSettings.consent.careTeam;
  renderHomeTodayStatus();
  renderPauseStatus();
}

function renderPairedPeople(){
  const list=$("#pairedPeopleList");list.replaceChildren();
  familiarPeople.forEach((person,index)=>{
    const row=document.createElement("div"),description=document.createElement("span"),remove=document.createElement("button");
    description.textContent=`${person.name} · ${person.relationship}${person.note?` · ${person.note}`:""}`;
    remove.type="button";remove.textContent="Remove";remove.setAttribute("aria-label",`Remove ${person.name}`);
    remove.addEventListener("click",()=>{familiarPeople.splice(index,1);renderPairedPeople();markUnsaved();$("#setupForm").requestSubmit()});
    row.append(description,remove);list.append(row);
  });
}

$("#pairedAddPerson").addEventListener("click",()=>{
  const name=value("#pairedPersonName"),relationship=value("#pairedPersonRelationship"),note=value("#pairedPersonNote"),file=$("#pairedPersonPhoto").files[0];
  if(!name||!relationship){showToast("Add a name and relationship");return}
  if(file&&(!file.type.startsWith("image/")||file.size>8*1024*1024)){showToast("Choose an image under 8 MB");return}
  const photoIndex=file?workingPhotos.length:null;
  if(file){workingPhotos.push(file);photoDetails.push({name,relationship,visible:true});renderPhotoManager()}
  familiarPeople.push({name,relationship,note,photoIndex});renderPairedPeople();
  ["#pairedPersonName","#pairedPersonRelationship","#pairedPersonNote","#pairedPersonPhoto"].forEach(selector=>$(selector).value="");
  markUnsaved();$("#setupForm").requestSubmit();
});

function renderPauseStatus(){
  const paused=Boolean(workingSettings.paused);
  $("#pauseScreen").textContent=paused?"Resume screen":"Pause screen";
  $("#pauseScreen").setAttribute("aria-pressed",String(paused));
  $("#pauseStatus").textContent=paused?"Pause saved. Confirm it appears on Wanda’s screen.":"Screen is available.";
}

function renderHomeTodayStatus(){
  const item=workingSettings.home_today;
  if(!item){$("#homeTodayStatus").textContent="Nothing waiting.";return}
  const expires=new Date(item.expires_at);
  if(expires<=new Date()){workingSettings.home_today=null;$("#homeTodayStatus").textContent="Nothing waiting.";return}
  $("#homeTodayStatus").textContent=`From ${item.from}, available until ${expires.toLocaleDateString()}.`;
}

function showToast(message){const toast=$("#toast");toast.textContent=message;toast.classList.add("show");clearTimeout(showToast.timeout);showToast.timeout=setTimeout(()=>toast.classList.remove("show"),2300)}
function setSync(message,attention=false){$("#syncLabel").textContent=message;$("#syncPill").classList.toggle("attention",attention)}
function fileName(file){return file?.name||"Saved media"}

function renderPhotoManager(){
  thumbnailUrls.forEach(URL.revokeObjectURL);thumbnailUrls=[];
  const manager=$("#photoManager");manager.innerHTML="";
  workingPhotos.forEach((photo,index)=>{
    const url=URL.createObjectURL(photo);thumbnailUrls.push(url);
    const detail=photoDetails[index]||{name:"",relationship:"",visible:true};photoDetails[index]=detail;
    const item=document.createElement("div");item.className="photo-item";
    item.innerHTML=`<img alt="Photograph ${index+1}"><div class="photo-fields"><label>Name or place<input data-field="name" maxlength="80" placeholder="Wanda and Savannah"></label><label>Relationship or caption<input data-field="relationship" maxlength="100" placeholder="Daughter, at the lake"></label><label class="photo-visible"><input type="checkbox" data-field="visible"> Show on Wanda’s screen</label></div><div class="photo-actions"><button type="button" data-action="left" aria-label="Move photograph ${index+1} left" ${index===0?"disabled":""}>←</button><button type="button" data-action="right" aria-label="Move photograph ${index+1} right" ${index===workingPhotos.length-1?"disabled":""}>→</button><button type="button" class="delete-photo" data-action="delete" aria-label="Delete photograph ${index+1}">Delete</button></div>`;
    item.querySelector("img").src=url;
    item.querySelector('[data-field="name"]').value=detail.name;
    item.querySelector('[data-field="relationship"]').value=detail.relationship;
    item.querySelector('[data-field="visible"]').checked=detail.visible!==false;
    item.querySelectorAll("[data-field]").forEach(input=>input.addEventListener("change",async()=>{
      detail[input.dataset.field]=input.type==="checkbox"?input.checked:input.value.trim();
      if(input.dataset.field!=="visible"){markUnsaved();return}
      try{await saveLocal();if(cloudResident)await window.ezCloud.saveSettings(cloudResident.id,collectSettings());setSync(cloudResident?"TV updated":"Saved on this device");showToast(input.checked?"Photo shown":"Photo hidden")}
      catch(error){console.error(error);setSync("Needs attention",true);showToast("Could not update TV. Check the connection")}
    }));
    item.querySelectorAll("button").forEach(button=>button.addEventListener("click",()=>{
      if(button.dataset.action==="delete"){workingPhotos.splice(index,1);photoDetails.splice(index,1);familiarPeople.forEach(person=>{if(person.photoIndex===index)person.photoIndex=null;else if(person.photoIndex>index)person.photoIndex--})}
      if(button.dataset.action==="left"&&index>0){[workingPhotos[index-1],workingPhotos[index]]=[workingPhotos[index],workingPhotos[index-1]];[photoDetails[index-1],photoDetails[index]]=[photoDetails[index],photoDetails[index-1]];familiarPeople.forEach(person=>{if(person.photoIndex===index)person.photoIndex=index-1;else if(person.photoIndex===index-1)person.photoIndex=index})}
      if(button.dataset.action==="right"&&index<workingPhotos.length-1){[workingPhotos[index+1],workingPhotos[index]]=[workingPhotos[index],workingPhotos[index+1]];[photoDetails[index+1],photoDetails[index]]=[photoDetails[index],photoDetails[index+1]];familiarPeople.forEach(person=>{if(person.photoIndex===index)person.photoIndex=index+1;else if(person.photoIndex===index+1)person.photoIndex=index})}
      renderPhotoManager();markUnsaved();
    }));
    manager.append(item);
  });
  $("#photoCount").textContent=`${workingPhotos.length} added`;
  photoStatus.textContent=workingPhotos.length?"Use the arrows to choose the order. Press Send to TV after deleting or changing captions.":"No personal photos saved yet.";
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
    preview.replaceChildren();const element=document.createElement("video");element.src=previewUrl;element.muted=true;element.playsInline=true;element.preload="metadata";element.setAttribute("aria-label",fileName(file));preview.append(element);
  }else{preview.innerHTML="<span>♪</span><p></p>";preview.querySelector("p").textContent=fileName(file)}
  remove.hidden=false;
  status.textContent=`Ready: ${fileName(file)}`;
}

function markUnsaved(){
  $("#saveStatus").textContent=window.ezCloud.configured&&cloudSession?"Changes have not been sent yet.":"Changes have not been saved yet.";
  setSync("Changes waiting");
}

async function saveLocal(){
  const profile={name:$("#residentName").value.trim()||"Wanda",help:$("#helpMessage").value.trim()||"You are safe. Someone from your care team is nearby."};
  const settings=collectSettings();
  await Promise.all([putValue("profile",profile),putValue("photos",workingPhotos),putValue("video",workingVideo),putValue("audio",workingAudio),putValue("settings",settings)]);
  return profile;
}

async function hydrateLocal(){
  const [profile,photos,video,audio,settings]=await Promise.all([getValue("profile"),getValue("photos"),getValue("video"),getValue("audio"),getValue("settings")]);
  if(profile){$("#residentName").value=profile.name;$("#helpMessage").value=profile.help}
  applySettings(settings||DEFAULT_SETTINGS);
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
  const [media,settings]=await Promise.all([window.ezCloud.signedMedia(cloudResident.id),window.ezCloud.getSettings(cloudResident.id).catch(()=>null)]);
  const files=await Promise.all(media.map(async item=>({...item,file:await urlToFile(item)})));
  $("#residentName").value=cloudResident.name;
  $("#helpMessage").value=cloudResident.help_message;
  workingPhotos=files.filter(item=>item.type==="photo").map(item=>item.file);
  workingVideo=files.find(item=>item.type==="video")?.file||null;
  workingAudio=files.find(item=>item.type==="audio")?.file||null;
  renderPhotoManager();renderSingleMedia("video");renderSingleMedia("audio");
  if(settings)applySettings(settings);
  renderPhotoManager();
  await saveLocal();
}

async function refreshDevices(){
  if(!cloudResident)return;
  const devices=await window.ezCloud.devices(cloudResident.id);
  const list=$("#deviceList");list.innerHTML="";
  if(!devices.length){list.innerHTML="<p>No screen paired yet.</p>";return}
  devices.forEach((device,index)=>{
    const row=document.createElement("div");row.className="device-row";
    const age=device.last_seen?Date.now()-new Date(device.last_seen).getTime():Infinity;
    const seen=device.last_seen?new Date(device.last_seen).toLocaleString():"Never connected";
    const status=age<120000?"Recently connected":age<600000?"Connection not recently confirmed":"Needs a connection check";
    row.innerHTML=`<div><b>Resident screen ${index+1}</b><small>${status} · last seen ${seen}. A stale check cannot tell whether the screen is off or offline.</small></div><button type="button">Disconnect</button>`;
    row.querySelector("button").addEventListener("click",async()=>{
      if(!confirm("Disconnect this Resident View? It will need a new pairing code."))return;
      await window.ezCloud.disconnectDevice(device.id);await refreshDevices();showToast("Screen disconnected");
    });
    list.append(row);
  });
}

function showConnectedState(){
  $("#connectionTitle").textContent="Wanda’s screen is connected";
  $("#connectionCopy").textContent="Changes can now be sent directly to Resident View.";
  $("#pairForm").hidden=true;
  $("#healthConnection").textContent="Paired; check screen status below";
}

photoInput.addEventListener("change",()=>{const files=[...photoInput.files];workingPhotos.push(...files);photoDetails.push(...files.map(()=>({name:"",relationship:"",visible:true})));photoInput.value="";renderPhotoManager();markUnsaved()});
videoInput.addEventListener("change",()=>{workingVideo=videoInput.files[0]||null;videoInput.value="";renderSingleMedia("video");markUnsaved()});
audioInput.addEventListener("change",()=>{workingAudio=audioInput.files[0]||null;audioInput.value="";renderSingleMedia("audio");markUnsaved()});
$("#removeVideo").addEventListener("click",()=>{workingVideo=null;renderSingleMedia("video");markUnsaved()});
$("#removeAudio").addEventListener("click",()=>{workingAudio=null;renderSingleMedia("audio");markUnsaved()});
$("#residentName").addEventListener("input",markUnsaved);
$("#helpMessage").addEventListener("input",markUnsaved);

$("#setupForm").addEventListener("submit",async event=>{
  event.preventDefault();const button=event.submitter||$("#setupForm .send-button");button.disabled=true;button.textContent="Sending…";
  try{
    const profile=await saveLocal();
    if(window.ezCloud.configured&&cloudSession&&cloudResident){
      setSync("Sending to TV");$("#saveStatus").textContent="Sending changes securely…";
      const settings=collectSettings();
      await window.ezCloud.uploadResident(cloudResident,profile,workingPhotos,workingVideo,workingAudio,settings);
      cloudResident={...cloudResident,name:profile.name,help_message:profile.help};
      $("#saveStatus").textContent="Wanda’s TV is up to date.";$("#healthUpdate").textContent=new Date().toLocaleString();setSync("TV up to date");showToast("Sent to Wanda’s TV");
    }else{$("#saveStatus").textContent="Saved for this browser preview.";setSync("Saved on this device");showToast("Saved on this device")}
  }catch(error){console.error(error);$("#saveStatus").textContent="Changes could not be sent. They remain safe on this device.";setSync("Needs attention",true);showToast("Could not send changes")}
  finally{button.disabled=false;button.textContent="Send to TV"}
});

$("#resetButton").addEventListener("click",async()=>{
  if(!confirm("Remove all content saved on this device?"))return;
  await clearDatabase();workingPhotos=[];photoDetails=[];workingVideo=null;workingAudio=null;
  $("#residentName").value="Wanda";$("#helpMessage").value="You are safe. Someone from your care team is nearby.";
  applySettings(DEFAULT_SETTINGS);renderPhotoManager();renderSingleMedia("video");renderSingleMedia("audio");setSync("Saved on this device");showToast("Local prototype reset");
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
  $("#pairCodeInput").value="";showConnectedState();$("#connectionMessage").textContent="Connected securely. The pairing code has expired.";await hydrateCloud();await refreshDevices();setSync("TV connected");showToast("Resident View paired");
});

$("#inviteButton")?.addEventListener("click",async()=>{
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
  $("#pairForm").hidden=false;$("#pairCodeInput").disabled=false;$("#pairButton").disabled=false;
  $("#connectionMessage").textContent="Ready to pair.";
  if(cloudResident){showConnectedState();$("#connectionMessage").textContent="Connected securely.";await hydrateCloud();await refreshDevices();setSync("Securely connected");$("#saveStatus").textContent="Wanda’s TV is up to date."}
  else setSync("Ready to pair");
}

document.querySelectorAll(".caregiver-tab").forEach(button=>button.addEventListener("click",()=>{
  document.querySelectorAll(".caregiver-tab").forEach(item=>item.classList.toggle("active",item===button));
  document.querySelectorAll(".care-section").forEach(page=>page.classList.toggle("active",page.dataset.carePage===button.dataset.careSection));
  window.scrollTo({top:0,behavior:"smooth"});
}));

document.querySelectorAll("[data-save-settings]").forEach(button=>button.addEventListener("click",async()=>{
  button.disabled=true;
  try{
    await saveLocal();
    if(cloudResident)await window.ezCloud.saveSettings(cloudResident.id,collectSettings());
    setSync(cloudResident?"TV up to date":"Saved on this device");showToast(cloudResident?"Saved for Wanda":"Saved on this device");
  }catch(error){console.error(error);setSync("Needs attention",true);showToast("Could not save settings")}
  finally{button.disabled=false}
}));

document.querySelectorAll(".care-section input,.care-section textarea,.care-section select").forEach(input=>input.addEventListener("change",()=>{
  if(input.id==="residentName")$("#preferredName").value=input.value;
  markUnsaved();
}));

$("#queueHomeToday").addEventListener("click",async()=>{
  const message=value("#homeTodayMessage");if(!message)return showToast("Add a short message first");
  const days=Number($("#homeTodayExpiry").value||1);const expires=new Date(Date.now()+days*86400000);
  workingSettings.home_today={from:value("#homeTodayFrom")||"Family",message,expires_at:expires.toISOString()};
  renderHomeTodayStatus();await saveLocal();
  if(cloudResident)await window.ezCloud.saveSettings(cloudResident.id,collectSettings());
  $("#homeTodayMessage").value="";showToast("Added to Wanda’s channel");
});

$("#copyRecoverySummary").addEventListener("click",async()=>{
  const text=`EZ-TV prototype setup\nResident: ${value("#residentName")||"Wanda"}\nCaregiver access: this browser\nResident screen: ${cloudResident?"paired":"not paired"}\nKeep this caregiver browser available. Clearing its data may remove access; contact the prototype owner before resetting it.`;
  await navigator.clipboard.writeText(text);showToast("Setup summary copied");
});

$("#pauseScreen").addEventListener("click",async()=>{
  const previous=Boolean(workingSettings.paused);
  workingSettings.paused=!previous;renderPauseStatus();
  try{await saveLocal();if(cloudResident)await window.ezCloud.saveSettings(cloudResident.id,collectSettings());setSync(cloudResident?"TV updated":"Saved on this device");showToast(previous?"Screen resumed":"Screen paused")}
  catch(error){workingSettings.paused=previous;renderPauseStatus();await saveLocal().catch(()=>{});console.error(error);setSync("Needs attention",true);showToast("Could not change the TV. Check the connection")}
});

const weekKey=()=>{const day=new Date();day.setHours(0,0,0,0);day.setDate(day.getDate()-(day.getDay()+6)%7);return day.toISOString().slice(0,10)};
let pilotWeek=weekKey();
let minutes=Number(localStorage.getItem(`eztv-pilot-minutes-${pilotWeek}`)||0);
function renderMinutes(){$("#maintenanceMinutes").textContent=minutes}
document.querySelectorAll("[data-minutes]").forEach(button=>button.addEventListener("click",()=>{if(weekKey()!==pilotWeek){pilotWeek=weekKey();minutes=Number(localStorage.getItem(`eztv-pilot-minutes-${pilotWeek}`)||0)}minutes+=Number(button.dataset.minutes);localStorage.setItem(`eztv-pilot-minutes-${pilotWeek}`,minutes);renderMinutes()}));
$("#resetMinutes").addEventListener("click",()=>{minutes=0;localStorage.setItem(`eztv-pilot-minutes-${pilotWeek}`,"0");renderMinutes()});
const checkinLabels={enjoyed:"Enjoyed it",chose:"Made a choice","needed-help":"Needed help",distressed:"Seemed uncomfortable"};
function renderCheckins(){const entries=JSON.parse(localStorage.getItem("eztv-checkins")||"[]");$("#checkinStatus").textContent=entries.length?`${entries.length} observations saved on this device.`:"No observation recorded yet.";$("#checkinHistory").replaceChildren(...entries.slice(-12).reverse().map(entry=>{const item=document.createElement("li");item.textContent=`${new Date(entry.at).toLocaleString()}: ${checkinLabels[entry.type]||entry.type}`;return item}))}
document.querySelectorAll("[data-checkin]").forEach(button=>button.addEventListener("click",()=>{const entries=JSON.parse(localStorage.getItem("eztv-checkins")||"[]");entries.push({type:button.dataset.checkin,at:new Date().toISOString()});localStorage.setItem("eztv-checkins",JSON.stringify(entries));renderCheckins();showToast("Observation saved on this device")}));
renderMinutes();
renderCheckins();

window.addEventListener("offline",()=>setSync("Offline. Changes stay here",true));
window.addEventListener("online",()=>setSync(cloudSession?"Securely connected":"Saved on this device"));
window.addEventListener("beforeunload",()=>{thumbnailUrls.forEach(URL.revokeObjectURL);if(previewUrl)URL.revokeObjectURL(previewUrl)});

(async function start(){
  await hydrateLocal();
  try{await initializeCloud()}catch(error){console.error(error);$("#connectionMessage").textContent="Secure connection needs attention. Local content is still available.";setSync("Needs attention",true)}
  setInterval(()=>{if(cloudResident&&document.visibilityState==="visible")refreshDevices().catch(()=>{})},60000);
  if("serviceWorker" in navigator)navigator.serviceWorker.register("service-worker.js").catch(()=>{});
})();

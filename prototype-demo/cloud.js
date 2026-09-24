(function(){
  const config=window.EZTV_CONFIG||{};
  const configured=Boolean(config.supabaseUrl&&config.supabaseAnonKey&&window.supabase);
  const isResidentView=location.pathname.endsWith("/tv.html");
  const authOptions={
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:!isResidentView
  };
  if(isResidentView)authOptions.storageKey="eztv-resident-auth";
  const client=configured?window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:authOptions}):null;
  const SETTINGS_PREFIX="EZTV2:";
  const missingSettingsTable=error=>error&&(error.code==="42P01"||error.code==="PGRST205"||String(error.message||"").includes("resident_settings"));
  function decodeHelpMessage(raw){
    if(!raw?.startsWith?.(SETTINGS_PREFIX))return {help:raw||"You are safe. Someone from your care team is nearby.",settings:null};
    try{return JSON.parse(raw.slice(SETTINGS_PREFIX.length))}catch{return {help:"You are safe. Someone from your care team is nearby.",settings:null}}
  }
  function encodeHelpMessage(help,settings){return SETTINGS_PREFIX+JSON.stringify({help,settings})}

  async function getResident(user){
    const accessible=await client.from("residents").select("*").limit(1).maybeSingle();
    if(accessible.error)throw accessible.error;
    if(accessible.data){const decoded=decodeHelpMessage(accessible.data.help_message);return {...accessible.data,help_message:decoded.help,_embedded_settings:decoded.settings}}
    if(user.is_anonymous)return null;
    const created=await client.from("residents").insert({owner_id:user.id,name:"Wanda",help_message:"You are safe. Someone from your care team is nearby."}).select().single();
    if(created.error)throw created.error;
    return created.data;
  }

  async function signedMedia(residentId){
    const result=await client.from("media").select("*").eq("resident_id",residentId).order("sort_order");
    if(result.error)throw result.error;
    return Promise.all(result.data.map(async item=>{
      const signed=await client.storage.from("resident-media").createSignedUrl(item.storage_path,3600);
      if(signed.error)throw signed.error;
      return {...item,url:signed.data.signedUrl};
    }));
  }

  async function uploadResident(resident,profile,photos,video,audio,settings){
    const update=await client.from("residents").update({name:profile.name,help_message:encodeHelpMessage(profile.help,settings||null)}).eq("id",resident.id);
    if(update.error)throw update.error;
    const old=await client.from("media").select("storage_path").eq("resident_id",resident.id);
    if(old.error)throw old.error;
    if(old.data.length){
      const removed=await client.storage.from("resident-media").remove(old.data.map(item=>item.storage_path));
      if(removed.error)throw removed.error;
    }
    const cleared=await client.from("media").delete().eq("resident_id",resident.id);
    if(cleared.error)throw cleared.error;
    const items=[
      ...photos.map((file,index)=>({file,type:"photo",order:index})),
      ...(video?[{file:video,type:"video",order:0}]:[]),
      ...(audio?[{file:audio,type:"audio",order:0}]:[])
    ];
    for(const item of items){
      const safeName=(item.file.name||`${item.type}-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g,"-");
      const path=`${resident.id}/${crypto.randomUUID()}-${safeName}`;
      const uploaded=await client.storage.from("resident-media").upload(path,item.file,{contentType:item.file.type||"application/octet-stream",upsert:false});
      if(uploaded.error)throw uploaded.error;
      const row=await client.from("media").insert({resident_id:resident.id,type:item.type,title:item.file.name||safeName,storage_path:path,sort_order:item.order});
      if(row.error)throw row.error;
    }
  }

  async function getSettings(residentId){
    const result=await client.from("resident_settings").select("*").eq("resident_id",residentId).maybeSingle();
    if(result.error){
      if(missingSettingsTable(result.error)){
        const resident=await client.from("residents").select("help_message").eq("id",residentId).single();
        if(resident.error)throw resident.error;
        return decodeHelpMessage(resident.data.help_message).settings;
      }
      throw result.error;
    }
    return result.data;
  }

  async function saveSettings(residentId,settings){
    const payload={resident_id:residentId,...settings,updated_at:new Date().toISOString()};
    const result=await client.from("resident_settings").upsert(payload,{onConflict:"resident_id"});
    if(result.error){
      if(missingSettingsTable(result.error)){
        const resident=await client.from("residents").select("help_message").eq("id",residentId).single();
        if(resident.error)throw resident.error;
        const decoded=decodeHelpMessage(resident.data.help_message);
        const fallback=await client.from("residents").update({help_message:encodeHelpMessage(decoded.help,settings)}).eq("id",residentId);
        if(fallback.error)throw fallback.error;
        return true;
      }
      throw result.error;
    }
    return true;
  }

  window.ezCloud={
    configured,
    client,
    async session(){return configured?(await client.auth.getSession()).data.session:null},
    async sendSignIn(email){return client.auth.signInWithOtp({email,options:{emailRedirectTo:location.href.split("?")[0]}})},
    async acceptInvite(token){
      if(!token)return null;
      const result=await client.rpc("accept_family_invite",{p_token:token});
      if(result.error)throw result.error;
      history.replaceState({},"",location.pathname);
      return result.data;
    },
    getResident,
    signedMedia,
    uploadResident,
    getSettings,
    saveSettings,
    decodeHelpMessage,
    async devices(residentId){
      const result=await client.from("devices").select("id,last_seen,paired_at").eq("resident_id",residentId).order("paired_at");
      if(result.error)throw result.error;
      return result.data;
    },
    async disconnectDevice(deviceId){
      const result=await client.rpc("disconnect_device",{p_device_id:deviceId});
      if(result.error)throw result.error;
      return result.data;
    }
  };
})();

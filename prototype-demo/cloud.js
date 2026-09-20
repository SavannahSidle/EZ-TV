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

  async function getResident(user){
    const accessible=await client.from("residents").select("*").limit(1).maybeSingle();
    if(accessible.error)throw accessible.error;
    if(accessible.data)return accessible.data;
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

  async function uploadResident(resident,profile,photos,video,audio){
    const update=await client.from("residents").update({name:profile.name,help_message:profile.help}).eq("id",resident.id);
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

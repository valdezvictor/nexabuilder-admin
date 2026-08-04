import React,{useState,useEffect,useCallback,useRef} from "react";
import {http} from "../lib/http";

interface StagingItem{id:number;public_url:string;original_name:string;mime_type:string;file_size_bytes:number;description_raw?:string;description_en?:string;description_es?:string;lang_detected?:string;target_product_id?:number;target_slug?:string;image_role:string;display_order?:number;status:string;uploaded_at:string;product_name?:string;product_category?:string;}
interface CatalogProduct{id:number;slug:string;display_name:string;category:string;}

const card:React.CSSProperties={background:"var(--card)",border:"1.5px solid var(--border)",borderRadius:"var(--radius)",boxShadow:"var(--shadow)"};
const lbl:React.CSSProperties={display:"block",fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:".07em",color:"var(--muted)",marginBottom:5};
const inp:React.CSSProperties={width:"100%",padding:"8px 11px",border:"1.5px solid var(--border)",borderRadius:8,fontSize:13,fontFamily:"inherit",background:"var(--bg)",color:"var(--text)",outline:"none",boxSizing:"border-box"};
const pill=(active:boolean,warn?:boolean):React.CSSProperties=>({padding:"5px 14px",borderRadius:20,border:"1.5px solid var(--border)",background:active?"var(--navy)":warn?"#fef9c3":"var(--card)",color:active?"#fff":warn?"#854d0e":"var(--muted)",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"});
const CMS_KEY="GidhUSbSVmhSzpY8Xd7gfBEJJYB-ycHKz5j-JxEYSpU";
const ADM={headers:{"X-Admin-Key":CMS_KEY}};
const CAT_ICONS:Record<string,string>={stone:"🪨",tile:"🔲",bathroom:"🚿",kitchen:"🍳",outdoor:"🌿",doors:"🚪",fountain:"⛲"};
const CATEGORIES=["bathroom","doors","kitchen","outdoor","stone","tile","fountain","other"];
const STATUS_STYLE:Record<string,{bg:string;color:string}>={pending:{bg:"#fef9c3",color:"#854d0e"},approved:{bg:"#dcfce7",color:"#166534"},rejected:{bg:"#fee2e2",color:"#991b1b"}};
const fmtSize=(b:number)=>b>1048576?`${(b/1048576).toFixed(1)} MB`:`${Math.round(b/1024)} KB`;

// ── Create New Product Modal ──────────────────────────────────────────────────
function CreateProductModal({onCreated,onClose}:{onCreated:(p:CatalogProduct)=>void;onClose:()=>void}){
  const [name,setName]=useState("");
  const [category,setCategory]=useState("outdoor");
  const [origin,setOrigin]=useState("");
  const [leadTime,setLeadTime]=useState("");
  const [seo,setSeo]=useState("");
  const [checking,setChecking]=useState(false);
  const [nameStatus,setNameStatus]=useState<{unique:boolean;auto_slug:string;conflicts:any[]}|null>(null);
  const [generatingSeo,setGeneratingSeo]=useState(false);
  const [saving,setSaving]=useState(false);
  const checkTimer=useRef<any>(null);

  const checkName=async(n:string)=>{
    if(!n.trim()){setNameStatus(null);return;}
    setChecking(true);
    try{const r=await http.get(`/materials/check-name?name=${encodeURIComponent(n)}`,ADM);setNameStatus(r.data);}
    catch{}setChecking(false);
  };

  const onNameChange=(n:string)=>{
    setName(n);setNameStatus(null);
    clearTimeout(checkTimer.current);
    checkTimer.current=setTimeout(()=>checkName(n),600);
  };

  const create=async()=>{
    if(!name.trim()){alert("Product name is required.");return;}
    if(nameStatus&&!nameStatus.unique){alert("This name is already taken. Choose a unique name.");return;}
    setSaving(true);
    try{
      const r=await http.post("/materials/product",{display_name:name,category,origin_region:origin||null,lead_time_weeks:leadTime||null,seo_description:seo||null},ADM);
      onCreated(r.data);
    }catch(e:any){alert("Failed: "+(e?.response?.data?.detail||e.message));}
    setSaving(false);
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(10,22,40,.6)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{...card,width:"100%",maxWidth:520,overflow:"hidden"}}>
        <div style={{background:"var(--navy)",padding:"14px 20px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{flex:1,color:"#fff",fontWeight:800,fontSize:15}}>Create New Product</span>
          <button onClick={onClose} style={{border:"none",background:"rgba(255,255,255,.1)",color:"#fff",borderRadius:7,padding:"5px 12px",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>✕ Cancel</button>
        </div>
        <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:14}}>
          {/* Name with uniqueness check */}
          <div>
            <label style={lbl}>Product Name *</label>
            <input value={name} onChange={e=>onNameChange(e.target.value)}
              placeholder="e.g. Mexican Stone Fountain" style={{...inp,borderColor:nameStatus?(nameStatus.unique?"var(--green)":"#dc2626"):"var(--border)"}}/>
            {checking&&<div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>Checking uniqueness…</div>}
            {nameStatus&&!checking&&(
              <div style={{fontSize:11,marginTop:4,color:nameStatus.unique?"var(--green)":"#dc2626",fontWeight:700}}>
                {nameStatus.unique
                  ?`✓ Unique — will use slug: /${nameStatus.auto_slug}`
                  :`⚠ Already exists: "${nameStatus.conflicts[0]?.display_name}"`}
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label style={lbl}>Category</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {CATEGORIES.map(c=>(
                <button key={c} onClick={()=>setCategory(c)}
                  style={{...pill(category===c),textTransform:"capitalize",padding:"5px 12px"}}>
                  {CAT_ICONS[c]||"📦"} {c}
                </button>
              ))}
            </div>
          </div>

          {/* Origin + Lead time */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={lbl}>Origin Region</label>
              <input value={origin} onChange={e=>setOrigin(e.target.value)}
                placeholder="e.g. Jalisco, Mexico" style={inp}/>
            </div>
            <div>
              <label style={lbl}>Lead Time</label>
              <input value={leadTime} onChange={e=>setLeadTime(e.target.value)}
                placeholder="e.g. 4-6 weeks" style={inp}/>
            </div>
          </div>

          {/* SEO description */}
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
              <label style={{...lbl,marginBottom:0,flex:1}}>SEO Description <span style={{fontWeight:400,textTransform:"none"}}>(optional — can generate after creating)</span></label>
              <button onClick={async()=>{
                if(!name.trim()){alert("Enter a product name first.");return;}
                // Can't generate-seo until product exists — show helpful note
                setSeo("Add description after creating the product, then use AI Generate in the catalog.");
              }} style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:6,border:"1.5px solid var(--blue)",background:"var(--card)",color:"var(--blue)",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                ✦ Add after creating
              </button>
            </div>
            <textarea value={seo} onChange={e=>setSeo(e.target.value)} rows={3}
              style={{...inp,resize:"vertical"}} placeholder="2-3 sentences describing this product for search engines…"/>
            <div style={{fontSize:11,color:seo.length>280?"#dc2626":"var(--muted)",marginTop:3}}>{seo.length}/280 chars</div>
          </div>

          <button onClick={create} disabled={saving||checking||(nameStatus!==null&&!nameStatus.unique)}
            style={{padding:"11px",borderRadius:9,border:"none",background:"var(--gold)",color:"var(--navy)",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",opacity:saving||checking?0.6:1}}>
            {saving?"Creating…":"✓ Create Product"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Drop Zone ─────────────────────────────────────────────────────────────────
function DropZone({onUploaded}:{onUploaded:()=>void}){
  const [dragging,setDragging]=useState(false);
  const [files,setFiles]=useState<File[]>([]);
  const [uploading,setUploading]=useState(false);
  const [result,setResult]=useState<any>(null);
  const [batchSlug,setBatchSlug]=useState("");
  const [batchRole,setBatchRole]=useState("gallery");
  const [products,setProducts]=useState<CatalogProduct[]>([]);
  const inputRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{
    http.get("/materials/staging?status=all",ADM).then(r=>setProducts(r.data?.products||[])).catch(()=>{});
  },[]);

  const addFiles=(fl:FileList|null)=>{
    if(!fl)return;
    const valid=Array.from(fl).filter(f=>f.type.startsWith("image/"));
    setFiles(prev=>{const names=new Set(prev.map(f=>f.name));return[...prev,...valid.filter(f=>!names.has(f.name))].slice(0,50);});
    setResult(null);
  };

  const upload=async()=>{
    if(!files.length)return;
    setUploading(true);setResult(null);
    const fd=new FormData();
    files.forEach(f=>fd.append("files",f));
    if(batchSlug)fd.append("target_slug",batchSlug);
    fd.append("image_role",batchRole);
    try{
      const r=await http.post("/materials/bulk-upload",fd,{headers:{"X-Admin-Key":CMS_KEY},timeout:120000});
      setResult(r.data);
      if(r.data.uploaded>0){setFiles([]);onUploaded();}
    }catch(e:any){setResult({uploaded:0,errors:files.length,error_list:[{file:"batch",error:e?.response?.data?.detail||e.message}]});}
    setUploading(false);
  };

  const cats=Array.from(new Set(products.map(p=>p.category))).sort();

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
        onDrop={e=>{e.preventDefault();setDragging(false);addFiles(e.dataTransfer.files);}}
        onClick={()=>inputRef.current?.click()}
        style={{border:`2px dashed ${dragging?"var(--navy)":"var(--border)"}`,borderRadius:12,padding:"36px 24px",textAlign:"center",cursor:"pointer",background:dragging?"#eff6ff":"var(--bg)",transition:"all .15s"}}>
        <input ref={inputRef} type="file" multiple accept="image/*" style={{display:"none"}} onChange={e=>addFiles(e.target.files)}/>
        <div style={{fontSize:36,marginBottom:10}}>📁</div>
        <div style={{fontSize:15,fontWeight:700,color:"var(--text)",marginBottom:4}}>Drop images here or click to browse</div>
        <div style={{fontSize:12,color:"var(--muted)"}}>JPEG · PNG · WebP · AVIF · Max 12 MB each · Up to 50 per batch</div>
      </div>

      {files.length>0&&<div style={{...card,padding:"16px 20px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div>
          <label style={lbl}>Assign all to product <span style={{fontWeight:400,textTransform:"none"}}>(optional)</span></label>
          <select value={batchSlug} onChange={e=>setBatchSlug(e.target.value)} style={{...inp,cursor:"pointer"}}>
            <option value="">— Unassigned (assign per-image after upload) —</option>
            {cats.map(c=>(
              <optgroup key={c} label={`${CAT_ICONS[c]||"📦"} ${c.charAt(0).toUpperCase()+c.slice(1)}`}>
                {products.filter(p=>p.category===c).map(p=><option key={p.slug} value={p.slug}>{p.display_name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label style={lbl}>Image Role</label>
          <div style={{display:"flex",gap:6}}>
            {[["hero","Hero Image","Replaces main photo"],["gallery","Gallery","Added to gallery"]].map(([v,l,d])=>(
              <button key={v} onClick={()=>setBatchRole(v)}
                style={{flex:1,padding:"10px 12px",borderRadius:8,border:`1.5px solid ${batchRole===v?"var(--navy)":"var(--border)"}`,background:batchRole===v?"var(--navy)":"var(--card)",color:batchRole===v?"#fff":"var(--muted)",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                <div>{l}</div><div style={{fontSize:10,fontWeight:400,opacity:.75}}>{d}</div>
              </button>
            ))}
          </div>
        </div>
      </div>}

      {files.length>0&&<div style={card}>
        <div style={{padding:"10px 16px",borderBottom:"1.5px solid var(--border)",display:"flex",alignItems:"center",gap:10}}>
          <span style={{flex:1,fontSize:13,fontWeight:700,color:"var(--text)"}}>{files.length} image{files.length!==1?"s":""} queued</span>
          <button onClick={()=>setFiles([])} style={{padding:"6px 12px",borderRadius:7,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--muted)",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Clear all</button>
          <button onClick={upload} disabled={uploading} style={{padding:"6px 18px",borderRadius:7,border:"none",background:"var(--navy)",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",opacity:uploading?.6:1}}>
            {uploading?"Uploading…":`Upload ${files.length}`}
          </button>
        </div>
        <div style={{maxHeight:240,overflowY:"auto"}}>
          {files.map((f,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"48px 1fr auto",alignItems:"center",borderBottom:i<files.length-1?"1px solid var(--border)":"none"}}>
              <img src={URL.createObjectURL(f)} alt={f.name} style={{width:48,height:48,objectFit:"cover"}}/>
              <div style={{padding:"8px 14px"}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div>
                <div style={{fontSize:11,color:"var(--muted)"}}>{fmtSize(f.size)}</div>
              </div>
              <button onClick={()=>setFiles(fs=>fs.filter((_,j)=>j!==i))} style={{border:"none",background:"none",cursor:"pointer",color:"var(--muted)",fontSize:16,padding:"0 12px"}}>✕</button>
            </div>
          ))}
        </div>
      </div>}

      {result&&<div style={{...card,padding:"14px 18px",background:result.errors===0?"#dcfce7":"#fef9c3",borderColor:result.errors===0?"#86efac":"#fcd34d"}}>
        <div style={{fontSize:14,fontWeight:700,color:result.errors===0?"#166534":"#854d0e"}}>
          {result.uploaded>0&&`✅ ${result.uploaded} image${result.uploaded!==1?"s":""} uploaded to staging. `}
          {result.errors>0&&`⚠ ${result.errors} failed.`}
        </div>
        {result.error_list?.map((e:any,i:number)=><div key={i} style={{fontSize:12,color:"#991b1b",marginTop:3}}>• {e.file}: {e.error}</div>)}
      </div>}
    </div>
  );
}

// ── Staging Card ──────────────────────────────────────────────────────────────
function StagingCard({item,products,onUpdate,onRefreshProducts}:{item:StagingItem;products:CatalogProduct[];onUpdate:()=>void;onRefreshProducts:()=>void}){
  const [slug,setSlug]=useState(item.target_slug||"");
  const [role,setRole]=useState(item.image_role||"gallery");
  const [desc,setDesc]=useState(item.description_raw||"");
  const [saving,setSaving]=useState(false);
  const [translating,setTranslating]=useState(false);
  const [approving,setApproving]=useState(false);
  const [rejecting,setRejecting]=useState(false);
  const [expanded,setExpanded]=useState(!item.target_product_id);
  const [showCreate,setShowCreate]=useState(false);

  const save=async(overrideSlug?:string)=>{
    setSaving(true);
    try{await http.put(`/materials/staging/${item.id}`,{target_slug:overrideSlug??slug??null,image_role:role,description_raw:desc||null},ADM);onUpdate();}
    catch(e:any){alert("Save failed: "+(e?.response?.data?.detail||e.message));}
    setSaving(false);
  };

  const translate=async()=>{
    if(!desc.trim()){alert("Add a description first.");return;}
    setSaving(true);
    try{await http.put(`/materials/staging/${item.id}`,{description_raw:desc},ADM);}catch{}
    setSaving(false);setTranslating(true);
    try{await http.post(`/materials/staging/${item.id}/translate`,{},ADM);onUpdate();}
    catch(e:any){alert("Translate failed: "+(e?.response?.data?.detail||e.message));}
    setTranslating(false);
  };

  const approve=async()=>{
    if(!slug){alert("Assign to a product first.");return;}
    setApproving(true);
    try{await save();await http.post(`/materials/staging/${item.id}/approve`,{},ADM);onUpdate();}
    catch(e:any){alert("Approve failed: "+(e?.response?.data?.detail||e.message));}
    setApproving(false);
  };

  const reject=async()=>{
    if(!confirm(`Remove "${item.original_name}" from staging?`))return;
    setRejecting(true);
    try{await http.delete(`/materials/staging/${item.id}`,ADM);onUpdate();}
    catch(e:any){alert("Failed: "+(e?.response?.data?.detail||e.message));}
    setRejecting(false);
  };

  const onProductCreated=(p:CatalogProduct)=>{
    setShowCreate(false);
    setSlug(p.slug);
    onRefreshProducts();
    // auto-save the assignment
    setTimeout(()=>save(p.slug),200);
  };

  const cats=Array.from(new Set(products.map(p=>p.category))).sort();
  const ss=STATUS_STYLE[item.status]||STATUS_STYLE.pending;

  return(
    <>
      {showCreate&&<CreateProductModal onCreated={onProductCreated} onClose={()=>setShowCreate(false)}/>}
      <div style={{...card,overflow:"hidden",opacity:item.status==="rejected"?.5:1}}>
        <div style={{display:"grid",gridTemplateColumns:"100px 1fr auto",gap:0}}>
          <div style={{height:100,background:"var(--bg)",overflow:"hidden"}}>
            <img src={item.public_url} alt={item.original_name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
          </div>
          <div style={{padding:"10px 14px",minWidth:0}}>
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:5,flexWrap:"wrap"}}>
              <span style={{fontSize:11,fontWeight:800,textTransform:"uppercase",padding:"2px 8px",borderRadius:6,background:ss.bg,color:ss.color}}>{item.status}</span>
              <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:6,background:"var(--bg)",color:"var(--muted)",border:"1px solid var(--border)"}}>{role==="hero"?"Hero":"Gallery"}</span>
              {item.target_product_id&&<span style={{fontSize:11,color:"var(--green)",fontWeight:700}}>✓ {item.product_name}</span>}
              {!item.target_product_id&&item.status==="pending"&&<span style={{fontSize:11,color:"#dc2626",fontWeight:700}}>⚠ Unassigned</span>}
            </div>
            <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.original_name}</div>
            <div style={{fontSize:11,color:"var(--muted)"}}>{fmtSize(item.file_size_bytes)} · {new Date(item.uploaded_at).toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
            {item.description_en&&<div style={{fontSize:11,color:"var(--muted)",marginTop:4,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.description_en}</div>}
          </div>
          {item.status==="pending"&&(
            <div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:6,justifyContent:"center",borderLeft:"1.5px solid var(--border)",minWidth:110}}>
              <button onClick={approve} disabled={approving||!slug}
                style={{padding:"7px 12px",borderRadius:7,border:"none",background:"var(--green)",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",opacity:approving||!slug?.5:1}}>
                {approving?"Approving…":"✓ Approve"}
              </button>
              <button onClick={()=>setExpanded(e=>!e)}
                style={{padding:"7px 12px",borderRadius:7,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--muted)",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                {expanded?"Collapse":"Edit"}
              </button>
              <button onClick={reject} disabled={rejecting}
                style={{padding:"7px 12px",borderRadius:7,border:"none",background:"#fee2e2",color:"#991b1b",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",opacity:rejecting?.5:1}}>
                {rejecting?"…":"✕ Reject"}
              </button>
            </div>
          )}
          {item.status==="approved"&&(
            <div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:4,justifyContent:"center",borderLeft:"1.5px solid var(--border)",minWidth:110,textAlign:"center"}}>
              <span style={{fontSize:11,fontWeight:700,color:"var(--green)"}}>✓ In Catalog</span>
              <span style={{fontSize:10,color:"var(--muted)"}}>{item.product_category} · {role}</span>
            </div>
          )}
        </div>

        {expanded&&item.status==="pending"&&(
          <div style={{padding:"14px 16px",borderTop:"1.5px solid var(--border)",background:"var(--bg)",display:"flex",flexDirection:"column",gap:12}}>
            {/* Product assignment */}
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                <label style={{...lbl,marginBottom:0,flex:1}}>Assign to Product</label>
                <button onClick={()=>setShowCreate(true)}
                  style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:6,border:"1.5px solid var(--gold)",background:"#fef9c3",color:"#854d0e",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                  + Create New Product
                </button>
              </div>
              <select value={slug} onChange={e=>setSlug(e.target.value)} style={{...inp,cursor:"pointer"}}>
                <option value="">— Select existing product —</option>
                {cats.map(c=>(
                  <optgroup key={c} label={`${CAT_ICONS[c]||"📦"} ${c.charAt(0).toUpperCase()+c.slice(1)}`}>
                    {products.filter(p=>p.category===c).map(p=><option key={p.slug} value={p.slug}>{p.display_name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Role */}
            <div>
              <label style={lbl}>Image Role</label>
              <div style={{display:"flex",gap:6}}>
                {[["hero","Hero Image"],["gallery","Gallery"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setRole(v)}
                    style={{flex:1,padding:"8px 12px",borderRadius:7,border:`1.5px solid ${role===v?"var(--navy)":"var(--border)"}`,background:role===v?"var(--navy)":"var(--card)",color:role===v?"#fff":"var(--muted)",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Description + AI translate */}
            <div>
              <label style={lbl}>Description <span style={{fontWeight:400,textTransform:"none"}}>(raw — AI generates EN/ES catalog copy)</span></label>
              <div style={{display:"flex",gap:8}}>
                <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={2}
                  style={{...inp,resize:"vertical",flex:1}} placeholder="Describe this image for the catalog…"/>
                <button onClick={translate} disabled={translating||!desc.trim()}
                  style={{padding:"8px 12px",borderRadius:7,border:"1.5px solid var(--blue)",background:"var(--card)",color:"var(--blue)",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",alignSelf:"flex-end",opacity:translating||!desc.trim()?.5:1,whiteSpace:"nowrap"}}>
                  {translating?"…":"✦ AI EN/ES"}
                </button>
              </div>
              {(item.description_en||item.description_es)&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
                  {[["EN",item.description_en],["ES",item.description_es]].map(([lang,txt])=>txt&&(
                    <div key={lang} style={{padding:"8px 10px",borderRadius:7,background:"var(--card)",border:"1px solid var(--border)",fontSize:12,color:"var(--text)"}}>
                      <span style={{fontSize:10,fontWeight:800,color:"var(--muted)",marginRight:6}}>{lang}</span>{txt}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>save()} disabled={saving}
                style={{padding:"8px 18px",borderRadius:8,border:"none",background:"var(--gold)",color:"var(--navy)",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",opacity:saving?.5:1}}>
                {saving?"Saving…":"Save Assignment"}
              </button>
              <button onClick={()=>setExpanded(false)}
                style={{padding:"8px 14px",borderRadius:8,border:"1.5px solid var(--border)",background:"none",color:"var(--muted)",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                Collapse
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export const MaterialsBulkPage:React.FC=()=>{
  const [tab,setTab]=useState<"upload"|"staging">("upload");
  const [items,setItems]=useState<StagingItem[]>([]);
  const [products,setProducts]=useState<CatalogProduct[]>([]);
  const [loading,setLoading]=useState(false);
  const [statusFilter,setStatusFilter]=useState("pending");
  const [selecting,setSelecting]=useState<Set<number>>(new Set());
  const [bulkApproving,setBulkApproving]=useState(false);

  const loadStaging=useCallback(async(sf?:string)=>{
    setLoading(true);
    try{const r=await http.get(`/materials/staging?status=${sf??statusFilter}`,ADM);setItems(r.data?.items||[]);setProducts(r.data?.products||[]);}
    catch{}setLoading(false);
  },[statusFilter]);

  const refreshProducts=useCallback(async()=>{
    try{const r=await http.get("/materials/staging?status=all",ADM);setProducts(r.data?.products||[]);}catch{}
  },[]);

  useEffect(()=>{if(tab==="staging")loadStaging();},[tab,loadStaging]);

  const toggleSelect=(id:number)=>setSelecting(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});
  const assigned=items.filter(i=>i.status==="pending"&&i.target_product_id);
  const unassigned=items.filter(i=>i.status==="pending"&&!i.target_product_id);

  const bulkApprove=async()=>{
    if(!selecting.size)return;
    setBulkApproving(true);
    try{
      const r=await http.post("/materials/staging/bulk-approve",{staging_ids:Array.from(selecting)},ADM);
      const errs=r.data?.errors||[];
      if(errs.length)alert(`${r.data.approved?.length||0} approved. ${errs.length} failed.`);
      setSelecting(new Set());await loadStaging();
    }catch(e:any){alert("Bulk approve failed: "+(e?.response?.data?.detail||e.message));}
    setBulkApproving(false);
  };

  const pending=items.filter(i=>i.status==="pending");

  return(
    <div style={{padding:24,maxWidth:1100,margin:"0 auto"}}>
      <div style={{marginBottom:24}}>
        <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".12em",color:"var(--muted)",marginBottom:6}}>NexaBuilder Content</div>
        <h1 style={{fontSize:26,fontWeight:900,color:"var(--text)",margin:"0 0 6px"}}>Image Bulk Upload</h1>
        <p style={{fontSize:13,color:"var(--muted)",margin:0}}>Upload batches of product images, assign each to a material (or create a new product), then push to the live catalog.</p>
      </div>

      <div style={{display:"flex",borderBottom:"2px solid var(--border)",marginBottom:24}}>
        {[{id:"upload" as const,label:"Upload Images",icon:"📁"},{id:"staging" as const,label:`Staging Queue${tab==="staging"&&pending.length>0?` (${pending.length})`:""}`,icon:"🗂"}].map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);if(t.id==="staging")loadStaging();}}
            style={{padding:"11px 20px",border:"none",background:"transparent",fontFamily:"inherit",cursor:"pointer",display:"flex",alignItems:"center",gap:7,borderBottom:tab===t.id?"2px solid var(--navy)":"2px solid transparent",marginBottom:"-2px",color:tab===t.id?"var(--navy)":"var(--muted)",fontWeight:tab===t.id?800:600,fontSize:13}}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab==="upload"&&(
        <div>
          <DropZone onUploaded={()=>{setTab("staging");setStatusFilter("pending");setTimeout(()=>loadStaging("pending"),500);}}/>
          <div style={{...card,padding:"16px 20px",marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:8}}>How it works</div>
              <ol style={{margin:0,paddingLeft:18,fontSize:12,color:"var(--muted)",lineHeight:1.9}}>
                <li>Drop images or click to browse (up to 50 at once)</li>
                <li>Optionally assign to one product + set role before uploading</li>
                <li>Images go to S3 staging — nothing goes live yet</li>
                <li>In Staging Queue: assign each to a product, or create a new one</li>
                <li>Add description, run AI to get EN/ES catalog copy</li>
                <li>Approve individually or bulk approve all assigned images</li>
              </ol>
            </div>
            <div style={{borderLeft:"1.5px solid var(--border)",paddingLeft:20}}>
              <div style={{fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:8}}>No matching product?</div>
              <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.7,marginBottom:10}}>
                If your image doesn't match any existing product (like a fountain that isn't in the catalog yet), open the image in staging and click <strong>+ Create New Product</strong>. It checks for duplicate names automatically, creates the product, and assigns the image in one step.
              </div>
              <div style={{fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:8}}>Image roles</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[{role:"Hero",desc:"Replaces the main product photo."},{role:"Gallery",desc:"Added alongside existing photos."}].map(r=>(
                  <div key={r.role} style={{fontSize:12,color:"var(--muted)"}}><strong style={{color:"var(--text)"}}>{r.role}:</strong> {r.desc}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab==="staging"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            {[["pending","Pending"],["approved","Approved"],["rejected","Rejected"],["all","All"]].map(([v,l])=>(
              <button key={v} onClick={()=>setStatusFilter(v)} style={{...pill(statusFilter===v)}}>
                {l}
              </button>
            ))}
            <button onClick={()=>loadStaging()} style={{...pill(false),marginLeft:4}}>↻ Refresh</button>
            {statusFilter==="pending"&&assigned.length>0&&<>
              <div style={{flex:1}}/>
              <span style={{fontSize:12,color:"var(--muted)"}}>{selecting.size} selected</span>
              <button onClick={()=>selecting.size?setSelecting(new Set()):setSelecting(new Set(assigned.map(i=>i.id)))}
                style={{...pill(false)}}>
                {selecting.size?"Clear selection":"Select all assigned"}
              </button>
              {selecting.size>0&&<button onClick={bulkApprove} disabled={bulkApproving}
                style={{padding:"5px 18px",borderRadius:20,border:"none",background:"var(--green)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:bulkApproving?.6:1}}>
                {bulkApproving?`Approving…`:`✓ Approve ${selecting.size}`}
              </button>}
            </>}
          </div>

          {statusFilter==="pending"&&!loading&&(unassigned.length>0||assigned.length>0)&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{...card,padding:"12px 16px",borderLeft:"4px solid #fcd34d"}}>
                <div style={{fontSize:20,fontWeight:900,color:"#854d0e"}}>{unassigned.length}</div>
                <div style={{fontSize:12,fontWeight:700,color:"#854d0e"}}>Need product assignment</div>
                <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>Click Edit to assign or create a new product</div>
              </div>
              <div style={{...card,padding:"12px 16px",borderLeft:"4px solid var(--green)"}}>
                <div style={{fontSize:20,fontWeight:900,color:"var(--green)"}}>{assigned.length}</div>
                <div style={{fontSize:12,fontWeight:700,color:"var(--green)"}}>Assigned — ready to approve</div>
              </div>
            </div>
          )}

          {loading?<div style={{padding:60,textAlign:"center",color:"var(--muted)"}}>Loading…</div>
          :items.length===0?<div style={{...card,padding:48,textAlign:"center",color:"var(--muted)",fontSize:13}}>
            {statusFilter==="pending"?"No images in staging. Upload some first.":statusFilter==="approved"?"No approved images yet.":"No images found."}
          </div>:(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {items.map(item=>(
                <div key={item.id} style={{position:"relative"}}>
                  {item.status==="pending"&&item.target_product_id&&(
                    <button onClick={()=>toggleSelect(item.id)}
                      style={{position:"absolute",top:8,left:8,zIndex:10,width:22,height:22,borderRadius:6,border:`2px solid ${selecting.has(item.id)?"var(--navy)":"var(--border)"}`,background:selecting.has(item.id)?"var(--navy)":"var(--card)",cursor:"pointer",color:"#fff",fontSize:13,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {selecting.has(item.id)?"✓":""}
                    </button>
                  )}
                  <StagingCard item={item} products={products} onUpdate={loadStaging} onRefreshProducts={refreshProducts}/>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default MaterialsBulkPage;

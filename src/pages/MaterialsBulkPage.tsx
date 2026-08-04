import React,{useState,useEffect,useCallback,useRef} from "react";
import {http} from "../lib/http";

// ── Types ─────────────────────────────────────────────────────────────────────
interface StagingItem {
  id:number; public_url:string; original_name:string; mime_type:string;
  file_size_bytes:number; description_raw?:string; description_en?:string;
  description_es?:string; lang_detected?:string; target_product_id?:number;
  target_slug?:string; image_role:string; display_order?:number;
  status:string; uploaded_at:string; product_name?:string; product_category?:string;
}
interface CatalogProduct {
  id:number; slug:string; display_name:string; category:string;
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const card:React.CSSProperties={background:"var(--card)",border:"1.5px solid var(--border)",borderRadius:"var(--radius)",boxShadow:"var(--shadow)"};
const lbl:React.CSSProperties={display:"block",fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:".07em",color:"var(--muted)",marginBottom:5};
const inp:React.CSSProperties={width:"100%",padding:"8px 11px",border:"1.5px solid var(--border)",borderRadius:8,fontSize:13,fontFamily:"inherit",background:"var(--bg)",color:"var(--text)",outline:"none",boxSizing:"border-box"};
const btn=(bg:string,color:string,extra?:React.CSSProperties):React.CSSProperties=>({padding:"7px 14px",borderRadius:8,border:"none",background:bg,color,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",...extra});
const CMS_KEY="GidhUSbSVmhSzpY8Xd7gfBEJJYB-ycHKz5j-JxEYSpU";
const ADM={headers:{"X-Admin-Key":CMS_KEY}};
const CAT_ICONS:Record<string,string>={stone:"🪨",tile:"🔲",bathroom:"🚿",kitchen:"🍳",outdoor:"🌿",doors:"🚪"};
const STATUS_STYLE:Record<string,{bg:string;color:string}>={
  pending:  {bg:"#fef9c3",color:"#854d0e"},
  approved: {bg:"#dcfce7",color:"#166534"},
  rejected: {bg:"#fee2e2",color:"#991b1b"},
};
const fmtSize=(b:number)=>b>1048576?`${(b/1048576).toFixed(1)} MB`:`${Math.round(b/1024)} KB`;

// ── Upload Drop Zone ──────────────────────────────────────────────────────────
function DropZone({onUploaded}:{onUploaded:()=>void}){
  const [dragging,setDragging]=useState(false);
  const [files,setFiles]=useState<File[]>([]);
  const [uploading,setUploading]=useState(false);
  const [result,setResult]=useState<{uploaded:number;errors:number;error_list:any[]}|null>(null);
  const [batchSlug,setBatchSlug]=useState("");
  const [batchRole,setBatchRole]=useState("gallery");
  const [products,setProducts]=useState<CatalogProduct[]>([]);
  const inputRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{
    http.get("/materials/staging?status=all",ADM)
      .then(r=>setProducts(r.data?.products||[]))
      .catch(()=>{});
  },[]);

  const addFiles=(incoming:FileList|null)=>{
    if(!incoming)return;
    const valid=Array.from(incoming).filter(f=>f.type.startsWith("image/"));
    setFiles(prev=>{
      const names=new Set(prev.map(f=>f.name));
      const fresh=valid.filter(f=>!names.has(f.name));
      return [...prev,...fresh].slice(0,50);
    });
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
      const r=await http.post("/materials/bulk-upload",fd,{
        ...ADM,headers:{...ADM.headers,"Content-Type":"multipart/form-data"},
        timeout:120000,
      });
      setResult(r.data);
      if(r.data.uploaded>0){setFiles([]);onUploaded();}
    }catch(e:any){
      setResult({uploaded:0,errors:files.length,error_list:[{file:"batch",error:e?.response?.data?.detail||e.message}]});
    }
    setUploading(false);
  };

  const cats=Array.from(new Set(products.map(p=>p.category))).sort();

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Drop zone */}
      <div
        onDragOver={e=>{e.preventDefault();setDragging(true);}}
        onDragLeave={()=>setDragging(false)}
        onDrop={e=>{e.preventDefault();setDragging(false);addFiles(e.dataTransfer.files);}}
        onClick={()=>inputRef.current?.click()}
        style={{
          border:`2px dashed ${dragging?"var(--navy)":"var(--border)"}`,
          borderRadius:12,padding:"36px 24px",textAlign:"center",cursor:"pointer",
          background:dragging?"#eff6ff":"var(--bg)",transition:"all .15s",
        }}
      >
        <input ref={inputRef} type="file" multiple accept="image/*" style={{display:"none"}}
          onChange={e=>addFiles(e.target.files)}/>
        <div style={{fontSize:36,marginBottom:10}}>📁</div>
        <div style={{fontSize:15,fontWeight:700,color:"var(--text)",marginBottom:4}}>
          Drop images here or click to browse
        </div>
        <div style={{fontSize:12,color:"var(--muted)"}}>
          JPEG, PNG, WebP, AVIF · Max 12 MB each · Up to 50 files per batch
        </div>
      </div>

      {/* Batch options */}
      {files.length>0&&(
        <div style={{...card,padding:"16px 20px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div>
            <label style={lbl}>Assign all to product <span style={{fontWeight:400,textTransform:"none"}}>(optional — can assign per-image after upload)</span></label>
            <select value={batchSlug} onChange={e=>setBatchSlug(e.target.value)} style={{...inp,cursor:"pointer"}}>
              <option value="">— Unassigned (assign later) —</option>
              {cats.map(c=>(
                <optgroup key={c} label={`${CAT_ICONS[c]||"📦"} ${c.charAt(0).toUpperCase()+c.slice(1)}`}>
                  {products.filter(p=>p.category===c).map(p=>(
                    <option key={p.slug} value={p.slug}>{p.display_name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Image Role</label>
            <div style={{display:"flex",gap:8}}>
              {[["hero","Hero Image","Replaces main product photo"],["gallery","Gallery","Added to product gallery"]].map(([v,l,d])=>(
                <button key={v} onClick={()=>setBatchRole(v)}
                  style={{...btn(batchRole===v?"var(--navy)":"var(--card)",batchRole===v?"#fff":"var(--muted)"),flex:1,padding:"10px 12px",border:`1.5px solid ${batchRole===v?"var(--navy)":"var(--border)"}`,textAlign:"left"}}>
                  <div style={{fontWeight:800,marginBottom:2}}>{l}</div>
                  <div style={{fontSize:11,fontWeight:400,opacity:.8}}>{d}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* File list */}
      {files.length>0&&(
        <div style={card}>
          <div style={{padding:"10px 16px",borderBottom:"1.5px solid var(--border)",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:13,fontWeight:700,color:"var(--text)",flex:1}}>{files.length} image{files.length!==1?"s":""} queued</span>
            <button onClick={()=>setFiles([])} style={btn("var(--bg)","var(--muted)",{border:"1.5px solid var(--border)"})}>Clear all</button>
            <button onClick={upload} disabled={uploading} style={btn("var(--navy)","#fff",{opacity:uploading?.6:1,minWidth:100})}>
              {uploading?`Uploading…`:`Upload ${files.length} image${files.length!==1?"s":""}`}
            </button>
          </div>
          <div style={{maxHeight:260,overflowY:"auto"}}>
            {files.map((f,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"48px 1fr auto",alignItems:"center",gap:0,borderBottom:i<files.length-1?"1px solid var(--border)":"none"}}>
                <div style={{width:48,height:48,overflow:"hidden",flexShrink:0}}>
                  <img src={URL.createObjectURL(f)} alt={f.name} style={{width:48,height:48,objectFit:"cover"}}/>
                </div>
                <div style={{padding:"8px 14px",minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div>
                  <div style={{fontSize:11,color:"var(--muted)"}}>{fmtSize(f.size)} · {f.type}</div>
                </div>
                <div style={{padding:"0 12px"}}>
                  <button onClick={()=>setFiles(fs=>fs.filter((_,j)=>j!==i))}
                    style={{border:"none",background:"none",cursor:"pointer",color:"var(--muted)",fontSize:16,padding:4}}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload result */}
      {result&&(
        <div style={{...card,padding:"14px 18px",background:result.errors===0?"#dcfce7":"#fef9c3",borderColor:result.errors===0?"#86efac":"#fcd34d"}}>
          <div style={{fontSize:14,fontWeight:700,color:result.errors===0?"#166534":"#854d0e",marginBottom:result.error_list?.length?8:0}}>
            {result.uploaded>0&&`✅ ${result.uploaded} image${result.uploaded!==1?"s":""} uploaded to staging. `}
            {result.errors>0&&`⚠ ${result.errors} failed.`}
          </div>
          {result.error_list?.map((e:any,i:number)=>(
            <div key={i} style={{fontSize:12,color:"#991b1b",marginTop:3}}>• {e.file}: {e.error}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Staging Item Card ─────────────────────────────────────────────────────────
function StagingCard({item,products,onUpdate}:{item:StagingItem;products:CatalogProduct[];onUpdate:()=>void}){
  const [slug,setSlug]=useState(item.target_slug||"");
  const [role,setRole]=useState(item.image_role||"gallery");
  const [desc,setDesc]=useState(item.description_raw||"");
  const [saving,setSaving]=useState(false);
  const [translating,setTranslating]=useState(false);
  const [approving,setApproving]=useState(false);
  const [rejecting,setRejecting]=useState(false);
  const [expanded,setExpanded]=useState(!item.target_product_id);

  const save=async()=>{
    setSaving(true);
    try{
      await http.put(`/materials/staging/${item.id}`,{
        target_slug:slug||null,
        image_role:role,
        description_raw:desc||null,
      },ADM);
      onUpdate();
    }catch(e:any){alert("Save failed: "+(e?.response?.data?.detail||e.message));}
    setSaving(false);
  };

  const translate=async()=>{
    if(!desc.trim()){alert("Add a description first.");return;}
    setSaving(true);
    try{
      await http.put(`/materials/staging/${item.id}`,{description_raw:desc},ADM);
    }catch{}
    setTranslating(true);setSaving(false);
    try{
      await http.post(`/materials/staging/${item.id}/translate`,{},ADM);
      onUpdate();
    }catch(e:any){alert("Translate failed: "+(e?.response?.data?.detail||e.message));}
    setTranslating(false);
  };

  const approve=async()=>{
    if(!slug){alert("Assign to a product before approving.");return;}
    setApproving(true);
    try{
      await save();
      await http.post(`/materials/staging/${item.id}/approve`,{},ADM);
      onUpdate();
    }catch(e:any){alert("Approve failed: "+(e?.response?.data?.detail||e.message));}
    setApproving(false);
  };

  const reject=async()=>{
    if(!confirm(`Remove "${item.original_name}" from staging? This will delete it from S3.`))return;
    setRejecting(true);
    try{
      await http.delete(`/materials/staging/${item.id}`,ADM);
      onUpdate();
    }catch(e:any){alert("Reject failed: "+(e?.response?.data?.detail||e.message));}
    setRejecting(false);
  };

  const cats=Array.from(new Set(products.map(p=>p.category))).sort();
  const ss=STATUS_STYLE[item.status]||STATUS_STYLE.pending;
  const assigned=!!item.target_product_id;

  return(
    <div style={{...card,overflow:"hidden",opacity:item.status==="rejected"?.5:1}}>
      {/* Top row */}
      <div style={{display:"grid",gridTemplateColumns:"100px 1fr auto",gap:0}}>
        {/* Thumbnail */}
        <div style={{position:"relative",height:100,background:"var(--bg)",overflow:"hidden"}}>
          <img src={item.public_url} alt={item.original_name}
            style={{width:"100%",height:"100%",objectFit:"cover"}}
            onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
        </div>
        {/* Info */}
        <div style={{padding:"10px 14px",minWidth:0}}>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:5,flexWrap:"wrap"}}>
            <span style={{fontSize:11,fontWeight:800,textTransform:"uppercase",padding:"2px 8px",borderRadius:6,background:ss.bg,color:ss.color}}>{item.status}</span>
            <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:6,background:"var(--bg)",color:"var(--muted)",border:"1px solid var(--border)"}}>{role==="hero"?"Hero":"Gallery"}</span>
            {assigned&&<span style={{fontSize:11,color:"var(--green)",fontWeight:700}}>✓ {item.product_name}</span>}
            {!assigned&&item.status==="pending"&&<span style={{fontSize:11,color:"var(--red)",fontWeight:700}}>⚠ Unassigned</span>}
          </div>
          <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.original_name}</div>
          <div style={{fontSize:11,color:"var(--muted)"}}>{fmtSize(item.file_size_bytes)} · {new Date(item.uploaded_at).toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
          {item.description_en&&<div style={{fontSize:11,color:"var(--muted)",marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontStyle:"italic"}}>{item.description_en}</div>}
        </div>
        {/* Actions */}
        {item.status==="pending"&&(
          <div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:6,justifyContent:"center",borderLeft:"1.5px solid var(--border)",minWidth:110}}>
            <button onClick={approve} disabled={approving||!slug} style={btn("var(--green)","#fff",{opacity:approving||!slug?.5:1})}>
              {approving?"Approving…":"✓ Approve"}
            </button>
            <button onClick={()=>setExpanded(e=>!e)} style={btn("var(--bg)","var(--muted)",{border:"1.5px solid var(--border)"})}>
              {expanded?"Hide Edit":"Edit"}
            </button>
            <button onClick={reject} disabled={rejecting} style={btn("#fee2e2","#991b1b",{opacity:rejecting?.5:1})}>
              {rejecting?"Removing…":"✕ Reject"}
            </button>
          </div>
        )}
        {item.status==="approved"&&(
          <div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:6,justifyContent:"center",borderLeft:"1.5px solid var(--border)",minWidth:110}}>
            <span style={{fontSize:11,fontWeight:700,color:"var(--green)",textAlign:"center"}}>✓ In Catalog</span>
            <div style={{fontSize:10,color:"var(--muted)",textAlign:"center"}}>{item.product_category} · {role}</div>
          </div>
        )}
      </div>

      {/* Expanded edit panel */}
      {expanded&&item.status==="pending"&&(
        <div style={{padding:"14px 16px",borderTop:"1.5px solid var(--border)",background:"var(--bg)",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {/* Product assignment */}
            <div>
              <label style={lbl}>Assign to Product</label>
              <select value={slug} onChange={e=>setSlug(e.target.value)} style={{...inp,cursor:"pointer"}}>
                <option value="">— Select product —</option>
                {cats.map(c=>(
                  <optgroup key={c} label={`${CAT_ICONS[c]||"📦"} ${c.charAt(0).toUpperCase()+c.slice(1)}`}>
                    {products.filter(p=>p.category===c).map(p=>(
                      <option key={p.slug} value={p.slug}>{p.display_name}</option>
                    ))}
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
                    style={btn(role===v?"var(--navy)":"var(--card)",role===v?"#fff":"var(--muted)",{flex:1,border:`1.5px solid ${role===v?"var(--navy)":"var(--border)"}`})}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Description */}
          <div>
            <label style={lbl}>Description <span style={{fontWeight:400,textTransform:"none"}}>(raw — AI will generate EN/ES versions)</span></label>
            <div style={{display:"flex",gap:8}}>
              <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={2}
                style={{...inp,resize:"vertical",flex:1}} placeholder="Describe this image for the catalog…"/>
              <button onClick={translate} disabled={translating||!desc.trim()}
                style={btn("var(--bg)","var(--blue)",{border:"1.5px solid var(--blue)",alignSelf:"flex-end",whiteSpace:"nowrap",opacity:translating||!desc.trim()?.5:1})}>
                {translating?"Translating…":"AI EN/ES"}
              </button>
            </div>
            {(item.description_en||item.description_es)&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
                {[["EN",item.description_en],["ES",item.description_es]].map(([lang,txt])=>txt&&(
                  <div key={lang} style={{padding:"8px 10px",borderRadius:7,background:"var(--card)",border:"1px solid var(--border)",fontSize:12,color:"var(--text)"}}>
                    <span style={{fontSize:10,fontWeight:800,textTransform:"uppercase",color:"var(--muted)",marginRight:6}}>{lang}</span>{txt}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Save row */}
          <div style={{display:"flex",gap:8}}>
            <button onClick={save} disabled={saving}
              style={btn("var(--gold)","var(--navy)",{opacity:saving?.5:1})}>
              {saving?"Saving…":"Save Assignment"}
            </button>
            <button onClick={()=>setExpanded(false)}
              style={btn("var(--bg)","var(--muted)",{border:"1.5px solid var(--border)"})}>
              Collapse
            </button>
          </div>
        </div>
      )}
    </div>
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

  const loadStaging=useCallback(async()=>{
    setLoading(true);
    try{
      const r=await http.get(`/materials/staging?status=${statusFilter}`,ADM);
      setItems(r.data?.items||[]);
      setProducts(r.data?.products||[]);
    }catch{}
    setLoading(false);
  },[statusFilter]);

  useEffect(()=>{if(tab==="staging")loadStaging();},[tab,loadStaging]);

  const toggleSelect=(id:number)=>setSelecting(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});
  const selectAll=()=>setSelecting(new Set(items.filter(i=>i.status==="pending"&&i.target_product_id).map(i=>i.id)));
  const clearSelection=()=>setSelecting(new Set());

  const bulkApprove=async()=>{
    if(!selecting.size)return;
    setBulkApproving(true);
    try{
      const r=await http.post("/materials/staging/bulk-approve",{staging_ids:Array.from(selecting)},ADM);
      const errors=r.data?.errors||[];
      if(errors.length)alert(`${r.data.approved?.length||0} approved. ${errors.length} failed.`);
      clearSelection();
      await loadStaging();
    }catch(e:any){alert("Bulk approve failed: "+(e?.response?.data?.detail||e.message));}
    setBulkApproving(false);
  };

  const pending=items.filter(i=>i.status==="pending");
  const unassigned=pending.filter(i=>!i.target_product_id);
  const assigned=pending.filter(i=>!!i.target_product_id);
  const readyCount=assigned.length;

  return(
    <div style={{padding:24,maxWidth:1100,margin:"0 auto"}}>
      {/* Header */}
      <div style={{marginBottom:24}}>
        <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".12em",color:"var(--muted)",marginBottom:6}}>NexaBuilder Content</div>
        <h1 style={{fontSize:26,fontWeight:900,color:"var(--text)",margin:"0 0 6px"}}>Image Bulk Upload</h1>
        <p style={{fontSize:13,color:"var(--muted)",margin:0}}>Upload batches of product images, assign each to a material, then push to the live catalog.</p>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"2px solid var(--border)",marginBottom:24}}>
        {[
          {id:"upload" as const,label:"Upload Images",icon:"📁"},
          {id:"staging" as const,label:`Staging Queue${pending.length>0&&tab==="staging"?` (${pending.length})`:""}`,icon:"🗂"},
        ].map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);if(t.id==="staging")loadStaging();}}
            style={{padding:"11px 20px",border:"none",background:"transparent",fontFamily:"inherit",cursor:"pointer",display:"flex",alignItems:"center",gap:7,borderBottom:tab===t.id?"2px solid var(--navy)":"2px solid transparent",marginBottom:"-2px",color:tab===t.id?"var(--navy)":"var(--muted)",fontWeight:tab===t.id?800:600,fontSize:13}}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* UPLOAD TAB */}
      {tab==="upload"&&(
        <div>
          <DropZone onUploaded={()=>{setTab("staging");setStatusFilter("pending");setTimeout(loadStaging,400);}}/>
          <div style={{...card,padding:"16px 20px",marginTop:16,display:"flex",gap:20,flexWrap:"wrap"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:8}}>How it works</div>
              <ol style={{margin:0,paddingLeft:18,fontSize:12,color:"var(--muted)",lineHeight:1.9}}>
                <li>Drop your images or click to browse — up to 50 at once</li>
                <li>Optionally assign all to one product + set role (Hero or Gallery) before uploading</li>
                <li>Images upload to S3 staging — nothing goes live yet</li>
                <li>Go to Staging Queue, assign any unassigned images to products</li>
                <li>Add descriptions, run AI to generate EN/ES versions</li>
                <li>Approve individually or select all and bulk approve</li>
              </ol>
            </div>
            <div style={{borderLeft:"1.5px solid var(--border)",paddingLeft:20,flex:1}}>
              <div style={{fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:8}}>Image roles</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {[
                  {role:"Hero",icon:"🖼",desc:"Replaces the main product photo. One per product. Choosing this will overwrite the current hero image."},
                  {role:"Gallery",icon:"🗃",desc:"Added to the product gallery alongside existing photos. A product can have many gallery images."},
                ].map(r=>(
                  <div key={r.role} style={{display:"flex",gap:10}}>
                    <span style={{fontSize:20,flexShrink:0}}>{r.icon}</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"var(--text)",marginBottom:2}}>{r.role}</div>
                      <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.5}}>{r.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STAGING TAB */}
      {tab==="staging"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Status filter + bulk actions */}
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            {[["pending","Pending"],["approved","Approved"],["rejected","Rejected"],["all","All"]].map(([v,l])=>(
              <button key={v} onClick={()=>setStatusFilter(v)}
                style={btn(statusFilter===v?"var(--navy)":"var(--card)",statusFilter===v?"#fff":"var(--muted)",{border:"1.5px solid var(--border)",borderRadius:20,padding:"5px 14px",borderColor:statusFilter===v?"var(--navy)":"var(--border)"})}>
                {l}
              </button>
            ))}
            <button onClick={loadStaging} style={btn("var(--card)","var(--muted)",{border:"1.5px solid var(--border)",borderRadius:20,padding:"5px 14px"})}>↻ Refresh</button>

            {statusFilter==="pending"&&readyCount>0&&<>
              <div style={{flex:1}}/>
              <span style={{fontSize:12,color:"var(--muted)"}}>{selecting.size} selected</span>
              <button onClick={selecting.size?clearSelection:selectAll}
                style={btn("var(--card)","var(--navy)",{border:"1.5px solid var(--navy)",borderRadius:20,padding:"5px 14px"})}>
                {selecting.size?"Clear selection":"Select all assigned"}
              </button>
              {selecting.size>0&&<button onClick={bulkApprove} disabled={bulkApproving}
                style={btn("var(--green)","#fff",{borderRadius:20,padding:"5px 18px",opacity:bulkApproving?.6:1})}>
                {bulkApproving?`Approving…`:`✓ Approve ${selecting.size}`}
              </button>}
            </>}
          </div>

          {/* Summary when there are pending items */}
          {statusFilter==="pending"&&!loading&&(unassigned.length>0||assigned.length>0)&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{...card,padding:"12px 16px",borderLeft:"4px solid #fcd34d"}}>
                <div style={{fontSize:20,fontWeight:900,color:"#854d0e"}}>{unassigned.length}</div>
                <div style={{fontSize:12,fontWeight:700,color:"#854d0e"}}>Need product assignment</div>
              </div>
              <div style={{...card,padding:"12px 16px",borderLeft:"4px solid var(--green)"}}>
                <div style={{fontSize:20,fontWeight:900,color:"var(--green)"}}>{readyCount}</div>
                <div style={{fontSize:12,fontWeight:700,color:"var(--green)"}}>Assigned — ready to approve</div>
              </div>
            </div>
          )}

          {/* Items */}
          {loading?<div style={{padding:60,textAlign:"center",color:"var(--muted)"}}>Loading staging queue…</div>
          :items.length===0?<div style={{...card,padding:48,textAlign:"center",color:"var(--muted)",fontSize:13}}>
            {statusFilter==="pending"?"No images in staging. Upload some images first.":
             statusFilter==="approved"?"No approved images yet.":
             statusFilter==="rejected"?"No rejected images.":"No images found."}
          </div>:(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {items.map(item=>(
                <div key={item.id} style={{position:"relative"}}>
                  {item.status==="pending"&&item.target_product_id&&(
                    <button
                      onClick={()=>toggleSelect(item.id)}
                      style={{position:"absolute",top:8,left:8,zIndex:10,width:22,height:22,borderRadius:6,border:`2px solid ${selecting.has(item.id)?"var(--navy)":"var(--border)"}`,background:selecting.has(item.id)?"var(--navy)":"var(--card)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:900}}>
                      {selecting.has(item.id)?"✓":""}
                    </button>
                  )}
                  <StagingCard item={item} products={products} onUpdate={loadStaging}/>
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

import React,{useState,useEffect,useCallback,useRef} from "react";
import {http} from "../lib/http";

interface Product{id:number;category:string;slug:string;display_name:string;stone_types?:string[];available_finishes?:string[];dim_length_in?:number;dim_width_in?:number;dim_height_in?:number;dim_notes?:string;weight_lbs?:number;price_usd?:number;price_visible:boolean;unit?:string;moq?:number;lead_time_weeks?:string;origin_region?:string;availability:string;hero_image_url?:string;gallery_images?:string[];image_updated_at?:string;image_disclaimer?:string;is_featured:boolean;seo_description?:string;updated_at?:string;}

const card:React.CSSProperties={background:"var(--card)",border:"1.5px solid var(--border)",borderRadius:"var(--radius)",boxShadow:"var(--shadow)"};
const lbl:React.CSSProperties={display:"block",fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:".07em",color:"var(--muted)",marginBottom:6};
const inp:React.CSSProperties={width:"100%",padding:"9px 12px",border:"1.5px solid var(--border)",borderRadius:9,fontSize:13,fontFamily:"inherit",background:"var(--bg)",color:"var(--text)",outline:"none",boxSizing:"border-box"};
const AVAIL:Record<string,{bg:string;color:string}>={available:{bg:"#dcfce7",color:"#166534"},low_stock:{bg:"#fef9c3",color:"#854d0e"},on_order:{bg:"#dbeafe",color:"#1d4ed8"},discontinued:{bg:"#fee2e2",color:"#991b1b"}};
const CAT_ICONS:Record<string,string>={stone:"🪨",tile:"🔲",bathroom:"🚿",kitchen:"🍳",outdoor:"🌿",doors:"🚪"};
const CMS_KEY="GidhUSbSVmhSzpY8Xd7gfBEJJYB-ycHKz5j-JxEYSpU";
const ADM={headers:{"X-Admin-Key":CMS_KEY}};

function ProductEditor({product,onClose,onSaved,onRefresh}:{product:Product;onClose:()=>void;onSaved:()=>void;onRefresh:()=>void}){
  const [f,setF]=useState<Partial<Product>>({...product});
  const [tab,setTab]=useState<"info"|"media"|"seo">("info");
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [newImg,setNewImg]=useState("");
  const [refreshing,setRefreshing]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [generatingSeo,setGeneratingSeo]=useState(false);
  const [publishing,setPublishing]=useState(false);
  const [published,setPublished]=useState<string|null>(null);
  const fileRef=useRef<HTMLInputElement>(null);

  const fld=(k:keyof Product,t:"text"|"number"|"bool")=>{
    if(t==="bool")return<button onClick={()=>setF(p=>({...p,[k]:!p[k]}))} style={{padding:"8px 14px",borderRadius:8,border:"1.5px solid var(--border)",background:(f as any)[k]?"#dcfce7":"var(--bg)",color:(f as any)[k]?"#166534":"var(--muted)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{(f as any)[k]?"Yes":"No"}</button>;
    return<input type={t} value={(f as any)[k]||""} onChange={e=>setF(p=>({...p,[k]:t==="number"?+e.target.value||undefined:e.target.value}))} style={inp}/>;
  };

  const save=async()=>{
    setSaving(true);
    try{
      await http.put(`/materials/product/${product.id}`,{
        display_name:f.display_name,dim_notes:f.dim_notes,
        dim_length_in:f.dim_length_in,dim_width_in:f.dim_width_in,dim_height_in:f.dim_height_in,
        weight_lbs:f.weight_lbs,unit:f.unit,moq:f.moq,lead_time_weeks:f.lead_time_weeks,
        origin_region:f.origin_region,price_usd:f.price_usd,price_visible:f.price_visible,
        is_featured:f.is_featured,seo_description:f.seo_description,image_disclaimer:f.image_disclaimer,
      },ADM);
      setSaved(true);onRefresh();setTimeout(()=>setSaved(false),2500);
    }catch(e:any){alert("Save failed: "+(e?.response?.data?.detail||e.message));}
    setSaving(false);
  };

  const setAvail=async(status:string)=>{
    try{await http.put(`/materials/product/${product.id}/availability`,null,{params:{status},...ADM});setF(p=>({...p,availability:status}));onRefresh();}
    catch(e:any){alert("Failed: "+(e?.response?.data?.detail||e.message));}
  };

  const refreshImage=async()=>{
    if(!newImg.trim()){alert("Enter an image URL.");return;}
    setRefreshing(true);
    try{await http.post("/materials/image-refresh",{product_id:product.id,new_image:newImg.trim(),changed_by:"admin"},ADM);setF(p=>({...p,hero_image_url:newImg.trim()}));setNewImg("");onSaved();}
    catch(e:any){alert("Failed: "+(e?.response?.data?.detail||e.message));}
    setRefreshing(false);
  };

  const ac=AVAIL[f.availability||"available"]||{bg:"var(--bg)",color:"var(--muted)"};

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(10,22,40,.55)",zIndex:9999,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"32px 20px",overflowY:"auto"}}>
      <div style={{...card,width:"100%",maxWidth:720,overflow:"hidden"}}>
        <div style={{background:"var(--navy)",padding:"14px 22px",display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:20}}>{CAT_ICONS[product.category]||"📦"}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:800,color:"#fff"}}>{f.display_name||product.display_name}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginTop:1}}>{product.category} · /{product.slug}</div>
          </div>
          <span style={{fontSize:11,fontWeight:800,textTransform:"uppercase",padding:"4px 10px",borderRadius:6,background:ac.bg,color:ac.color}}>{f.availability}</span>
          <button onClick={onClose} style={{border:"none",background:"rgba(255,255,255,.1)",color:"#fff",borderRadius:7,padding:"5px 12px",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700}}>Close</button>
        </div>
        <div style={{display:"flex",borderBottom:"1.5px solid var(--border)",background:"var(--bg)"}}>
          {(["info","media","seo"] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:"10px 20px",border:"none",background:"transparent",fontFamily:"inherit",cursor:"pointer",fontSize:13,fontWeight:tab===t?800:600,color:tab===t?"var(--navy)":"var(--muted)",borderBottom:tab===t?"2px solid var(--navy)":"2px solid transparent",marginBottom:"-1.5px",textTransform:"capitalize"}}>{t==="info"?"Product Info":t==="media"?"Media & Pricing":"SEO & Status"}</button>
          ))}
        </div>
        <div style={{padding:"20px 22px",display:"flex",flexDirection:"column",gap:14}}>
          {tab==="info"&&<>
            <label style={{display:"flex",flexDirection:"column",gap:6}}>
              <span style={lbl}>Display Name</span>{fld("display_name","text")}
            </label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {([["Length (in)","dim_length_in","number"],["Width (in)","dim_width_in","number"],["Height (in)","dim_height_in","number"],["Weight (lbs)","weight_lbs","number"],["Unit","unit","text"],["MOQ","moq","number"],["Lead Time","lead_time_weeks","text"],["Origin","origin_region","text"]] as [string,keyof Product,"text"|"number"][]).map(([l,k,t])=>(
                <label key={k} style={{display:"flex",flexDirection:"column",gap:6}}><span style={lbl}>{l}</span>{fld(k,t)}</label>
              ))}
            </div>
            <label style={{display:"flex",flexDirection:"column",gap:6}}>
              <span style={lbl}>Dimension Notes</span>
              <textarea value={f.dim_notes||""} onChange={e=>setF(p=>({...p,dim_notes:e.target.value}))} rows={2} style={{...inp,resize:"vertical"}}/>
            </label>
            {product.stone_types?.length?<div style={{padding:"12px 14px",borderRadius:9,background:"var(--bg)",border:"1.5px solid var(--border)"}}><div style={lbl}>Stone Types</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{product.stone_types.map(s=><span key={s} style={{padding:"3px 10px",borderRadius:10,background:"#f1f5f9",fontSize:12,fontWeight:600}}>{s}</span>)}</div></div>:null}
            {product.available_finishes?.length?<div style={{padding:"12px 14px",borderRadius:9,background:"var(--bg)",border:"1.5px solid var(--border)"}}><div style={lbl}>Available Finishes</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{product.available_finishes.map(fin=><span key={fin} style={{padding:"3px 10px",borderRadius:10,background:"#f1f5f9",fontSize:12,fontWeight:600}}>{fin}</span>)}</div></div>:null}
          </>}
          {tab==="media"&&<>
            <div>
              <div style={lbl}>Hero Image</div>
              {f.hero_image_url&&<img src={f.hero_image_url} alt={f.display_name} style={{width:"100%",maxHeight:200,objectFit:"cover",borderRadius:9,marginBottom:10,border:"1.5px solid var(--border)"}}/>}
              {/* Upload file directly */}
              <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{
                const file=e.target.files?.[0];if(!file)return;
                setUploading(true);
                try{
                  const fd=new FormData();fd.append("file",file);
                  const r=await http.post(`/materials/image-upload/${product.id}`,fd,{headers:{"X-Admin-Key":CMS_KEY},timeout:60000});
                  setF(p=>({...p,hero_image_url:r.data.public_url}));
                  setNewImg(r.data.public_url);
                  onRefresh();
                }catch(ex:any){alert("Upload failed: "+(ex?.response?.data?.detail||ex.message));}
                setUploading(false);e.target.value="";
              }}/>
              <div style={{display:"flex",gap:8,marginBottom:8}}>
                <button onClick={()=>fileRef.current?.click()} disabled={uploading}
                  style={{padding:"9px 16px",borderRadius:9,border:"1.5px solid var(--navy)",background:"var(--card)",color:"var(--navy)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",opacity:uploading?.5:1,whiteSpace:"nowrap"}}>
                  {uploading?"Uploading…":"📁 Upload File"}
                </button>
                <input value={newImg} onChange={e=>setNewImg(e.target.value)} placeholder="…or paste image URL" style={{...inp,flex:1}}/>
                <button onClick={refreshImage} disabled={refreshing||!newImg}
                  style={{padding:"9px 14px",borderRadius:9,border:"none",background:"var(--blue)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",opacity:refreshing||!newImg?0.5:1,whiteSpace:"nowrap"}}>
                  {refreshing?"Saving…":"Use URL"}
                </button>
              </div>
              {f.image_updated_at&&<div style={{fontSize:11,color:"var(--muted)"}}>Last refreshed: {f.image_updated_at}</div>}
            </div>
            {product.gallery_images?.length?<div><div style={lbl}>Gallery ({product.gallery_images.length})</div><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>{product.gallery_images.map((img,i)=><img key={i} src={img} alt="" style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:7,border:"1.5px solid var(--border)"}}/>)}</div></div>:null}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <label style={{display:"flex",flexDirection:"column",gap:6}}><span style={lbl}>Price (USD, internal)</span>{fld("price_usd","number")}</label>
              <div style={{display:"flex",flexDirection:"column",gap:6}}><span style={lbl}>Show Price Publicly</span><button onClick={()=>setF(p=>({...p,price_visible:!p.price_visible}))} style={{padding:"9px 14px",borderRadius:9,border:"1.5px solid var(--border)",background:f.price_visible?"#dcfce7":"var(--bg)",color:f.price_visible?"#166534":"var(--muted)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>{f.price_visible?"Visible to customers":"Hidden (quote only)"}</button></div>
            </div>
            <label style={{display:"flex",flexDirection:"column",gap:6}}><span style={lbl}>Image Disclaimer</span><textarea value={f.image_disclaimer||""} onChange={e=>setF(p=>({...p,image_disclaimer:e.target.value}))} rows={2} style={{...inp,resize:"vertical"}} placeholder="e.g. Colors may vary. Sample photo for reference only."/></label>
          </>}
          {tab==="seo"&&<>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{...lbl,marginBottom:0,flex:1}}>SEO Description ({(f.seo_description||"").length}/300)</span>
                <button onClick={async()=>{
                  setGeneratingSeo(true);
                  try{
                    const r=await http.post(`/materials/product/${product.id}/generate-seo`,{},ADM);
                    if(r.data.generated_description)setF(p=>({...p,seo_description:r.data.generated_description}));
                  }catch(ex:any){alert("AI failed: "+(ex?.response?.data?.detail||ex.message));}
                  setGeneratingSeo(false);
                }} disabled={generatingSeo}
                  style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:6,border:"1.5px solid var(--blue)",background:"var(--card)",color:"var(--blue)",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",opacity:generatingSeo?.5:1}}>
                  {generatingSeo?"Generating…":"✦ AI Generate"}
                </button>
              </div>
              <textarea value={f.seo_description||""} onChange={e=>setF(p=>({...p,seo_description:e.target.value}))} rows={4}
                style={{...inp,resize:"vertical",borderColor:(f.seo_description||"").length>300?"#dc2626":"var(--border)"}}/>
              <div style={{fontSize:11,color:(f.seo_description||"").length>300?"#dc2626":"var(--muted)"}}>
                {(f.seo_description||"").length}/300 · AI will generate a unique description that doesn't duplicate existing products
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <span style={lbl}>Featured Product</span>
              <button onClick={()=>setF(p=>({...p,is_featured:!p.is_featured}))} style={{padding:"9px 14px",borderRadius:9,border:"1.5px solid var(--border)",background:f.is_featured?"#fef9c3":"var(--bg)",color:f.is_featured?"#854d0e":"var(--muted)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",textAlign:"left",width:"fit-content"}}>{f.is_featured?"Featured on homepage":"Not featured"}</button>
            </div>
            <div>
              <div style={lbl}>Availability</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {(["available","low_stock","on_order","discontinued"] as const).map(s=>{const c=AVAIL[s];const act=f.availability===s;return<button key={s} onClick={()=>setAvail(s)} style={{padding:"7px 16px",borderRadius:8,border:`1.5px solid ${act?c.color:c.color+"44"}`,background:act?c.bg:"transparent",color:c.color,fontWeight:act?800:600,fontSize:12,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>{s.replace("_"," ")}</button>;})}
              </div>
            </div>
          </>}
        </div>
        <div style={{padding:"14px 22px",borderTop:"1.5px solid var(--border)",display:"flex",alignItems:"center",gap:10,background:"var(--bg)"}}>
          <button onClick={save} disabled={saving} style={{padding:"10px 24px",borderRadius:9,border:"none",background:saved?"var(--green)":"var(--gold)",color:saved?"#fff":"var(--navy)",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",opacity:saving?0.6:1}}>
            {saving?"Saving…":saved?"Saved":"Save Changes"}
          </button>
          <button onClick={async()=>{
            setPublishing(true);setPublished(null);
            try{
              const r=await http.post(`/materials/product/${product.id}/publish-to-site`,{},ADM);
              setPublished(r.data.url);
            }catch(e:any){alert("Publish failed: "+(e?.response?.data?.detail||e.message));}
            setPublishing(false);
          }} disabled={publishing} style={{padding:"10px 20px",borderRadius:9,border:"none",
            background:publishing?"var(--border)":"var(--green)",color:publishing?"var(--muted)":"#fff",
            fontWeight:800,fontSize:13,cursor:publishing?"not-allowed":"pointer",fontFamily:"inherit",opacity:publishing?.6:1}}>
            {publishing?"Publishing…":"🌐 Publish to Site"}
          </button>
          <button onClick={onClose} style={{padding:"10px 16px",borderRadius:9,border:"1.5px solid var(--border)",background:"none",color:"var(--muted)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          {product.updated_at&&<span style={{marginLeft:"auto",fontSize:11,color:"var(--muted)"}}>Last updated {new Date(product.updated_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>}
        </div>
        {published&&(
          <div style={{padding:"12px 22px",background:"#dcfce7",borderTop:"1.5px solid #86efac",display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:13,fontWeight:700,color:"#166534",flex:1}}>
              ✅ Published!
            </span>
            <a href={published} target="_blank" rel="noopener"
              style={{fontSize:13,fontWeight:700,color:"#166534",textDecoration:"underline"}}>
              {published}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export const MaterialsCmsPage:React.FC=()=>{
  const [products,setProducts]=useState<Product[]>([]);
  const [loading,setLoading]=useState(true);
  const [editing,setEditing]=useState<Product|null>(null);
  const [refreshDue,setRefreshDue]=useState<any[]>([]);
  const [filterCat,setFilterCat]=useState("all");
  const [filterAvail,setFilterAvail]=useState("all");
  const [filterFeatured,setFilterFeatured]=useState(false);
  const [tab,setTab]=useState<"catalog"|"refresh">("catalog");
  const [error,setError]=useState("");

  const load=useCallback(async()=>{setLoading(true);setError("");try{const r=await http.get("/materials/catalog");setProducts(r.data?.products||[]);}catch{setError("Failed to load catalog");}setLoading(false);},[]);
  const loadRefresh=useCallback(async()=>{try{const r=await http.get("/materials/image-refresh/due",ADM);setRefreshDue(r.data?.needs_refresh||[]);}catch{}},[]);
  useEffect(()=>{load();loadRefresh();},[load,loadRefresh]);

  const cats=["all",...Array.from(new Set(products.map(p=>p.category))).sort()];
  const filtered=products.filter(p=>{
    if(filterCat!=="all"&&p.category!==filterCat)return false;
    if(filterAvail!=="all"&&p.availability!==filterAvail)return false;
    if(filterFeatured&&!p.is_featured)return false;
    return true;
  });
  const stats={total:products.length,available:products.filter(p=>p.availability==="available").length,featured:products.filter(p=>p.is_featured).length};

  return(
    <div style={{padding:24,maxWidth:1200,margin:"0 auto"}}>
      {editing&&<ProductEditor product={editing} onClose={()=>setEditing(null)} onSaved={()=>setEditing(null)} onRefresh={()=>{load();loadRefresh();}}/>}

      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:24,flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".12em",color:"var(--muted)",marginBottom:6}}>NexaBuilder Content</div>
          <h1 style={{fontSize:26,fontWeight:900,color:"var(--text)",margin:"0 0 6px"}}>Materials Catalog</h1>
          <p style={{fontSize:13,color:"var(--muted)",margin:0}}>{stats.total} products · {stats.available} available · {stats.featured} featured</p>
        </div>
        {refreshDue.length>0&&<button onClick={()=>setTab("refresh")} style={{padding:"10px 16px",borderRadius:10,background:"#fef9c3",border:"1.5px solid #fcd34d",fontSize:13,color:"#854d0e",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
          {refreshDue.length} products need image refresh
        </button>}
      </div>

      <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.max(cats.length-1,1)},1fr)`,gap:10,marginBottom:20}}>
        {cats.filter(c=>c!=="all").map(c=>(
          <button key={c} onClick={()=>{setFilterCat(c===filterCat?"all":c);setTab("catalog");}} style={{...card,padding:"12px 16px",cursor:"pointer",border:filterCat===c?"2px solid var(--navy)":"1.5px solid var(--border)",background:filterCat===c?"var(--navy)":"var(--card)"}}>
            <div style={{fontSize:20,marginBottom:4}}>{CAT_ICONS[c]||"📦"}</div>
            <div style={{fontSize:14,fontWeight:900,color:filterCat===c?"#fff":"var(--text)"}}>{products.filter(p=>p.category===c).length}</div>
            <div style={{fontSize:11,fontWeight:700,textTransform:"capitalize",color:filterCat===c?"rgba(255,255,255,.7)":"var(--muted)"}}>{c}</div>
          </button>
        ))}
      </div>

      <div style={{display:"flex",borderBottom:"2px solid var(--border)",marginBottom:20}}>
        {[{id:"catalog",label:"Product Catalog"},{id:"refresh",label:`Image Refresh${refreshDue.length>0?` (${refreshDue.length})`:""}`}]
          .map(t=><button key={t.id} onClick={()=>setTab(t.id as any)} style={{padding:"10px 20px",border:"none",background:"transparent",fontFamily:"inherit",cursor:"pointer",fontSize:13,fontWeight:tab===t.id?800:600,color:tab===t.id?"var(--navy)":"var(--muted)",borderBottom:tab===t.id?"2px solid var(--navy)":"2px solid transparent",marginBottom:"-2px"}}>{t.label}</button>)}
      </div>

      {tab==="catalog"&&<>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16,alignItems:"center"}}>
          {["all","available","low_stock","on_order","discontinued"].map(s=>{
            const c=s==="all"?{bg:"var(--card)",color:"var(--muted)"}:AVAIL[s];
            return<button key={s} onClick={()=>setFilterAvail(s)} style={{padding:"5px 14px",borderRadius:20,border:"1.5px solid var(--border)",background:filterAvail===s?c.bg:"var(--card)",color:filterAvail===s?c.color:"var(--muted)",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>{s==="all"?"All Status":s.replace("_"," ")}</button>;
          })}
          <button onClick={()=>setFilterFeatured(f=>!f)} style={{padding:"5px 14px",borderRadius:20,border:"1.5px solid var(--border)",background:filterFeatured?"#fef9c3":"var(--card)",color:filterFeatured?"#854d0e":"var(--muted)",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Featured only</button>
        </div>
        {error&&<div style={{padding:"10px 14px",background:"#fef2f2",color:"#dc2626",borderRadius:8,marginBottom:16,fontSize:13}}>{error}</div>}
        {loading?<div style={{padding:60,textAlign:"center",color:"var(--muted)"}}>Loading…</div>:(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {filtered.length===0&&<div style={{...card,padding:40,textAlign:"center",color:"var(--muted)",fontSize:13}}>No products match the current filters.</div>}
            {filtered.map(p=>{
              const ac=AVAIL[p.availability]||{bg:"var(--bg)",color:"var(--muted)"};
              const daysOld=p.image_updated_at?Math.floor((Date.now()-new Date(p.image_updated_at).getTime())/(1000*86400)):999;
              return(
                <div key={p.id} style={{...card,display:"grid",gridTemplateColumns:"80px 1fr auto",overflow:"hidden"}}>
                  <div style={{width:80,background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {p.hero_image_url?<img src={p.hero_image_url} alt={p.display_name} style={{width:80,height:80,objectFit:"cover"}}/>:<span style={{fontSize:28}}>{CAT_ICONS[p.category]||"📦"}</span>}
                  </div>
                  <div style={{padding:"12px 16px",minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
                      <span style={{fontSize:11,fontWeight:800,textTransform:"capitalize",padding:"2px 8px",borderRadius:6,background:ac.bg,color:ac.color}}>{p.availability.replace("_"," ")}</span>
                      {p.is_featured&&<span style={{fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:6,background:"#fef9c3",color:"#854d0e"}}>Featured</span>}
                      {daysOld>=30&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:6,background:"#fee2e2",color:"#991b1b"}}>Image overdue</span>}
                      <span style={{fontSize:11,padding:"2px 8px",borderRadius:6,background:"var(--bg)",color:"var(--muted)",textTransform:"capitalize"}}>{CAT_ICONS[p.category]} {p.category}</span>
                    </div>
                    <div style={{fontSize:15,fontWeight:700,color:"var(--text)",marginBottom:4}}>{p.display_name}</div>
                    <div style={{display:"flex",gap:12,fontSize:11,color:"var(--muted)",flexWrap:"wrap"}}>
                      <span>/{p.slug}</span>
                      {p.dim_length_in&&<span>{p.dim_length_in}x{p.dim_width_in}{p.dim_height_in?`x${p.dim_height_in}`:""} in</span>}
                      {p.lead_time_weeks&&<span>{p.lead_time_weeks}</span>}
                      {p.origin_region&&<span>{p.origin_region}</span>}
                      {p.stone_types?.length&&<span>{p.stone_types.join(", ")}</span>}
                      {p.available_finishes?.length&&<span>{p.available_finishes.join(", ")}</span>}
                    </div>
                    {p.seo_description&&<div style={{fontSize:12,color:"var(--muted)",marginTop:5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.seo_description}</div>}
                  </div>
                  <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:6,justifyContent:"center",flexShrink:0,borderLeft:"1.5px solid var(--border)"}}>
                    <button onClick={()=>setEditing(p)} style={{padding:"7px 16px",borderRadius:8,border:"none",background:"var(--navy)",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>
                    <button onClick={async()=>{const s=p.availability==="available"?"low_stock":"available";await http.put(`/materials/product/${p.id}/availability`,null,{params:{status:s},...ADM});load();}} style={{padding:"7px 16px",borderRadius:8,border:"1.5px solid var(--border)",background:"var(--card)",color:"var(--muted)",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                      {p.availability==="available"?"Low Stock":"Available"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>}

      {tab==="refresh"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {refreshDue.length===0?<div style={{...card,padding:40,textAlign:"center",color:"var(--muted)"}}>All product images are up to date.</div>:
          refreshDue.map((p:any)=>(
            <div key={p.id} style={{...card,display:"grid",gridTemplateColumns:"60px 1fr auto",overflow:"hidden"}}>
              <div style={{background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center"}}>{p.hero_image_url?<img src={p.hero_image_url} alt={p.display_name} style={{width:60,height:60,objectFit:"cover"}}/>:<span style={{fontSize:24}}>{CAT_ICONS[p.category]||"📦"}</span>}</div>
              <div style={{padding:"12px 16px"}}>
                <div style={{fontSize:14,fontWeight:700,color:"var(--text)",marginBottom:3}}>{p.display_name}</div>
                <div style={{fontSize:12,color:"var(--muted)"}}>Last refreshed: {p.image_updated_at||"Never"} · {p.days_since_refresh>=999?"Never refreshed":`${Math.round(p.days_since_refresh)} days ago`}</div>
              </div>
              <div style={{padding:"12px 14px",borderLeft:"1.5px solid var(--border)",display:"flex",alignItems:"center"}}>
                <button onClick={()=>setEditing(products.find(x=>x.id===p.id)||p)} style={{padding:"7px 14px",borderRadius:8,border:"none",background:"var(--navy)",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Update Image</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default MaterialsCmsPage;

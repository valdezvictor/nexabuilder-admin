import React, { useEffect, useState, useCallback } from "react";
import { http } from "../lib/http";

// ── Types ──────────────────────────────────────────────────────────────────────
interface User {
  id: string; email: string; role: string; status: string;
  first_name: string|null; last_name: string|null;
  full_name: string; department: string|null; title: string|null;
  phone: string|null; notes: string|null;
  created_at: string|null; last_login_at: string|null; verified: boolean;
}

const ROLES = ["admin","agent","partner","contractor","lead"];
const DEPARTMENTS = [
  "Call Center","Marketing","Legal","Accounting",
  "Operations","Technology","Executive","Sales",
];
const ROLE_BADGE: Record<string,string> = {
  admin:"badge-red", agent:"badge-blue", partner:"badge-purple",
  contractor:"badge-green", lead:"badge-gray",
};
const ROLE_PORTAL: Record<string,string> = {
  admin:"Admin Console", agent:"Call Center",
  partner:"Partner Portal", contractor:"Contractor Portal", lead:"Member Portal",
};

const fmtDate = (ts: string|null) => {
  if (!ts) return "Never";
  const d = new Date(ts);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff}d ago`;
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
};

// ── Invite / Edit Modal ────────────────────────────────────────────────────────
interface FormState {
  email: string; role: string; first_name: string; last_name: string;
  department: string; title: string; phone: string; notes: string;
  send_invite: boolean; status?: string; job_title?: string;
}
const EMPTY_FORM: FormState = {
  email:"", role:"agent", first_name:"", last_name:"",
  department:"Call Center", title:"", phone:"", notes:"", send_invite:true,
};

const UserModal: React.FC<{
  user: User|null;
  onClose: ()=>void;
  onSave: ()=>void;
}> = ({ user, onClose, onSave }) => {
  const isEdit = !!user;
  const [form, setForm]     = useState<FormState>(isEdit ? {
    email:      user.email,
    role:       user.role,
    first_name: user.first_name||"",
    last_name:  user.last_name||"",
    department: user.department||"",
    title:      user.title||"",
    phone:      user.phone||"",
    notes:      user.notes||"",
    send_invite: false,
    status:     user.status,
  } : EMPTY_FORM);
  const [loading, setLoading]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [jobTitles, setJobTitles] = useState<any[]>([]);

  useEffect(() => {
    http.get("/admin/job-titles")
      .then(r => setJobTitles(r.data.titles || []))
      .catch(() => {});
  }, []);

  const titlesForDept = jobTitles.filter(t => !form.department || t.department === form.department);

  // Auto-fill role when job title is selected
  const handleTitleChange = (title: string) => {
    const found = jobTitles.find(t => t.title === title);
    if (found) {
      setForm(p => ({...p, job_title: title, role: found.base_role, department: found.department}));
    } else {
      setForm(p => ({...p, job_title: title}));
    }
  };

  const set = (k: string, v: any) => setForm(p => ({...p, [k]: v}));

  const submit = async () => {
    if (!isEdit && !form.email.includes("@")) { setError("Valid email required"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      if (isEdit) {
        await http.patch(`/admin/users/${user.id}`, {
          role: form.role, department: form.department,
          first_name: form.first_name, last_name: form.last_name,
          title: form.title, phone: form.phone,
          notes: form.notes,
          ...(form.status ? { status: (form as FormState).status } : {}),
        });
        setSuccess("✓ User updated");
      } else {
        const r = await http.post("/admin/users/invite", form);
        const link = r.data.magic_link;
        setSuccess(`✓ ${r.data.action === "created" ? "User invited" : "User updated"} successfully${!form.send_invite && link ? " — Copy invite link below" : ""}`);
        if (!form.send_invite && link) {
          setTimeout(() => navigator.clipboard?.writeText(link).catch(()=>{}), 100);
        }
      }
      setTimeout(() => { onSave(); onClose(); }, 1500);
    } catch(e: any) {
      setError(e?.response?.data?.detail || "Error saving user");
    } finally { setLoading(false); }
  };

  const resend = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await http.post(`/admin/users/${user.id}/resend`);
      setSuccess("✓ Invite resent");
    } catch { setError("Failed to resend invite"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
      <div style={{background:"#fff",borderRadius:16,width:520,maxWidth:"95vw",
        maxHeight:"90vh",overflow:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.3)"}}>

        {/* Header */}
        <div style={{padding:"20px 24px",borderBottom:"1px solid var(--border)",
          display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontWeight:800,fontSize:16,color:"var(--navy)"}}>
              {isEdit ? `Edit User` : "Invite New User"}
            </div>
            {isEdit && <div style={{fontSize:13,color:"var(--muted)",marginTop:2}}>{user.email}</div>}
          </div>
          <button onClick={onClose}
            style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"var(--muted)"}}>×</button>
        </div>

        <div style={{padding:"20px 24px"}}>
          {error   && <div className="error-msg"   style={{marginBottom:12}}>{error}</div>}
          {success && <div className="success-msg" style={{marginBottom:12}}>{success}</div>}

          {/* Email — only for new users */}
          {!isEdit && (
            <div className="field">
              <label>Email Address *</label>
              <input type="email" value={form.email}
                onChange={e=>set("email",e.target.value)}
                placeholder="agent@company.com"/>
            </div>
          )}

          {/* Name row */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div className="field">
              <label>First Name</label>
              <input value={form.first_name} onChange={e=>set("first_name",e.target.value)} placeholder="Maria"/>
            </div>
            <div className="field">
              <label>Last Name</label>
              <input value={form.last_name}  onChange={e=>set("last_name",e.target.value)}  placeholder="Garcia"/>
            </div>
          </div>

          {/* Role + Department */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div className="field">
              <label>Role *</label>
              <select value={form.role} onChange={e=>set("role",e.target.value)}>
                {ROLES.map(r=>(
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase()+r.slice(1)} — {ROLE_PORTAL[r]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Department</label>
              <select value={form.department} onChange={e=>set("department",e.target.value)}>
                <option value="">— Select —</option>
                {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Job Title (from DB) */}
          <div className="field">
            <label>Job Title {titlesForDept.length > 0 ? `(${titlesForDept.length} options for ${form.department||"selected dept"})` : ""}</label>
            <select value={form.job_title||""} onChange={e=>handleTitleChange(e.target.value)}>
              <option value="">— Select job title —</option>
              {titlesForDept.map(t=>(
                <option key={t.title} value={t.title}>{t.title}</option>
              ))}
              <option value="__custom">Custom (type below)</option>
            </select>
            {form.job_title && jobTitles.find(t=>t.title===form.job_title) && (
              <div style={{fontSize:11,color:"var(--muted)",marginTop:4,
                padding:"6px 8px",background:"#f8faff",borderRadius:6,lineHeight:1.5}}>
                {jobTitles.find(t=>t.title===form.job_title)?.description}
              </div>
            )}
          </div>

          {/* Custom title input */}
          {(form.job_title === "__custom" || (!jobTitles.find(t=>t.title===form.job_title) && form.job_title)) && (
            <div className="field">
              <label>Custom Title</label>
              <input value={form.title} onChange={e=>set("title",e.target.value)} placeholder="e.g. Regional Sales Manager"/>
            </div>
          )}

          {/* Title + Phone */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div className="field" style={{display:"none"}}>
              <label>Job Title</label>
              <input value={form.title} onChange={e=>set("title",e.target.value)} placeholder="Call Center Agent"/>
            </div>
            <div className="field">
              <label>Phone</label>
              <input type="tel" value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="(714) 555-1234"/>
            </div>
          </div>

          {/* Status — edit only */}
          {isEdit && (
            <div className="field">
              <label>Status</label>
              <select value={form.status || ""} onChange={e=>set("status",e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}

          {/* Notes */}
          <div className="field">
            <label>Internal Notes</label>
            <textarea value={form.notes} onChange={e=>set("notes",e.target.value)}
              placeholder="Location, shift, special access notes..." rows={2}/>
          </div>

          {/* Send invite toggle — new users only */}
          {!isEdit && (
            <label style={{display:"flex",alignItems:"center",gap:10,
              padding:"10px 12px",background:"#eff6ff",borderRadius:8,cursor:"pointer",marginBottom:12}}>
              <input type="checkbox" checked={form.send_invite}
                onChange={e=>set("send_invite",e.target.checked)}
                style={{width:16,height:16,accentColor:"var(--blue)"}}/>
              <div>
                <div style={{fontWeight:700,fontSize:13}}>Send invite email</div>
                <div style={{fontSize:11,color:"var(--muted)"}}>
                  Sends a magic link to {form.email||"the user"} directing them to {ROLE_PORTAL[form.role]}
                </div>
              </div>
            </label>
          )}

          {/* Actions */}
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
            {isEdit && (
              <button className="btn btn-outline btn-sm" onClick={resend} disabled={loading}>
                📧 Resend Invite
              </button>
            )}
            <button className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Save Changes" : form.send_invite ? "Invite User →" : "Create User →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const UsersPage: React.FC = () => {
  const [users, setUsers]         = useState<User[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filterRole, setFilterRole] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");
  const [search, setSearch]       = useState("");
  const [modalUser, setModalUser] = useState<User|null|undefined>(undefined);
  // undefined = closed, null = new user, User = edit

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string,string> = {};
      if (filterRole)   params.role   = filterRole;
      if (filterStatus) params.status = filterStatus;
      if (filterDept)   params.department = filterDept;
      const r = await http.get("/admin/users", { params });
      setUsers(r.data.users || []);
    } catch(e:any) {
      console.error("Failed to load users:", e);
    } finally { setLoading(false); }
  }, [filterRole, filterStatus, filterDept]);

  useEffect(() => { load(); }, [load]);

  const deactivate = async (user: User) => {
    if (!window.confirm(`Deactivate ${user.email}? They will lose portal access.`)) return;
    try {
      await http.delete(`/admin/users/${user.id}`);
      load();
    } catch { alert("Failed to deactivate user"); }
  };

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.email.toLowerCase().includes(q) ||
      u.full_name.toLowerCase().includes(q) ||
      (u.department||"").toLowerCase().includes(q) ||
      (u.title||"").toLowerCase().includes(q);
  });

  // Stats
  const byRole = ROLES.reduce((acc,r)=>({...acc,[r]:users.filter(u=>u.role===r).length}),{} as Record<string,number>);
  const activeCount = users.filter(u=>u.status==="active").length;

  return (
    <div>
      {/* Modal */}
      {modalUser !== undefined && (
        <UserModal
          user={modalUser}
          onClose={() => setModalUser(undefined)}
          onSave={load}
        />
      )}

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{fontSize:"1.3rem",fontWeight:900,color:"var(--navy)"}}>
            User Management
          </h1>
          <p style={{fontSize:13,color:"var(--muted)",marginTop:2}}>
            {activeCount} active users across {Object.values(byRole).filter(v=>v>0).length} roles
          </p>
        </div>
        <button className="btn btn-primary" onClick={()=>setModalUser(null)}>
          + Invite User
        </button>
      </div>

      {/* Role stats cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:20}}>
        {[
          {role:"admin",      label:"Admins",      color:"var(--red)",    icon:"🔑"},
          {role:"agent",      label:"Agents",      color:"var(--blue)",   icon:"🎧"},
          {role:"partner",    label:"Partners",    color:"var(--purple)", icon:"🤝"},
          {role:"contractor", label:"Contractors", color:"var(--green)",  icon:"👷"},
          {role:"lead",       label:"Leads",       color:"var(--amber)",  icon:"👤"},
        ].map(s=>(
          <div key={s.role} className="card"
            style={{marginBottom:0,padding:"12px 14px",cursor:"pointer",
              borderLeft:`3px solid ${s.color}`,transition:"all .15s"}}
            onClick={()=>setFilterRole(filterRole===s.role?"":s.role)}>
            <div style={{fontSize:11,fontWeight:800,color:"var(--muted)",
              textTransform:"uppercase",letterSpacing:".4px",marginBottom:4}}>
              {s.icon} {s.label}
            </div>
            <div style={{fontSize:"1.4rem",fontWeight:900,color:s.color,lineHeight:1}}>
              {byRole[s.role]||0}
            </div>
            {filterRole===s.role && (
              <div style={{fontSize:10,color:"var(--blue)",marginTop:4,fontWeight:700}}>
                Filtered ×
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <input
          style={{flex:"1 1 200px",padding:"9px 12px",border:"1.5px solid var(--border)",
            borderRadius:8,fontSize:13,minWidth:0}}
          placeholder="Search name, email, department..."
          value={search} onChange={e=>setSearch(e.target.value)}
        />
        <select style={{padding:"9px 12px",border:"1.5px solid var(--border)",borderRadius:8,fontSize:13}}
          value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select style={{padding:"9px 12px",border:"1.5px solid var(--border)",borderRadius:8,fontSize:13}}
          value={filterDept} onChange={e=>setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
        {(filterRole||filterDept||filterStatus!=="active"||search) && (
          <button className="btn btn-outline btn-sm"
            onClick={()=>{setFilterRole("");setFilterDept("");setFilterStatus("active");setSearch("");}}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{overflow:"auto"}}>
        {loading ? (
          <div className="loading-wrap"><div className="spinner"></div>Loading users...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div style={{fontSize:40,marginBottom:12}}>👥</div>
            <p>No users match your filters</p>
            <button className="btn btn-primary" style={{marginTop:12}}
              onClick={()=>setModalUser(null)}>Invite First User →</button>
          </div>
        ) : (
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                {["User","Role","Department","Portal Access","Last Login","Status",""].map(h=>(
                  <th key={h} style={{padding:"10px 14px",textAlign:"left",
                    fontSize:10,fontWeight:800,textTransform:"uppercase",
                    letterSpacing:".5px",color:"var(--muted)",
                    background:"#fafbfc",borderBottom:"2px solid var(--border)",
                    whiteSpace:"nowrap"}}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user,i)=>(
                <tr key={user.id} style={{cursor:"pointer",transition:"background .1s"}}
                  onMouseEnter={e=>(e.currentTarget.style.background="#f8faff")}
                  onMouseLeave={e=>(e.currentTarget.style.background="")}>

                  <td style={{padding:"12px 14px",borderBottom:"1px solid var(--border)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:36,height:36,borderRadius:"50%",flexShrink:0,
                        background:`hsl(${(user.email.charCodeAt(0)*5)%360},55%,55%)`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:13,fontWeight:800,color:"#fff"}}>
                        {(user.first_name?.[0]||user.email[0]).toUpperCase()}
                      </div>
                      <div>
                        <div style={{fontWeight:700,fontSize:13,color:"var(--navy)"}}>
                          {user.full_name}
                        </div>
                        <div style={{fontSize:11,color:"var(--muted)"}}>
                          {user.email}
                          {user.title ? ` · ${user.title}` : ""}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td style={{padding:"12px 14px",borderBottom:"1px solid var(--border)"}}>
                    <span className={`badge ${ROLE_BADGE[user.role]||"badge-gray"}`}>
                      {user.role}
                    </span>
                  </td>

                  <td style={{padding:"12px 14px",borderBottom:"1px solid var(--border)",
                    fontSize:13,color:"var(--muted)"}}>
                    {user.department||"—"}
                  </td>

                  <td style={{padding:"12px 14px",borderBottom:"1px solid var(--border)",
                    fontSize:12,color:"var(--muted)"}}>
                    {ROLE_PORTAL[user.role]}
                  </td>

                  <td style={{padding:"12px 14px",borderBottom:"1px solid var(--border)",
                    fontSize:12,color:"var(--muted)",whiteSpace:"nowrap"}}>
                    <div>{fmtDate(user.last_login_at)}</div>
                    {!user.verified && (
                      <div style={{fontSize:10,color:"var(--amber)",fontWeight:700,marginTop:2}}>
                        ⏳ Invite pending
                      </div>
                    )}
                  </td>

                  <td style={{padding:"12px 14px",borderBottom:"1px solid var(--border)"}}>
                    <span className={`badge ${user.status==="active"?"badge-green":"badge-gray"}`}>
                      {user.status}
                    </span>
                  </td>

                  <td style={{padding:"12px 14px",borderBottom:"1px solid var(--border)"}}>
                    <div style={{display:"flex",gap:6}}>
                      <button className="btn btn-outline btn-sm"
                        onClick={e=>{e.stopPropagation();setModalUser(user);}}>
                        Edit
                      </button>
                      {user.status==="active" && (
                        <button className="btn btn-sm"
                          style={{background:"#fef2f2",color:"var(--red)",border:"1px solid #fecaca"}}
                          onClick={e=>{e.stopPropagation();deactivate(user);}}>
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export { UsersPage };

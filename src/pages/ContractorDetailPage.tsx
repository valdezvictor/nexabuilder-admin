import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { http } from "../lib/http";

type ContractorDetail = {
  id: number; license_no?: string; business_name?: string;
  full_business_name?: string; email?: string; phone?: string;
  city?: string; state?: string; zip_code?: string;
  classifications?: string; primary_status?: string;
  business_type?: string; created_at?: string;
};

export const ContractorDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contractor, setContractor] = useState<ContractorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    http.get(`/admin/contractors/${id}`)
      .then((r: any) => setContractor(r.data))
      .catch(() => setError("Contractor not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleActivate = () => {
    if (!contractor) return;
    setActivating(true);
    http.patch(`/admin/contractors/${id}`, { primary_status: "CLEAR" })
      .then(() => {
        setContractor(prev => prev ? { ...prev, primary_status: "CLEAR" } : prev);
        setActivated(true);
      })
      .catch(() => setError("Activation failed"))
      .finally(() => setActivating(false));
  };

  if (loading) return <div className="loading-wrap"><div className="spinner"></div></div>;
  if (error) return <div className="empty-state">{error} <button className="btn btn-outline btn-sm" style={{marginLeft:12}} onClick={() => navigate("/contractors")}>← Back</button></div>;
  if (!contractor) return null;

  const isPending = contractor.primary_status === "PENDING_REVIEW";
  const isClear = contractor.primary_status === "CLEAR";

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:24 }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate("/contractors")}>
          ← Contractors
        </button>
        <h2 style={{ fontSize:"1.4rem", fontWeight:800, color:"var(--navy)", margin:0 }}>
          {contractor.business_name || contractor.full_business_name || `Contractor #${id}`}
        </h2>
        <span className={`badge ${isClear ? "badge-green" : isPending ? "badge-amber" : "badge-gray"}`}
          style={{ marginLeft:"auto" }}>
          {contractor.primary_status || "unknown"}
        </span>
      </div>

      {/* Activation banner for pending accounts */}
      {isPending && !activated && (
        <div style={{
          background:"#fff7ed", border:"1.5px solid #f59e0b", borderRadius:12,
          padding:"16px 20px", marginBottom:20, display:"flex",
          alignItems:"center", justifyContent:"space-between", gap:16
        }}>
          <div>
            <div style={{ fontWeight:700, color:"#92400e", marginBottom:4 }}>
              Pending Review — Action Required
            </div>
            <div style={{ fontSize:13, color:"#78350f" }}>
              This contractor registered through the portal and is awaiting CSLB license verification and account activation.
            </div>
          </div>
          <button className="btn btn-primary btn-sm" style={{ background:"#d97706", whiteSpace:"nowrap", flexShrink:0 }}
            onClick={handleActivate} disabled={activating}>
            {activating ? "Activating..." : "✓ Activate Account"}
          </button>
        </div>
      )}

      {activated && (
        <div style={{
          background:"#f0fdf4", border:"1.5px solid #10b981", borderRadius:12,
          padding:"16px 20px", marginBottom:20, fontWeight:600, color:"#065f46"
        }}>
          ✓ Account activated — contractor can now log in and receive leads
        </div>
      )}

      {/* Info cards */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>

        <div className="card" style={{ padding:"20px 24px" }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:"var(--muted)", marginBottom:14 }}>Business Info</div>
          <table style={{ width:"100%", fontSize:13, borderCollapse:"collapse" }}>
            <tbody>
              {[
                ["Business Name", contractor.business_name],
                ["Legal Name", contractor.full_business_name],
                ["Business Type", contractor.business_type],
                ["Classifications", contractor.classifications?.replace(/\|/g, " · ")],
                ["License #", contractor.license_no],
              ].filter(([,v]) => v).map(([label, value]) => (
                <tr key={label as string}>
                  <td style={{ color:"var(--muted)", paddingBottom:10, width:"40%", verticalAlign:"top" }}>{label}</td>
                  <td style={{ fontWeight:600, paddingBottom:10, color:"var(--navy)" }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ padding:"20px 24px" }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:"var(--muted)", marginBottom:14 }}>Contact & Location</div>
          <table style={{ width:"100%", fontSize:13, borderCollapse:"collapse" }}>
            <tbody>
              {[
                ["Email", contractor.email],
                ["Phone", contractor.phone],
                ["City", contractor.city],
                ["State", contractor.state],
                ["Zip Code", contractor.zip_code],
                ["Registered", contractor.created_at ? new Date(contractor.created_at).toLocaleDateString() : null],
              ].filter(([,v]) => v).map(([label, value]) => (
                <tr key={label as string}>
                  <td style={{ color:"var(--muted)", paddingBottom:10, width:"40%", verticalAlign:"top" }}>{label}</td>
                  <td style={{ fontWeight:600, paddingBottom:10, color:"var(--navy)" }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* Admin Actions */}
      <div className="card" style={{ padding:"20px 24px" }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:"var(--muted)", marginBottom:14 }}>Admin Actions</div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {isPending && !activated && (
            <button className="btn btn-primary btn-sm" onClick={handleActivate} disabled={activating}>
              {activating ? "Activating..." : "✓ Activate Account"}
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={() => navigate("/outreach")}>
            Send Outreach SMS
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate(`/bids?contractor_id=${id}`)}>
            View Bid History
          </button>
        </div>
      </div>

    </div>
  );
};

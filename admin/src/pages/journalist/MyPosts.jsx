import React, { useState, useEffect } from "react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { PenTool, CheckCircle, FileText, Clock, Trash2, Eye } from "lucide-react";

const STATUS_COLORS = { published: "#10B981", draft: "#8B5CF6", pending: "#F59E0B" };

const MyPosts = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/articles/getAll?authorId=${user.id || ""}&page=0&size=50&sortBy=id&direction=desc`)
      .then(r => setPosts(Array.isArray(r.data) ? r.data : (r.data?.content || [])))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [user]);

  const deletePost = async (id) => {
    if (!window.confirm("Delete this draft?")) return;
    try { await api.delete(`/articles/${id}`); setPosts(prev => prev.filter(p => p.id !== id)); }
    catch (err) { console.error(err); }
  };

  const totalViews = posts.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
  const counts = {
    published: posts.filter(p => p.status === "published").length,
    pending: posts.filter(p => p.status === "pending").length,
    drafts: posts.filter(p => p.status === "draft").length
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}><PenTool size={26} color="var(--primary)" /> My Stories</h1>
          <p className="text-secondary">Welcome, {user.email.split("@")[0]}. Here's your reporting workspace.</p>
        </div>
        <Link to="/journalist/create" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
          <PenTool size={16} /> Write New Story
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "2rem" }}>
        <div className="glass-panel stat-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>Total Views</div>
            <div style={{ color: "#3B82F6", padding: "0.5rem", background: "rgba(59,130,246,0.1)", borderRadius: "8px" }}><Eye size={18} /></div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>{totalViews.toLocaleString()}</div>
        </div>
        <div className="glass-panel stat-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>Published</div>
            <div style={{ color: "#10B981", padding: "0.5rem", background: "rgba(16,185,129,0.1)", borderRadius: "8px" }}><CheckCircle size={18} /></div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>{counts.published}</div>
        </div>
        <div className="glass-panel stat-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>In Review</div>
            <div style={{ color: "#F59E0B", padding: "0.5rem", background: "rgba(245,158,11,0.1)", borderRadius: "8px" }}><Clock size={18} /></div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>{counts.pending}</div>
        </div>
        <div className="glass-panel stat-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>Drafts</div>
            <div style={{ color: "#8B5CF6", padding: "0.5rem", background: "rgba(139,92,246,0.1)", borderRadius: "8px" }}><FileText size={18} /></div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>{counts.drafts}</div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <h3 style={{ marginBottom: "1rem" }}>All Stories</h3>
        {loading ? <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>
          : posts.length === 0 ? <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>You haven't written any stories yet.</div>
          : <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {posts.map(post => (
              <div key={post.id} style={{ padding: "1rem 1.25rem", background: "var(--bg-secondary)", borderRadius: "10px", display: "flex", alignItems: "center", gap: "1rem", borderLeft: `4px solid ${STATUS_COLORS[post.status] || "var(--border-color)"}` }}>
                {post.imageUrl && <img src={post.imageUrl} alt="" style={{ width: "60px", height: "60px", borderRadius: "8px", objectFit: "cover" }} />}
                <div style={{ flex: 1 }}>
                  <Link to={`/journalist/edit/${post.id}`} style={{ fontWeight: 700, color: "var(--text-primary)", textDecoration: "none", fontSize: "1.05rem" }}>{post.titleTa || post.titleEn}</Link>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem", display: "flex", gap: "1rem" }}>
                    <span>{new Date(post.createdAt || post.publishedAt || Date.now()).toLocaleDateString()}</span>
                    {(post.viewsCount || 0) > 0 && <span style={{ color: "var(--primary)", fontWeight: 600 }}>??? {post.viewsCount} views</span>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "4px 10px", borderRadius: "12px", background: `${STATUS_COLORS[post.status]}22`, color: STATUS_COLORS[post.status], textTransform: "capitalize" }}>{post.status}</span>
                  <Link to={`/journalist/edit/${post.id}`} className="btn btn-secondary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", textDecoration: "none" }}>Edit</Link>
                  <button onClick={() => deletePost(post.id)} style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", color: "#EF4444", cursor: "pointer" }}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>}
      </div>
    </div>
  );
};
export default MyPosts;

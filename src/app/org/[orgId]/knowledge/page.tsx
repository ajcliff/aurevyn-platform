"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import Drawer from "@/components/Drawer";
import {
  getArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  type KnowledgeArticle,
  type ArticleCategory,
} from "@/lib/knowledgeBase";

const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  sop: "SOP",
  policy: "Policy",
  onboarding: "Onboarding",
  faq: "FAQ",
  general: "General",
};

export default function KnowledgeBasePage() {
  const { organization } = useEngine();

  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<"all" | ArticleCategory>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<KnowledgeArticle | null>(null);
  const [editing, setEditing] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ArticleCategory>("general");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const data = await getArticles(organization.id);
    setArticles(data);
    setLoading(false);
  }

  const filtered = articles.filter((a) => {
    const matchCategory = categoryFilter === "all" || a.category === categoryFilter;
    const matchSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  function openNew() {
    setTitle("");
    setCategory("general");
    setContent("");
    setSelected(null);
    setEditing(false);
    setShowNew(true);
  }

  function openArticle(article: KnowledgeArticle) {
    setSelected(article);
    setEditing(false);
    setShowNew(false);
  }

  function closeDrawer() {
    setSelected(null);
    setShowNew(false);
    setEditing(false);
  }

  function startEdit() {
    if (!selected) return;
    setTitle(selected.title);
    setCategory(selected.category);
    setContent(selected.content);
    setEditing(true);
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) return;

    try {
      setSaving(true);

      if (showNew) {
        await createArticle({
          orgId: organization.id,
          title,
          category,
          content,
          createdByName: "You",
        });
      } else if (selected) {
        await updateArticle(selected.id, title, category, content, organization.id);
      }

      closeDrawer();
      load();
    } catch (err) {
      console.error(err);
      alert("Failed to save article");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(article: KnowledgeArticle) {
    if (!confirm(`Delete "${article.title}"?`)) return;
    await deleteArticle(article.id, article.title, organization.id);
    closeDrawer();
    load();
  }

  if (loading) return <div>Loading knowledge base...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Knowledge Base</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            SOPs, policies, onboarding guides, and FAQs for {organization.name}.
          </p>
        </div>
        <button style={buttonGold} onClick={openNew}>
          + New Article
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Search articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, width: 220, marginBottom: 0 }}
        />
        <FilterChip label="All" active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")} />
        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
          <FilterChip
            key={value}
            label={label}
            active={categoryFilter === value}
            onClick={() => setCategoryFilter(value as ArticleCategory)}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ ...cardStyle, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          No articles yet. Create your first SOP, policy, or FAQ.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {filtered.map((a) => (
            <div
              key={a.id}
              onClick={() => openArticle(a)}
              className="card"
              style={{ ...cardStyle, padding: 14, cursor: "pointer", display: "flex", flexDirection: "column", gap: 6 }}
            >
              <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {a.title}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {CATEGORY_LABELS[a.category]} · {new Date(a.updated_at).toLocaleDateString()}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {a.content}
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer
        open={!!selected || showNew}
        onClose={closeDrawer}
        title={showNew ? "New Article" : editing ? "Edit Article" : selected?.title ?? ""}
        width={520}
      >
        {editing || showNew ? (
          <>
            <input
              placeholder="Article title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ArticleCategory)}
              style={inputStyle}
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <textarea
              placeholder="Write the article content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ ...inputStyle, minHeight: 300, resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                style={ghostButton}
                onClick={() => {
                  setEditing(false);
                  setShowNew(false);
                  if (!selected) closeDrawer();
                }}
              >
                Cancel
              </button>
              <button style={{ ...buttonGold, flex: 1 }} onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </>
        ) : (
          selected && (
            <>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16 }}>
                {CATEGORY_LABELS[selected.category]} · Updated {new Date(selected.updated_at).toLocaleDateString()}
              </div>

              <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7, color: "var(--text-secondary)" }}>
                {selected.content}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button style={ghostButton} onClick={startEdit}>Edit</button>
                <button style={dangerBtn} onClick={() => handleDelete(selected)}>Delete</button>
              </div>
            </>
          )
        )}
      </Drawer>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: active ? "var(--gold)" : "var(--bg-elevated)",
        color: active ? "#07070f" : "var(--text-secondary)",
        fontSize: 11,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 20,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  marginBottom: 10,
  fontSize: 13,
};

const buttonGold: React.CSSProperties = {
  background: "var(--gold)",
  color: "#07070f",
  border: "none",
  borderRadius: 10,
  padding: "9px 18px",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};

const ghostButton: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 12,
  cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 10,
  border: "1px solid #ef4444",
  background: "transparent",
  color: "#ef4444",
  fontSize: 12,
  cursor: "pointer",
};
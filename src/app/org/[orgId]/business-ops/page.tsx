"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import Drawer from "@/components/Drawer";
import EmptyState from "@/components/EmptyState";
import {
  getTeams,
  createTeam,
  getProjects,
  createProject,
  updateProject,
  getTasks,
  createTask,
  updateTask,
  getDocuments,
  createDocument,
  type OpsTeam,
  type OpsProject,
  type OpsTask,
  type OpsDocument,
} from "@/lib/operations";

type ProjectStatus = OpsProject["status"];
type Priority = OpsProject["priority"];
type TaskStatus = OpsTask["status"];

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  completed: "Completed",
  on_hold: "On Hold",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: "#5b9cf5",
  completed: "#3dd68c",
  on_hold: "#f5b942",
  cancelled: "var(--text-muted)",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "var(--text-muted)",
  medium: "#5b9cf5",
  high: "#f5b942",
  urgent: "#ef4444",
};

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "var(--text-muted)",
  in_progress: "#5b9cf5",
  review: "#f5b942",
  done: "#3dd68c",
};

const DOC_TYPE_ICONS: Record<OpsDocument["type"], string> = {
  document: "📄",
  spreadsheet: "📊",
  presentation: "📽️",
  pdf: "📕",
  other: "📎",
};

const TEAM_COLORS = ["#f5b942", "#5b9cf5", "#3dd68c", "#ef4444", "#a78bfa", "#f472b6", "#38bdf8", "#fb923c"];

export default function BusinessOpsPage() {
  const { organization } = useEngine();

  const [tab, setTab] = useState<"teams" | "projects">("projects");
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<OpsTeam[]>([]);
  const [projects, setProjects] = useState<OpsProject[]>([]);

  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");

  // Team drawer
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamLead, setTeamLead] = useState("");
  const [teamMemberCount, setTeamMemberCount] = useState(1);
  const [teamColor, setTeamColor] = useState(TEAM_COLORS[0]);
  const [savingTeam, setSavingTeam] = useState(false);

  // Project drawer (new + detail)
  const [showNewProject, setShowNewProject] = useState(false);
  const [selectedProject, setSelectedProject] = useState<OpsProject | null>(null);
  const [editingProject, setEditingProject] = useState(false);

  const [projName, setProjName] = useState("");
  const [projDescription, setProjDescription] = useState("");
  const [projTeamId, setProjTeamId] = useState<string>("");
  const [projStatus, setProjStatus] = useState<ProjectStatus>("active");
  const [projPriority, setProjPriority] = useState<Priority>("medium");
  const [projProgress, setProjProgress] = useState(0);
  const [projStartDate, setProjStartDate] = useState("");
  const [projDueDate, setProjDueDate] = useState("");
  const [savingProject, setSavingProject] = useState(false);

  // Project detail: tasks + documents
  const [detailLoading, setDetailLoading] = useState(false);
  const [tasks, setTasks] = useState<OpsTask[]>([]);
  const [documents, setDocuments] = useState<OpsDocument[]>([]);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("medium");
  const [addingTask, setAddingTask] = useState(false);

  const [newDocName, setNewDocName] = useState("");
  const [newDocType, setNewDocType] = useState<OpsDocument["type"]>("document");
  const [newDocUrl, setNewDocUrl] = useState("");
  const [addingDoc, setAddingDoc] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [t, p] = await Promise.all([getTeams(organization.id), getProjects(organization.id)]);
    setTeams(t);
    setProjects(p);
    setLoading(false);
  }

  const teamById = (id: string | null) => teams.find((t) => t.id === id);

  const filteredProjects = projects.filter((p) => {
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchPriority = priorityFilter === "all" || p.priority === priorityFilter;
    return matchStatus && matchPriority;
  });

  // ---------- Teams ----------

  function openNewTeam() {
    setTeamName("");
    setTeamDescription("");
    setTeamLead("");
    setTeamMemberCount(1);
    setTeamColor(TEAM_COLORS[0]);
    setShowNewTeam(true);
  }

  function closeTeamDrawer() {
    setShowNewTeam(false);
  }

  async function handleSaveTeam() {
    if (!teamName.trim()) return;
    try {
      setSavingTeam(true);
      await createTeam({
        org_id: organization.id,
        name: teamName,
        description: teamDescription || null,
        color: teamColor,
        lead: teamLead || null,
        member_count: teamMemberCount,
      });
      closeTeamDrawer();
      load();
    } catch (err) {
      console.error(err);
      alert("Failed to save team");
    } finally {
      setSavingTeam(false);
    }
  }

  // ---------- Projects ----------

  function openNewProject() {
    setProjName("");
    setProjDescription("");
    setProjTeamId("");
    setProjStatus("active");
    setProjPriority("medium");
    setProjProgress(0);
    setProjStartDate("");
    setProjDueDate("");
    setSelectedProject(null);
    setEditingProject(false);
    setShowNewProject(true);
  }

  async function openProject(project: OpsProject) {
    setSelectedProject(project);
    setEditingProject(false);
    setShowNewProject(false);
    setProjName(project.name);
    setProjDescription(project.description ?? "");
    setProjTeamId(project.team_id ?? "");
    setProjStatus(project.status);
    setProjPriority(project.priority);
    setProjProgress(project.progress);
    setProjStartDate(project.start_date ?? "");
    setProjDueDate(project.due_date ?? "");

    setDetailLoading(true);
    const [t, d] = await Promise.all([
      getTasks(organization.id, project.id),
      getDocuments(organization.id, project.id),
    ]);
    setTasks(t);
    setDocuments(d);
    setDetailLoading(false);
  }

  function closeProjectDrawer() {
    setSelectedProject(null);
    setShowNewProject(false);
    setEditingProject(false);
    setTasks([]);
    setDocuments([]);
    setNewTaskTitle("");
    setNewDocName("");
    setNewDocUrl("");
  }

  async function handleSaveProject() {
    if (!projName.trim()) return;
    try {
      setSavingProject(true);

      if (showNewProject) {
        await createProject({
          org_id: organization.id,
          team_id: projTeamId || null,
          name: projName,
          description: projDescription || null,
          status: projStatus,
          priority: projPriority,
          progress: projProgress,
          start_date: projStartDate || null,
          due_date: projDueDate || null,
        });
        closeProjectDrawer();
      } else if (selectedProject) {
        const updated = await updateProject(selectedProject.id, {
          team_id: projTeamId || null,
          name: projName,
          description: projDescription || null,
          status: projStatus,
          priority: projPriority,
          progress: projProgress,
          start_date: projStartDate || null,
          due_date: projDueDate || null,
        });
        setSelectedProject(updated);
        setEditingProject(false);
      }

      load();
    } catch (err) {
      console.error(err);
      alert("Failed to save project");
    } finally {
      setSavingProject(false);
    }
  }

  async function handleQuickStatusChange(status: ProjectStatus) {
    if (!selectedProject) return;
    setProjStatus(status);
    const updated = await updateProject(selectedProject.id, { status });
    setSelectedProject(updated);
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function handleQuickProgressChange(progress: number) {
    if (!selectedProject) return;
    setProjProgress(progress);
    const updated = await updateProject(selectedProject.id, { progress });
    setSelectedProject(updated);
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  // ---------- Tasks ----------

  async function handleAddTask() {
    if (!newTaskTitle.trim() || !selectedProject) return;
    try {
      setAddingTask(true);
      const task = await createTask({
        org_id: organization.id,
        project_id: selectedProject.id,
        title: newTaskTitle,
        description: null,
        status: "todo",
        priority: newTaskPriority,
        assignee: null,
        due_date: null,
      });
      setTasks((prev) => [...prev, task]);
      setNewTaskTitle("");
      setNewTaskPriority("medium");
    } catch (err) {
      console.error(err);
      alert("Failed to add task");
    } finally {
      setAddingTask(false);
    }
  }

  async function handleToggleTask(task: OpsTask) {
    const nextStatus: TaskStatus = task.status === "done" ? "todo" : "done";
    const updated = await updateTask(task.id, { status: nextStatus });
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  // ---------- Documents ----------

  async function handleAddDocument() {
    if (!newDocName.trim() || !selectedProject) return;
    try {
      setAddingDoc(true);
      const doc = await createDocument({
        org_id: organization.id,
        project_id: selectedProject.id,
        name: newDocName,
        type: newDocType,
        size: null,
        url: newDocUrl || null,
        uploaded_by: "You",
      });
      setDocuments((prev) => [doc, ...prev]);
      setNewDocName("");
      setNewDocType("document");
      setNewDocUrl("");
    } catch (err) {
      console.error(err);
      alert("Failed to add document");
    } finally {
      setAddingDoc(false);
    }
  }

  if (loading) return <div>Loading business ops...</div>;

  const projectDrawerOpen = showNewProject || !!selectedProject;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Business Ops</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Teams, projects, and tasks for {organization.name}.
          </p>
        </div>
        <button style={buttonGold} onClick={tab === "teams" ? openNewTeam : openNewProject}>
          {tab === "teams" ? "+ New Team" : "+ New Project"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <FilterChip label="Projects" active={tab === "projects"} onClick={() => setTab("projects")} />
        <FilterChip label="Teams" active={tab === "teams"} onClick={() => setTab("teams")} />
      </div>

      {tab === "projects" ? (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <FilterChip label="All Statuses" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <FilterChip
                key={value}
                label={label}
                active={statusFilter === value}
                onClick={() => setStatusFilter(value as ProjectStatus)}
              />
            ))}
            <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />
            <FilterChip label="All Priorities" active={priorityFilter === "all"} onClick={() => setPriorityFilter("all")} />
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <FilterChip
                key={value}
                label={label}
                active={priorityFilter === value}
                onClick={() => setPriorityFilter(value as Priority)}
              />
            ))}
          </div>

          <div className="card" style={cardStyle}>
            {filteredProjects.length === 0 ? (
              <EmptyState icon="🧭" message="No projects match these filters." />
            ) : (
              <>
                <div style={{ ...rowStyle, ...projectGridCols, borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 11, fontWeight: 600 }}>
                  <span>PROJECT</span>
                  <span>TEAM</span>
                  <span>STATUS</span>
                  <span>PRIORITY</span>
                  <span>PROGRESS</span>
                  <span style={{ textAlign: "right" }}>DUE</span>
                </div>
                {filteredProjects.map((p) => {
                  const team = teamById(p.team_id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => openProject(p)}
                      style={{ ...rowStyle, ...projectGridCols, cursor: "pointer" }}
                    >
                      <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {team ? team.name : "—"}
                      </span>
                      <Badge color={STATUS_COLORS[p.status]}>{STATUS_LABELS[p.status]}</Badge>
                      <Badge color={PRIORITY_COLORS[p.priority]}>{PRIORITY_LABELS[p.priority]}</Badge>
                      <ProgressBar value={p.progress} />
                      <span style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "right" }}>
                        {p.due_date ? new Date(p.due_date).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </>
      ) : (
        <div className="card" style={cardStyle}>
          {teams.length === 0 ? (
            <EmptyState icon="🧭" message="No teams yet. Create your first team." />
          ) : (
            <>
              <div style={{ ...rowStyle, ...teamGridCols, borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 11, fontWeight: 600 }}>
                <span>TEAM</span>
                <span>LEAD</span>
                <span style={{ textAlign: "right" }}>MEMBERS</span>
              </div>
              {teams.map((t) => (
                <div key={t.id} style={{ ...rowStyle, ...teamGridCols }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
                    {t.name}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t.lead || "—"}</span>
                  <span style={{ fontSize: 12, textAlign: "right" }}>{t.member_count}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Team Drawer */}
      <Drawer open={showNewTeam} onClose={closeTeamDrawer} title="New Team" width={420}>
        <input
          placeholder="Team name"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          style={inputStyle}
        />
        <textarea
          placeholder="What does this team own?"
          value={teamDescription}
          onChange={(e) => setTeamDescription(e.target.value)}
          style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
        />
        <input
          placeholder="Team lead"
          value={teamLead}
          onChange={(e) => setTeamLead(e.target.value)}
          style={inputStyle}
        />
        <label style={labelStyle}>Member count</label>
        <input
          type="number"
          min={0}
          value={teamMemberCount}
          onChange={(e) => setTeamMemberCount(Number(e.target.value))}
          style={inputStyle}
        />
        <label style={labelStyle}>Color</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {TEAM_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setTeamColor(c)}
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: c,
                border: teamColor === c ? "2px solid var(--text-primary)" : "2px solid transparent",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={ghostButton} onClick={closeTeamDrawer}>Cancel</button>
          <button style={{ ...buttonGold, flex: 1 }} onClick={handleSaveTeam} disabled={savingTeam}>
            {savingTeam ? "Saving..." : "Save Team"}
          </button>
        </div>
      </Drawer>

      {/* Project Drawer */}
      <Drawer
        open={projectDrawerOpen}
        onClose={closeProjectDrawer}
        title={showNewProject ? "New Project" : selectedProject?.name ?? ""}
        width={480}
      >
        {showNewProject || editingProject ? (
          <>
            <input
              placeholder="Project name"
              value={projName}
              onChange={(e) => setProjName(e.target.value)}
              style={inputStyle}
            />
            <textarea
              placeholder="Description"
              value={projDescription}
              onChange={(e) => setProjDescription(e.target.value)}
              style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
            />
            <select value={projTeamId} onChange={(e) => setProjTeamId(e.target.value)} style={inputStyle}>
              <option value="">No team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={projStatus}
                onChange={(e) => setProjStatus(e.target.value as ProjectStatus)}
                style={{ ...inputStyle, flex: 1 }}
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <select
                value={projPriority}
                onChange={(e) => setProjPriority(e.target.value as Priority)}
                style={{ ...inputStyle, flex: 1 }}
              >
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Start date</label>
                <input
                  type="date"
                  value={projStartDate}
                  onChange={(e) => setProjStartDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Due date</label>
                <input
                  type="date"
                  value={projDueDate}
                  onChange={(e) => setProjDueDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            <label style={labelStyle}>Progress ({projProgress}%)</label>
            <input
              type="range"
              min={0}
              max={100}
              value={projProgress}
              onChange={(e) => setProjProgress(Number(e.target.value))}
              style={{ width: "100%", marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                style={ghostButton}
                onClick={() => {
                  if (showNewProject) closeProjectDrawer();
                  else setEditingProject(false);
                }}
              >
                Cancel
              </button>
              <button style={{ ...buttonGold, flex: 1 }} onClick={handleSaveProject} disabled={savingProject}>
                {savingProject ? "Saving..." : "Save Project"}
              </button>
            </div>
          </>
        ) : (
          selectedProject && (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <select
                  value={selectedProject.status}
                  onChange={(e) => handleQuickStatusChange(e.target.value as ProjectStatus)}
                  style={{ ...selectStyle, flex: 1 }}
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <Badge color={PRIORITY_COLORS[selectedProject.priority]}>
                  {PRIORITY_LABELS[selectedProject.priority]}
                </Badge>
              </div>

              {selectedProject.description && (
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
                  {selectedProject.description}
                </p>
              )}

              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
                {teamById(selectedProject.team_id)?.name ?? "No team"} ·{" "}
                {selectedProject.due_date ? `Due ${new Date(selectedProject.due_date).toLocaleDateString()}` : "No due date"}
              </div>

              <label style={labelStyle}>Progress ({projProgress}%)</label>
              <input
                type="range"
                min={0}
                max={100}
                value={projProgress}
                onChange={(e) => handleQuickProgressChange(Number(e.target.value))}
                style={{ width: "100%", marginBottom: 12 }}
              />

              <button style={{ ...ghostButton, marginBottom: 20 }} onClick={() => setEditingProject(true)}>
                Edit Details
              </button>

              <SectionDivider label="Tasks" />
              {detailLoading ? (
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Loading tasks...</p>
              ) : (
                <>
                  {tasks.length === 0 && (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>No tasks yet.</p>
                  )}
                  {tasks.map((t) => (
                    <div key={t.id} style={taskRowStyle}>
                      <input
                        type="checkbox"
                        checked={t.status === "done"}
                        onChange={() => handleToggleTask(t)}
                        style={{ cursor: "pointer" }}
                      />
                      <span
                        style={{
                          flex: 1,
                          fontSize: 13,
                          textDecoration: t.status === "done" ? "line-through" : "none",
                          color: t.status === "done" ? "var(--text-muted)" : "var(--text-primary)",
                        }}
                      >
                        {t.title}
                      </span>
                      <Badge color={TASK_STATUS_COLORS[t.status]}>{TASK_STATUS_LABELS[t.status]}</Badge>
                      <Badge color={PRIORITY_COLORS[t.priority]}>{PRIORITY_LABELS[t.priority]}</Badge>
                    </div>
                  ))}

                  <div style={{ display: "flex", gap: 6, marginTop: 10, marginBottom: 20 }}>
                    <input
                      placeholder="New task"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                      style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                    />
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                      style={{ ...selectStyle, width: 100 }}
                    >
                      {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <button style={buttonGold} onClick={handleAddTask} disabled={addingTask}>
                      Add
                    </button>
                  </div>
                </>
              )}

              <SectionDivider label="Documents" />
              {detailLoading ? (
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Loading documents...</p>
              ) : (
                <>
                  {documents.length === 0 && (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>No documents yet.</p>
                  )}
                  {documents.map((d) => (
                    <div key={d.id} style={taskRowStyle}>
                      <span>{DOC_TYPE_ICONS[d.type]}</span>
                      {d.url ? (
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ flex: 1, fontSize: 13, color: "var(--gold)" }}
                        >
                          {d.name}
                        </a>
                      ) : (
                        <span style={{ flex: 1, fontSize: 13 }}>{d.name}</span>
                      )}
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.uploaded_by}</span>
                    </div>
                  ))}

                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <input
                      placeholder="Document name"
                      value={newDocName}
                      onChange={(e) => setNewDocName(e.target.value)}
                      style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                    />
                    <select
                      value={newDocType}
                      onChange={(e) => setNewDocType(e.target.value as OpsDocument["type"])}
                      style={{ ...selectStyle, width: 110 }}
                    >
                      {Object.entries(DOC_TYPE_ICONS).map(([value]) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    placeholder="Link / URL (optional)"
                    value={newDocUrl}
                    onChange={(e) => setNewDocUrl(e.target.value)}
                    style={{ ...inputStyle, marginTop: 6 }}
                  />
                  <button style={{ ...buttonGold, width: "100%" }} onClick={handleAddDocument} disabled={addingDoc}>
                    Add Document
                  </button>
                </>
              )}
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
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3px 8px",
        borderRadius: 6,
        background: `${color}1f`,
        border: `1px solid ${color}40`,
        color,
        fontSize: 10,
        fontWeight: 700,
        width: "fit-content",
      }}
    >
      {children}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: "var(--bg-elevated)", overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: "var(--gold)" }} />
      </div>
      <span style={{ fontSize: 10, color: "var(--text-muted)", width: 26, textAlign: "right" }}>{value}%</span>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 0.5, margin: "4px 0 10px" }}>
      {label.toUpperCase()}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 8,
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  padding: "10px 12px",
  borderBottom: "1px solid var(--border)",
  fontSize: 13,
  alignItems: "center",
  gap: 8,
};

const projectGridCols: React.CSSProperties = {
  gridTemplateColumns: "1.6fr 1fr 0.9fr 0.9fr 1fr 0.8fr",
};

const teamGridCols: React.CSSProperties = {
  gridTemplateColumns: "1.6fr 1fr 0.6fr",
};

const taskRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 0",
  borderBottom: "1px solid var(--border)",
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

const selectStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  fontSize: 12,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-muted)",
  marginBottom: 4,
  display: "block",
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
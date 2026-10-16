// A document attached to a mail message or an approval request. Only the id and display name are stored;
// opening one goes through /api/org/attachment, which checks the viewer is allowed to see that item.
export type Attachment = { documentId: string; name: string };

export type AttachmentContext = { type: "mail"; threadId: string } | { type: "approval"; requestId: string };

export async function openAttachment(orgId: string, context: AttachmentContext, documentId: string): Promise<void> {
  const res = await fetch("/api/org/attachment", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orgId, context, documentId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) throw new Error(json.error ?? "Couldn't open this attachment.");
  window.open(json.url, "_blank");
}

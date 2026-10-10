"use client";

import MailView from "@/components/mail/MailView";
import f from "@/styles/founder.module.css";

export default function FounderMailPage() {
  return (
    <div className={`page-shell ${f.root}`}>
      <main className="page-main">
        <div className={f.page}>
          <div className={f.top}>
            <div>
              <p className={f.greeting}>Support</p>
              <h1 className={f.headline}>Mail</h1>
              <p className={f.sectionSub} style={{ marginTop: 8 }}>
                Messages from your organizations. Reply here, or start a conversation with any org&apos;s owners and admins.
              </p>
            </div>
          </div>
          <MailView mode="founder" />
        </div>
      </main>
    </div>
  );
}

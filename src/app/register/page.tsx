"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getPackages, type Package } from "@/lib/packages";
import { isValidEmail, isValidPhone, isStrongEnoughPassword } from "@/lib/validation";
import { PACKAGE_ENGINES } from "@/lib/packageEngines";
import { createNotification } from "@/lib/notifications";
import { COUNTRIES, OTHER_OPTION } from "@/lib/locations";
import AuthShell from "@/components/marketing/AuthShell";

const INDUSTRIES = [
  "Retail",
  "Healthcare",
  "Education",
  "SACCO",
  "Real Estate",
  "General Business",
  "Other",
];

const BUSINESS_TYPES = [
  "Sole Proprietorship",
  "Partnership",
  "Private Limited Company",
  "Public Limited Company",
  "NGO / Non-profit",
  "Cooperative / SACCO",
  "Government / Public Institution",
  "Other",
];

const COMPANY_SIZES = ["1–5 employees", "6–20 employees", "21–50 employees", "51–200 employees", "200+ employees"];
const BRANCH_COUNTS = ["Single location", "2–5 locations", "6–20 locations", "20+ locations"];

// Maps the industry a customer selects at signup to a blueprint slug
const INDUSTRY_TO_BLUEPRINT_SLUG: Record<string, string> = {
  Retail: "retail",
  Healthcare: "clinic",
  Education: "school",
  SACCO: "sacco",
  "Real Estate": "property",
  "General Business": "sme",
  Other: "sme",
};

const STEP_LABELS = ["Business", "Profile", "Account", "Package", "Confirm"];

type Form = {
  companyName: string;
  industry: string;
  businessType: string;
  companySize: string;
  branches: string;
  taxId: string;
  website: string;
  fullName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  packageSlug: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [packages, setPackages] = useState<Package[]>([]);
  const [step, setStep] = useState(1);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  const [form, setForm] = useState<Form>({
    companyName: "",
    industry: "",
    businessType: "",
    companySize: "",
    branches: "",
    taxId: "",
    website: "",
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    packageSlug: "",
  });

  // Location is handled separately so we can offer real dropdowns with an
  // "Other" fallback instead of a free-text field that invites typos.
  const [countrySelect, setCountrySelect] = useState("Kenya");
  const [countryOther, setCountryOther] = useState("");
  const [citySelect, setCitySelect] = useState("");
  const [cityOther, setCityOther] = useState("");

  const resolvedCountry = countrySelect === OTHER_OPTION ? countryOther.trim() : countrySelect;
  const resolvedCity = citySelect === OTHER_OPTION ? cityOther.trim() : citySelect;
  const cityOptions = useMemo(() => {
    const match = COUNTRIES.find((c) => c.name === countrySelect);
    return match ? [...match.cities, OTHER_OPTION] : [OTHER_OPTION];
  }, [countrySelect]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getPackages().then(setPackages);
  }, []);

  const update = (key: keyof Form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const markTouched = (key: string) => setTouched((prev) => ({ ...prev, [key]: true }));

  // ---- Validation, run live so Continue buttons only enable when the step is actually complete ----

  const step1Errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!form.companyName.trim()) errs.companyName = "Company name is required";
    if (!form.industry) errs.industry = "Please select an industry";
    if (!form.businessType) errs.businessType = "Please select a business type";
    if (!resolvedCountry) errs.country = "Country is required";
    if (!resolvedCity) errs.city = "City is required";
    return errs;
  }, [form.companyName, form.industry, form.businessType, resolvedCountry, resolvedCity]);

  const step2Errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!form.companySize) errs.companySize = "Please select company size";
    if (!form.branches) errs.branches = "Please select number of locations";
    return errs;
  }, [form.companySize, form.branches]);

  const step3Errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = "Full name is required";
    if (!form.phone.trim()) errs.phone = "Phone number is required";
    else if (!isValidPhone(form.phone)) errs.phone = "Enter a valid phone number";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!isValidEmail(form.email)) errs.email = "Enter a valid email address";
    if (!form.password) errs.password = "Password is required";
    else if (!isStrongEnoughPassword(form.password)) errs.password = "Password must be at least 8 characters";
    if (!form.confirmPassword) errs.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords do not match";
    return errs;
  }, [form.fullName, form.phone, form.email, form.password, form.confirmPassword]);

  const step1Valid = Object.keys(step1Errors).length === 0;
  const step2Valid = Object.keys(step2Errors).length === 0;
  const step3Valid = Object.keys(step3Errors).length === 0;
  const step4Valid = !!form.packageSlug;

  const goToStep2 = () => {
    setFieldErrors(step1Errors);
    setTouched((t) => ({ ...t, companyName: true, industry: true, businessType: true, country: true, city: true }));
    if (step1Valid) setStep(2);
  };

  const goToStep3 = () => {
    setFieldErrors(step2Errors);
    setTouched((t) => ({ ...t, companySize: true, branches: true }));
    if (step2Valid) setStep(3);
  };

  const goToStep4 = () => {
    setFieldErrors(step3Errors);
    setTouched((t) => ({ ...t, fullName: true, phone: true, email: true, password: true, confirmPassword: true }));
    if (step3Valid) setStep(4);
  };

  const goToStep5 = () => {
    if (step4Valid) setStep(5);
  };

  const handleRegistration = async () => {
    // Defensive re-check — never allow submission with an incomplete/invalid form,
    // even if someone reaches this step some other way.
    if (!step1Valid || !step2Valid || !step3Valid || !step4Valid) {
      setError("Please complete every field correctly before continuing.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: { full_name: form.fullName.trim() },
        },
      });

      if (signupError) throw signupError;

      const userId = signupData.user?.id;
      if (!userId) throw new Error("User creation failed");

      // If your Supabase project has "Confirm email" turned on (Authentication →
      // Sign In / Providers → Email), signUp() returns a user but no session
      // until they click the link in their inbox. That's the actual mechanism
      // that stops registration with an email nobody owns — client-side regex
      // can't verify that on its own.
      const hasSession = !!signupData.session;

      const blueprintSlug = INDUSTRY_TO_BLUEPRINT_SLUG[form.industry] ?? "sme";

      const { data: blueprint } = await supabase
        .from("blueprints")
        .select("id")
        .eq("slug", blueprintSlug)
        .maybeSingle();

      const { data: organization, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: form.companyName.trim(),
          location: `${resolvedCity}, ${resolvedCountry}`,
          package: form.packageSlug,
          status: "operational",
          revenue: "0",
          blueprint_id: blueprint?.id ?? null,
          business_type: form.businessType,
          company_size: form.companySize,
          branch_count: form.branches,
          tax_id: form.taxId.trim() || null,
          website: form.website.trim() || null,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      const orgId = organization.id;

      await createNotification(
        "new_org",
        "New organization registered",
        `${form.companyName} signed up on the ${form.packageSlug} plan`
      );

      const { error: membershipError } = await supabase.from("org_users").insert({
        org_id: orgId,
        user_id: userId,
        role: "owner",
        full_name: form.fullName.trim(),
        email: form.email.trim(),
      });

      if (membershipError) throw membershipError;

      const slugs = PACKAGE_ENGINES[form.packageSlug] ?? [];
      if (slugs.length > 0) {
        const { data: engines } = await supabase
          .from("engines")
          .select("id, slug")
          .in("slug", slugs);

        if (engines?.length) {
          const engineRows = engines.map((engine) => ({
            org_id: orgId,
            engine_id: engine.id,
            engine_slug: engine.slug,
            enabled: true,
            subscription_tier: form.packageSlug,
          }));
          await supabase.from("organization_engines").insert(engineRows);
        }
      }

      if (!hasSession) {
        // Organization is set up, but they can't be signed in yet.
        setPendingConfirmation(true);
        setLoading(false);
        return;
      }

      router.push(`/org/${orgId}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Failed to create organization";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (pendingConfirmation) {
    return (
      <AuthShell width={440}>
        <div className="mkt-badge-live" style={{ marginBottom: 14 }}>Almost there</div>
        <h1 className="mkt-h3" style={{ fontSize: "1.25rem" }}>Confirm your email</h1>
        <p className="mkt-body" style={{ fontSize: "0.875rem", marginTop: 10 }}>
          We've sent a confirmation link to <strong style={{ color: "var(--mkt-paper)" }}>{form.email}</strong>.
          Your organization <strong style={{ color: "var(--mkt-paper)" }}>{form.companyName}</strong> is set up
          and waiting — click the link in that email to verify your account, then log in.
        </p>
        <a href="/login" className="mkt-btn mkt-btn--primary mkt-btn--full" style={{ marginTop: 20 }}>
          Go to login
        </a>
      </AuthShell>
    );
  }

  return (
    <AuthShell width={640}>
      <div className="mkt-eyebrow" style={{ marginBottom: 6 }}>Create organization</div>
      <h1 className="mkt-h3" style={{ fontSize: "1.375rem" }}>Set up Aurevyn</h1>

      <div className="mkt-register-steps">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="mkt-register-steps__item">
            <div className={`mkt-register-steps__bar ${step >= s ? "mkt-register-steps__bar--active" : ""}`} />
            <span className="mkt-mono mkt-register-steps__label">{STEP_LABELS[s - 1]}</span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div>
          <h2 className="mkt-h3" style={{ fontSize: "1rem", marginBottom: 4 }}>Business basics</h2>

          <label className="mkt-field-label">Company name</label>
          <input
            placeholder="Company name"
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            onBlur={() => markTouched("companyName")}
            className="mkt-input"
          />
          {touched.companyName && fieldErrors.companyName && <div className="mkt-form-error">{fieldErrors.companyName}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="mkt-field-label">Industry</label>
              <select
                value={form.industry}
                onChange={(e) => update("industry", e.target.value)}
                onBlur={() => markTouched("industry")}
                className="mkt-input"
              >
                <option value="">Select…</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
              {touched.industry && fieldErrors.industry && <div className="mkt-form-error">{fieldErrors.industry}</div>}
            </div>
            <div>
              <label className="mkt-field-label">Business type</label>
              <select
                value={form.businessType}
                onChange={(e) => update("businessType", e.target.value)}
                onBlur={() => markTouched("businessType")}
                className="mkt-input"
              >
                <option value="">Select…</option>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {touched.businessType && fieldErrors.businessType && <div className="mkt-form-error">{fieldErrors.businessType}</div>}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="mkt-field-label">Country</label>
              <select
                value={countrySelect}
                onChange={(e) => {
                  setCountrySelect(e.target.value);
                  setCitySelect("");
                  setFieldErrors((prev) => ({ ...prev, country: "", city: "" }));
                }}
                onBlur={() => markTouched("country")}
                className="mkt-input"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
                <option value={OTHER_OPTION}>Other</option>
              </select>
              {countrySelect === OTHER_OPTION && (
                <input
                  placeholder="Enter country"
                  value={countryOther}
                  onChange={(e) => { setCountryOther(e.target.value); setFieldErrors((prev) => ({ ...prev, country: "" })); }}
                  onBlur={() => markTouched("country")}
                  className="mkt-input"
                  style={{ marginTop: 8 }}
                />
              )}
              {touched.country && fieldErrors.country && <div className="mkt-form-error">{fieldErrors.country}</div>}
            </div>
            <div>
              <label className="mkt-field-label">City</label>
              <select
                value={citySelect}
                onChange={(e) => { setCitySelect(e.target.value); setFieldErrors((prev) => ({ ...prev, city: "" })); }}
                onBlur={() => markTouched("city")}
                className="mkt-input"
              >
                <option value="">Select…</option>
                {cityOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {citySelect === OTHER_OPTION && (
                <input
                  placeholder="Enter city"
                  value={cityOther}
                  onChange={(e) => { setCityOther(e.target.value); setFieldErrors((prev) => ({ ...prev, city: "" })); }}
                  onBlur={() => markTouched("city")}
                  className="mkt-input"
                  style={{ marginTop: 8 }}
                />
              )}
              {touched.city && fieldErrors.city && <div className="mkt-form-error">{fieldErrors.city}</div>}
            </div>
          </div>

          <button onClick={goToStep2} disabled={!step1Valid} className="mkt-btn mkt-btn--primary mkt-btn--full" style={{ marginTop: 20 }}>
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="mkt-h3" style={{ fontSize: "1rem", marginBottom: 4 }}>Business profile</h2>
          <p className="mkt-body" style={{ fontSize: "0.8125rem", marginBottom: 10 }}>
            Helps us configure Aurevyn to fit how your business actually runs.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="mkt-field-label">Company size</label>
              <select
                value={form.companySize}
                onChange={(e) => update("companySize", e.target.value)}
                onBlur={() => markTouched("companySize")}
                className="mkt-input"
              >
                <option value="">Select…</option>
                {COMPANY_SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {touched.companySize && fieldErrors.companySize && <div className="mkt-form-error">{fieldErrors.companySize}</div>}
            </div>
            <div>
              <label className="mkt-field-label">Locations / branches</label>
              <select
                value={form.branches}
                onChange={(e) => update("branches", e.target.value)}
                onBlur={() => markTouched("branches")}
                className="mkt-input"
              >
                <option value="">Select…</option>
                {BRANCH_COUNTS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              {touched.branches && fieldErrors.branches && <div className="mkt-form-error">{fieldErrors.branches}</div>}
            </div>
          </div>

          <label className="mkt-field-label">Business registration / Tax PIN <span className="mkt-dim">(optional)</span></label>
          <input
            placeholder="e.g. KRA PIN, RC number"
            value={form.taxId}
            onChange={(e) => update("taxId", e.target.value)}
            className="mkt-input"
          />

          <label className="mkt-field-label">Website <span className="mkt-dim">(optional)</span></label>
          <input
            placeholder="https://"
            value={form.website}
            onChange={(e) => update("website", e.target.value)}
            className="mkt-input"
          />

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={() => setStep(1)} className="mkt-btn mkt-btn--ghost">Back</button>
            <button onClick={goToStep3} disabled={!step2Valid} className="mkt-btn mkt-btn--primary" style={{ flex: 1 }}>
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="mkt-h3" style={{ fontSize: "1rem", marginBottom: 4 }}>Contact & account</h2>

          <label className="mkt-field-label">Full name</label>
          <input
            placeholder="Full name"
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            onBlur={() => markTouched("fullName")}
            className="mkt-input"
          />
          {touched.fullName && fieldErrors.fullName && <div className="mkt-form-error">{fieldErrors.fullName}</div>}

          <label className="mkt-field-label">Phone number</label>
          <input
            placeholder="Phone number"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            onBlur={() => markTouched("phone")}
            className="mkt-input"
          />
          {touched.phone && fieldErrors.phone && <div className="mkt-form-error">{fieldErrors.phone}</div>}

          <label className="mkt-field-label">Email</label>
          <input
            type="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            onBlur={() => markTouched("email")}
            className="mkt-input"
          />
          {touched.email && fieldErrors.email && <div className="mkt-form-error">{fieldErrors.email}</div>}

          <label className="mkt-field-label">Password</label>
          <input
            type="password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            onBlur={() => markTouched("password")}
            className="mkt-input"
          />
          {touched.password && fieldErrors.password && <div className="mkt-form-error">{fieldErrors.password}</div>}

          <label className="mkt-field-label">Confirm password</label>
          <input
            type="password"
            placeholder="Confirm password"
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
            onBlur={() => markTouched("confirmPassword")}
            className="mkt-input"
          />
          {touched.confirmPassword && fieldErrors.confirmPassword && <div className="mkt-form-error">{fieldErrors.confirmPassword}</div>}

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={() => setStep(2)} className="mkt-btn mkt-btn--ghost">Back</button>
            <button onClick={goToStep4} disabled={!step3Valid} className="mkt-btn mkt-btn--primary" style={{ flex: 1 }}>
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 className="mkt-h3" style={{ fontSize: "1rem", marginBottom: 12 }}>Select package</h2>

          <div className="mkt-register-packages">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => update("packageSlug", pkg.slug)}
                className={`mkt-card mkt-register-package ${form.packageSlug === pkg.slug ? "mkt-register-package--active" : ""}`}
              >
                <h3 className="mkt-h3" style={{ fontSize: "1rem" }}>{pkg.name}</h3>
                <p className="mkt-num" style={{ color: "var(--mkt-brass-light)", fontWeight: 700, marginTop: 6 }}>
                  {pkg.price}
                </p>
                <p style={{ fontSize: "0.8125rem", color: "var(--mkt-paper-faint)", marginTop: 8 }}>
                  {pkg.features}
                </p>
              </div>
            ))}
          </div>
          {packages.length === 0 && (
            <p className="mkt-dim mkt-mono" style={{ fontSize: "0.8125rem" }}>Loading packages…</p>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            <button onClick={() => setStep(3)} className="mkt-btn mkt-btn--ghost">Back</button>
            <button onClick={goToStep5} disabled={!step4Valid} className="mkt-btn mkt-btn--primary" style={{ flex: 1 }}>
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div>
          <h2 className="mkt-h3" style={{ fontSize: "1.0625rem", color: "var(--mkt-brass-light)" }}>
            Review & confirm
          </h2>

          <div className="mkt-register-review">
            <div><span className="mkt-dim">Organization</span><span>{form.companyName}</span></div>
            <div><span className="mkt-dim">Industry</span><span>{form.industry}</span></div>
            <div><span className="mkt-dim">Business type</span><span>{form.businessType}</span></div>
            <div><span className="mkt-dim">Location</span><span>{resolvedCity}, {resolvedCountry}</span></div>
            <div><span className="mkt-dim">Company size</span><span>{form.companySize}</span></div>
            <div><span className="mkt-dim">Locations</span><span>{form.branches}</span></div>
            <div><span className="mkt-dim">Owner</span><span>{form.fullName}</span></div>
            <div><span className="mkt-dim">Email</span><span>{form.email}</span></div>
            <div><span className="mkt-dim">Package</span><span>{packages.find((p) => p.slug === form.packageSlug)?.name}</span></div>
          </div>

          {error && <div className="mkt-alert-box" style={{ marginTop: 14 }}>{error}</div>}

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button onClick={() => setStep(4)} className="mkt-btn mkt-btn--ghost" disabled={loading}>Back</button>
            <button
              className="mkt-btn mkt-btn--primary"
              style={{ flex: 1 }}
              disabled={loading || !step1Valid || !step2Valid || !step3Valid || !step4Valid}
              onClick={handleRegistration}
            >
              {loading ? "Creating organization…" : "Create organization"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .mkt-register-steps {
          display: flex;
          gap: 8px;
          margin: 18px 0 26px;
        }
        .mkt-register-steps__item {
          flex: 1;
        }
        .mkt-register-steps__bar {
          height: 3px;
          background: var(--mkt-line-strong);
        }
        .mkt-register-steps__bar--active {
          background: var(--mkt-brass);
        }
        .mkt-register-steps__label {
          display: block;
          margin-top: 6px;
          font-size: 0.625rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--mkt-paper-faint);
        }
        .mkt-register-packages {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px;
        }
        .mkt-register-package {
          cursor: pointer;
        }
        .mkt-register-package--active {
          border-color: var(--mkt-brass);
        }
        .mkt-register-package--active::before,
        .mkt-register-package--active::after {
          border-color: var(--mkt-brass);
        }
        .mkt-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .mkt-register-review {
          margin-top: 14px;
          border-top: 1px solid var(--mkt-line);
        }
        .mkt-register-review > div {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 0;
          border-bottom: 1px solid var(--mkt-line);
          font-size: 0.875rem;
        }
      `}</style>
    </AuthShell>
  );
}

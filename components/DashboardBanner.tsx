import { DashboardIllustration } from "@/components/illustrations/Illustrations";

// Header strip at the top of each dashboard: a greeting, one line of context,
// and the scene matching that role.
export function DashboardBanner({
  variant,
  title,
  subtitle,
}: {
  variant: "student" | "instructor" | "admin" | "super_admin";
  title: string;
  subtitle: string;
}) {
  return (
    <section className="dash-banner">
      <div className="dash-banner-text">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <div className="dash-banner-art" aria-hidden="true">
        <DashboardIllustration variant={variant} />
      </div>
    </section>
  );
}

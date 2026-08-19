import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const results = [];

function log(label, ok, detail) {
  results.push({ label, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} - ${label}${detail ? " — " + detail : ""}`);
}

async function loginAs(browser, email, password) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(student|instructor|admin|super-admin)/, { timeout: 15000 });
  return { context, page };
}

async function main() {
  const browser = await chromium.launch();

  // 1. Student login + dashboard content
  {
    const { page, context } = await loginAs(browser, "eleve1@teranga.fabus.sn", "FabusDemo2026!");
    const url = page.url();
    log("Student login redirects to /student", url.includes("/student"), url);
    const body = await page.textContent("body");
    log("Student dashboard shows greeting", body.includes("Bonjour Ahmadou"), "");
    log("Student dashboard shows driving session card", body.includes("Séance de conduite") || body.includes("Stationnement"), "");
    await context.close();
  }

  // 2. Instructor login
  {
    const { page, context } = await loginAs(browser, "moniteur@teranga.fabus.sn", "FabusDemo2026!");
    log("Instructor login redirects to /instructor", page.url().includes("/instructor"), page.url());
    await context.close();
  }

  // 3. Admin login + tenant isolation check
  {
    const { page: pageA, context: ctxA } = await loginAs(browser, "admin@teranga.fabus.sn", "FabusDemo2026!");
    await pageA.goto(`${BASE}/admin/students`);
    const bodyA = await pageA.textContent("body");
    log("Admin Teranga sees its own students", bodyA.includes("Ahmadou Diop") && bodyA.includes("Aissatou Sow"), "");
    log("Admin Teranga does NOT see École Baobab's student", !bodyA.includes("Ibrahima Sarr"), "");

    await pageA.goto(`${BASE}/admin/instructors`);
    const instructorsA = await pageA.textContent("body");
    log("Admin Teranga sees its own instructor", instructorsA.includes("Cheikh Fall"), "");
    log("Admin Teranga does NOT see École Baobab's instructor", !instructorsA.includes("Khady Diallo"), "");
    await ctxA.close();

    const { page: pageB, context: ctxB } = await loginAs(browser, "admin@baobab.fabus.sn", "FabusDemo2026!");
    await pageB.goto(`${BASE}/admin/students`);
    const bodyB = await pageB.textContent("body");
    log("Admin Baobab sees its own student", bodyB.includes("Ibrahima Sarr"), "");
    log("Admin Baobab does NOT see École Teranga's students", !bodyB.includes("Ahmadou Diop"), "");
    await ctxB.close();
  }

  // 4. Super admin
  {
    const { page, context } = await loginAs(browser, "superadmin@fabus.sn", "FabusDemo2026!");
    log("Super admin login redirects to /super-admin", page.url().includes("/super-admin"), page.url());
    await page.goto(`${BASE}/super-admin/organizations`);
    const body = await page.textContent("body");
    log("Super admin sees both organizations", body.includes("Teranga") && body.includes("Baobab"), "");
    await context.close();
  }

  // 5. Cross-tenant URL guessing: student tries to hit an admin-only area
  {
    const { page, context } = await loginAs(browser, "eleve1@teranga.fabus.sn", "FabusDemo2026!");
    await page.goto(`${BASE}/admin`);
    await page.waitForTimeout(1500);
    const url = page.url();
    log("Student blocked from /admin (redirected away)", !url.includes("/admin") || url.includes("/login"), url);
    await context.close();
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Demo seed data (section 27 of the product brief): a super admin, two
// auto-écoles each with an admin/instructor/students, a couple of courses
// with chapters/lessons, a few appointments, payments and notifications.
// Lets you verify tenant isolation end-to-end: log in as École A's admin
// and confirm École B's data is never visible.
//
// Usage: npm run seed   (reads .env.local via `node --env-file`)

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const DEMO_PASSWORD = "FabusDemo2026!";

async function createUser(email, fullName, role, organizationId, phone) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser(${email}): ${error.message}`);

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    organization_id: organizationId,
    role,
    full_name: fullName,
    phone: phone ?? null,
  });
  if (profileError) throw new Error(`profile(${email}): ${profileError.message}`);

  return data.user.id;
}

async function main() {
  console.log("Seeding FABUS demo data...");

  // --- Super admin -------------------------------------------------------
  const superAdminId = await createUser("superadmin@fabus.sn", "Super Admin FABUS", "super_admin", null);
  console.log("Created super_admin: superadmin@fabus.sn");

  // --- Plans ---------------------------------------------------------------
  const { data: plans, error: planError } = await admin
    .from("plans")
    .insert([
      { code: "starter", name: "Starter", price_fcfa: 25000, max_instructors: 3, max_students: 100, storage_limit_mb: 1024 },
      { code: "pro", name: "Pro", price_fcfa: 60000, max_instructors: 10, max_students: 500, storage_limit_mb: 5120 },
    ])
    .select();
  if (planError) throw new Error(planError.message);
  const starterPlan = plans.find((p) => p.code === "starter");

  // --- École A -------------------------------------------------------------
  const { data: orgA, error: orgAError } = await admin
    .from("organizations")
    .insert({ name: "Auto-École Teranga", slug: "teranga", city: "Dakar", status: "active" })
    .select()
    .single();
  if (orgAError) throw new Error(orgAError.message);

  await admin.from("subscriptions").insert({
    organization_id: orgA.id,
    plan_id: starterPlan.id,
    status: "active",
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  const adminA = await createUser("admin@teranga.fabus.sn", "Fatou Ndiaye", "admin", orgA.id, "+221771234501");
  const instructorA = await createUser("moniteur@teranga.fabus.sn", "Cheikh Fall", "instructor", orgA.id, "+221771234502");
  const studentA1 = await createUser("eleve1@teranga.fabus.sn", "Ahmadou Diop", "student", orgA.id, "+221771234503");
  const studentA2 = await createUser("eleve2@teranga.fabus.sn", "Aissatou Sow", "student", orgA.id, "+221771234504");
  console.log("Created École Teranga: admin@teranga.fabus.sn, moniteur@teranga.fabus.sn, eleve1@teranga.fabus.sn, eleve2@teranga.fabus.sn");

  const { data: courseA, error: courseAError } = await admin
    .from("courses")
    .insert({
      organization_id: orgA.id,
      title: "Code de la route — Formation complète",
      category: "code",
      description: "Toutes les leçons pour réussir l'examen du code sénégalais.",
      price_fcfa: 40000,
      status: "published",
      created_by: adminA,
    })
    .select()
    .single();
  if (courseAError) throw new Error(courseAError.message);

  const { data: chapterA, error: chapterAError } = await admin
    .from("chapters")
    .insert({ course_id: courseA.id, title: "Les intersections et priorités", position: 0, status: "published" })
    .select()
    .single();
  if (chapterAError) throw new Error(chapterAError.message);

  await admin.from("lessons").insert([
    {
      chapter_id: chapterA.id,
      title: "Comprendre les priorités à droite",
      content_type: "text",
      content_body: "À une intersection sans signalisation, la priorité va au véhicule venant de droite...",
      position: 0,
      status: "published",
    },
    {
      chapter_id: chapterA.id,
      title: "Les panneaux de signalisation d'intersection",
      content_type: "text",
      content_body: "Cédez le passage, stop, et sens giratoire : comment les reconnaître et réagir.",
      position: 1,
      status: "published",
    },
  ]);

  await admin.from("enrollments").insert([
    { organization_id: orgA.id, student_id: studentA1, course_id: courseA.id, status: "active" },
    { organization_id: orgA.id, student_id: studentA2, course_id: courseA.id, status: "active" },
  ]);

  const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const start = new Date(inTwoDays.setHours(15, 0, 0, 0));
  const end = new Date(inTwoDays.setHours(16, 0, 0, 0));

  await admin.from("appointments").insert({
    organization_id: orgA.id,
    type: "driving_session",
    title: "Séance de conduite — Stationnement",
    instructor_id: instructorA,
    student_id: studentA1,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    status: "scheduled",
    location: "Agence Fann Point E",
    created_by: adminA,
  });

  await admin.from("payments").insert([
    { organization_id: orgA.id, student_id: studentA1, amount_fcfa: 40000, status: "success", provider: "wave", paid_at: new Date().toISOString() },
    { organization_id: orgA.id, student_id: studentA2, amount_fcfa: 25000, status: "pending", provider: "manual" },
  ]);

  await admin.from("notifications").insert({
    organization_id: orgA.id,
    user_id: studentA1,
    type: "session_reminder",
    title: "Séance de conduite demain",
    body: "Rendez-vous à 15h à l'agence Fann Point E.",
  });

  // --- École B -------------------------------------------------------------
  const { data: orgB, error: orgBError } = await admin
    .from("organizations")
    .insert({ name: "Auto-École Baobab", slug: "baobab", city: "Thiès", status: "active" })
    .select()
    .single();
  if (orgBError) throw new Error(orgBError.message);

  const adminB = await createUser("admin@baobab.fabus.sn", "Moussa Ba", "admin", orgB.id, "+221771234601");
  const instructorB = await createUser("moniteur@baobab.fabus.sn", "Khady Diallo", "instructor", orgB.id, "+221771234602");
  const studentB1 = await createUser("eleve1@baobab.fabus.sn", "Ibrahima Sarr", "student", orgB.id, "+221771234603");
  console.log("Created École Baobab: admin@baobab.fabus.sn, moniteur@baobab.fabus.sn, eleve1@baobab.fabus.sn");

  const { data: courseB, error: courseBError } = await admin
    .from("courses")
    .insert({
      organization_id: orgB.id,
      title: "Perfectionnement conduite",
      category: "perfectionnement",
      description: "Pour les conducteurs ayant déjà le permis.",
      price_fcfa: 60000,
      status: "published",
      created_by: adminB,
    })
    .select()
    .single();
  if (courseBError) throw new Error(courseBError.message);

  await admin.from("enrollments").insert({ organization_id: orgB.id, student_id: studentB1, course_id: courseB.id, status: "active" });
  await admin.from("payments").insert({ organization_id: orgB.id, student_id: studentB1, amount_fcfa: 60000, status: "pending", provider: "orange_money" });

  console.log("\nDone. All demo accounts use the password:", DEMO_PASSWORD);
  console.log("Super admin: superadmin@fabus.sn");
  console.log("École Teranga: admin@teranga.fabus.sn / moniteur@teranga.fabus.sn / eleve1@teranga.fabus.sn / eleve2@teranga.fabus.sn");
  console.log("École Baobab: admin@baobab.fabus.sn / moniteur@baobab.fabus.sn / eleve1@baobab.fabus.sn");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

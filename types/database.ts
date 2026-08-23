// Hand-written types mirroring supabase/migrations/0001_schema.sql.
// If you later run `supabase gen types typescript`, that generated file
// can replace this one — keep the shapes in sync until then.

export type UserRole = "super_admin" | "admin" | "admin_auto_ecole" | "instructor" | "student";
export type OrgStatus = "pending" | "active" | "suspended" | "archived" | "rejected";
// Account approval status — 'active' for everyone except a self-registered
// moniteur awaiting their school's decision (see 0008_signup.sql).
export type ProfileStatus = "pending" | "active" | "rejected";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";
export type PaymentType = "registration" | "course" | "extra_service" | "subscription" | "other";
export type ContentStatus = "draft" | "published" | "archived";
export type LessonContentType = "text" | "video" | "pdf" | "audio" | "quiz" | "exercise" | "link";
export type QuizKind = "quiz" | "mock_exam";
export type EnrollmentStatus = "active" | "completed" | "canceled";
export type AppointmentType = "driving_session" | "video_course" | "exam" | "other";
export type AppointmentStatus = "scheduled" | "confirmed" | "canceled" | "completed" | "no_show";
export type PaymentStatus = "pending" | "success" | "failed" | "refunded";
export type PaymentProvider = "wave" | "orange_money" | "manual" | "other";
export type DocumentStatus = "pending" | "submitted" | "validated" | "rejected";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  status: OrgStatus;
  responsable_name: string | null;
  address: string | null;
  quartier: string | null;
  region: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  cover_photo_url: string | null;
  description: string | null;
  id_number: string | null;
  services: string[];
  pricing: Record<string, number | null>;
  equipment: Record<string, string | null>;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  organization_id: string | null;
  role: UserRole;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  must_change_password: boolean;
  social_links: Record<string, string>;
  social_links_public: boolean;
  status: ProfileStatus;
  rejection_reason: string | null;
  birth_date: string | null;
  gender: string | null;
  license_number: string | null;
  years_experience: number | null;
  teaching_categories: string[];
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  price_fcfa: number;
  max_instructors: number | null;
  max_students: number | null;
  storage_limit_mb: number | null;
  features: string[];
  is_active: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  category: string;
  cover_image_url: string | null;
  price_fcfa: number;
  status: ContentStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  course_id: string;
  title: string;
  position: number;
  status: ContentStatus;
  created_at: string;
}

export interface Lesson {
  id: string;
  chapter_id: string;
  title: string;
  content_type: LessonContentType;
  content_body: string | null;
  content_url: string | null;
  position: number;
  status: ContentStatus;
  created_at: string;
}

export interface Quiz {
  id: string;
  organization_id: string;
  course_id: string | null;
  lesson_id: string | null;
  kind: QuizKind;
  title: string;
  pass_score_percent: number;
  status: ContentStatus;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  image_url: string | null;
  position: number;
}

export interface QuizAnswer {
  id: string;
  question_id: string;
  answer_text: string;
  is_correct: boolean;
  position: number;
}

export interface Enrollment {
  id: string;
  organization_id: string;
  student_id: string;
  course_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
}

export interface LessonProgress {
  id: string;
  student_id: string;
  lesson_id: string;
  completed_at: string | null;
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  student_id: string;
  quiz_id: string;
  score_percent: number;
  answers: Record<string, string>;
  attempted_at: string;
}

export interface Appointment {
  id: string;
  organization_id: string;
  type: AppointmentType;
  title: string;
  description: string | null;
  instructor_id: string | null;
  student_id: string | null;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  location: string | null;
  meeting_provider: string | null;
  meeting_room_id: string | null;
  meeting_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SessionNote {
  id: string;
  appointment_id: string;
  instructor_id: string;
  observations: string | null;
  skills_rating: Record<string, number>;
  created_at: string;
}

export interface Payment {
  id: string;
  organization_id: string;
  student_id: string;
  enrollment_id: string | null;
  amount_fcfa: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  provider_reference: string | null;
  payment_type: PaymentType;
  gross_amount_fcfa: number | null;
  platform_commission_fcfa: number;
  seller_amount_fcfa: number | null;
  course_id: string | null;
  extra_service_id: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  organization_id: string;
  student_id: string;
  payment_id: string | null;
  number: string;
  amount_fcfa: number;
  status: PaymentStatus;
  issued_at: string;
  due_at: string | null;
}

export interface Notification {
  id: string;
  organization_id: string | null;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  organization_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  attachment_url: string | null;
  created_at: string;
}

export interface DocumentRow {
  id: string;
  organization_id: string;
  owner_id: string;
  title: string;
  category: string;
  file_url: string | null;
  status: DocumentStatus;
  uploaded_at: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  organization_id: string | null;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

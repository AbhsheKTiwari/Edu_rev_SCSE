-- =====================================================================
-- DEVELOPMENT SEED ONLY — synthetic demo achievements.
-- Runs automatically with `supabase db reset` on a LOCAL database.
-- Do NOT run this against production. All rows are flagged is_demo = true
-- and are hidden when NEXT_PUBLIC_DEMO_MODE=false.
-- =====================================================================

insert into public.achievements
  (is_demo, period_type, period_start, rank, display_name, initials, achievement_title, category, public_remark, status, published_at)
values
  (true, 'day', current_date, 1, 'Aanya Kapoor (demo)', 'AK', 'Low-cost soil moisture sensing for small farms', 'Research', 'Rigorous method and clear documentation.', 'published', now()),
  (true, 'day', current_date, 2, 'Rohan Verma (demo)', 'RV', 'Campus placement offer — software engineering', 'Placement', 'Strong real-world impact, well evidenced.', 'published', now()),
  (true, 'day', current_date, 3, 'Ishita Bansal (demo)', 'IB', 'Accessible timetable app for visually impaired students', 'Project', 'Original idea executed with care.', 'published', now()),
  (true, 'day', current_date - 1, 1, 'Kabir Malhotra (demo)', 'KM', 'Student venture reached its first paying customers', 'Revenue Generation', 'Commended for teamwork and initiative.', 'published', now()),
  (true, 'day', current_date - 1, 2, 'Meera Iyer (demo)', 'MI', 'Lightweight model for early crop-disease detection', 'Research', 'Thoughtful design with measurable results.', 'published', now()),
  (true, 'week', date_trunc('week', current_date)::date, 1, 'Arjun Sethi (demo)', 'AS', 'IoT library seat-availability finder', 'Project', 'Original idea executed with care.', 'published', now()),
  (true, 'week', date_trunc('week', current_date)::date, 2, 'Simran Gill (demo)', 'SG', 'Pre-placement offer after summer internship', 'Placement', 'Strong real-world impact, well evidenced.', 'published', now()),
  (true, 'week', date_trunc('week', current_date)::date, 3, 'Dev Khanna (demo)', 'DK', 'Inter-university debate finalist', 'Other', 'Commended for teamwork and initiative.', 'published', now())
on conflict do nothing;

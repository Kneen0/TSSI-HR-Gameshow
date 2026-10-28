/* =====================================================================
   CONFIG — Supabase project details for the TSSI game show.
   Clear both values ("") to run in DEMO MODE: host and players must then
   be tabs in the same browser on the same computer (great for rehearsal).

   ✅ The anon / public key below is designed to be public — safe here.
   ⛔ NEVER put the secret / service_role key in this file or anywhere in
      this repo: the site is public and that key bypasses all security.
   ===================================================================== */
window.TSSI_CONFIG = {
  SUPABASE_URL: "https://dcmdevqwdeumqvjsnsia.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjbWRldnF3ZGV1bXF2anNuc2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMTgwNjQsImV4cCI6MjEwODc5NDA2NH0.r64gnuyDBR0CT9hF560kh_iyjtnNuLnRlQ--rZ0R7O0",
  EVENT_TITLE: "TSSI HR Global Social Connect",
  SAVE_RESULTS: true       // writes the final leaderboard to the game_results table (run supabase/schema.sql first)
};

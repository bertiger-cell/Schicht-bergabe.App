const { createClient } = require('@supabase/supabase-js');

// Diese Werte kommen von Render (Environment Variables)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = {
  checkUser: async (username, password) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password);

    if (error) {
      console.error("Login Fehler:", error.message);
      return false;
    }
    return data && data.length > 0;
  },

  getUserCount: async () => {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (error) return 0;
    return count || 0;
  },

  createUser: async (username, password) => {
    const { error } = await supabase
      .from('users')
      .insert([{ username, password }]);

    if (error) {
      console.error("Registrierung Fehler:", error.message);
      return false;
    }
    return true;
  },

  getAllEntries: async () => {
    try {
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .order('id', { ascending: false }); // Sortierung nach ID ist sicherer

      if (error) {
        console.error("Fehler beim Laden der Einträge:", error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error("Unerwarteter Fehler in getAllEntries:", err.message);
      return [];
    }
  },

  saveEntry: async (entry) => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);

    const { error } = await supabase
      .from('entries')
      .insert([{
        machine: entry.machine,
        operator: entry.operator,
        additional_employee: entry.additionalEmployee,
        date: entry.date,
        work_time: entry.workTime,
        incident_from: entry.incidentFrom,
        incident_to: entry.incidentTo,
        completed_tasks: entry.completedTasks,
        incidents: entry.incidents,
        pending_works: entry.pendingWorks,
        issuer: entry.issuer,
        issuer_date: entry.issuerDate,
        issuer_time: currentTime,
        photos: JSON.stringify(entry.photos || []),
        user_id: entry.userId
      }]);

    if (error) {
      console.error("Speichern Fehler:", error.message);
    }
  }
};

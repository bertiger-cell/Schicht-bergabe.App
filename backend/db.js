const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = {
  checkUser: async (username, password) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password);

      if (error) throw error;
      return data && data.length > 0;
    } catch (err) {
      console.error("Login Fehler:", err.message);
      return false;
    }
  },

  getUserCount: async () => {
    try {
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    } catch (err) {
      return 0;
    }
  },

  createUser: async (username, password) => {
    try {
      const { error } = await supabase
        .from('users')
        .insert([{ username, password }]);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Registrierung Fehler:", err.message);
      return false;
    }
  },

  getAllEntries: async () => {
    try {
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Laden Fehler:", err.message);
      return [];
    }
  },

  saveEntry: async (entry) => {
    try {
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

      if (error) throw error;
    } catch (err) {
      console.error("Speichern Fehler:", err.message);
    }
  }
};

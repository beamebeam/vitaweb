import { supabase } from './supabaseClient';

// ============================================================
// HELPER UMUM: konversi nama field camelCase (JS) <-> snake_case (kolom Postgres)
// Contoh: scheduleTime <-> schedule_time, cd4AtDiagnosis <-> cd4_at_diagnosis
// ============================================================
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, (l) => '_' + l.toLowerCase());
}
function snakeToCamel(str) {
  return str.replace(/_([a-z0-9])/g, (_, l) => l.toUpperCase());
}
function objToSnake(obj) {
  const out = {};
  Object.keys(obj).forEach((k) => {
    if (obj[k] !== undefined) out[camelToSnake(k)] = obj[k];
  });
  return out;
}
function objToCamel(row) {
  if (!row) return null;
  const out = {};
  Object.keys(row).forEach((k) => {
    out[snakeToCamel(k)] = row[k];
  });
  return out;
}

async function getUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new Error('Kamu belum login. Silakan login dulu.');
  }
  return data.user.id;
}

function generateId() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 7);
}

// ============================================================
// AUTH (Supabase Auth - email & password)
// ============================================================
export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function resetPasswordForEmail(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

// callback(session | null) dipanggil setiap kali status login berubah
export function subscribeAuthChanges(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return data.subscription;
}

// ===== Format tanggal helper (murni JS, tidak berubah) =====
export function getTodayDateString() {
  const d = new Date();
  return toDateString(d);
}

export function toDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateIndo(dateString) {
  if (!dateString) return '-';
  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const d = new Date(dateString);
  return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateShortIndo(dateString) {
  if (!dateString) return '-';
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const d = new Date(dateString);
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

export function daysBetween(dateString1, dateString2) {
  const d1 = new Date(dateString1);
  const d2 = new Date(dateString2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

export function isValidDateString(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
  const d = new Date(dateString);
  return !isNaN(d.getTime());
}

// ============================================================
// PROFILE
// ============================================================
export async function getProfile() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return objToCamel(data);
}

export async function saveProfile(profile) {
  const userId = await getUserId();
  const payload = objToSnake(profile);
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...payload }, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return objToCamel(data);
}

export async function isOnboardingCompleted() {
  const profile = await getProfile();
  return !!profile?.onboardingCompleted;
}

export async function markOnboardingCompleted() {
  return await saveProfile({ onboardingCompleted: true });
}

// ============================================================
// PIN KEAMANAN (kunci lokal tambahan, terpisah dari login akun)
// ============================================================
export async function isPinEnabled() {
  const profile = await getProfile();
  return !!profile?.pinEnabled && !!profile?.pinCode;
}

export async function setPinCode(pinCode) {
  return await saveProfile({ pinEnabled: true, pinCode });
}

export async function disablePin() {
  return await saveProfile({ pinEnabled: false, pinCode: null });
}

export async function verifyPinCode(inputPin) {
  const profile = await getProfile();
  return profile?.pinCode === inputPin;
}

// ============================================================
// EXPORT / IMPORT DATA (backup berupa CSV) - tetap dipakai untuk pindah data
// antar akun / migrasi dari versi lokal lama.
// ============================================================
function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function arrayToCsv(rows, headers) {
  const headerLine = headers.join(',');
  const dataLines = rows.map((row) => headers.map((h) => csvEscape(row[h])).join(','));
  return [headerLine, ...dataLines].join('\n');
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
    return obj;
  });
}

function splitCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (char === '"') { inQuotes = false; }
      else { current += char; }
    } else {
      if (char === '"') { inQuotes = true; }
      else if (char === ',') { result.push(current); current = ''; }
      else { current += char; }
    }
  }
  result.push(current);
  return result;
}

export async function exportAllDataAsCsv() {
  const profile = await getProfile();
  const medicines = await getMedicines();
  const logs = await getMedicineLogs();
  const stockHistory = await getStockHistory();
  const visits = await getControlVisits();
  const timeline = await getTimelineEntries();

  const sections = [];

  sections.push('===SECTION:profile===');
  sections.push(arrayToCsv([profile || {}], [
    'nickname', 'diagnosisDate', 'cd4AtDiagnosis', 'faskes', 'emergencyContact',
    'onboardingCompleted', 'pinEnabled', 'pinCode',
  ]));

  sections.push('===SECTION:medicines===');
  sections.push(arrayToCsv(medicines, [
    'id', 'name', 'category', 'scheduleTime', 'mealRule', 'doseAmount', 'frequencyUnit',
    'stockRemaining', 'stockTotal', 'isActive', 'notes', 'endDate', 'createdAt',
  ]));

  sections.push('===SECTION:medicine_logs===');
  sections.push(arrayToCsv(logs, [
    'id', 'medicineId', 'date', 'scheduledTime', 'takenAtTime', 'status', 'bottleNumber',
  ]));

  sections.push('===SECTION:stock_history===');
  sections.push(arrayToCsv(stockHistory, [
    'id', 'medicineId', 'amount', 'startDate', 'endDateCalculated',
  ]));

  sections.push('===SECTION:control_visits===');
  sections.push(arrayToCsv(visits, [
    'id', 'visitDate', 'faskes', 'doctor', 'notes', 'isCompleted',
    'cd4', 'viralLoad', 'bloodPressureSys', 'bloodPressureDia', 'weight',
  ]));

  sections.push('===SECTION:timeline===');
  sections.push(arrayToCsv(timeline.map((t) => ({ ...t, tags: (t.tags || []).join('|') })), [
    'id', 'entryDate', 'entryType', 'title', 'description', 'severity', 'tags',
    'refVisitId', 'refMedicineId', 'refStockHistoryId',
  ]));

  return sections.join('\n\n');
}

// Mengimpor data dari hasil export. MENGGANTI semua data akun ini yang ada saat ini.
// ID lama (dari versi lokal / akun lain) tidak bisa dipakai langsung sebagai UUID Postgres,
// jadi setiap baris dibuatkan ID baru dan semua referensi (medicineId, refVisitId, dst)
// dipetakan ulang ke ID baru tersebut.
export async function importAllDataFromCsv(csvText) {
  const userId = await getUserId();
  const sectionRegex = /===SECTION:(\w+)===\n([\s\S]*?)(?=\n\n===SECTION:|$)/g;
  const sectionsData = {};
  let match;
  while ((match = sectionRegex.exec(csvText)) !== null) {
    sectionsData[match[1]] = parseCsv(match[2].trim());
  }

  // Hapus semua data lama milik akun ini (urutan aman berkat ON DELETE CASCADE di database)
  const { error: delMedError } = await supabase.from('medicines').delete().eq('user_id', userId);
  if (delMedError) throw delMedError;
  const { error: delVisitError } = await supabase.from('control_visits').delete().eq('user_id', userId);
  if (delVisitError) throw delVisitError;

  if (sectionsData.profile && sectionsData.profile[0]) {
    const p = sectionsData.profile[0];
    await saveProfile({
      nickname: p.nickname || '',
      diagnosisDate: p.diagnosisDate || null,
      cd4AtDiagnosis: p.cd4AtDiagnosis ? Number(p.cd4AtDiagnosis) : null,
      faskes: p.faskes || '',
      emergencyContact: p.emergencyContact || '',
      onboardingCompleted: true,
      pinEnabled: p.pinEnabled === 'true' || p.pinEnabled === true,
      pinCode: p.pinCode || null,
    });
  }

  const medicineIdMap = {};
  if (sectionsData.medicines) {
    for (const m of sectionsData.medicines) {
      const { data, error } = await supabase.from('medicines').insert({
        user_id: userId,
        name: m.name,
        category: m.category || 'ARV',
        schedule_time: m.scheduleTime || null,
        meal_rule: m.mealRule || '',
        dose_amount: m.doseAmount ? Number(m.doseAmount) : 1,
        frequency_unit: m.frequencyUnit || 'Hari',
        stock_remaining: Number(m.stockRemaining) || 0,
        stock_total: Number(m.stockTotal) || 0,
        is_active: m.isActive === 'true' || m.isActive === true,
        notes: m.notes || '',
        end_date: m.endDate || null,
      }).select().single();
      if (!error && data) medicineIdMap[m.id] = data.id;
    }
  }

  const stockHistoryIdMap = {};
  if (sectionsData.stock_history) {
    for (const h of sectionsData.stock_history) {
      const newMedId = medicineIdMap[h.medicineId];
      if (!newMedId) continue;
      const { data, error } = await supabase.from('stock_history').insert({
        user_id: userId,
        medicine_id: newMedId,
        amount: Number(h.amount) || 0,
        start_date: h.startDate,
        end_date_calculated: h.endDateCalculated,
      }).select().single();
      if (!error && data) stockHistoryIdMap[h.id] = data.id;
    }
  }

  if (sectionsData.medicine_logs) {
    for (const l of sectionsData.medicine_logs) {
      const newMedId = medicineIdMap[l.medicineId];
      if (!newMedId) continue;
      await supabase.from('medicine_logs').insert({
        user_id: userId,
        medicine_id: newMedId,
        date: l.date,
        scheduled_time: l.scheduledTime || null,
        taken_at_time: l.takenAtTime,
        status: l.status || 'tepat',
        bottle_number: l.bottleNumber ? Number(l.bottleNumber) : null,
      });
    }
  }

  const visitIdMap = {};
  if (sectionsData.control_visits) {
    for (const v of sectionsData.control_visits) {
      const { data, error } = await supabase.from('control_visits').insert({
        user_id: userId,
        visit_date: v.visitDate,
        faskes: v.faskes || '',
        doctor: v.doctor || '',
        notes: v.notes || '',
        is_completed: v.isCompleted === 'true' || v.isCompleted === true,
        cd4: v.cd4 ? Number(v.cd4) : null,
        viral_load: v.viralLoad || null,
        blood_pressure_sys: v.bloodPressureSys ? Number(v.bloodPressureSys) : null,
        blood_pressure_dia: v.bloodPressureDia ? Number(v.bloodPressureDia) : null,
        weight: v.weight ? Number(v.weight) : null,
        attachments: [],
      }).select().single();
      if (!error && data) visitIdMap[v.id] = data.id;
    }
  }

  if (sectionsData.timeline) {
    for (const t of sectionsData.timeline) {
      await supabase.from('timeline_entries').insert({
        user_id: userId,
        entry_date: t.entryDate,
        entry_type: t.entryType,
        title: t.title || '',
        description: t.description || '',
        severity: t.severity || null,
        tags: t.tags ? t.tags.split('|').filter(Boolean) : [],
        ref_visit_id: t.refVisitId ? (visitIdMap[t.refVisitId] || null) : null,
        ref_medicine_id: t.refMedicineId ? (medicineIdMap[t.refMedicineId] || null) : null,
        ref_stock_history_id: t.refStockHistoryId ? (stockHistoryIdMap[t.refStockHistoryId] || null) : null,
      });
    }
  }

  return true;
}

// Menghapus SEMUA data milik akun ini (obat, log, kontrol, timeline). Akun & profil tetap
// ada (supaya tidak perlu daftar ulang), tapi isi profil direset seperti akun baru.
export async function clearAllData() {
  const userId = await getUserId();

  const { error: medError } = await supabase.from('medicines').delete().eq('user_id', userId); // cascade: logs & stock_history & timeline obat ikut terhapus
  if (medError) throw medError;

  const { error: visitError } = await supabase.from('control_visits').delete().eq('user_id', userId); // cascade: timeline kontrol ikut terhapus
  if (visitError) throw visitError;

  const { error: timelineError } = await supabase.from('timeline_entries').delete().eq('user_id', userId); // sisa entri manual (jurnal/gejala/milestone)
  if (timelineError) throw timelineError;

  const { error: profileError } = await supabase.from('profiles').update({
    nickname: null,
    diagnosis_date: null,
    cd4_at_diagnosis: null,
    faskes: null,
    emergency_contact: null,
    onboarding_completed: false,
    pin_enabled: false,
    pin_code: null,
    notifications_enabled: false,
  }).eq('id', userId);
  if (profileError) throw profileError;
}

// ============================================================
// MEDICINE (daftar obat)
// ============================================================
export async function getMedicines() {
  const { data, error } = await supabase.from('medicines').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(objToCamel);
}

export async function getMedicineById(id) {
  const { data, error } = await supabase.from('medicines').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return objToCamel(data);
}

export async function getActiveMedicines() {
  const { data, error } = await supabase.from('medicines').select('*').eq('is_active', true).order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(objToCamel);
}

const FREQUENCY_TO_DAYS = {
  Jam: 1 / 24,
  Hari: 1,
  Minggu: 7,
  Bulan: 30,
};

function calculateDaysSupply(stockTotal, doseAmount = 1, frequencyUnit = 'Hari') {
  const daysPerCycle = FREQUENCY_TO_DAYS[frequencyUnit] ?? 1;
  const dose = doseAmount > 0 ? doseAmount : 1;
  const cycles = stockTotal / dose;
  return Math.max(1, Math.round(cycles * daysPerCycle));
}

function calculateBottleEndDate(startDate, daysSupply) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + daysSupply - 1);
  return toDateString(d);
}

export function formatDoseText(doseAmount, frequencyUnit) {
  const amount = doseAmount || 1;
  const unit = frequencyUnit || 'Hari';
  const unitLabel = { Jam: 'jam', Hari: 'hari', Minggu: 'minggu', Bulan: 'bulan' }[unit] || 'hari';
  return `${amount}x minum / ${unitLabel}`;
}

export async function saveMedicine(medicine) {
  const userId = await getUserId();
  const payload = objToSnake(medicine);
  delete payload.bottle_number;
  delete payload.stock_start_date; // hanya dipakai untuk hitung botol pertama, bukan kolom di tabel medicines

  const { data: newRow, error } = await supabase
    .from('medicines')
    .insert({ user_id: userId, is_active: true, ...payload })
    .select()
    .single();
  if (error) throw error;
  const newMedicine = objToCamel(newRow);

  if (medicine.stockTotal > 0) {
    const startDate = medicine.stockStartDate || getTodayDateString();
    const daysSupply = calculateDaysSupply(medicine.stockTotal, medicine.doseAmount, medicine.frequencyUnit);
    const endDateCalculated = calculateBottleEndDate(startDate, daysSupply);

    const { data: stockRow, error: stockErr } = await supabase.from('stock_history').insert({
      user_id: userId,
      medicine_id: newMedicine.id,
      amount: medicine.stockTotal,
      start_date: startDate,
      end_date_calculated: endDateCalculated,
    }).select().single();
    if (stockErr) throw stockErr;

    const kategoriLabel = newMedicine.category === 'ARV' ? 'ARV' : newMedicine.category === 'pendamping' ? 'Pendamping' : 'Temporer';
    await saveTimelineEntry({
      entryDate: startDate,
      entryType: 'obat',
      title: `${kategoriLabel}: ${newMedicine.name} - Botol-1`,
      description: `${medicine.stockTotal} Tablet, Mulai diminum`,
      refMedicineId: newMedicine.id,
      refStockHistoryId: stockRow.id,
    });

    // Hitung ulang stok tersisa supaya langsung akurat (bukan 0) begitu obat baru dibuat
    await recalculateStockRemaining(newMedicine.id);
    return await getMedicineById(newMedicine.id);
  }

  return newMedicine;
}

export async function updateMedicine(id, updates) {
  const payload = objToSnake(updates);
  const { data, error } = await supabase.from('medicines').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return objToCamel(data);
}

export async function deactivateMedicine(id) {
  return await updateMedicine(id, { isActive: false, endDate: getTodayDateString() });
}

export async function restoreMedicine(id) {
  return await updateMedicine(id, { isActive: true, endDate: null });
}

// Menghapus obat + SEMUA data terkait (log, riwayat botol, entri timeline) otomatis lewat
// ON DELETE CASCADE di database - tidak perlu hapus manual satu-satu seperti versi lokal dulu.
export async function deleteMedicine(id) {
  const { error } = await supabase.from('medicines').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// MEDICINE_LOG (log konsumsi harian)
// ============================================================
export async function getMedicineLogs() {
  const { data, error } = await supabase.from('medicine_logs').select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(objToCamel);
}

export async function getLogsForMedicine(medicineId) {
  const { data, error } = await supabase
    .from('medicine_logs')
    .select('*')
    .eq('medicine_id', medicineId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(objToCamel);
}

export async function getLogForToday(medicineId, dateString) {
  const { data, error } = await supabase
    .from('medicine_logs')
    .select('*')
    .eq('medicine_id', medicineId)
    .eq('date', dateString)
    .maybeSingle();
  if (error) throw error;
  return objToCamel(data);
}

function calculateLogStatus(scheduledTime, takenAtTime) {
  if (!scheduledTime) return 'tepat';
  const [schedH, schedM] = scheduledTime.split(':').map(Number);
  const [takenH, takenM] = takenAtTime.split(':').map(Number);
  const scheduledMinutes = schedH * 60 + schedM;
  const takenMinutes = takenH * 60 + takenM;
  const diff = takenMinutes - scheduledMinutes;
  if (Math.abs(diff) <= 30) return 'tepat';
  if (diff > 30) return 'terlambat';
  return 'lebih_awal';
}

export function calculateMinutesDiff(scheduledTime, takenAtTime) {
  if (!scheduledTime) return 0;
  const [schedH, schedM] = scheduledTime.split(':').map(Number);
  const [takenH, takenM] = takenAtTime.split(':').map(Number);
  const scheduledMinutes = schedH * 60 + schedM;
  const takenMinutes = takenH * 60 + takenM;
  return takenMinutes - scheduledMinutes;
}

export async function markMedicineTaken(medicineId, scheduledTime, options = {}) {
  const userId = await getUserId();
  const now = new Date();
  const dateString = options.dateString || getTodayDateString();
  const takenAtTime = options.takenAtTime ||
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const status = calculateLogStatus(scheduledTime, takenAtTime);
  const isToday = dateString === getTodayDateString();

  const matchedBottle = await findBottleForDate(medicineId, dateString);
  const bottleNumber = matchedBottle?.bottleNumber ?? null;

  if (isToday) {
    const { data: existing } = await supabase
      .from('medicine_logs')
      .select('id')
      .eq('medicine_id', medicineId)
      .eq('date', dateString)
      .maybeSingle();
    if (existing) {
      const { data, error } = await supabase
        .from('medicine_logs')
        .update({ scheduled_time: scheduledTime, taken_at_time: takenAtTime, status, bottle_number: bottleNumber })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      await recalculateStockRemaining(medicineId);
      return objToCamel(data);
    }
  }

  const { data, error } = await supabase.from('medicine_logs').insert({
    user_id: userId,
    medicine_id: medicineId,
    date: dateString,
    scheduled_time: scheduledTime,
    taken_at_time: takenAtTime,
    status,
    bottle_number: bottleNumber,
  }).select().single();
  if (error) throw error;
  await recalculateStockRemaining(medicineId);
  return objToCamel(data);
}

export async function unmarkMedicineTaken(medicineId, dateString) {
  const { error } = await supabase.from('medicine_logs').delete().eq('medicine_id', medicineId).eq('date', dateString);
  if (error) throw error;
  await recalculateStockRemaining(medicineId);
}

export async function deleteMedicineLog(logId) {
  const { data: target } = await supabase.from('medicine_logs').select('medicine_id').eq('id', logId).maybeSingle();
  const { error } = await supabase.from('medicine_logs').delete().eq('id', logId);
  if (error) throw error;
  if (target) await recalculateStockRemaining(target.medicine_id);
}

export async function updateMedicineLog(logId, { dateString, takenAtTime }) {
  const { data: existing, error: gErr } = await supabase.from('medicine_logs').select('*').eq('id', logId).single();
  if (gErr) throw gErr;
  const status = calculateLogStatus(existing.scheduled_time, takenAtTime);
  const matchedBottle = await findBottleForDate(existing.medicine_id, dateString);

  const { data, error } = await supabase.from('medicine_logs').update({
    date: dateString,
    taken_at_time: takenAtTime,
    status,
    bottle_number: matchedBottle ? matchedBottle.bottleNumber : null,
  }).eq('id', logId).select().single();
  if (error) throw error;
  await recalculateStockRemaining(existing.medicine_id);
  return objToCamel(data);
}

export async function addManualMedicineLog(medicineId, scheduledTime, dateString, takenAtTime) {
  return await markMedicineTaken(medicineId, scheduledTime, { dateString, takenAtTime });
}

export async function getLogsForBottle(medicineId, bottleNumber) {
  const { data, error } = await supabase
    .from('medicine_logs')
    .select('*')
    .eq('medicine_id', medicineId)
    .eq('bottle_number', bottleNumber)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(objToCamel);
}

export async function getOrphanLogsForMedicine(medicineId) {
  const { data, error } = await supabase
    .from('medicine_logs')
    .select('*')
    .eq('medicine_id', medicineId)
    .is('bottle_number', null)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(objToCamel);
}

export async function getMonthlyComplianceStats() {
  const logs = await getMedicineLogs();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const logsThisMonth = logs.filter((log) => {
    const d = new Date(log.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const tepatWaktu = logsThisMonth.filter((l) => l.status === 'tepat').length;
  const total = logsThisMonth.length;
  const persen = total > 0 ? Math.round((tepatWaktu / total) * 100) : 0;

  return { tepatWaktu, total, persen };
}

export async function getComplianceCalendar(year, month) {
  const logs = await getMedicineLogs();
  const result = {};
  logs.forEach((log) => {
    const d = new Date(log.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      if (!result[log.date]) {
        result[log.date] = log.status;
      } else if (result[log.date] !== log.status) {
        result[log.date] = 'campur';
      }
    }
  });
  return result;
}

// ============================================================
// STOCK HISTORY (riwayat botol per obat) - berbasis rentang tanggal.
// bottleNumber dihitung dinamis dari urutan start_date (terlama = botol 1), sama seperti versi lokal.
// ============================================================
export async function getStockHistory() {
  const { data, error } = await supabase.from('stock_history').select('*').order('start_date', { ascending: true });
  if (error) throw error;
  return (data || []).map(objToCamel);
}

export async function getStockHistoryForMedicine(medicineId) {
  const { data, error } = await supabase
    .from('stock_history')
    .select('*')
    .eq('medicine_id', medicineId)
    .order('start_date', { ascending: true });
  if (error) throw error;
  return (data || []).map((row, index) => ({ ...objToCamel(row), bottleNumber: index + 1 }));
}

export async function findBottleForDate(medicineId, dateString) {
  const bottles = await getStockHistoryForMedicine(medicineId);
  if (bottles.length === 0) return null;
  return bottles.find((b) => dateString >= b.startDate && dateString <= b.endDateCalculated) || null;
}

export async function recalculateStockRemaining(medicineId) {
  const { data: bottles, error: bErr } = await supabase.from('stock_history').select('amount').eq('medicine_id', medicineId);
  if (bErr) throw bErr;
  const totalAmount = (bottles || []).reduce((sum, h) => sum + (Number(h.amount) || 0), 0);

  const { data: med, error: mErr } = await supabase.from('medicines').select('dose_amount').eq('id', medicineId).maybeSingle();
  if (mErr) throw mErr;
  const doseAmount = med?.dose_amount || 1;

  const { count, error: cErr } = await supabase
    .from('medicine_logs')
    .select('id', { count: 'exact', head: true })
    .eq('medicine_id', medicineId);
  if (cErr) throw cErr;
  const totalConsumed = (count || 0) * doseAmount;
  const stockRemaining = Math.max(0, totalAmount - totalConsumed);

  await supabase.from('medicines').update({ stock_total: totalAmount, stock_remaining: stockRemaining }).eq('id', medicineId);

  return { stockTotal: totalAmount, stockRemaining };
}

export async function addNewStock(medicineId, amount, customStartDate) {
  const userId = await getUserId();
  const medicine = await getMedicineById(medicineId);
  if (!medicine) return null;

  const numericAmount = Number(amount) || 0;
  const startDate = customStartDate || getTodayDateString();
  const daysSupply = calculateDaysSupply(numericAmount, medicine.doseAmount, medicine.frequencyUnit);
  const endDateCalculated = calculateBottleEndDate(startDate, daysSupply);

  const { data: newRow, error } = await supabase.from('stock_history').insert({
    user_id: userId,
    medicine_id: medicineId,
    amount: numericAmount,
    start_date: startDate,
    end_date_calculated: endDateCalculated,
  }).select().single();
  if (error) throw error;

  await recalculateStockRemaining(medicineId);

  const updatedHistory = await getStockHistoryForMedicine(medicineId);
  const newBottle = updatedHistory.find((h) => h.id === newRow.id);
  const kategoriLabel = medicine.category === 'ARV' ? 'ARV' : medicine.category === 'pendamping' ? 'Pendamping' : 'Temporer';
  await saveTimelineEntry({
    entryDate: startDate,
    entryType: 'obat',
    title: `${kategoriLabel}: ${medicine.name} - Botol-${newBottle?.bottleNumber || '?'}`,
    description: `${numericAmount} Tablet, Mulai diminum`,
    refMedicineId: medicineId,
    refStockHistoryId: newRow.id,
  });

  return await getMedicineById(medicineId);
}

export async function updateStockHistoryEntry(historyId, updates) {
  const { data: existingRow, error: gErr } = await supabase.from('stock_history').select('*').eq('id', historyId).single();
  if (gErr) throw gErr;
  const existing = objToCamel(existingRow);
  const merged = { ...existing, ...updates };
  const medicine = await getMedicineById(merged.medicineId);

  let endDateCalculated = existing.endDateCalculated;
  if (updates.startDate !== undefined || updates.amount !== undefined) {
    const daysSupply = calculateDaysSupply(merged.amount, medicine?.doseAmount, medicine?.frequencyUnit);
    endDateCalculated = calculateBottleEndDate(merged.startDate, daysSupply);
  }

  const { data: updatedRow, error } = await supabase.from('stock_history').update({
    amount: merged.amount,
    start_date: merged.startDate,
    end_date_calculated: endDateCalculated,
  }).eq('id', historyId).select().single();
  if (error) throw error;

  await recalculateStockRemaining(merged.medicineId);

  const allBottles = await getStockHistoryForMedicine(merged.medicineId);
  const thisBottle = allBottles.find((b) => b.id === historyId);
  if (medicine && thisBottle) {
    const kategoriLabel = medicine.category === 'ARV' ? 'ARV' : medicine.category === 'pendamping' ? 'Pendamping' : 'Temporer';
    await supabase.from('timeline_entries').update({
      entry_date: merged.startDate,
      title: `${kategoriLabel}: ${medicine.name} - Botol-${thisBottle.bottleNumber}`,
      description: `${merged.amount} Tablet, Mulai diminum`,
    }).eq('ref_stock_history_id', historyId);
  }

  return objToCamel(updatedRow);
}

// Menghapus botol - entri timeline terkait ikut terhapus otomatis lewat ON DELETE CASCADE.
export async function deleteStockHistoryEntry(historyId) {
  const { data: target } = await supabase.from('stock_history').select('medicine_id').eq('id', historyId).maybeSingle();
  const { error } = await supabase.from('stock_history').delete().eq('id', historyId);
  if (error) throw error;
  if (target) await recalculateStockRemaining(target.medicine_id);
}

// ============================================================
// CONTROL_VISIT (riwayat & jadwal kontrol)
// ============================================================
export async function getControlVisits() {
  const { data, error } = await supabase.from('control_visits').select('*').order('visit_date', { ascending: false });
  if (error) throw error;
  return (data || []).map(objToCamel);
}

export async function getControlVisitById(id) {
  const { data, error } = await supabase.from('control_visits').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return objToCamel(data);
}

export async function getUpcomingControlVisit() {
  const visits = await getControlVisits();
  const today = getTodayDateString();

  const belumSelesai = visits.filter((v) => !v.isCompleted && isValidDateString(v.visitDate));
  if (belumSelesai.length === 0) return null;

  belumSelesai.sort((a, b) => new Date(a.visitDate) - new Date(b.visitDate));

  const terlambat = belumSelesai.filter((v) => v.visitDate < today);
  if (terlambat.length > 0) {
    return { date: terlambat[0].visitDate, source: terlambat[0], status: 'terlambat' };
  }

  const hariIni = belumSelesai.find((v) => v.visitDate === today);
  if (hariIni) {
    return { date: hariIni.visitDate, source: hariIni, status: 'hari_ini' };
  }

  const akanDatang = belumSelesai.find((v) => v.visitDate > today);
  if (akanDatang) {
    return { date: akanDatang.visitDate, source: akanDatang, status: 'akan_datang' };
  }

  return null;
}

export async function markControlVisitCompleted(visitId) {
  const { error } = await supabase.from('control_visits').update({
    is_completed: true,
    completed_at: new Date().toISOString(),
  }).eq('id', visitId);
  if (error) throw error;
}

export async function unmarkControlVisitCompleted(visitId) {
  const { error } = await supabase.from('control_visits').update({
    is_completed: false,
    completed_at: null,
  }).eq('id', visitId);
  if (error) throw error;
}

export async function saveControlVisit(visit) {
  const userId = await getUserId();
  const payload = objToSnake(visit);
  const { data, error } = await supabase.from('control_visits').insert({
    user_id: userId,
    is_completed: false,
    attachments: [],
    ...payload,
  }).select().single();
  if (error) throw error;
  const newVisit = objToCamel(data);

  await saveTimelineEntry({
    entryDate: newVisit.visitDate,
    entryType: 'kontrol',
    title: `Kontrol — ${newVisit.faskes || 'Faskes'}`,
    description: newVisit.notes || '',
    refVisitId: newVisit.id,
  });

  return newVisit;
}

export async function updateControlVisit(id, updates) {
  const payload = objToSnake(updates);
  const { data, error } = await supabase.from('control_visits').update(payload).eq('id', id).select().single();
  if (error) throw error;
  const updated = objToCamel(data);

  if (updates.visitDate !== undefined || updates.faskes !== undefined || updates.notes !== undefined) {
    await supabase.from('timeline_entries').update({
      entry_date: updated.visitDate,
      title: `Kontrol — ${updated.faskes || 'Faskes'}`,
      description: updated.notes || '',
    }).eq('ref_visit_id', id);
  }

  return updated;
}

// Menghapus kunjungan - entri timeline terkait ikut terhapus otomatis lewat ON DELETE CASCADE.
export async function deleteControlVisit(id) {
  const { error } = await supabase.from('control_visits').delete().eq('id', id);
  if (error) throw error;
}

export async function addAttachmentToVisit(visitId, attachment) {
  const visit = await getControlVisitById(visitId);
  const attachments = [...(visit?.attachments || []), { id: generateId(), ...attachment }];
  const { error } = await supabase.from('control_visits').update({ attachments }).eq('id', visitId);
  if (error) throw error;
}

export async function updateAttachment(visitId, attachmentId, updates) {
  const visit = await getControlVisitById(visitId);
  const attachments = (visit?.attachments || []).map((a) => (a.id === attachmentId ? { ...a, ...updates } : a));
  const { error } = await supabase.from('control_visits').update({ attachments }).eq('id', visitId);
  if (error) throw error;
}

export async function deleteAttachment(visitId, attachmentId) {
  const visit = await getControlVisitById(visitId);
  const attachments = (visit?.attachments || []).filter((a) => a.id !== attachmentId);
  const { error } = await supabase.from('control_visits').update({ attachments }).eq('id', visitId);
  if (error) throw error;
}

// ============================================================
// TIMELINE_ENTRY (jurnal, gejala, penyakit, milestone, kontrol)
// ============================================================
export async function getTimelineEntries() {
  const { data, error } = await supabase.from('timeline_entries').select('*').order('entry_date', { ascending: false });
  if (error) throw error;
  return (data || []).map(objToCamel);
}

export async function getTimelineEntriesByType(entryType) {
  const entries = await getTimelineEntries();
  if (entryType === 'semua') return entries;
  return entries.filter((e) => e.entryType === entryType);
}

export async function saveTimelineEntry(entry) {
  const userId = await getUserId();
  const payload = objToSnake(entry);
  const { data, error } = await supabase.from('timeline_entries').insert({
    user_id: userId,
    tags: [],
    ...payload,
  }).select().single();
  if (error) throw error;
  return objToCamel(data);
}

export async function updateTimelineEntry(id, updates) {
  const payload = objToSnake(updates);
  const { data, error } = await supabase.from('timeline_entries').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return objToCamel(data);
}

export async function deleteTimelineEntry(id) {
  const { error } = await supabase.from('timeline_entries').delete().eq('id', id);
  if (error) throw error;
}

export async function getTimelineEntriesForMonth(year, month) {
  const entries = await getTimelineEntries();
  return entries.filter((e) => {
    const d = new Date(e.entryDate);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

import * as SQLite from 'expo-sqlite';

let db;

export async function getDB() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('brightsmile.db');
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin','doctor','patient')),
        address TEXT,
        sex TEXT,
        age INTEGER,
        doctor_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS doctors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        specialization TEXT DEFAULT 'Dentist',
        shift TEXT NOT NULL CHECK(shift IN ('Morning','Afternoon','Night')),
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference_no TEXT NOT NULL UNIQUE,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        appointment_date TEXT NOT NULL,
        appointment_time TEXT NOT NULL,
        concern TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Scheduled'
          CHECK(status IN ('Scheduled','Completed','Cancelled')),
        doctor_notes TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(patient_id) REFERENCES users(id),
        FOREIGN KEY(doctor_id) REFERENCES doctors(id)
      );
      CREATE TABLE IF NOT EXISTS date_availability (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        availability_date TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL CHECK(status IN ('Closed')),
        reason TEXT DEFAULT ''
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_active_appointment_slot
      ON appointments(doctor_id, appointment_date, appointment_time)
      WHERE status != 'Cancelled';
    `);
    await seedData(db);
  }
  return db;
}

async function seedData(database) {
  const admin = await database.getFirstAsync(
    'SELECT id FROM users WHERE email = ?', ['admin@brightsmile.com']
  );
  if (!admin) {
    await database.runAsync(
      'INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)',
      ['Clinic Owner', 'admin@brightsmile.com', 'admin123', 'admin']
    );
  }

  const count = await database.getFirstAsync('SELECT COUNT(*) AS total FROM doctors');
  if (count.total === 0) {
    const demoDoctors = [
      ['Dr. Maria Santos', 'General Dentist', 'Morning', '08:00', '12:00', 'maria@brightsmile.com'],
      ['Dr. John Reyes', 'General Dentist', 'Afternoon', '13:00', '17:00', 'john@brightsmile.com'],
      ['Dr. Angela Cruz', 'General Dentist', 'Night', '18:00', '21:00', 'angela@brightsmile.com']
    ];
    for (const [name, specialization, shift, start, end, email] of demoDoctors) {
      const existing = await database.getFirstAsync('SELECT id FROM users WHERE email = ?', [email]);
      let userId = existing?.id;
      if (!userId) {
        const result = await database.runAsync(
          'INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)',
          [name, email, 'doctor123', 'doctor']
        );
        userId = result.lastInsertRowId;
      }
      await database.runAsync(
        `INSERT INTO doctors (user_id,name,specialization,shift,start_time,end_time)
         VALUES (?,?,?,?,?,?)`,
        [userId, name, specialization, shift, start, end]
      );
    }
  }
}

export async function login(email, password) {
  const database = await getDB();
  return database.getFirstAsync(
    'SELECT * FROM users WHERE lower(email)=lower(?) AND password=?',
    [email.trim(), password]
  );
}

export async function registerPatient({name,email,password,address,sex,age}) {
  const database = await getDB();
  const exists = await database.getFirstAsync('SELECT id FROM users WHERE lower(email)=lower(?)', [email.trim()]);
  if (exists) throw new Error('That email is already registered.');
  const result = await database.runAsync(
    `INSERT INTO users (name,email,password,role,address,sex,age)
     VALUES (?,?,?,'patient',?,?,?)`,
    [name.trim(), email.trim(), password, address.trim(), sex, Number(age)]
  );
  return database.getFirstAsync('SELECT * FROM users WHERE id=?', [result.lastInsertRowId]);
}

export async function getDoctors() {
  const database = await getDB();
  return database.getAllAsync('SELECT * FROM doctors WHERE active=1 ORDER BY id');
}

export async function getAllDoctors() {
  const database = await getDB();
  return database.getAllAsync('SELECT * FROM doctors ORDER BY id');
}

export async function addDoctor({name,email,password,specialization,shift}) {
  const database = await getDB();
  const shifts = {
    Morning: ['08:00','12:00'],
    Afternoon: ['13:00','17:00'],
    Night: ['18:00','21:00']
  };
  const existing = await database.getFirstAsync('SELECT id FROM users WHERE lower(email)=lower(?)', [email.trim()]);
  if (existing) throw new Error('That email is already used.');
  const userResult = await database.runAsync(
    'INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)',
    [name.trim(), email.trim(), password, 'doctor']
  );
  await database.runAsync(
    `INSERT INTO doctors (user_id,name,specialization,shift,start_time,end_time)
     VALUES (?,?,?,?,?,?)`,
    [userResult.lastInsertRowId, name.trim(), specialization.trim() || 'General Dentist',
     shift, shifts[shift][0], shifts[shift][1]]
  );
}

export async function updateDoctorActive(id, active) {
  const database = await getDB();
  await database.runAsync('UPDATE doctors SET active=? WHERE id=?', [active ? 1 : 0, id]);
}

export async function deleteDoctor(id) {
  const database = await getDB();
  const used = await database.getFirstAsync(
    `SELECT COUNT(*) AS total FROM appointments WHERE doctor_id=?`, [id]
  );
  if (used.total > 0) throw new Error('This doctor has appointment history. Deactivate the doctor instead so past records are preserved.');
  const doctor = await database.getFirstAsync('SELECT user_id FROM doctors WHERE id=?', [id]);
  await database.runAsync('DELETE FROM doctors WHERE id=?', [id]);
  if (doctor?.user_id) await database.runAsync('DELETE FROM users WHERE id=?', [doctor.user_id]);
}

export async function getAppointments({role,userId,doctorId,date} = {}) {
  const database = await getDB();
  let sql = `
    SELECT a.*, p.name AS patient_name, p.email AS patient_email,
           p.address AS patient_address, p.sex AS patient_sex, p.age AS patient_age,
           d.name AS doctor_name, d.shift AS doctor_shift
    FROM appointments a
    JOIN users p ON p.id=a.patient_id
    JOIN doctors d ON d.id=a.doctor_id
  `;
  const where = [];
  const params = [];
  if (role === 'patient') { where.push('a.patient_id=?'); params.push(userId); }
  if (role === 'doctor') { where.push('d.user_id=?'); params.push(userId); }
  if (doctorId) { where.push('a.doctor_id=?'); params.push(doctorId); }
  if (date) { where.push('a.appointment_date=?'); params.push(date); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ` ORDER BY a.appointment_date ASC, a.appointment_time ASC`;
  return database.getAllAsync(sql, params);
}

export async function createAppointment({patientId,doctorId,date,time,concern}) {
  const database = await getDB();
  const today = new Date();
  today.setHours(0,0,0,0);
  const chosen = new Date(`${date}T00:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(chosen.getTime()) || chosen < today) {
    throw new Error('Choose a valid date today or later (YYYY-MM-DD).');
  }
  const closedDate = await database.getFirstAsync(
  'SELECT id FROM date_availability WHERE availability_date=?',
  [date]
);

if (closedDate) {
  throw new Error('The clinic is closed on this date. Please choose another date.');
}
  const doctor = await database.getFirstAsync('SELECT * FROM doctors WHERE id=? AND active=1', [doctorId]);
  if (!doctor) throw new Error('That doctor is not currently available.');
  if (time < doctor.start_time || time >= doctor.end_time) throw new Error('That time is outside the selected doctor’s shift.');
  const [hour, minute] = time.split(':').map(Number);
  if (minute !== 0 && minute !== 30) throw new Error('Choose a 30-minute appointment slot.');
  if (hour < 0 || hour > 23) throw new Error('Invalid appointment time.');

  const duplicate = await database.getFirstAsync(
    `SELECT id FROM appointments
     WHERE doctor_id=? AND appointment_date=? AND appointment_time=? AND status!='Cancelled'`,
    [doctorId, date, time]
  );
  if (duplicate) throw new Error('That doctor and time slot is already booked. Please choose another slot.');

  const reference = `BS-${Date.now().toString().slice(-8)}`;
  await database.runAsync(
    `INSERT INTO appointments
     (reference_no,patient_id,doctor_id,appointment_date,appointment_time,concern,status)
     VALUES (?,?,?,?,?,?,'Scheduled')`,
    [reference, patientId, doctorId, date, time, concern.trim()]
  );
  return reference;
}

export async function updateAppointmentStatus(id,status,notes='') {
  const database = await getDB();
  await database.runAsync(
    'UPDATE appointments SET status=?, doctor_notes=? WHERE id=?',
    [status, notes, id]
  );
}

export async function deleteAppointment(id,userId) {
  const database = await getDB();
  const result = await database.runAsync(
    `UPDATE appointments SET status='Cancelled'
     WHERE id=? AND patient_id=? AND status='Scheduled'`,
    [id,userId]
  );
  if (result.changes === 0) throw new Error('This appointment cannot be cancelled.');
}

export async function getAvailability(date) {
  const database = await getDB();
  const doctors = await getDoctors();
  const closedDate = await getDateAvailability(date);
  const bookings = await database.getAllAsync(
    `SELECT doctor_id, appointment_time FROM appointments
     WHERE appointment_date=? AND status!='Cancelled'`, [date]
  );
  return doctors.map(doctor => {
    const slots = [];
    const [sh, sm] = doctor.start_time.split(':').map(Number);
    const [eh, em] = doctor.end_time.split(':').map(Number);
    let minutes = sh * 60 + sm;
    const end = eh * 60 + em;
    while (minutes < end) {
      const hh = String(Math.floor(minutes / 60)).padStart(2,'0');
      const mm = String(minutes % 60).padStart(2,'0');
      const time = `${hh}:${mm}`;
      const booked = bookings.some(b => b.doctor_id === doctor.id && b.appointment_time === time);
      slots.push({time,available:!booked});
      minutes += 30;
    }
    return {
  ...doctor,
  slots: closedDate
    ? slots.map(slot => ({...slot, available: false}))
    : slots,
  closed: !!closedDate,
  closure_reason: closedDate?.reason || ''
};
  });
}
export async function getDateAvailability(date) {
  const database = await getDB();

  return database.getFirstAsync(
    'SELECT * FROM date_availability WHERE availability_date = ?',
    [date]
  );
}

export async function setDateAvailability(date, status, reason = '') {
  const database = await getDB();

  if (status === 'Available') {
    await database.runAsync(
      'DELETE FROM date_availability WHERE availability_date = ?',
      [date]
    );
    return;
  }

  await database.runAsync(
    `INSERT INTO date_availability
      (availability_date, status, reason)
     VALUES (?, 'Closed', ?)
     ON CONFLICT(availability_date)
     DO UPDATE SET status='Closed', reason=excluded.reason`,
    [date, reason]
  );
}

export async function updateDoctorShift(id, shift) {
  const database = await getDB();

  const shiftTimes = {
    Morning: ['08:00', '12:00'],
    Afternoon: ['13:00', '17:00'],
    Night: ['18:00', '21:00']
  };

  if (!shiftTimes[shift]) {
    throw new Error('Invalid doctor shift.');
  }

  const [start, end] = shiftTimes[shift];

  await database.runAsync(
    `UPDATE doctors
     SET shift=?, start_time=?, end_time=?
     WHERE id=?`,
    [shift, start, end, id]
  );
}

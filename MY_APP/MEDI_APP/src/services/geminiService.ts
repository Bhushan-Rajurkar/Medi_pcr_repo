// Gemini AI Extraction Service for Prescription Processing

export interface ExtractedDoctor {
  clinicName: string;
  doctorNames: string[];
  address: string;
  contactNumber: string;
}

export interface ExtractedPatient {
  name: string;
  age: string;
  gender: string;
  allergies?: string;
  bp?: string;
  heartRate?: string;
  weight?: string;
}

export interface ExtractedMedicine {
  medicineName: string;
  dosage?: string;
  strength?: string;
  frequency?: string;
  status: string;
  mediStatus?: string;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  night: boolean;
  morningTime?: string | null;
  afternoonTime?: string | null;
  eveningTime?: string | null;
  nightTime?: string | null;
  foodInstruction?: string;
  totalQuantity?: number;
  startDate?: string;
  endDate?: string | null;
  noOfDays?: number | null;
}

export interface ExtractedPrescription {
  prescriptionId: string;
  uploadDate: string;
  date: string;
  doctor: ExtractedDoctor;
  patient: ExtractedPatient;
  medicines: ExtractedMedicine[];
}

export interface BackendPrescriptionPayload {
  prescription: {
    prescriptionId?: string;
    uploadDate: string;
    date: string;
    doctor: {
      clinicName?: string;
      doctorNames?: string[];
      address?: string;
      contactNumber?: string;
    };
    patient: {
      name: string;
      age?: string;
      gender?: string;
      Allergies?: string;
      BP?: string;
      HeartRate?: string;
      Weight?: string;
    };
    medicines: Array<{
      medicineName: string;
      status: string;
      mediStatus?: string;
      frequency?: string;
      morning: boolean;
      afternoon: boolean;
      evening: boolean;
      night: boolean;
      morningTime?: string | null;
      afternoonTime?: string | null;
      eveningTime?: string | null;
      nightTime?: string | null;
      foodInstruction?: string;
      totalQuantity?: number;
      startDate: string;
      endDate?: string | null;
    }>;
  };
}

// Gemini API key from environment variable (configure EXPO_PUBLIC_GEMINI_API_KEY in .env)
export const DEFAULT_GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

export const geminiService = {
  async extractPrescription(
    base64Image: string,
    mimeType: string,
    apiKey: string = DEFAULT_GEMINI_KEY
  ): Promise<{ visualData: ExtractedPrescription; backendPayload: BackendPrescriptionPayload }> {
    const activeKey = (apiKey && apiKey.trim()) || DEFAULT_GEMINI_KEY;
    if (!activeKey || !activeKey.trim()) {
      throw new Error('Gemini API key is required');
    }

    const schemaDef = {
      type: 'OBJECT',
      properties: {
        prescriptionid: { type: 'STRING', nullable: true },
        Date: { type: 'STRING' },
        Doctors_Details: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              doctor_name: { type: 'STRING', nullable: true },
              specialization: { type: 'STRING', nullable: true },
              clinic_name: { type: 'STRING', nullable: true },
              address: { type: 'STRING', nullable: true },
              contact: { type: 'STRING', nullable: true },
            },
          },
        },
        Patients_Details: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              patient_name: { type: 'STRING', nullable: true },
              age: { type: 'STRING', nullable: true },
              gender: { type: 'STRING', nullable: true },
              weight: { type: 'STRING', nullable: true },
              bp: { type: 'STRING', nullable: true },
              heartRate: {
                type: 'STRING',
                description: 'If any value that has unit bpm or heart rate, otherwise null.',
                nullable: true,
              },
              allergies: { type: 'STRING', nullable: true },
            },
          },
        },
        Medicines: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              id: { type: 'STRING', nullable: true },
              medicine_name: { type: 'STRING' },
              dosage: { type: 'STRING', nullable: true },
              strength: { type: 'STRING', nullable: true },
              frequency: { type: 'STRING', nullable: true },
              morning: { type: 'BOOLEAN' },
              afternoon: { type: 'BOOLEAN' },
              evening: { type: 'BOOLEAN' },
              night: { type: 'BOOLEAN' },
              morningtime: { type: 'STRING', nullable: true },
              afternoontime: { type: 'STRING', nullable: true },
              eveningtime: { type: 'STRING', nullable: true },
              nighttime: { type: 'STRING', nullable: true },
              food_instruction: { type: 'STRING', nullable: true },
              No_of_days: {
                type: 'INTEGER',
                nullable: true,
                description: 'If no duration is specified, this MUST be null.',
              },
              start_date: {
                type: 'STRING',
                description: 'MUST be extracted and populated. Exactly the same as main prescription Date (YYYY-MM-DD).',
              },
              end_date: {
                type: 'STRING',
                nullable: true,
                description: 'Calculate by adding No_of_days to start_date (YYYY-MM-DD). If No_of_days is null, this MUST be null.',
              },
              status: { type: 'STRING', nullable: true },
            },
          },
        },
      },
    };

    const promptText = `Extract the data from this prescription image. STRICT RULES: 
1. Deduce booleans (morning, afternoon, evening, night) based on frequency using this CRITICAL CUSTOM LOGIC: 
   - RULE A (Mixed): If the frequency contains 'O' or '0' (e.g., '| - O - |' or 'X - O - X'), then 'O' or '0' means TRUE, and '|', '1', or 'X' means FALSE. 
   - RULE B (Lines Only): If the frequency ONLY contains '|' or '1' and NO 'O', '0', or 'X' is present (e.g., '| - | - |' or '| - |'), then consider '|' or '1' as TRUE.
2. You MUST set 'start_date' for EVERY medicine exactly equal to the main prescription 'Date'. Format dates as YYYY-MM-DD.
3. If a duration is explicitly given for a medicine, calculate its 'end_date' and 'No_of_days'. 
4. SYRUPS AND LIQUIDS SPECIAL RULE: If the medicine is a syrup or liquid bottle, set its quantity/dosage to 1. If NO duration is explicitly given for this syrup, you MUST set its 'end_date' to match the LATEST 'end_date' found among all other medicines on this prescription, and calculate 'No_of_days' based on that.
5. For all other normal medicines (tablets/capsules): If no duration is given, you MUST set 'end_date' and 'No_of_days' to null.
6. Times must be standard HH:mm:ss (or null). Do NOT return the string "null", use actual null.`;

    const payload = {
      contents: [
        {
          parts: [
            { text: promptText },
            { inlineData: { mimeType, data: base64Image } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schemaDef,
      },
    };

    // Try primary model and fallbacks if needed
    const candidateModels = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];
    let lastError: any = null;
    let data: any = null;

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey.trim()}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await response.json();
        if (json.error) {
          throw new Error(json.error.message || `Gemini ${model} extraction failed`);
        }

        const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          data = json;
          break; // Success
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Attempt with ${model} failed, trying next candidate:`, err.message);
      }
    }

    if (!data) {
      throw new Error(
        lastError?.message || 'Could not extract prescription. Please check your network connection and image clarity.'
      );
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('No content returned from Gemini');
    }

    // Strip Markdown code fences if returned by model
    let cleanText = rawText.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    let parsed: any;
    try {
      parsed = JSON.parse(cleanText);
    } catch (parseErr: any) {
      throw new Error('Failed to parse Gemini output as JSON: ' + parseErr.message);
    }

    // Sanitize and transform to clean models
    return sanitizeAndTransform(parsed);
  },
};

// Helper to sanitize "null" strings to actual null
function sanitizeNull<T>(val: T): T | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (
      trimmed === '' ||
      trimmed.toLowerCase() === 'null' ||
      trimmed.toLowerCase() === 'none' ||
      trimmed.toLowerCase() === 'n/a' ||
      trimmed.toLowerCase() === 'undefined'
    ) {
      return null;
    }
    return trimmed as unknown as T;
  }
  return val;
}

// Strict Date Sanitizer: ensures YYYY-MM-DD or null (never empty string "")
function sanitizeDate(val: any, fallback?: string): string | null {
  const clean = sanitizeNull(val);
  if (!clean) return fallback ? sanitizeDate(fallback) : null;

  const str = String(clean).trim();

  // Already standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Try standard Date parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return fallback ? sanitizeDate(fallback) : null;
}

// Strict Time Sanitizer: ensures HH:mm:ss or null
function sanitizeTime(val: any, defaultTime?: string): string | null {
  const clean = sanitizeNull(val);
  const target = clean || defaultTime;
  if (!target) return null;

  const str = String(target).trim();

  // HH:mm:ss
  if (/^\d{2}:\d{2}:\d{2}$/.test(str)) {
    return str;
  }

  // HH:mm
  if (/^\d{1,2}:\d{2}$/.test(str)) {
    const parts = str.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1]}:00`;
  }

  // 12-hour AM/PM e.g. "10:00 AM"
  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const min = ampmMatch[2];
    const sec = ampmMatch[3] || '00';
    const isPm = ampmMatch[4].toUpperCase() === 'PM';
    if (isPm && hour < 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${min}:${sec}`;
  }

  return defaultTime || null;
}

function sanitizeAndTransform(raw: any): { visualData: ExtractedPrescription; backendPayload: BackendPrescriptionPayload } {
  const today = new Date().toISOString().split('T')[0];
  const presDate = sanitizeDate(raw.Date, today) || today;
  const presId = sanitizeNull(raw.prescriptionid) || `RX-${Date.now().toString().slice(-6)}`;

  const drRaw = (raw.Doctors_Details && raw.Doctors_Details.length > 0) ? raw.Doctors_Details[0] : {};
  const ptRaw = (raw.Patients_Details && raw.Patients_Details.length > 0) ? raw.Patients_Details[0] : {};

  const doctorName = sanitizeNull(drRaw.doctor_name) || 'Attending Physician';
  const doctor: ExtractedDoctor = {
    clinicName: sanitizeNull(drRaw.clinic_name) || 'Clinical Practice',
    doctorNames: [doctorName],
    address: sanitizeNull(drRaw.address) || 'Clinic Address',
    contactNumber: sanitizeNull(drRaw.contact) || '',
  };

  const patient: ExtractedPatient = {
    name: sanitizeNull(ptRaw.patient_name) || 'Patient',
    age: sanitizeNull(ptRaw.age) || '',
    gender: sanitizeNull(ptRaw.gender) || '',
    allergies: sanitizeNull(ptRaw.allergies) || 'None reported',
    bp: sanitizeNull(ptRaw.bp) || '',
    heartRate: sanitizeNull(ptRaw.heartRate) || '',
    weight: sanitizeNull(ptRaw.weight) || '',
  };

  const rawMeds = Array.isArray(raw.Medicines) ? raw.Medicines : [];
  const medicines: ExtractedMedicine[] = rawMeds.map((m: any) => {
    const medName = sanitizeNull(m.medicine_name) || 'Prescribed Medicine';
    const isMorning = Boolean(m.morning);
    const isAfternoon = Boolean(m.afternoon);
    const isEvening = Boolean(m.evening);
    const isNight = Boolean(m.night);

    const morningTime = isMorning ? sanitizeTime(m.morningtime, '09:00:00') : null;
    const afternoonTime = isAfternoon ? sanitizeTime(m.afternoontime, '14:00:00') : null;
    const eveningTime = isEvening ? sanitizeTime(m.eveningtime, '19:00:00') : null;
    const nightTime = isNight ? sanitizeTime(m.nighttime, '22:00:00') : null;

    let foodInstruction = sanitizeNull(m.food_instruction);
    if (!foodInstruction) {
      foodInstruction = 'AFTER_FOOD';
    }

    const startDate = sanitizeDate(m.start_date, presDate) || presDate;
    let endDate = sanitizeDate(m.end_date);
    const noOfDays = typeof m.No_of_days === 'number' && !isNaN(m.No_of_days) ? m.No_of_days : null;

    // If endDate was not set but noOfDays is specified, calculate endDate accurately
    if (!endDate && noOfDays && noOfDays > 0) {
      const startD = new Date(startDate);
      if (!isNaN(startD.getTime())) {
        startD.setDate(startD.getDate() + noOfDays);
        endDate = startD.toISOString().split('T')[0];
      }
    }

    return {
      medicineName: medName,
      dosage: sanitizeNull(m.dosage) || '1 tablet',
      strength: sanitizeNull(m.strength) || '',
      frequency: sanitizeNull(m.frequency) || '1-0-1',
      status: 'ACTIVE',
      mediStatus: 'PENDING',
      morning: isMorning,
      afternoon: isAfternoon,
      evening: isEvening,
      night: isNight,
      morningTime,
      afternoonTime,
      eveningTime,
      nightTime,
      foodInstruction,
      totalQuantity: noOfDays ? Math.max(noOfDays * 2, 5) : 10,
      startDate,
      endDate,
      noOfDays,
    };
  });

  const visualData: ExtractedPrescription = {
    prescriptionId: presId,
    uploadDate: today,
    date: presDate,
    doctor,
    patient,
    medicines,
  };

  const backendPayload: BackendPrescriptionPayload = {
    prescription: {
      prescriptionId: presId,
      uploadDate: today,
      date: presDate,
      doctor: {
        clinicName: doctor.clinicName,
        doctorNames: doctor.doctorNames,
        address: doctor.address,
        contactNumber: doctor.contactNumber,
      },
      patient: {
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        Allergies: patient.allergies,
        BP: patient.bp,
        HeartRate: patient.heartRate,
        Weight: patient.weight,
      },
      medicines: medicines.map((m) => ({
        medicineName: m.medicineName,
        status: m.status,
        mediStatus: m.mediStatus,
        frequency: m.frequency,
        morning: m.morning,
        afternoon: m.afternoon,
        evening: m.evening,
        night: m.night,
        morningTime: m.morningTime,
        afternoonTime: m.afternoonTime,
        eveningTime: m.eveningTime,
        nightTime: m.nightTime,
        foodInstruction: m.foodInstruction,
        totalQuantity: m.totalQuantity,
        startDate: m.startDate || presDate,
        endDate: m.endDate,
      })),
    },
  };

  return { visualData, backendPayload };
}

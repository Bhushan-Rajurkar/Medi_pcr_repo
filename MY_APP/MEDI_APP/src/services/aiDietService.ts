import { Platform } from 'react-native';
import { DEFAULT_GEMINI_KEY } from './geminiService';

export interface McqOption {
  id: string;
  label: string;
  sublabel?: string;
  icon?: string;
}

export interface McqQuestion {
  id: string;
  questionNumber: number;
  title: string;
  subtitle: string;
  isMultiSelect?: boolean;
  options: McqOption[];
}

export const PREDEFINED_QUESTIONS: McqQuestion[] = [
  {
    id: 'goal',
    questionNumber: 1,
    title: 'What is your primary health & weight goal?',
    subtitle: 'This will determine your daily calorie and macronutrient balance.',
    options: [
      { id: 'gain', label: 'Weight Gain Diet', sublabel: 'Healthy muscle building & caloric surplus with nutrient-dense foods', icon: '🏋️‍♂️' },
      { id: 'loss', label: 'Weight Loss Diet', sublabel: 'Fat loss, high satiety & caloric deficit without starving', icon: '🥗' },
      { id: 'moderate', label: 'Moderate / Maintenance Diet', sublabel: 'Balanced energy, stamina, immunity & overall wellness', icon: '⚖️' },
    ],
  },
  {
    id: 'diet_type',
    questionNumber: 2,
    title: 'What is your dietary preference?',
    subtitle: 'We strictly tailor all meal plans to your dietary lifestyle.',
    options: [
      { id: 'pure_veg', label: 'Pure Vegetarian', sublabel: 'Dairy, lentils, grains, vegetables (No meat, No eggs)', icon: '🥦' },
      { id: 'eggetarian', label: 'Eggetarian', sublabel: 'Vegetarian meals + whole eggs / egg whites for protein', icon: '🥚' },
      { id: 'non_veg', label: 'Non-Vegetarian', sublabel: 'Includes chicken, fish, eggs, and dairy alongside vegetables', icon: '🍗' },
      { id: 'vegan', label: '100% Vegan', sublabel: 'Strictly plant-based (No dairy, no eggs, no animal products)', icon: '🌱' },
    ],
  },
  {
    id: 'health_conditions',
    questionNumber: 3,
    isMultiSelect: true,
    title: 'Do you have any existing health or medical conditions?',
    subtitle: 'Select all that apply. Our AI adjusts glycemic index, sodium, and nutrients accordingly.',
    options: [
      { id: 'none', label: 'None / Generally Healthy', sublabel: 'No diagnosed metabolic or chronic conditions', icon: '✨' },
      { id: 'diabetes', label: 'Diabetes / Prediabetic', sublabel: 'Requires strict blood sugar & low glycemic index control', icon: '🩸' },
      { id: 'hypertension', label: 'Hypertension / High BP', sublabel: 'Requires low-sodium, heart-friendly DASH-style foods', icon: '💓' },
      { id: 'thyroid', label: 'Thyroid (Hypo/Hyper)', sublabel: 'Requires iodine/selenium balance and hormone support', icon: '🦋' },
      { id: 'pcod', label: 'PCOS / PCOD', sublabel: 'Hormone balancing, insulin-friendly, anti-inflammatory', icon: '🌸' },
      { id: 'cholesterol', label: 'High Cholesterol / Heart Health', sublabel: 'Low saturated fat, high soluble fiber foods', icon: '🫀' },
    ],
  },
  {
    id: 'allergies',
    questionNumber: 4,
    isMultiSelect: true,
    title: 'Do you have any food allergies or intolerances?',
    subtitle: 'Select all that apply. We will ensure these ingredients are 100% eliminated from your plan.',
    options: [
      { id: 'none', label: 'No Known Food Allergies', sublabel: 'Can consume all standard ingredients safely', icon: '🛡️' },
      { id: 'lactose', label: 'Lactose / Dairy Intolerance', sublabel: 'No milk, curd, or paneer (plant alternatives used)', icon: '🥛' },
      { id: 'gluten', label: 'Gluten / Wheat Sensitivity', sublabel: 'No wheat/maida (rice, millet, jowar, bajra used)', icon: '🌾' },
      { id: 'nuts', label: 'Peanut / Nut Allergy', sublabel: 'No peanuts, almonds, cashews, or walnuts', icon: '🥜' },
      { id: 'seafood', label: 'Seafood / Shellfish Allergy', sublabel: 'No fish, prawns, or marine products', icon: '🦐' },
      { id: 'jain', label: 'No Onion / No Garlic', sublabel: 'Sattvic / Jain dietary guidelines respected', icon: '🧄' },
    ],
  },
  {
    id: 'avoid',
    questionNumber: 5,
    isMultiSelect: true,
    title: 'What specific foods would you like to strictly avoid?',
    subtitle: 'Select all that apply. We will eliminate them from your grocery list.',
    options: [
      { id: 'fried', label: 'Deep-Fried & Excessively Oily Foods', sublabel: 'Pakoras, samosas, puris, heavy gravies', icon: '🛢️' },
      { id: 'sugar', label: 'Refined Sugar & Commercial Sweets', sublabel: 'Chocolates, mithai, carbonated soft drinks', icon: '🍬' },
      { id: 'spicy', label: 'Excessively Spicy & Acidic Foods', sublabel: 'Prevents acid reflux, gastritis, and heartburn', icon: '🌶️' },
      { id: 'red_meat', label: 'Red Meat & Processed Meats', sublabel: 'Stick to lighter lean protein sources', icon: '🥩' },
      { id: 'maida', label: 'Refined Flour (Maida) & Junk Food', sublabel: 'No white bread, instant noodles, or bakery items', icon: '🍞' },
      { id: 'none', label: 'Nothing in particular', sublabel: 'Moderate consumption of home-cooked varieties is fine', icon: '👍' },
    ],
  },
  {
    id: 'exercise_type',
    questionNumber: 6,
    isMultiSelect: true,
    title: 'What types of exercise & physical activity do you prefer?',
    subtitle: 'Select all that apply. We will build an actionable daily fitness routine matching your choices.',
    options: [
      { id: 'yoga_meditation', label: 'Yoga & Meditation', sublabel: 'Surya Namaskar, stretching, Asanas, Pranayama & mindfulness', icon: '🧘' },
      { id: 'walking', label: 'Walking & Brisk Walking', sublabel: 'Low impact, daily 5,000–10,000 steps for heart & digestion', icon: '🚶' },
      { id: 'running', label: 'Running & Jogging', sublabel: 'Cardio, stamina, endurance, and accelerated calorie burn', icon: '🏃' },
      { id: 'home_workout', label: 'Home Workouts / Bodyweight', sublabel: 'Pushups, squats, lunges, and core exercises without gym gear', icon: '🤸' },
      { id: 'mix', label: 'Balanced Mix (Walking + Yoga + Meditation)', sublabel: 'Holistic physical movement and mental wellness routine', icon: '🌟' },
    ],
  },
  {
    id: 'exercise_time',
    questionNumber: 7,
    title: 'How much time can you dedicate daily to exercise?',
    subtitle: 'Be realistic—consistency matters far more than duration.',
    options: [
      { id: '15_mins', label: '15–20 Minutes Daily', sublabel: 'Quick morning or evening high-efficiency routine', icon: '⚡' },
      { id: '30_mins', label: '30–45 Minutes Daily', sublabel: 'Ideal sweet-spot for sustainable transformation', icon: '⏱️' },
      { id: '60_mins', label: '60+ Minutes Daily', sublabel: 'Dedicated fitness enthusiast with high activity', icon: '🔥' },
      { id: 'sedentary', label: 'Very Limited / Desk Job Movement', sublabel: 'Focus on posture, micro-walks, and gentle stretching', icon: '🪑' },
    ],
  },
  {
    id: 'budget',
    questionNumber: 8,
    title: 'What is your budget & grocery accessibility?',
    subtitle: 'Our AI prioritizes affordable home cooking for normal middle-class households.',
    options: [
      { id: 'middle_class', label: 'Normal Middle-Class Affordable', sublabel: 'Budget-friendly staples: Dal, Roti, Rice, Seasonal Sabzi, Sattu, Besan, Eggs/Paneer, Curd, Chana, Bananas', icon: '💰' },
      { id: 'ultra_budget', label: 'Student / Ultra-Budget Friendly', sublabel: 'Maximum savings using basic pantry items with zero waste', icon: '🪙' },
      { id: 'flexible', label: 'Flexible / Standard', sublabel: 'Can include occasional dry fruits, whey protein, or seeds', icon: '🛒' },
    ],
  },
  {
    id: 'routine',
    questionNumber: 9,
    title: 'What is your typical daily schedule & meal routine?',
    subtitle: 'Helps schedule meal timings so they match your biological clock.',
    options: [
      { id: 'standard', label: 'Standard Daytime Routine', sublabel: 'Wake up 6–7 AM, Lunch 1–2 PM, Dinner by 8–9 PM', icon: '🌅' },
      { id: 'busy_office', label: 'Busy Office / Working Professional', sublabel: 'Requires quick breakfast, tiffin-friendly lunch, easy dinner', icon: '💼' },
      { id: 'late_shift', label: 'Late Night / Night Shift Schedule', sublabel: 'Altered meal timings for irregular working hours', icon: '🌙' },
      { id: 'intermittent', label: 'Intermittent Fasting (16:8)', sublabel: 'Eating window between 12 PM and 8 PM', icon: '⏳' },
    ],
  },
  {
    id: 'age_gender',
    questionNumber: 10,
    title: 'What is your age group & current lifestyle?',
    subtitle: 'Helps calculate metabolic rate and joint-friendly exercise intensity.',
    options: [
      { id: 'young_adult', label: '18–30 Years (Young Adult)', sublabel: 'Higher metabolic potential, active lifestyle', icon: '🧑' },
      { id: 'adult', label: '31–45 Years (Working Adult)', sublabel: 'Focus on stress management, posture & sustained energy', icon: '👨' },
      { id: 'middle_aged', label: '46–59 Years (Mature Adult)', sublabel: 'Focus on metabolic health, joint care & bone density', icon: '🧔' },
      { id: 'senior', label: '60+ Years (Senior)', sublabel: 'Gentle mobility, heart health, easy-to-digest nutrition', icon: '🧓' },
    ],
  },
];

export interface DayDietPlan {
  day: string; // e.g. "Monday"
  earlyMorning: string; // e.g. "Warm Lemon Water + 4 Soaked Almonds"
  breakfast: string; // e.g. "2 Besan Chilla with Mint Chutney"
  midMorning: string; // e.g. "1 Seasonal Fruit or Sprouted Moong"
  lunch: string; // e.g. "2 Phulkas + 1 bowl Moong Dal + Sabzi + Cucumber Salad"
  eveningSnack: string; // e.g. "Roasted Chana + Chaas / Tea"
  dinner: string; // e.g. "Vegetable Khichdi / Dal Soup + Roti"
  bedtime: string; // e.g. "Warm Turmeric Milk"
}

export interface CoreExerciseItem {
  name: string; // e.g. "Surya Namaskar & Yoga Asanas"
  timing: string; // e.g. "6:30 AM - 6:50 AM (Morning)"
  duration: string; // e.g. "15-20 Mins"
  routine: string; // e.g. "5-7 sets Surya Namaskar + Tadasana, Bhujangasana"
  benefits: string; // e.g. "Spine flexibility, joint mobility & core strength"
}

export interface DayExercisePlan {
  day: string; // e.g. "Monday"
  timing: string; // e.g. "6:30 AM - 7:00 AM (Morning)"
  exerciseType: string; // e.g. "Yoga & Brisk Walking"
  routineDetails: string; // e.g. "20 mins Brisk Walk + Surya Namaskar (5 sets) + 5 mins Anulom Vilom"
  benefits: string; // e.g. "Cardiovascular stamina & joint mobility"
}

export interface StructuredDietPlanResult {
  category: 'GAIN DIET' | 'LOSS DIET' | 'MODERATE DIET';
  summary: string;
  weeklyDiet: DayDietPlan[];
  exercises: CoreExerciseItem[]; // exactly 3-4 exercises with meditation and yoga
  weeklyExercise?: DayExercisePlan[];
  avoidList: string[];
  hydrationAndTips: string[];
  rawText?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  isQuestion?: boolean;
  questionIndex?: number;
  isDietPlan?: boolean;
  planData?: StructuredDietPlanResult;
  dietCategory?: 'GAIN DIET' | 'LOSS DIET' | 'MODERATE DIET';
  timestamp: number;
}

class AiDietService {
  private getApiKey(): string {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage) {
          const stored = window.localStorage.getItem('medi_pcr_gemini_api_key');
          if (stored && stored.trim()) return stored.trim();
        }
      } catch {
        // Ignore localStorage errors on restricted environments
      }
    }
    return DEFAULT_GEMINI_KEY;
  }

  /**
   * Generates a structured 7-Day Diet Plan (table only) and exactly 3-4 daily exercises
   * with yoga and meditation with specific timings.
   */
  public async generateDietPlan(
    answers: Record<string, string>,
    apiKeyOverride?: string
  ): Promise<StructuredDietPlanResult> {
    const apiKey = (apiKeyOverride || this.getApiKey()).trim();
    if (!apiKey) {
      throw new Error('Gemini API key is required. Please check your settings.');
    }

    // Determine diet classification
    let category: 'GAIN DIET' | 'LOSS DIET' | 'MODERATE DIET' = 'MODERATE DIET';
    const goalAnswer = (answers['goal'] || '').toLowerCase();
    if (goalAnswer.includes('gain')) {
      category = 'GAIN DIET';
    } else if (goalAnswer.includes('loss')) {
      category = 'LOSS DIET';
    } else {
      category = 'MODERATE DIET';
    }

    const promptText = `
You are an expert Clinical Nutritionist and Yoga/Fitness Coach.
Generate a structured, easy-to-understand **7-DAY WEEKLY DIET PLAN (TABLE ONLY)** and **ONLY 3-4 DAILY EXERCISES WITH YOGA & MEDITATION** with exact timings for a patient.
Avoid long descriptive text or essays. Keep food items simple, healthy, and middle-class affordable (Dal, Roti, Rice, Sattu, Besan, Eggs/Paneer, Curd, Chana, Seasonal Sabzi, Bananas).

PATIENT PROFILE:
- Goal: ${answers['goal'] || 'General'} -> CLASSIFICATION: ${category}
- Dietary Preference: ${answers['diet_type'] || 'Vegetarian'}
- Medical Conditions: ${answers['health_conditions'] || 'None'}
- Allergies: ${answers['allergies'] || 'None'}
- Strict Avoidance: ${answers['avoid'] || 'None'}
- Exercise Choices: ${answers['exercise_type'] || 'Yoga, Walking, Meditation'}
- Available Daily Time: ${answers['exercise_time'] || '30 mins'}
- Budget: ${answers['budget'] || 'Normal Middle-Class Affordable'}
- Routine: ${answers['routine'] || 'Standard Daytime'}
- Age: ${answers['age_gender'] || 'Adult'}

MANDATORY OUTPUT FORMAT:
You must return a strictly valid JSON object matching this exact schema:
{
  "category": "${category}",
  "summary": "1-2 brief sentences summarizing this 7-day diet and yoga/meditation plan.",
  "weeklyDiet": [
    {
      "day": "Monday",
      "earlyMorning": "Warm Lemon Water + 4 Soaked Almonds",
      "breakfast": "2 Besan Chilla with Mint Chutney",
      "midMorning": "1 Seasonal Fruit (Papaya/Guava)",
      "lunch": "2 Phulkas + 1 bowl Moong Dal + Bhindi Sabzi + Curd",
      "eveningSnack": "Roasted Chana + 1 cup Chaas / Green Tea",
      "dinner": "Vegetable Khichdi with 1 tsp Ghee + Mixed Salad",
      "bedtime": "Warm Turmeric Milk"
    },
    { "day": "Tuesday", ... },
    { "day": "Wednesday", ... },
    { "day": "Thursday", ... },
    { "day": "Friday", ... },
    { "day": "Saturday", ... },
    { "day": "Sunday", ... }
  ],
  "exercises": [
    {
      "name": "Surya Namaskar & Yoga Asanas",
      "timing": "6:30 AM - 6:50 AM (Morning)",
      "duration": "15-20 Mins",
      "routine": "5-7 rounds of Surya Namaskar + Tadasana, Bhujangasana & Vrikshasana",
      "benefits": "Spine flexibility, joint mobility & core strength"
    },
    {
      "name": "Brisk Walking / Light Jogging",
      "timing": "6:50 AM - 7:15 AM or Evening 5:30 PM",
      "duration": "20-25 Mins",
      "routine": "Continuous brisk walk (3,000-4,000 steps) with steady posture",
      "benefits": "Cardiovascular stamina, healthy blood pressure & metabolic rate"
    },
    {
      "name": "Pranayama (Breathing Exercises)",
      "timing": "7:15 AM - 7:25 AM",
      "duration": "10 Mins",
      "routine": "5 mins Anulom Vilom (Alternate Nostril) + 5 mins Kapalbhati",
      "benefits": "Lung capacity expansion, oxygenation & nervous system calm"
    },
    {
      "name": "Mindfulness Meditation & Relaxation",
      "timing": "9:30 PM - 9:45 PM (Bedtime) or 7:25 AM",
      "duration": "10-15 Mins",
      "routine": "Silent breath observation, box breathing (4-4-4-4) & Shavasana",
      "benefits": "Lowers cortisol/stress, mental clarity & ensures deep restful sleep"
    }
  ],
  "avoidList": [
    "Deep-fried snacks (Samosas, Pakoras, Puris, commercial Bhujia)",
    "Refined white sugar, packaged juices, sodas, and synthetic syrups",
    "Refined flour (Maida) bakery items and instant noodles"
  ],
  "hydrationAndTips": [
    "Drink at least 2.5 to 3.5 Liters of clean water daily",
    "Finish dinner at least 2 hours before bedtime",
    "Maintain consistent sleep schedule (7-8 hours)"
  ]
}

Ensure all 7 days (Monday through Sunday) are fully populated in weeklyDiet. Keep meal items and exercise instructions concise (under 10 words each) so the output fits cleanly.
`;

    const payload = {
      contents: [
        {
          parts: [{ text: promptText }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 8192,
      },
    };

    const models = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];
    let lastError: any = null;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error.message || `Gemini ${model} request failed`);
        }

        const candidate = data.candidates?.[0];
        if (candidate?.finishReason === 'MAX_TOKENS') {
          throw new Error(`Gemini ${model} response was truncated by token limit.`);
        }

        const generatedText = candidate?.content?.parts?.[0]?.text;
        if (!generatedText) {
          throw new Error('No diet plan was returned from the AI model.');
        }

        // Clean any accidental markdown json fencing or outside text
        let cleanJson = generatedText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        const firstBrace = cleanJson.indexOf('{');
        const lastBrace = cleanJson.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleanJson = cleanJson.slice(firstBrace, lastBrace + 1);
        }

        const parsed: StructuredDietPlanResult = JSON.parse(cleanJson);
        parsed.category = category;
        parsed.rawText = generatedText;
        return parsed;
      } catch (err: any) {
        lastError = err;
        console.warn(`[aiDietService] Model ${model} notice:`, err.message);
      }
    }

    console.warn('[aiDietService] Falling back to structured local clinical plan generator:', lastError?.message);
    return this.generateFallbackStructuredPlan(answers, category);
  }

  /**
   * Generates a high-quality, customized middle-class 7-Day Diet & Exercise Plan
   * as a local fallback if Gemini is unreachable or rate-limited.
   */
  public generateFallbackStructuredPlan(
    answers: Record<string, string>,
    category: 'GAIN DIET' | 'LOSS DIET' | 'MODERATE DIET'
  ): StructuredDietPlanResult {
    const isNonVeg = (answers['diet_type'] || '').toLowerCase().includes('non-veg');
    const isEggetarian = (answers['diet_type'] || '').toLowerCase().includes('eggetarian');
    const isVegan = (answers['diet_type'] || '').toLowerCase().includes('vegan');
    const exerciseChoice = (answers['exercise_type'] || '').toLowerCase();
    const isOffice = (answers['routine'] || '').toLowerCase().includes('office');

    // 7 Days Meal Schedule
    const weeklyDiet: DayDietPlan[] = [
      {
        day: 'Monday',
        earlyMorning: 'Warm Lemon Water + 4 Soaked Almonds + 2 Walnuts',
        breakfast: isNonVeg || isEggetarian
          ? '2 Boiled Eggs + 2 Whole Wheat Toasts / Phulkas + Green Tea'
          : '2 Besan Chilla with Grated Paneer + Mint Chutney',
        midMorning: '1 Seasonal Fruit (Apple/Guava) or 1 glass Chaas',
        lunch: isNonVeg
          ? '2 Phulkas + 100g Grilled / Stewed Chicken + Cucumber Salad'
          : '2 Phulkas + 1 bowl Moong Dal + Bhindi/Lauki Sabzi + Curd',
        eveningSnack: 'Roasted Chana (1 cup) + Warm Spiced Green Tea',
        dinner: 'Vegetable Khichdi with Mixed Veggies & 1 tsp Ghee + Papadam',
        bedtime: isVegan ? 'Warm Almond Milk with Cinnamon' : 'Warm Turmeric Milk (Haldi Doodh)',
      },
      {
        day: 'Tuesday',
        earlyMorning: '1 glass Soaked Methi Water + 1 Banana',
        breakfast: 'Vegetable Poha / Upma with Peanuts & Peas + 1 cup Curd / Tea',
        midMorning: '1 bowl Sprouted Moong Salad with Lemon & Black Salt',
        lunch: isNonVeg
          ? 'Steamed Rice + 1 bowl Fish Curry or Dal + Cabbage Poriyal'
          : '2 Multigrain Rotis + 1 bowl Chana Masala + Mixed Salad',
        eveningSnack: 'Roasted Makhana (Fox nuts) with pinch of Pepper',
        dinner: '2 Phulkas + 1 bowl Palak Paneer / Tofu + Clear Veg Soup',
        bedtime: isVegan ? 'Warm Jeera Water' : 'Warm Turmeric Milk with pinch of Nutmeg',
      },
      {
        day: 'Wednesday',
        earlyMorning: 'Warm Water with 1 tsp Chia Seeds + 4 Almonds',
        breakfast: isNonVeg || isEggetarian
          ? '2-Egg Omelette with Veggies + 1 Multigrain Roti'
          : '2 Moong Dal Cheelas + Tomato Mint Chutney',
        midMorning: '1 bowl Fresh Papaya or Watermelon slices',
        lunch: '2 Phulkas + 1 bowl Yellow Arhar Dal + Seasonal Gobhi/Carrot Sabzi + Curd',
        eveningSnack: '1 glass Sattu Sharbat (Namkeen with roasted jeera)',
        dinner: '1 bowl Dalia with sauteed veggies + 1 bowl Green Salad',
        bedtime: isVegan ? 'Warm Chamomile Tea' : 'Warm Milk with 2 cardamoms',
      },
      {
        day: 'Thursday',
        earlyMorning: '1 glass Warm Cinnamon Infused Water + 2 Figs (Anjeer)',
        breakfast: '1 bowl Vegetable Oats Porridge with Roasted Flax Seeds',
        midMorning: '1 glass Buttermilk (Chaas) with Coriander and Ginger',
        lunch: isNonVeg
          ? '2 Phulkas + 1 bowl Chicken Curry + Radish & Onion Salad'
          : '2 Phulkas + 1 bowl Rajma + 1 bowl Green Beans Sabzi + Salad',
        eveningSnack: 'Boiled Sweet Corn / Peanuts with Lime & Chaat Masala',
        dinner: '2 Soft Phulkas + 1 bowl Lauki Chana Dal + Cucumber Raita',
        bedtime: isVegan ? 'Warm Ginger Water' : 'Warm Turmeric Milk',
      },
      {
        day: 'Friday',
        earlyMorning: 'Warm Lemon Water + 5 Soaked Munakka / Raisins',
        breakfast: isNonVeg || isEggetarian
          ? 'Egg Bhurji (2 Eggs) + 2 Phulkas + Mint Tea'
          : '2 Paneer / Tofu Stuffed Phulkas with Mint Raita',
        midMorning: '1 Seasonal Orange or Sweet Lime (Mosambi)',
        lunch: 'Steamed Rice + 1 bowl Sambar + Seasonal Beans Sabzi + Curd',
        eveningSnack: 'Roasted Chana + 1 cup Black Coffee or Lemon Tea',
        dinner: 'Mixed Vegetable Soup + 2 Phulkas + 1 bowl Dal Tadka',
        bedtime: isVegan ? 'Warm Clove Water' : 'Warm Milk with pinch of Cinnamon',
      },
      {
        day: 'Saturday',
        earlyMorning: '1 glass Jeera-Ajwain Infused Warm Water',
        breakfast: '2 Idlis or 1 bowl Sprout Chaat with Coconut Chutney',
        midMorning: 'Handful Roasted Peanuts / Almonds + 1 Fruit',
        lunch: isNonVeg
          ? '2 Rotis + 1 bowl Egg Curry (2 eggs) + Tomato Salad'
          : '2 Phulkas + 1 bowl Black Gram (Kala Chana) + Steamed Rice (1 small cup)',
        eveningSnack: '1 cup Puffed Rice (Bhel with raw veggies, no oily sev)',
        dinner: 'Vegetable Oats Khichdi / Quinoa with 1 bowl Cucumber Raita',
        bedtime: isVegan ? 'Warm Mint Tea' : 'Warm Turmeric Milk',
      },
      {
        day: 'Sunday (Active Reset)',
        earlyMorning: 'Warm Lemon Honey Water + 4 Soaked Almonds',
        breakfast: 'Vegetable Methi Thepla / Paratha (Light oil) + Fresh Curd',
        midMorning: '1 Tender Coconut Water or Fresh Seasonal Fruit',
        lunch: isNonVeg
          ? 'Sundays Special: Lean Grilled Chicken/Fish + Brown Rice + Salad'
          : '2 Phulkas + 1 bowl Mixed Dal Makhani (Home-style light) + Paneer Bhurji',
        eveningSnack: 'Roasted Makhana + 1 cup Herbal Green Tea',
        dinner: 'Light Dinner: Clear Moong Dal Soup + 1 Roti + Grilled Veggies',
        bedtime: isVegan ? 'Warm Fennel (Saunf) Tea' : 'Warm Turmeric Milk',
      },
    ];

    // Focused 3-4 Daily Exercises with Yoga and Meditation
    const morningTiming = isOffice ? '6:15 AM - 6:50 AM (Morning)' : '6:30 AM - 7:00 AM (Morning)';
    const eveningTiming = '5:30 PM - 6:00 PM (Evening)';

    const exercises: CoreExerciseItem[] = [
      {
        name: 'Surya Namaskar & Yoga Asanas',
        timing: '6:30 AM - 6:50 AM (Morning)',
        duration: '20 Mins',
        routine: '5-7 rounds of Surya Namaskar + Tadasana, Bhujangasana, Vrikshasana, Paschimottanasana',
        benefits: 'Spine flexibility, joint mobility, core strength & stress reduction',
      },
      {
        name: 'Brisk Walking / Light Jogging',
        timing: '6:50 AM - 7:20 AM (Morning) or Evening 6:00 PM - 6:30 PM',
        duration: '30 Mins',
        routine: 'Continuous brisk walk (4,000-5,000 steps) with steady posture',
        benefits: 'Cardiovascular stamina, healthy blood pressure & metabolic rate',
      },
      {
        name: 'Pranayama (Breathing Exercises)',
        timing: '7:20 AM - 7:35 AM (After walk/yoga)',
        duration: '15 Mins',
        routine: '5 mins Anulom Vilom + 5 mins Kapalbhati + 5 mins Bhramari',
        benefits: 'Lung capacity expansion, oxygenation, nervous system calm & BP regulation',
      },
      {
        name: 'Mindfulness Meditation & Relaxation',
        timing: '9:30 PM - 9:45 PM (Bedtime)',
        duration: '15 Mins',
        routine: 'Silent breath observation, body scan & Shavasana',
        benefits: 'Lowers cortisol/stress, mental clarity & ensures deep restful sleep',
      },
    ];

    const avoidList = [
      'Deep-fried snacks (Samosas, Pakoras, Puris, commercial Bhujia)',
      'Refined white sugar, packaged juices, sodas, and synthetic syrups',
      'Refined flour (Maida) bakery products, white sandwich bread, instant noodles',
      'Heavy hydrogenated oils (Vanaspati, Dalda) and excessive table salt',
      'Late-night midnight snacking after 9:30 PM',
    ];

    const hydrationAndTips = [
      'Drink 2.5 to 3.5 Liters of water evenly across the day (keep a marked water bottle)',
      'Consume whole seasonal fruits instead of packaged fruit juices for high satiety fiber',
      'Maintain at least 2 to 2.5 hours gap between your dinner and bedtime',
      'Walk 100 paces (Shatapawali) after dinner to stimulate digestion and avoid acid reflux',
      'Prioritize 7 to 8 hours of uninterrupted restful sleep every night',
    ];

    return {
      category,
      summary: `Tailored 7-day ${category.toLowerCase()} prioritizing affordable middle-class staples, balanced protein, and 4 daily yoga & meditation exercises.`,
      weeklyDiet,
      exercises,
      avoidList,
      hydrationAndTips,
    };
  }

  /**
   * Generates a clean, professional, clinical HTML document formatted with tables
   * ready for printing or saving as PDF on any device.
   */
  public generatePlanPdfHtml(plan: StructuredDietPlanResult, patientName?: string): string {
    const categoryColors = {
      'GAIN DIET': { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
      'LOSS DIET': { bg: '#FFF7ED', text: '#9A3412', border: '#FED7AA' },
      'MODERATE DIET': { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
    };

    const catStyle = categoryColors[plan.category] || categoryColors['MODERATE DIET'];

    // Generate Diet Table Rows
    const dietRowsHtml = (plan.weeklyDiet || [])
      .map(
        (row, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
          <td style="font-weight: 700; color: #0F172A; white-space: nowrap; padding: 10px 8px; border: 1px solid #CBD5E1;">${row.day}</td>
          <td style="padding: 10px 8px; border: 1px solid #CBD5E1;">${row.earlyMorning || '-'}</td>
          <td style="padding: 10px 8px; border: 1px solid #CBD5E1;">${row.breakfast || '-'}</td>
          <td style="padding: 10px 8px; border: 1px solid #CBD5E1;">${row.midMorning || '-'}</td>
          <td style="padding: 10px 8px; border: 1px solid #CBD5E1; font-weight: 600;">${row.lunch || '-'}</td>
          <td style="padding: 10px 8px; border: 1px solid #CBD5E1;">${row.eveningSnack || '-'}</td>
          <td style="padding: 10px 8px; border: 1px solid #CBD5E1; font-weight: 600;">${row.dinner || '-'}</td>
          <td style="padding: 10px 8px; border: 1px solid #CBD5E1;">${row.bedtime || '-'}</td>
        </tr>
      `
      )
      .join('');

    // Focused 3-4 Daily Exercises with Yoga and Meditation
    const coreExercises: CoreExerciseItem[] =
      plan.exercises && plan.exercises.length > 0
        ? plan.exercises
        : [
            {
              name: 'Surya Namaskar & Yoga Asanas',
              timing: '6:30 AM - 6:50 AM (Morning)',
              duration: '15-20 Mins',
              routine: '5-7 rounds of Surya Namaskar + Tadasana, Bhujangasana (Cobra), and Vrikshasana (Tree Pose)',
              benefits: 'Enhances full-body flexibility, activates metabolism, tones core and lubricates joints',
            },
            {
              name: 'Brisk Walking / Light Jogging',
              timing: '6:50 AM - 7:15 AM or Evening 5:30 PM - 6:00 PM',
              duration: '20-25 Mins',
              routine: 'Continuous brisk walk (3,000-4,000 steps) at steady pace with upright posture',
              benefits: 'Cardiovascular heart conditioning, healthy blood circulation and active calorie burn',
            },
            {
              name: 'Pranayama (Deep Yogic Breathing)',
              timing: '7:15 AM - 7:25 AM (Post-Walk or Morning)',
              duration: '10 Mins',
              routine: '5 mins Anulom Vilom (Alternate Nostril) + 5 mins gentle Kapalbhati',
              benefits: 'Increases vital lung capacity, oxygenates bloodstream and balances nervous system',
            },
            {
              name: 'Mindfulness Meditation & Relaxation',
              timing: '9:30 PM - 9:45 PM (Bedtime) or Morning',
              duration: '10-15 Mins',
              routine: 'Silent breath observation, 4-4-4-4 box breathing & full-body Shavasana relaxation',
              benefits: 'Lowers cortisol/stress, calms mental chatter, ensures deep restorative sleep',
            },
          ];

    // Generate Exercise Table Rows (Only 3-4 Focused Exercises with Yoga & Meditation)
    const exerciseRowsHtml = coreExercises
      .map(
        (ex, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
          <td style="font-weight: 700; color: #0284C7; text-align: center; border: 1px solid #CBD5E1; padding: 10px 8px;">${idx + 1}</td>
          <td style="font-weight: 700; color: #0F172A; border: 1px solid #CBD5E1; padding: 10px 8px;">${ex.name}</td>
          <td style="padding: 10px 8px; border: 1px solid #CBD5E1; color: #0284C7; font-weight: 700; white-space: nowrap;">${ex.timing}<br/><span style="color:#64748B; font-weight:600; font-size:10px;">⏱️ ${ex.duration}</span></td>
          <td style="padding: 10px 8px; border: 1px solid #CBD5E1;">${ex.routine}</td>
          <td style="padding: 10px 8px; border: 1px solid #CBD5E1; color: #16A34A; font-weight: 600;">${ex.benefits}</td>
        </tr>
      `
      )
      .join('');

    const avoidListHtml = (plan.avoidList || [])
      .map((item) => `<li style="margin-bottom: 6px; color: #DC2626; font-weight: 500;">🚫 ${item}</li>`)
      .join('');

    const tipsListHtml = (plan.hydrationAndTips || [])
      .map((item) => `<li style="margin-bottom: 6px; color: #0284C7; font-weight: 500;">💧 ${item}</li>`)
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Medi-AI 7-Day Diet & Exercise Plan - ${plan.category}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #1E293B;
      margin: 0;
      padding: 15px;
      font-size: 11px;
      line-height: 1.4;
      background: #FFFFFF;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0284C7;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #0284C7;
      margin: 0;
    }
    .brand-sub {
      font-size: 11px;
      color: #64748B;
      margin-top: 2px;
    }
    .badge-box {
      background-color: ${catStyle.bg};
      border: 1px solid ${catStyle.border};
      color: ${catStyle.text};
      padding: 6px 14px;
      border-radius: 6px;
      text-align: right;
    }
    .badge-title {
      font-size: 13px;
      font-weight: 800;
    }
    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #0F172A;
      margin: 14px 0 6px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    th {
      background-color: #0F172A;
      color: #FFFFFF;
      font-weight: 700;
      text-align: left;
      padding: 8px;
      font-size: 11px;
      border: 1px solid #334155;
    }
    .guidelines-grid {
      display: flex;
      gap: 15px;
      margin-top: 10px;
      page-break-inside: avoid;
    }
    .guideline-card {
      flex: 1;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 10px 14px;
      background-color: #F8FAFC;
    }
    .guideline-title {
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    ul {
      margin: 0;
      padding-left: 18px;
    }
    .footer {
      margin-top: 15px;
      padding-top: 8px;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      color: #64748B;
      font-size: 10px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header-bar">
    <div>
      <h1 class="brand-title">Medi-PCR Clinical Health • 7-Day Diet & Workout Plan</h1>
      <div class="brand-sub">Affordable Middle-Class Household Nutrition • Formulated by Medi-AI with Gemini 2.5 Flash</div>
    </div>
    <div class="badge-box">
      <div class="badge-title">🎯 ${plan.category}</div>
      <div style="font-size: 10px; color: #475569;">${patientName ? 'Patient: ' + patientName : 'Personalized Schedule'}</div>
    </div>
  </div>

  <div style="background: #F1F5F9; padding: 6px 12px; border-radius: 4px; margin-bottom: 12px; font-size: 11px; color: #334155;">
    <strong>Summary:</strong> ${plan.summary || 'Customized 7-day clinical nutrition and daily fitness schedule.'}
  </div>

  <!-- TABLE 1: WEEKLY DIET PLAN -->
  <div class="section-title">🍽️ TABLE 1: 7-DAY WEEKLY MEAL SCHEDULE (FOOD ITEMS & TIMINGS)</div>
  <table>
    <thead>
      <tr>
        <th style="width: 8%;">Day</th>
        <th style="width: 13%;">🌅 Early Morning<br/><span style="font-size: 9px; font-weight: 400; opacity: 0.8;">6:30 - 7:00 AM</span></th>
        <th style="width: 14%;">🥣 Breakfast<br/><span style="font-size: 9px; font-weight: 400; opacity: 0.8;">8:00 - 8:30 AM</span></th>
        <th style="width: 13%;">🍎 Mid-Morning<br/><span style="font-size: 9px; font-weight: 400; opacity: 0.8;">11:00 - 11:30 AM</span></th>
        <th style="width: 16%;">🍛 Lunch<br/><span style="font-size: 9px; font-weight: 400; opacity: 0.8;">1:00 - 1:30 PM</span></th>
        <th style="width: 12%;">☕ Evening Snack<br/><span style="font-size: 9px; font-weight: 400; opacity: 0.8;">5:00 - 5:30 PM</span></th>
        <th style="width: 14%;">🍲 Dinner<br/><span style="font-size: 9px; font-weight: 400; opacity: 0.8;">8:00 - 8:30 PM</span></th>
        <th style="width: 10%;">🥛 Bedtime<br/><span style="font-size: 9px; font-weight: 400; opacity: 0.8;">10:00 PM</span></th>
      </tr>
    </thead>
    <tbody>
      ${dietRowsHtml}
    </tbody>
  </table>

  <!-- TABLE 2: DAILY EXERCISES WITH YOGA & MEDITATION (3-4 FOCUS ROUTINES) -->
  <div class="section-title">🧘 TABLE 2: DAILY EXERCISES WITH YOGA & MEDITATION (WITH EXACT TIMINGS)</div>
  <table>
    <thead>
      <tr>
        <th style="width: 5%; text-align: center;">#</th>
        <th style="width: 25%;">Exercise / Yoga Routine</th>
        <th style="width: 20%;">⏰ Timings & Duration</th>
        <th style="width: 30%;">Specific Routine Steps</th>
        <th style="width: 20%;">Primary Health Benefit</th>
      </tr>
    </thead>
    <tbody>
      ${exerciseRowsHtml}
    </tbody>
  </table>

  <!-- TABLE 3 / BOXES: FOODS TO AVOID & HYDRATION -->
  <div class="guidelines-grid">
    <div class="guideline-card" style="border-left: 4px solid #DC2626;">
      <div class="guideline-title" style="color: #DC2626;">🚫 Foods to Strictly Avoid</div>
      <ul>
        ${avoidListHtml}
      </ul>
    </div>
    <div class="guideline-card" style="border-left: 4px solid #0284C7;">
      <div class="guideline-title" style="color: #0284C7;">💧 Daily Hydration & Lifestyle Rules</div>
      <ul>
        ${tipsListHtml}
      </ul>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>Medi-PCR Healthcare Management System • AI Clinical Nutrition Module</div>
    <div>Disclaimer: Please consult your doctor before modifying medication or prescription treatments.</div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
    `;
  }


  /**
   * Continuous conversational chat for follow-up questions
   * (e.g. substitutions, exercise modifications, ingredient alternatives)
   */
  public async sendFollowUpQuestion(
    history: Array<{ role: 'user' | 'model'; text: string }>,
    userQuestion: string,
    apiKeyOverride?: string
  ): Promise<string> {
    const apiKey = (apiKeyOverride || this.getApiKey()).trim();
    if (!apiKey) {
      throw new Error('Gemini API key is required.');
    }

    // Build conversation context
    const contents = history.map((item) => ({
      role: item.role === 'model' ? 'model' : 'user',
      parts: [{ text: item.text }],
    }));

    contents.push({
      role: 'user',
      parts: [
        {
          text: `You are a helpful Clinical Nutritionist and Fitness Trainer assisting a patient who already has an affordable, middle-class Indian diet and exercise plan. Answer their question concisely, practically, and empathetically:\n\n${userQuestion}`,
        },
      ],
    });

    const payload = {
      contents,
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 1200,
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || 'Gemini chat response failed');
    }

    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!answer) {
      throw new Error('No response returned from Gemini.');
    }

    return answer;
  }
}

export const aiDietService = new AiDietService();

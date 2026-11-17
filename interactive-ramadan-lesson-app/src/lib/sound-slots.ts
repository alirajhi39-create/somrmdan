/** خانات الأصوات التي يمكن للمعلم تخصيصها (رفع/تسجيل/حذف) */
export interface SoundSlot {
  key: string;
  group: "effects" | "narration";
  label: string;
  hint: string;
}

export const MAX_SOUND_BYTES = 2.5 * 1024 * 1024; // 2.5 MB

export function narrationSlotKey(stationKey: string): string {
  return `tts-${stationKey}`;
}

export const SOUND_SLOTS: SoundSlot[] = [
  { key: "fx-correct", group: "effects", label: "صوت الإجابة الصحيحة", hint: "يُشغَّل عند كل إجابة صحيحة بدل النغمة الافتراضية" },
  { key: "fx-wrong", group: "effects", label: "صوت الإجابة الخاطئة", hint: "يُشغَّل عند الإجابة الخاطئة (يُفضَّل صوت لطيف)" },
  { key: "fx-complete", group: "effects", label: "صوت إتمام الرحلة", hint: "يُشغَّل عند إنهاء المحطات الاثنتي عشرة" },
  { key: narrationSlotKey("ramadan-month"), group: "narration", label: "مقدمة شهر رمضان (المحطة 1)", hint: "زر «استمع» في المحطة الأولى" },
  { key: narrationSlotKey("meaning"), group: "narration", label: "معنى الصوم (المحطة 2)", hint: "قراءة تعريف الصوم" },
  { key: narrationSlotKey("evidence"), group: "narration", label: "تلاوة آية وجوب الصيام (المحطة 5)", hint: "يُفضَّل تلاوة مجوَّدة للآية 183 من سورة البقرة" },
  { key: narrationSlotKey("virtue"), group: "narration", label: "حديث فضل الصوم (المحطة 8)", hint: "قراءة الحديث الشريف مع ضبط الحركات" },
  { key: narrationSlotKey("sincerity"), group: "narration", label: "الإخلاص والمتابعة + الإضاءة (المحطة 10)", hint: "قراءة شرطي قبول العبادة والإضاءة" },
];

export const SOUND_SLOT_KEYS = new Set(SOUND_SLOTS.map((s) => s.key));

export interface SoundInfo {
  key: string;
  filename: string;
  mime: string;
  size: number;
  updatedAt: string;
}

export function soundUrl(info: SoundInfo): string {
  return `/api/sounds/${encodeURIComponent(info.key)}?v=${encodeURIComponent(info.updatedAt)}`;
}

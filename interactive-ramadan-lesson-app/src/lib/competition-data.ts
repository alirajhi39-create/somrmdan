import { STATIONS, type McqQuestion } from "@/lib/lesson-data";

export interface CompetitionQuestion extends McqQuestion {
  /** لا تُخلط الخيارات (صح/خطأ) */
  fixedOrder?: boolean;
}

const EXTRA_QUESTIONS: CompetitionQuestion[] = [
  {
    prompt: "مَا مَعْنَى (احْتِسَابًا) فِي حَدِيثِ فَضْلِ الصَّوْمِ؟",
    options: ["طَلَبًا لِلأَجْرِ وَالثَّوَابِ مِنَ اللَّهِ", "عَدًّا لِأَيَّامِ الشَّهْرِ", "خَوْفًا مِنْ كَلَامِ النَّاسِ"],
    answer: 0,
    explain: "احْتِسَابًا: طَلَبًا لِلأَجْرِ وَالثَّوَابِ مِنَ اللَّهِ تَعَالَى.",
  },
  {
    prompt: "مَاذَا يَحْدُثُ لِأَبْوَابِ الْجَنَّةِ فِي شَهْرِ رَمَضَانَ؟",
    options: ["تُفْتَحُ", "تُغْلَقُ", "لَا تَتَغَيَّرُ"],
    answer: 0,
    explain: "فِي رَمَضَانَ تُفْتَحُ أَبْوَابُ الْجَنَّةِ وَتُغْلَقُ أَبْوَابُ النَّارِ.",
  },
  {
    prompt: "مَنْ صَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا ...",
    options: ["غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ", "أُعْطِيَ مَالًا كَثِيرًا", "لَمْ يَنَلْ شَيْئًا"],
    answer: 0,
    explain: "قَالَ ﷺ: «مَنْ صَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ».",
  },
  {
    prompt: "مَا الَّذِي يَتْرُكُهُ الصَّائِمُ فِي نَهَارِ رَمَضَانَ؟",
    options: ["الطَّعَامَ وَالشَّرَابَ وَالْمُفْطِرَاتِ", "الصَّلَاةَ", "الْكَلَامَ مَعَ أَهْلِهِ"],
    answer: 0,
    explain: "الصَّوْمُ: تَرْكُ الطَّعَامِ وَالشَّرَابِ وَغَيْرِهِمَا مِنَ المُفْطِرَاتِ.",
  },
];

function buildQuestions(): CompetitionQuestion[] {
  const mcq: CompetitionQuestion[] = [];
  const trueFalse: CompetitionQuestion[] = [];
  for (const station of STATIONS) {
    if (station.type === "mcq") {
      mcq.push(...station.questions.map((q) => ({ ...q, options: [...q.options] })));
    }
    if (station.type === "truefalse") {
      trueFalse.push(
        ...station.statements.map((s) => ({
          prompt: `صَحٌّ أَمْ خَطَأٌ: ${s.text}`,
          options: ["✅ صَحّ", "❌ خَطَأ"],
          answer: s.answer ? 0 : 1,
          explain: s.explain,
          fixedOrder: true,
        })),
      );
    }
  }
  return [...mcq, ...EXTRA_QUESTIONS, ...trueFalse];
}

export const COMPETITION_QUESTIONS: CompetitionQuestion[] = buildQuestions();
export const TOTAL_COMPETITION_QUESTIONS = COMPETITION_QUESTIONS.length;

/** مولّد أرقام عشوائية ثابت البذرة حتى تتطابق الخيارات بين السبورة وأجهزة الطلاب */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ResolvedQuestion {
  prompt: string;
  options: string[];
  answer: number;
  explain: string;
}

export function getCompetitionQuestion(index: number, seed: number): ResolvedQuestion | null {
  const q = COMPETITION_QUESTIONS[index];
  if (!q) return null;
  if (q.fixedOrder) return { prompt: q.prompt, options: q.options, answer: q.answer, explain: q.explain };
  const rnd = mulberry32(seed * 7919 + index * 104729 + 17);
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    prompt: q.prompt,
    options: order.map((i) => q.options[i]),
    answer: order.indexOf(q.answer),
    explain: q.explain,
  };
}

/** نقاط الإجابة: 100 للإجابة الصحيحة + مكافأة سرعة حتى 50 */
export function scoreFor(correct: boolean, elapsedMs: number, limitMs: number): number {
  if (!correct) return 0;
  const ratio = limitMs > 0 ? Math.min(1, Math.max(0, elapsedMs / limitMs)) : 1;
  return 100 + Math.round(50 * (1 - ratio));
}

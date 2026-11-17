"use client";

import { formatGregorian, formatHijri } from "@/lib/dates";
import { GRADE, SCHOOL_NAME, SUBJECT, percentOf, starsFor } from "@/lib/lesson-data";
import { CertificatePattern } from "./HeroIllustration";

interface Props {
  name: string;
  classroom: string;
  score: number;
  maxScore: number;
  date: Date;
}

export default function Certificate({ name, classroom, score, maxScore, date }: Props) {
  const percent = percentOf(score, maxScore);
  const stars = starsFor(score, maxScore);
  const hijri = formatHijri(date);
  const gregorian = formatGregorian(date);

  return (
    <div id="certificate-wrap" className="@container w-full">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          #certificate-wrap { width: 270mm !important; max-width: 270mm !important; margin: 0 auto !important; }
          #certificate { box-shadow: none !important; }
        }
      `}</style>
      <div
        id="certificate"
        dir="rtl"
        className="relative mx-auto aspect-[1.414/1] w-full overflow-hidden rounded-[2cqw] border-[0.9cqw] border-[#d4a017] bg-[#fffaf0] text-[#0b4f3f] shadow-2xl"
        style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact", fontFamily: "Cairo, Tahoma, sans-serif" }}
      >
        <CertificatePattern />
        <div className="absolute inset-[1.2cqw] rounded-[1.4cqw] border-[0.28cqw] border-[#d4a017]" />
        <div className="absolute inset-[2cqw] rounded-[1cqw] border-[0.12cqw] border-[#0f766e]/40" />

        <span className="absolute right-[3cqw] top-[2.6cqw] text-[4.2cqw]">🌙</span>
        <span className="absolute left-[3cqw] top-[2.6cqw] text-[4.2cqw]">🏮</span>
        <span className="absolute bottom-[2.6cqw] right-[3cqw] text-[3.6cqw]">⭐</span>
        <span className="absolute bottom-[2.6cqw] left-[3cqw] text-[3.6cqw]">✨</span>

        <div className="relative z-10 flex h-full flex-col items-center justify-between px-[8cqw] py-[3.4cqw] text-center">
          <div>
            <p className="text-[2.1cqw] font-black leading-tight text-[#0f766e]">🕌 {SCHOOL_NAME}</p>
            <p className="text-[1.45cqw] font-bold text-[#6b7280]">
              {SUBJECT} • {GRADE}
            </p>
          </div>

          <h2 className="font-amiri text-[6.2cqw] font-bold leading-none text-[#b8860b]">شَهَادَةُ تَقْدِيرٍ</h2>

          <p className="text-[1.9cqw] font-bold text-[#0b4f3f]">تَشْهَدُ مَدْرَسَةُ الْعَرُوسِ الِابْتِدَائِيَّةُ بِأَنَّ الطَّالِبَ/ـةَ</p>

          <p className="min-w-[40cqw] border-b-[0.3cqw] border-dashed border-[#d4a017] px-[3cqw] pb-[0.4cqw] font-amiri text-[4.8cqw] font-bold leading-tight text-[#0f766e]">
            {name.trim() || "……………………"}
          </p>

          <p className="max-w-[82cqw] text-[1.7cqw] font-bold leading-[1.9] text-[#0b4f3f]">
            {classroom ? `(الفصل ${classroom}) ` : ""}
            قَدْ أَتَمَّ بِنَجَاحٍ رِحْلَةَ دَرْسِ «صَوْمُ رَمَضَانَ» بِمَحَطَّاتِهَا الاِثْنَتَيْ عَشْرَةَ، وَحَصَلَ عَلَى {score} مِنْ {maxScore} نُقْطَةً (
            {percent}%)، وَنَالَ بِجَدَارَةٍ لَقَبَ
          </p>

          <p className="text-[3.5cqw] font-black leading-tight text-[#0b4f3f]">🏆 بَطَلُ صَوْمِ رَمَضَانَ 🏆</p>
          <p className="text-[2.6cqw] leading-none">{"⭐".repeat(Math.max(1, stars))}</p>

          <div className="flex w-full items-end justify-between text-[1.3cqw] font-bold text-[#0b4f3f]">
            <div className="text-center">
              <p>مُعَلِّمُ/ـةُ الْمَادَّةِ</p>
              <div className="mt-[2.4cqw] w-[18cqw] border-t-[0.18cqw] border-[#0b4f3f]" />
            </div>
            <div className="text-center text-[#6b7280]">
              {hijri && <p>{hijri}</p>}
              <p>{gregorian}</p>
            </div>
            <div className="text-center">
              <p>مُدِيرُ/ـةُ الْمَدْرَسَةِ</p>
              <div className="mt-[2.4cqw] w-[18cqw] border-t-[0.18cqw] border-[#0b4f3f]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { InfoPageShell } from "@/components/public/info-page-shell";

export const metadata: Metadata = {
  title: "ط§ظ„ظ…ط³ط§ط¹ط¯ط©",
  description: "طµظپط­ط© ظ…ط³ط§ط¹ط¯ط© ظ…ط¨ط¯ط¦ظٹط© ظ„ظ„ط¥ط¬ط§ط¨ط© ط¹ظ„ظ‰ ط£ظƒط«ط± ط§ظ„ط£ط³ط¦ظ„ط© ط´ظٹظˆط¹ظ‹ط§ ط­ظˆظ„ ط§ط³طھط®ط¯ط§ظ… ط§ظ„ظ…ظ†طµط©.",
};

const faqItems = [
  { question: "ظƒظٹظپ ط£ط´طھط±ظٹ ظƒطھط§ط¨ظ‹ط§طں", answer: "ط§ط®طھط± ط§ظ„ظƒطھط§ط¨طŒ ط«ظ… ط§ظ„ط¹ط±ط¶ ط§ظ„ظ…ظ†ط§ط³ط¨طŒ ط«ظ… ط£ظƒظ…ظ„ ط®ط·ظˆط§طھ ط§ظ„ط¯ظپط¹ ظ…ظ† طµظپط­ط© ط§ظ„ط·ظ„ط¨." },
  { question: "ظƒظٹظپ ظٹط¹ظ…ظ„ ط§ظ„ط§ط³طھط¦ط¬ط§ط±طں", answer: "ط¹ظ†ط¯ ط§ط®طھظٹط§ط± ط¹ط±ط¶ ط§ظ„ط§ط³طھط¦ط¬ط§ط±طŒ طھط­طµظ„ ط¹ظ„ظ‰ ظˆطµظˆظ„ ظ…ط¤ظ‚طھ ظ„ظ„ظƒطھط§ط¨ ط­ط³ط¨ ظ…ط¯ط© ط§ظ„ط¥ط¹ط§ط±ط©." },
  { question: "ط£ظٹظ† ط£ط¬ط¯ ظƒطھط¨ظٹطں", answer: "ظƒظ„ ط§ظ„ظƒطھط¨ ط§ظ„طھظٹ ط­طµظ„طھ ط¹ظ„ظٹظ‡ط§ طھط¸ظ‡ط± ظپظٹ طµظپط­ط© ظ…ظƒطھط¨طھظƒ ط¶ظ…ظ† ط§ظ„ط­ط³ط§ط¨." },
];

export default function HelpPage() {
  return (
    <InfoPageShell
      title="ظ…ط±ظƒط² ط§ظ„ظ…ط³ط§ط¹ط¯ط©"    
      description=""
>
      <div className="space-y-3">
        {faqItems.map((item) => (
          <article key={item.question} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-base font-bold text-slate-900">{item.question}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">{item.answer}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
        ظ„ظ… طھط¬ط¯ ط¥ط¬ط§ط¨طھظƒطں ظٹظ…ظƒظ†ظƒ <Link className="font-bold underline" href="/contact">ط§ظ„طھظˆط§طµظ„ ظ…ط¹ ظپط±ظٹظ‚ ط§ظ„ط¯ط¹ظ…</Link>.
      </div>
    </InfoPageShell>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeacherBySlug } from "@/lib/repo";
import { Avatar } from "@/components/Avatar";
import { submitReviewAction } from "../actions";

// Post-class review page, linked from the follow-up email. Submissions are
// held for the teacher's approval before appearing on their public page.
export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ done?: string; name?: string; email?: string; error?: string }>;
}) {
  const { slug } = await params;
  const { done, name, email, error } = await searchParams;
  const teacher = await getTeacherBySlug(slug);
  if (!teacher) notFound();
  const first = teacher.name.split(" ")[0];

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="flex items-center gap-3 mb-6">
          <Avatar name={teacher.name} src={teacher.avatarUrl} size={52} />
          <div>
            <h1 className="text-xl font-semibold">
              How was class with {first}?
            </h1>
            <p className="text-sm text-muted">
              Your review helps other students find great teachers.
            </p>
          </div>
        </div>

        {done ? (
          <div className="card text-center py-10">
            <p className="text-3xl mb-2">🙏</p>
            <p className="font-semibold mb-1">Thank you!</p>
            <p className="text-sm text-muted mb-4">
              {first} will see your review shortly.
            </p>
            <Link href={`/t/${teacher.slug}`} className="btn-primary text-sm">
              Back to {first}&apos;s page
            </Link>
          </div>
        ) : (
          <form action={submitReviewAction} className="card space-y-4">
            <input type="hidden" name="slug" value={teacher.slug} />

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
                Please add a star rating and a few words.
              </p>
            )}

            <div>
              <label className="label">Your rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label
                    key={n}
                    className="flex-1 cursor-pointer text-center rounded-lg border border-border py-2 text-lg has-checked:border-brand has-checked:bg-brand-tint"
                  >
                    <input
                      type="radio"
                      name="rating"
                      value={n}
                      defaultChecked={n === 5}
                      className="sr-only"
                    />
                    {"★".repeat(n)}
                    <span className="block text-[10px] text-muted">{n}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="label" htmlFor="authorName">
                Your name
              </label>
              <input
                id="authorName"
                name="authorName"
                defaultValue={name ?? ""}
                required
                className="input"
              />
            </div>
            <input type="hidden" name="clientEmail" value={email ?? ""} />

            <div>
              <label className="label" htmlFor="body">
                A few words
              </label>
              <textarea
                id="body"
                name="body"
                required
                className="textarea"
                placeholder="What did the class feel like? What should other students know?"
              />
            </div>

            <button type="submit" className="btn-primary w-full">
              Submit review
            </button>
            <p className="hint text-center">
              Reviews appear on {first}&apos;s page after they approve them.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

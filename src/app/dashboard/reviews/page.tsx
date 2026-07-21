import { getCurrentTeacher } from "@/lib/session";
import { redirect } from "next/navigation";
import { listReviews, getReviewStats } from "@/lib/repo";
import { Stars } from "@/components/Stars";
import {
  addReviewAction,
  deleteReviewAction,
  toggleReviewFlagAction,
} from "./actions";

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; error?: string }>;
}) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  const { added, error } = await searchParams;

  const [reviews, stats] = await Promise.all([
    listReviews(teacher.id, false),
    getReviewStats(teacher.id),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Reviews</h1>
        <p className="text-muted text-sm">
          Add the kind words students have shared with you — they appear on your
          public page and build trust with new students.
        </p>
      </div>

      {added && (
        <div className="card !p-4 border-brand bg-brand-tint/60 text-sm">
          ✓ Review added — it&apos;s now live on your public page.
        </div>
      )}
      {error === "missing" && (
        <div className="card !p-4 border-danger text-sm text-danger">
          Add a name and the review text to publish it.
        </div>
      )}

      {stats.count > 0 && (
        <div className="card !p-4 flex items-center gap-3">
          <Stars rating={stats.average} className="text-lg" />
          <span className="text-sm">
            <span className="font-semibold">{stats.average.toFixed(1)}</span>{" "}
            <span className="text-muted">
              from {stats.count} {stats.count === 1 ? "review" : "reviews"} shown
              publicly
            </span>
          </span>
        </div>
      )}

      {/* Add a review */}
      <form action={addReviewAction} className="card space-y-4">
        <h2 className="font-semibold">Add a review</h2>
        <div className="grid sm:grid-cols-[1fr_auto] gap-4">
          <div>
            <label className="label" htmlFor="authorName">
              Student name
            </label>
            <input
              id="authorName"
              name="authorName"
              required
              maxLength={80}
              placeholder="e.g. Priya S."
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="rating">
              Rating
            </label>
            <select id="rating" name="rating" defaultValue="5" className="input">
              <option value="5">★★★★★ · 5</option>
              <option value="4">★★★★ · 4</option>
              <option value="3">★★★ · 3</option>
              <option value="2">★★ · 2</option>
              <option value="1">★ · 1</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="body">
            What they said
          </label>
          <textarea
            id="body"
            name="body"
            required
            maxLength={1000}
            className="textarea"
            placeholder="Maya's breathwork completely changed how I handle stress at work…"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="featured" className="size-4" />
          Feature this one at the top
        </label>
        <button type="submit" className="btn-primary">
          Add review
        </button>
        <p className="hint">
          Adding reviews you&apos;ve already received by hand. Soon, students will
          be able to leave a rating automatically after each class.
        </p>
      </form>

      {/* Existing reviews */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your reviews</h2>
        {reviews.length === 0 ? (
          <div className="card text-center py-8 text-sm text-muted">
            No reviews yet. Add your first above to start building social proof.
          </div>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li
                key={r.id}
                className={`card !p-4 space-y-2 ${r.published ? "" : "opacity-60"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Stars rating={r.rating} className="text-sm" />
                    <span className="font-medium truncate">{r.authorName}</span>
                    {r.featured && r.published && (
                      <span className="pill !py-0.5 text-xs">Featured</span>
                    )}
                    {!r.published && (
                      <span className="pill !bg-border/60 !text-muted !py-0.5 text-xs">
                        Hidden
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted">{r.body}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <FlagButton
                    id={r.id}
                    flag="featured"
                    value={!r.featured}
                    label={r.featured ? "Unfeature" : "Feature"}
                  />
                  <FlagButton
                    id={r.id}
                    flag="published"
                    value={!r.published}
                    label={r.published ? "Hide" : "Show"}
                  />
                  <form action={deleteReviewAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="btn-ghost !px-2 !py-1 text-xs text-danger">
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FlagButton({
  id,
  flag,
  value,
  label,
}: {
  id: string;
  flag: "featured" | "published";
  value: boolean;
  label: string;
}) {
  return (
    <form action={toggleReviewFlagAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="flag" value={flag} />
      <input type="hidden" name="value" value={String(value)} />
      <button type="submit" className="btn-secondary !px-2 !py-1 text-xs">
        {label}
      </button>
    </form>
  );
}

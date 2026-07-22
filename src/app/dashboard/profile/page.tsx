import { getCurrentTeacher } from "@/lib/session";
import { redirect } from "next/navigation";
import { saveProfileAction } from "../actions";
import { AvatarUpload } from "@/components/AvatarUpload";
import { BannerUpload } from "@/components/BannerUpload";
import { BrandColorPicker } from "@/components/BrandColorPicker";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  const { saved } = await searchParams;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-1">Your profile</h1>
      <p className="text-muted mb-6 text-sm">
        This is what students see on your public booking page.
      </p>

      {saved && (
        <p className="mb-4 rounded-lg bg-brand-tint px-3 py-2 text-sm text-brand-dark">
          Profile saved.
        </p>
      )}

      <form action={saveProfileAction} className="card space-y-5">
        <AvatarUpload name={teacher.name} initialUrl={teacher.avatarUrl} />

        {/* Page style — make it feel like THEIR studio, not a template. */}
        <div className="rounded-xl border border-border p-4 space-y-4">
          <p className="text-sm font-semibold">
            Your page style{" "}
            <span className="font-normal text-muted">
              — like a LinkedIn banner, for your studio
            </span>
          </p>
          <BannerUpload initialUrl={teacher.bannerUrl} />
          <BrandColorPicker initial={teacher.brandColor} />
        </div>

        <div>
          <label className="label" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            name="name"
            defaultValue={teacher.name}
            className="input"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="headline">
            Headline
          </label>
          <input
            id="headline"
            name="headline"
            defaultValue={teacher.headline}
            placeholder="Vinyasa & restorative yoga for busy people"
            className="input"
          />
        </div>

        <div>
          <label className="label" htmlFor="bio">
            About you
          </label>
          <textarea
            id="bio"
            name="bio"
            defaultValue={teacher.bio}
            placeholder="Tell students about your style, training, and what a session feels like."
            className="textarea"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="location">
              Location
            </label>
            <input
              id="location"
              name="location"
              defaultValue={teacher.location}
              placeholder="Austin, TX · or Online"
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="timezone">
              Timezone
            </label>
            <input
              id="timezone"
              name="timezone"
              defaultValue={teacher.timezone}
              placeholder="America/Chicago"
              className="input"
            />
            <p className="hint">IANA name — controls your availability times.</p>
          </div>
        </div>

        <div className="border-t border-border pt-5">
          <label className="label" htmlFor="defaultMeetingUrl">
            💻 Your virtual studio room (Zoom / Google Meet link)
          </label>
          <input
            id="defaultMeetingUrl"
            name="defaultMeetingUrl"
            type="url"
            defaultValue={teacher.defaultMeetingUrl}
            placeholder="https://us02web.zoom.us/j/1234567890"
            className="input"
          />
          <p className="hint">
            Set it once here and every online class uses it automatically —
            students get it in their confirmation. (A class can still override
            it with its own link.)
          </p>
        </div>

        <div>
          <label className="label" htmlFor="specialties">
            Specialties
          </label>
          <input
            id="specialties"
            name="specialties"
            defaultValue={teacher.specialties.join(", ")}
            placeholder="Vinyasa, Restorative, Prenatal"
            className="input"
          />
          <p className="hint">Comma-separated, up to 8.</p>
        </div>

        <div className="border-t border-border pt-5">
          <label className="label" htmlFor="slug">
            Public link
          </label>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted">kuleo.io/t/</span>
            <input
              id="slug"
              name="slug"
              defaultValue={teacher.slug}
              className="input flex-1"
            />
          </div>
          <p className="hint">
            This is the link you share with students. Keep it short.
          </p>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary">
            Save profile
          </button>
        </div>
      </form>
    </div>
  );
}

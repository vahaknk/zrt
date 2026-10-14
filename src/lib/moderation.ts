import { adminGet, adminPatch } from './directusAdmin';
import { displayName, type Member } from './platformAuth';
import { sendEmail } from './email';
import { notify, groupStudentIds } from './notifications';
import { formatSize, type PlatformFile } from './platformFiles';

// Facilitators' library uploads are reviewed by a moderator (Sarin) before
// participants can see them. A moderator is a platform member with
// `moderator` on. Moderators' and team members' own uploads skip review.

const SITE = 'https://zartsants.com';

export function needsReview(uploader: Pick<Member, 'role' | 'moderator'>): boolean {
  return !uploader.moderator && uploader.role !== 'team';
}

async function moderators(): Promise<Array<{ id: number; email: string | null; full_name: string; armenian_name: string | null }>> {
  try {
    const res = await adminGet(
      `/items/platform_members?filter[moderator][_eq]=true&filter[status][_eq]=active&fields=id,email,full_name,armenian_name&limit=-1`
    );
    return res.data ?? [];
  } catch {
    return [];
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// Tells the moderators — email + platform notification. Never throws.
export async function requestReview(
  file: Pick<PlatformFile, 'id' | 'filename' | 'kind' | 'size'>,
  uploader: Pick<Member, 'id' | 'full_name' | 'armenian_name'>
): Promise<void> {
  const mods = await moderators();
  await notify(mods.map((m) => m.id), 'file_review', { actor: uploader.id, file: file.id });
  const who = displayName(uploader);
  for (const m of mods) {
    if (!m.email) continue;
    const html = `<p>Բարե՛ւ ${esc(displayName(m))},</p>
<p>${esc(who)} նոր ծրար մը բեռնեց, որ կը սպասէ քու հաստատումիդ։</p>
<p style="margin: 20px 0; padding: 16px 20px; background: #f6f3ee; border-radius: 8px;">
<strong>${esc(file.filename)}</strong><br/>
${formatSize(file.size)}${file.kind === 'video' ? '<br/>Տեսերիզը քանի մը վայրկեանէն պատրաստ կ՚ըլլայ դիտելու։' : ''}
</p>
<p style="margin: 24px 0;"><a href="${SITE}/platform/file/${file.id}" style="display: inline-block; padding: 12px 24px; background: #1a1a1a; color: #ffffff; border-radius: 999px; font-weight: 700; text-decoration: none;">Ստուգել</a></p>
<p>Սիրով՝<br/>Զարցանցի հարթակ</p>`;
    await sendEmail(m.email, `Ստուգելու՝ ${file.filename}`, html).catch((e) => console.error('review email failed:', e));
  }
}

// A moderator approves or rejects a library file. Approval tells the
// uploader and — now that they can see it — the participants of every
// group the file is already used in.
export async function decideReview(
  file: Pick<PlatformFile, 'id' | 'owner'>,
  moderator: Pick<Member, 'id'>,
  approve: boolean,
  note: string
): Promise<void> {
  await adminPatch(`/items/platform_files/${file.id}`, {
    review_status: approve ? 'approved' : 'rejected',
    review_note: note || null,
    reviewed_by: moderator.id,
    reviewed_at: new Date().toISOString(),
  });
  if (file.owner) await notify([file.owner], approve ? 'file_approved' : 'file_rejected', { actor: moderator.id, file: file.id });
  if (!approve) return;
  const uses = await adminGet(`/items/materials?filter[file][_eq]=${file.id}&fields=id,workshop,cloud&limit=-1`).catch(() => ({ data: [] }));
  for (const m of (uses.data ?? []) as Array<{ id: number; workshop: number | null; cloud: number | null }>) {
    await notify(await groupStudentIds(m.workshop, m.cloud), 'material', { actor: file.owner, material: m.id });
  }
}

export interface ReviewItem {
  id: string;
  filename: string;
  kind: string;
  size: number;
  status: string;
  thumb_key: string | null;
  review_status: string;
  review_note: string | null;
  reviewed_at: string | null;
  date_created: string;
  owner: { full_name: string; armenian_name: string | null } | null;
}

export async function reviewQueue(): Promise<{ pending: ReviewItem[]; recent: ReviewItem[] }> {
  const fields =
    'id,filename,kind,size,status,thumb_key,review_status,review_note,reviewed_at,date_created,owner.full_name,owner.armenian_name';
  try {
    const [pending, recent] = await Promise.all([
      adminGet(`/items/platform_files?filter[purpose][_eq]=library&filter[review_status][_eq]=pending&sort=date_created&fields=${fields}&limit=-1`),
      adminGet(
        `/items/platform_files?filter[purpose][_eq]=library&filter[review_status][_in]=approved,rejected&filter[reviewed_at][_nnull]=true` +
          `&sort=-reviewed_at&fields=${fields}&limit=20`
      ),
    ]);
    return { pending: pending.data ?? [], recent: recent.data ?? [] };
  } catch (e) {
    console.error('Failed to load review queue:', e);
    return { pending: [], recent: [] };
  }
}

export async function pendingReviewCount(): Promise<number> {
  try {
    const res = await adminGet(
      `/items/platform_files?filter[purpose][_eq]=library&filter[review_status][_eq]=pending&aggregate[count]=id`
    );
    return Number(res.data?.[0]?.count?.id ?? 0);
  } catch {
    return 0;
  }
}

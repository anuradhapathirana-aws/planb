<?php

declare(strict_types=1);

namespace App\Services\Settings;

use App\Models\TeamMember;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Intervention\Image\ImageManager;

/**
 * The one way in and out of the website's team carousel.
 *
 * Nothing else may call `TeamMember::create()`.
 */
class TeamMemberService
{
    /**
     * 800x1000 — 4:5 portrait, exactly the frame `TeamSection.tsx` reserves.
     * These two numbers and that component's `aspect-[4/5]` are one decision in
     * two files; change one, change the other.
     */
    private const PHOTO_WIDTH = 800;

    private const PHOTO_HEIGHT = 1000;

    /**
     * Every member, in the admin's order.
     *
     * @return Collection<int, TeamMember>
     */
    public function all(): Collection
    {
        return TeamMember::query()->ordered()->get();
    }

    /**
     * Every member a visitor should see. An empty collection hides the section
     * on the website rather than rendering an empty carousel.
     *
     * @return Collection<int, TeamMember>
     */
    public function live(): Collection
    {
        return TeamMember::query()
            ->where('is_visible', true)
            ->ordered()
            ->get()
            ->filter(fn (TeamMember $member) => $member->isPublishable())
            ->values();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): TeamMember
    {
        $member = new TeamMember;

        // Appended: adding a colleague is not a request to reorder the team.
        $member->sort_order = (int) TeamMember::query()->max('sort_order') + 1;

        return $this->fill($member, $data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(TeamMember $member, array $data): TeamMember
    {
        return $this->fill($member, $data);
    }

    public function delete(TeamMember $member): void
    {
        // Media Library removes the photograph with the row — which matters
        // more here than elsewhere: a person removed from the team should not
        // leave their picture on our disk.
        $member->delete();
    }

    /**
     * Rewrite the carousel order from a list of ids. Position in the array IS
     * the order (root CLAUDE.md §8), in one transaction.
     *
     * @param  list<int>  $orderedIds
     */
    public function reorder(array $orderedIds): void
    {
        DB::transaction(function () use ($orderedIds): void {
            foreach ($orderedIds as $position => $id) {
                TeamMember::query()->whereKey($id)->update(['sort_order' => $position]);
            }
        });
    }

    /**
     * Re-encodes before storing (root CLAUDE.md §7.4), and crops to portrait.
     *
     * `cover()` centres the crop, which is wrong for a head-and-shoulders
     * photograph landing in a 4:5 frame — a centred crop of a standing person
     * cuts their head off. Anchoring to the top keeps the face, which is also
     * why the card renders with `object-top`.
     */
    public function updatePhoto(TeamMember $member, UploadedFile $file): TeamMember
    {
        $encoded = ImageManager::gd()
            ->read($file->getRealPath())
            ->coverDown(self::PHOTO_WIDTH, self::PHOTO_HEIGHT, 'top')
            ->toJpeg(85);

        $tempPath = tempnam(sys_get_temp_dir(), 'planb_team_member_').'.jpg';
        file_put_contents($tempPath, (string) $encoded);

        $member->addMedia($tempPath)
            ->usingFileName('team-member.jpg')
            ->toMediaCollection(TeamMember::PHOTO_COLLECTION);

        return $member->fresh() ?? $member;
    }

    public function removePhoto(TeamMember $member): TeamMember
    {
        $member->clearMediaCollection(TeamMember::PHOTO_COLLECTION);

        return $member->fresh() ?? $member;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function fill(TeamMember $member, array $data): TeamMember
    {
        $member->fill([
            'name' => $data['name'],
            'role' => $data['role'] ?? null,
            'role_si' => $data['role_si'] ?? null,
            // Normalised to null when cleared, so the Resource can test for a
            // link with `!== null` rather than also having to treat '' as absent.
            'facebook_url' => $this->url($data['facebook_url'] ?? null),
            'linkedin_url' => $this->url($data['linkedin_url'] ?? null),
            'is_visible' => $data['is_visible'] ?? false,
        ]);

        $member->save();

        return $member->fresh() ?? $member;
    }

    private function url(?string $value): ?string
    {
        $trimmed = trim((string) $value);

        return $trimmed === '' ? null : $trimmed;
    }
}

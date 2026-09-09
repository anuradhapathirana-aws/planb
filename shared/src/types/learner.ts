/**
 * One face in the Course Details learner stack.
 *
 * Mirrors `LearnerAvatarResource`, which carries the photo URL and nothing
 * else — no id, no name. This is the only payload where a student reads data
 * about other students, so it stays this narrow deliberately; if you find
 * yourself wanting a name here, the answer is no.
 */
export interface LearnerAvatar {
  photo_url: string | null;
}

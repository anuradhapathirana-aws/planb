/**
 * One circle in the Course Details learner stack.
 *
 * Mirrors `LearnerAvatarResource`, which carries initials and nothing else — no
 * photo, no id, no name. This is the only payload where a student reads data
 * about other students, so it stays this narrow deliberately; if you find
 * yourself wanting a photo or a name here, the answer is no.
 */
export interface LearnerAvatar {
  /** One or two capital letters, e.g. "NP". */
  initials: string;
}

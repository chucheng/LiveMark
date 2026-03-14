import { createSignal } from "solid-js";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { message } from "@tauri-apps/plugin-dialog";

declare const __APP_VERSION__: string;

const FEEDBACK_EMAIL = "chaselivemark@gmail.com";
const LAUNCH_THRESHOLD = 7;
const DEFER_INCREMENT = 5;

const [launchCount, setLaunchCount] = createSignal(0);
const [feedbackResolved, setFeedbackResolved] = createSignal(false);
const [feedbackNextThreshold, setFeedbackNextThreshold] = createSignal(LAUNCH_THRESHOLD);
const [isEnjoymentPromptOpen, setEnjoymentPromptOpen] = createSignal(false);

function buildMailtoUrl(subject: string, body: string): string {
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function feedbackBody(): string {
  const lines = [
    "What were you trying to do?\n\n",
    "What would you like improved?\n\n",
    "---",
    `LiveMark ${__APP_VERSION__}`,
  ];
  return lines.join("\n");
}

async function openFeedbackEmail() {
  const url = buildMailtoUrl("feedback:", feedbackBody());
  try {
    await shellOpen(url);
  } catch {
    await message(
      `Could not open your mail app.\n\nPlease send feedback to:\n${FEEDBACK_EMAIL}`,
      { title: "Send Feedback", kind: "info" },
    );
  }
}

// TODO: Replace with actual App Store URL once the app ID is known
// e.g. "https://apps.apple.com/app/idXXXXXXXXXX?action=write-review"
const APP_STORE_REVIEW_URL = "";

async function openAppStoreReview() {
  if (!APP_STORE_REVIEW_URL) {
    // App Store URL not configured yet — thank the user instead of confusing them with a feedback form
    await message(
      "Thanks for enjoying LiveMark! App Store reviews will be available soon.",
      { title: "Thank You", kind: "info" },
    );
    return;
  }
  try {
    await shellOpen(APP_STORE_REVIEW_URL);
  } catch {
    await message(
      "Could not open the App Store. Thank you for your support!",
      { title: "Thank You", kind: "info" },
    );
  }
}

export interface FeedbackPrefs {
  launchCount?: number;
  feedbackResolved?: boolean;
  feedbackNextThreshold?: number;
}

function loadFeedbackPrefs(prefs: FeedbackPrefs) {
  if (prefs.launchCount !== undefined) setLaunchCount(prefs.launchCount);
  if (prefs.feedbackResolved !== undefined) setFeedbackResolved(prefs.feedbackResolved);
  if (prefs.feedbackNextThreshold !== undefined) setFeedbackNextThreshold(prefs.feedbackNextThreshold);
}

function saveFeedbackPrefs(): FeedbackPrefs {
  return {
    launchCount: launchCount(),
    feedbackResolved: feedbackResolved(),
    feedbackNextThreshold: feedbackNextThreshold(),
  };
}

/** Call once on app mount after preferences are loaded. */
function recordLaunch(save: () => void) {
  const count = launchCount() + 1;
  setLaunchCount(count);
  save();

  if (!feedbackResolved() && count >= feedbackNextThreshold()) {
    setEnjoymentPromptOpen(true);
  }
}

function handleEnjoymentYes(save: () => void) {
  setFeedbackResolved(true);
  setEnjoymentPromptOpen(false);
  save();
  openAppStoreReview();
}

function handleEnjoymentNo(save: () => void) {
  setFeedbackResolved(true);
  setEnjoymentPromptOpen(false);
  save();
  openFeedbackEmail();
}

function handleEnjoymentNotNow(save: () => void) {
  setFeedbackNextThreshold(launchCount() + DEFER_INCREMENT);
  setEnjoymentPromptOpen(false);
  save();
}

export const feedbackState = {
  FEEDBACK_EMAIL,
  LAUNCH_THRESHOLD,
  isEnjoymentPromptOpen,
  setEnjoymentPromptOpen,
  openFeedbackEmail,
  loadFeedbackPrefs,
  saveFeedbackPrefs,
  recordLaunch,
  handleEnjoymentYes,
  handleEnjoymentNo,
  handleEnjoymentNotNow,
};

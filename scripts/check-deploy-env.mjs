const required = [
  "GOOGLE_SERVICE_ACCOUNT_KEY",
  "GCAL_ID_EVENT_SPACE",
  "GCAL_ID_MEETING_ROOM",
  "GCAL_ID_SOLO_BOOTH_1",
  "GCAL_ID_SOLO_BOOTH_2",
  "GCAL_ID_SOLO_BOOTH_3",
  "GCAL_ID_SOLO_BOOTH_4",
  "GCAL_ID_SOLO_BOOTH_5",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "CANCEL_SECRET",
  "SITE_URL",
];

const placeholderMatchers = [
  /your-project-id/i,
  /group\.calendar\.google\.com$/,
  /^re_x+/i,
  /noreply@example\.com/i,
  /replace-with-a-random/i,
  /your-vercel-domain\.vercel\.app/i,
];

function isPlaceholder(value) {
  return placeholderMatchers.some((pattern) => pattern.test(value));
}

function validateGoogleCredentials(raw) {
  try {
    const parsed = JSON.parse(raw);
    const expectedKeys = ["client_email", "private_key", "project_id", "type"];
    const missing = expectedKeys.filter((key) => !parsed[key]);
    if (missing.length > 0) {
      return `GOOGLE_SERVICE_ACCOUNT_KEY is missing keys: ${missing.join(", ")}`;
    }
    if (parsed.type !== "service_account") {
      return "GOOGLE_SERVICE_ACCOUNT_KEY.type must be service_account";
    }
    return null;
  } catch (error) {
    return `GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON: ${error.message}`;
  }
}

const problems = [];

for (const name of required) {
  const value = process.env[name];
  if (!value) {
    problems.push(`${name} is not set`);
    continue;
  }

  if (isPlaceholder(value)) {
    problems.push(`${name} still looks like a placeholder`);
  }
}

if (process.env.CANCEL_SECRET && process.env.CANCEL_SECRET.length < 32) {
  problems.push("CANCEL_SECRET must be at least 32 characters");
}

if (process.env.SITE_URL) {
  try {
    const url = new URL(process.env.SITE_URL);
    if (!["http:", "https:"].includes(url.protocol)) {
      problems.push("SITE_URL must use http or https");
    }
  } catch {
    problems.push("SITE_URL is not a valid URL");
  }
}

if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
  const credentialsProblem = validateGoogleCredentials(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  if (credentialsProblem) {
    problems.push(credentialsProblem);
  }
}

if (problems.length > 0) {
  process.stderr.write("Deployment environment check failed:\n");
  for (const problem of problems) {
    process.stderr.write(`- ${problem}\n`);
  }
  process.exit(1);
}

process.stdout.write("Deployment environment check passed.\n");

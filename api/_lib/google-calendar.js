const { GoogleAuth } = require("google-auth-library");

let cachedClient = null;

class CalendarApiError extends Error {
  constructor(status, body) {
    super(`Calendar API ${status}: ${body}`);
    this.name = "CalendarApiError";
    this.status = status;
    this.body = body;
  }
}

function getCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not configured");
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON: ${error.message}`);
  }
}

function getAuth() {
  return new GoogleAuth({
    credentials: getCredentials(),
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
}

async function calendarFetch(path, options = {}) {
  try {
    if (!cachedClient) {
      cachedClient = await getAuth().getClient();
    }

    const tokenResponse = await cachedClient.getAccessToken();
    const token = typeof tokenResponse === "string" ? tokenResponse : tokenResponse?.token;

    const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new CalendarApiError(response.status, await response.text());
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  } catch (error) {
    cachedClient = null;
    throw error;
  }
}

module.exports = {
  calendarFetch,
  CalendarApiError,
};

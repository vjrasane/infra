import * as wmill from "windmill-client";

interface NtfyCredentials {
  url: string;
  username: string;
  password: string;
}

interface ErrorResult {
  name: string;
  message: string;
  stack: string;
}

export async function main(previous_result: ErrorResult) {
  const credentials: NtfyCredentials = JSON.parse(
    await wmill.getVariable("f/scripts/ntfy_credentials"),
  );

  const message = `${previous_result.message}
-----------------------------------------------
${previous_result.stack}`;

  const response = await fetch(`${credentials.url}/alerts`, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + btoa(`${credentials.username}:${credentials.password}`),
      Title: previous_result.name,
      "Content-Type": "text/plain",
    },
    body: message,
  });

  return await response.json();
}
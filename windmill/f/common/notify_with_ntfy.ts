import * as wmill from "windmill-client";

interface NtfyCredentials {
  url: string;
  username: string;
  password: string;
}

export async function main(title: string, message: string, topic: string) {
  const credentials: NtfyCredentials = JSON.parse(
    await wmill.getVariable("f/scripts/ntfy_credentials"),
  );

  const response = await fetch(`${credentials.url}/${topic}`, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + btoa(`${credentials.username}:${credentials.password}`),
      Title: title,
      "Content-Type": "text/plain",
    },
    body: message,
  });

  return await response.json();
}

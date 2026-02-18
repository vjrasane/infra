export interface ntfy {
  url: string;
  username: string;
  password: string;
}

export async function sendToNtfy(
  ntfy: ntfy,
  title: string,
  message: string,
  topic: string,
) {
  const { url, username, password } = ntfy;
  const response = await fetch(`${url}/${topic}`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${username}:${password}`),
      Title: title,
      "Content-Type": "text/plain",
    },
    body: message,
  });

  return await response.json();
}

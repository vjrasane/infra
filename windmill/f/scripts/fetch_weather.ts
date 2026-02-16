import * as wmill from "windmill-client";

export interface ForecastEntry {
  dt: number;
  dt_txt: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
    pressure: number;
  };
  weather: {
    main: string;
    description: string;
  }[];
  wind: {
    speed: number;
    deg: number;
    gust: number;
  };
  pop: number;
  snow?: { "3h": number };
  rain?: { "3h": number };
  visibility: number;
}

export async function main(city: string): Promise<ForecastEntry[]> {
  const apiKey = await wmill.getVariable("f/scripts/openweathermap_api_key");
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`,
  );

  if (!res.ok) {
    throw new Error(`${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return data.list;
}

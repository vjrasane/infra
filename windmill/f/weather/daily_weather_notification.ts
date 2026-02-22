import {
  addDays,
  differenceInSeconds,
  format,
  isSameDay,
  set,
} from "date-fns";
import { TZDate } from "@date-fns/tz";
import { capitalize, minBy } from "lodash/fp";
import { ntfy, sendToNtfy } from "../common/ntfy";
import { weatherapi } from "../common/resources";

function toTZDate(epochSeconds: number, timezone: string): TZDate {
  return new TZDate(epochSeconds * 1000, timezone);
}

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

export async function main(
  city: string,
  day: "today" | "tomorrow",
  timezone: string,
  ntfy: ntfy,
  weatherapi: weatherapi,
): Promise<any> {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${weatherapi.apiKey}&units=metric`,
  );

  if (!res.ok) {
    throw new Error(`${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const forecasts: ForecastEntry[] = data.list;

  const { title, message } = formatForecasts(forecasts, day, timezone);

  const response = await sendToNtfy(ntfy, title, message, "weather");

  return response;
}

export function formatForecasts(
  forecasts: ForecastEntry[],
  day: "today" | "tomorrow",
  timezone: string,
  now: Date = new TZDate(Date.now(), timezone),
) {
  const dayOffset = day === "today" ? 0 : 1;
  const targetDate = addDays(now, dayOffset);
  const targetForecasts = forecasts.filter((f) =>
    isSameDay(toTZDate(f.dt, timezone), targetDate),
  );

  if (!targetForecasts.length)
    return {
      title: "Weather - Helsinki",
      message: `No forecast available for ${format(targetDate, "yyyy-MM-dd")}`,
    };

  const hourForecasts = [8, 12, 16].map((hours) =>
    getForecastAtTime(
      set(targetDate, { hours, minutes: 0, seconds: 0 }),
      targetForecasts,
      timezone,
    ),
  );

  const winds = targetForecasts.map((f) => f.wind.speed);
  const maxWind = Math.round(Math.max(...winds));

  const humidity = targetForecasts.map((f) => f.main.humidity);
  const avgHumidity = Math.round(
    humidity.reduce((a, b) => a + b) / humidity.length,
  );

  const totalRain = targetForecasts.reduce(
    (sum, f) => sum + (f.rain?.["3h"] || 0),
    0,
  );
  const totalSnow = targetForecasts.reduce(
    (sum, f) => sum + (f.snow?.["3h"] || 0),
    0,
  );

  const [morning, noon, evening] = hourForecasts;

  const formatEntry = (f: ForecastEntry) =>
    `${format(toTZDate(f.dt, timezone), "HH:mm")}: ${Math.round(f.main.feels_like)}°C, ${f.weather[0].description}`;

  const lines: string[] = [];
  if (morning) lines.push(formatEntry(morning));
  if (noon) lines.push(formatEntry(noon));
  if (evening) lines.push(formatEntry(evening));
  lines.push(`Wind: up to ${maxWind} m/s`);
  lines.push(`Humidity: ~${avgHumidity}%`);

  if (totalRain > 0) lines.push(`Rain: ${totalRain.toFixed(1)} mm`);
  if (totalSnow > 0) lines.push(`Snow: ${totalSnow.toFixed(1)} mm`);

  const title = `${capitalize(day)}'s Weather - ${format(targetDate, "EEEE, MMMM d")}`;

  return { title, message: lines.join("\n") };
}

export function getForecastAtTime(
  time: Date,
  forecasts: ForecastEntry[],
  timezone: string,
): ForecastEntry | undefined {
  return minBy(
    (d) => Math.abs(differenceInSeconds(toTZDate(d.dt, timezone), time)),
    forecasts,
  );
}

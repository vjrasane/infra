import { ForecastEntry } from "./fetch_weather";
import { addDays, format, fromUnixTime, isSameDay } from "date-fns";
import { capitalize } from "lodash/fp";

export interface FormattedForecast {
  title: string;
  message: string;
}

export async function main(
  forecasts: ForecastEntry[],
  day: "today" | "tomorrow",
): Promise<FormattedForecast> {
  const dayOffset = day === "today" ? 0 : 1;
  const targetDate = addDays(new Date(), dayOffset);
  const targetForecasts = forecasts.filter((f) =>
    isSameDay(fromUnixTime(f.dt), targetDate),
  );

  if (!targetForecasts.length)
    return {
      title: "Weather - Helsinki",
      message: `No forecast available for ${format(targetDate, "yyyy-MM-dd")}`,
    };

  const temps = targetForecasts.map((f) => f.main.temp);
  const minTemp = Math.round(Math.min(...temps));
  const maxTemp = Math.round(Math.max(...temps));
  const feelsLike = targetForecasts.map((f) => f.main.feels_like);
  const minFeels = Math.round(Math.min(...feelsLike));
  const maxFeels = Math.round(Math.max(...feelsLike));

  const conditions = targetForecasts.map((f) => f.weather[0].description);
  const conditionCounts: Record<string, number> = {};
  conditions.forEach(
    (c) => (conditionCounts[c] = (conditionCounts[c] || 0) + 1),
  );
  const mainCondition = Object.entries(conditionCounts).sort(
    (a, b) => b[1] - a[1],
  )[0][0];

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

  const feelsMessage =
    minFeels < maxFeels ? `${minFeels}°C to ${maxFeels}°C` : `${minFeels}°C`;
  const tempMessage =
    minTemp < maxTemp ? `${minTemp}°C to ${maxTemp}°C` : `${minTemp}°C`;
  let message = `${feelsMessage}, ${mainCondition}\n\n`;
  message += `Temperature: ${tempMessage}\n`;
  message += `Wind: up to ${maxWind} m/s\n`;
  message += `Humidity: ~${avgHumidity}%\n`;

  if (totalRain > 0) {
    message += `Rain: ${totalRain.toFixed(1)} mm\n`;
  }
  if (totalSnow > 0) {
    message += `Snow: ${totalSnow.toFixed(1)} mm\n`;
  }

  const title = `${capitalize(day)}'s Weather - ${format(targetDate, "EEEE, MMMM d")}`;

  return { title, message };
}

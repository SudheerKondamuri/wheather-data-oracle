import { WeatherReported as WeatherReportedEvent } from "../generated/WeatherOracle/WeatherOracle"
import { WeatherReport } from "../generated/schema"

export function handleWeatherReported(event: WeatherReportedEvent): void {
  let entity = new WeatherReport(event.params.requestId)
  
  entity.city = event.params.city
  entity.temperature = event.params.temperature.toI32()
  entity.description = event.params.description
  entity.timestamp = event.params.timestamp
  entity.requester = event.transaction.from

  entity.save()
}
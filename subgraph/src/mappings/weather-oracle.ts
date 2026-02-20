import { WeatherReported as WeatherReportedEvent } from "../generated/WeatherOracle/WeatherOracle"
import { WeatherReport } from "../generated/schema"

export function handleWeatherReported(event: WeatherReportedEvent): void {
  // Check if entity already exists to handle idempotency requirement
  let entity = WeatherReport.load(event.params.requestId)
  
  if (entity == null) {
    entity = new WeatherReport(event.params.requestId)
  }
  
  entity.city = event.params.city
  entity.temperature = event.params.temperature.toI32()
  entity.description = event.params.description
  entity.timestamp = event.params.timestamp
  entity.requester = event.params.requester

  entity.save()
}
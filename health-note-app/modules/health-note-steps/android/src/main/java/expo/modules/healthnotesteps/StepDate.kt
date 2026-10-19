package expo.modules.healthnotesteps

import java.time.Instant
import java.time.ZoneId

fun stepDate(timeMillis: Long, zone: ZoneId = ZoneId.systemDefault()): String =
  Instant.ofEpochMilli(timeMillis).atZone(zone).toLocalDate().toString()

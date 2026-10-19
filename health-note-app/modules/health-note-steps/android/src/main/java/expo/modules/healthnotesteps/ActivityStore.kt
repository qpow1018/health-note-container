package expo.modules.healthnotesteps

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

class ActivityStore(context: Context) {
  private val prefs = context.getSharedPreferences("health-note-steps", Context.MODE_PRIVATE)
  fun load(date: String, time: Long): ActivityDay {
    val raw = prefs.getString("activity:$date", null) ?: return ActivityDay(date, time)
    val json = JSONObject(raw)
    val day = ActivityDay(date, json.getLong("since"))
    val hours = json.getJSONArray("hours")
    for (i in 0..23) {
      val item = hours.getJSONObject(i)
      day.hours[i].apply {
        steps = item.getLong("steps"); activeMs = item.getLong("activeMs")
        meters = item.getDouble("meters"); measuredMs = item.getLong("measuredMs")
      }
    }
    val sessions = json.getJSONArray("sessions")
    for (i in 0 until sessions.length()) day.sessions.add(readSession(sessions.getJSONObject(i)))
    if (!json.isNull("current")) day.current = readSession(json.getJSONObject("current"))
    return day
  }
  fun save(day: ActivityDay) {
    prefs.edit().putString("activity:${day.date}", json(day).toString()).apply()
  }
  fun snapshot(date: String): Map<String, Any?> {
    val day = load(date, System.currentTimeMillis())
    val sessions = day.sessions.toMutableList()
    day.current?.let { if (it.activeMs >= ActivityLedger.MIN_ACTIVITY) sessions.add(it) }
    return mapOf(
      "since" to day.since,
      "activeMs" to day.hours.sumOf { it.activeMs },
      "meters" to day.hours.sumOf { it.meters },
      "measuredMs" to day.hours.sumOf { it.measuredMs },
      "hours" to day.hours.mapIndexed { hour, it -> mapOf("hour" to hour, "steps" to it.steps, "activeMs" to it.activeMs, "meters" to it.meters, "measuredMs" to it.measuredMs) },
      "sessions" to sessions.map { mapOf("start" to it.start, "end" to it.end, "activeMs" to it.activeMs, "meters" to it.meters, "measuredMs" to it.measuredMs, "kind" to it.kind, "interrupted" to it.interrupted, "isOngoing" to (it === day.current)) }
    )
  }
  private fun json(day: ActivityDay) = JSONObject().apply {
    put("since", day.since)
    put("hours", JSONArray().apply { day.hours.forEach { h -> put(JSONObject().apply {
      put("steps", h.steps); put("activeMs", h.activeMs); put("meters", h.meters); put("measuredMs", h.measuredMs)
    }) } })
    put("sessions", JSONArray().apply { day.sessions.forEach { put(sessionJson(it)) } })
    put("current", day.current?.let { sessionJson(it) } ?: JSONObject.NULL)
  }
  private fun sessionJson(s: ActivitySession) = JSONObject().apply {
    put("start", s.start); put("end", s.end); put("activeMs", s.activeMs)
    put("meters", s.meters); put("measuredMs", s.measuredMs); put("kind", s.kind); put("interrupted", s.interrupted)
  }
  private fun readSession(s: JSONObject) = ActivitySession(s.getLong("start"), s.getLong("end"), s.getLong("activeMs"), s.getDouble("meters"), s.getLong("measuredMs"), s.getString("kind"), s.getBoolean("interrupted"))
}

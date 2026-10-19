package expo.modules.healthnotesteps

import android.content.Context

class StepStore(context: Context) {
  private val prefs = context.getSharedPreferences("health-note-steps", Context.MODE_PRIVATE)
  var failed: Boolean
    get() = prefs.getBoolean("failed", false)
    set(value) { prefs.edit().putBoolean("failed", value).commit() }

  fun date(timeMillis: Long = System.currentTimeMillis()): String =
    stepDate(timeMillis)

  fun steps(date: String = date()): Long = prefs.getLong("steps:$date", 0)
  fun resetToday() {
    check(prefs.edit().putLong("steps:${date()}", 0).commit()) { "Could not reset today's steps" }
  }
  fun add(date: String, delta: Long) {
    if (delta > 0) prefs.edit().putLong("steps:$date", steps(date) + delta).commit()
  }
}

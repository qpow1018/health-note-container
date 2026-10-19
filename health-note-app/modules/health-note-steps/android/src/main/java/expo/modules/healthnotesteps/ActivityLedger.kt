package expo.modules.healthnotesteps

import java.time.Instant
import java.time.ZoneId
import kotlin.math.*

data class ActivityHour(var steps: Long = 0, var activeMs: Long = 0, var meters: Double = 0.0, var measuredMs: Long = 0)
data class ActivitySession(val start: Long, var end: Long, var activeMs: Long = 0, var meters: Double = 0.0, var measuredMs: Long = 0, var kind: String = "on-foot", var interrupted: Boolean = false)
data class ActivityDay(val date: String, val since: Long, val hours: List<ActivityHour> = List(24) { ActivityHour() }, val sessions: MutableList<ActivitySession> = mutableListOf(), var current: ActivitySession? = null)
data class Position(val time: Long, val latitude: Double, val longitude: Double, val accuracy: Double)

// Short pauses stay in activity time; GPS lifetime and distance validation are separate.
class ActivityLedger(
  private val zone: ZoneId = ZoneId.systemDefault(),
  private val load: (String, Long) -> ActivityDay = { date, time -> ActivityDay(date, time) },
  private val save: (ActivityDay) -> Unit = {}
) {
  private val days = mutableMapOf<String, ActivityDay>()
  private var lastStep: Long? = null
  private var position: Position? = null
  private var pendingPosition: Position? = null
  private var currentDay: ActivityDay? = null
  private var kind = "on-foot"
  private var vehicle = false

  fun day(time: Long): ActivityDay {
    val date = Instant.ofEpochMilli(time).atZone(zone).toLocalDate().toString()
    return days.getOrPut(date) { load(date, time) }
  }
  fun recover(time: Long) {
    val day = day(time)
    day.current?.let { it.interrupted = true; finish(day) }
  }
  fun steps(time: Long, count: Long) {
    if (count <= 0) return
    val day = day(time)
    day.hours[Instant.ofEpochMilli(time).atZone(zone).hour].steps += count
    save(day)
  }
  fun activity(type: String) {
    vehicle = type == "vehicle"
    if (vehicle) {
      currentDay?.let { finish(it) }
      lastStep = null
      position = null
      pendingPosition = null
    } else if (type == "walking" || type == "running") kind = type
  }
  fun moving(time: Long): Boolean = !vehicle && lastStep?.let { time >= it - 2000 && time - it <= LOCATION_STEP_WINDOW } == true

  fun hasActivity(time: Long): Boolean = !vehicle && lastStep?.let { time >= it && time - it < END_GAP } == true

  fun step(time: Long) {
    if (vehicle || lastStep?.let { time <= it } == true) return
    tick(time)
    val day = day(time)
    val previous = lastStep
    val midnight = Instant.ofEpochMilli(time).atZone(zone).toLocalDate().atStartOfDay(zone).toInstant().toEpochMilli()
    if (currentDay?.date != day.date) {
      currentDay?.let {
        if (previous != null && time - previous < PAUSE_GAP) {
          distribute(previous, midnight) { hour, part -> hour.activeMs += part }
          it.current?.apply { activeMs += midnight - previous; end = midnight }
        }
        finish(it)
      }
      currentDay = day
    }
    if (day.current == null) day.current = ActivitySession(if (previous != null && time - previous < PAUSE_GAP) max(previous, midnight) else time, time, kind = kind)
    val session = day.current!!
    if (session.kind != kind) session.kind = "mixed"
    if (previous != null && time - previous < PAUSE_GAP) {
      val start = max(previous, Instant.ofEpochMilli(time).atZone(zone).toLocalDate().atStartOfDay(zone).toInstant().toEpochMilli())
      distribute(start, time) { hour, fraction -> hour.activeMs += fraction }
      session.activeMs += time - start
    } else { position = null; pendingPosition = null }
    session.end = time
    lastStep = time
    pendingPosition?.takeIf { it.time <= time }?.let { pendingPosition = null; location(it) }
    save(day)
  }
  fun tick(time: Long) {
    val previous = lastStep ?: return
    if (time - previous >= END_GAP) {
      currentDay?.let { finish(it) }
      currentDay = null
      lastStep = null
      position = null
      pendingPosition = null
    }
  }
  fun location(sample: Position) {
    if (!sample.latitude.isFinite() || !sample.longitude.isFinite() ||
      sample.latitude !in -90.0..90.0 || sample.longitude !in -180.0..180.0 ||
      !sample.accuracy.isFinite() || sample.accuracy < 0 || sample.accuracy > 25 || !moving(sample.time)) {
      position = null
      return
    }
    // A fix after the last step waits for the next step: stopped time is not measured time.
    if (sample.time > (lastStep ?: 0)) { pendingPosition = sample; return }
    val previous = position
    if (previous != null && sample.time <= previous.time) return
    if (previous == null) { position = sample; return }
    val duration = sample.time - previous.time
    if (duration > 15000 || day(previous.time).date != day(sample.time).date) { position = sample; return }
    val meters = distance(previous, sample)
    if (meters / (duration / 1000.0) > 8) { position = sample; return }
    if (meters < max(3.0, min(previous.accuracy, sample.accuracy) / 2)) return
    position = sample
    val session = currentDay?.current ?: return
    session.meters += meters
    session.measuredMs += duration
    distribute(previous.time, sample.time) { hour, part ->
      hour.meters += meters * part / duration
      hour.measuredMs += part
    }
    save(currentDay!!)
  }
  fun reset(time: Long) {
    val fresh = ActivityDay(day(time).date, time)
    days[fresh.date] = fresh
    if (currentDay?.date == fresh.date) currentDay = null
    lastStep = null
    position = null
    pendingPosition = null
    save(fresh)
  }
  private fun finish(day: ActivityDay) {
    day.current?.let { if (it.activeMs >= MIN_ACTIVITY) day.sessions.add(it) }
    day.current = null
    save(day)
  }
  private fun distribute(start: Long, end: Long, add: (ActivityHour, Long) -> Unit) {
    var cursor = start
    while (cursor < end) {
      val local = Instant.ofEpochMilli(cursor).atZone(zone)
      val nextHour = local.withMinute(0).withSecond(0).withNano(0).plusHours(1).toInstant().toEpochMilli()
      val until = min(end, nextHour)
      val day = day(cursor)
      add(day.hours[local.hour], until - cursor)
      cursor = until
    }
  }
  companion object {
    const val PAUSE_GAP = 30000L
    private const val LOCATION_STEP_WINDOW = 3000L
    const val END_GAP = 180000L
    const val MIN_ACTIVITY = 180000L
    fun distance(a: Position, b: Position): Double {
      val latitude = Math.toRadians(b.latitude - a.latitude)
      val longitude = Math.toRadians(b.longitude - a.longitude)
      val h = sin(latitude / 2).pow(2) + cos(Math.toRadians(a.latitude)) * cos(Math.toRadians(b.latitude)) * sin(longitude / 2).pow(2)
      return 6371000 * 2 * asin(sqrt(h.coerceIn(0.0, 1.0)))
    }
  }
}

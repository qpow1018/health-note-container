package expo.modules.healthnotesteps

// A new listener starts with a baseline: never backfill an unobserved interval.
class StepCounter {
  private var previous: Long? = null
  private var ignoreThrough = Long.MIN_VALUE
  fun reset(timestampNanos: Long) {
    previous = null
    ignoreThrough = timestampNanos
  }
  fun record(total: Long, timestampNanos: Long = Long.MAX_VALUE): Long {
    if (timestampNanos <= ignoreThrough) return 0
    val last = previous
    previous = total
    return if (last == null || total < last) 0 else total - last
  }
}

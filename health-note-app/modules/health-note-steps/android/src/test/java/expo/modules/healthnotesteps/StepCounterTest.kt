package expo.modules.healthnotesteps

import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.Instant
import java.time.ZoneId

class StepCounterTest {
  @Test fun resetIgnoresQueuedEventsAndRebasesBeforeCountingAgain() {
    val counter = StepCounter()
    counter.record(100, 10)
    assertEquals(10L, counter.record(110, 20))
    counter.reset(30)
    assertEquals(0L, counter.record(115, 25))
    assertEquals(0L, counter.record(120, 30))
    assertEquals(0L, counter.record(125, 40))
    assertEquals(5L, counter.record(130, 50))
  }

  @Test fun usesLocalDateAcrossMidnightInsteadOfUtcOrDeliveryDate() {
    val zone = ZoneId.of("Asia/Seoul")
    assertEquals("2026-10-19", stepDate(Instant.parse("2026-10-19T14:59:59Z").toEpochMilli(), zone))
    assertEquals("2026-10-20", stepDate(Instant.parse("2026-10-19T15:00:00Z").toEpochMilli(), zone))
  }

  @Test fun excludesStepsBeforeOptInAndDuplicateReadings() {
    val counter = StepCounter()
    assertEquals(0L, counter.record(1200))
    assertEquals(17L, counter.record(1217))
    assertEquals(0L, counter.record(1217))
    assertEquals(3L, counter.record(1220))
  }
  @Test fun sensorResetDoesNotSubtractSavedSteps() {
    val counter = StepCounter()
    counter.record(900)
    assertEquals(0L, counter.record(2))
    assertEquals(4L, counter.record(6))
  }
  @Test fun newServiceDoesNotBackfillAnUnobservedGap() {
    val first = StepCounter()
    first.record(100)
    assertEquals(10L, first.record(110))
    val restarted = StepCounter()
    assertEquals(0L, restarted.record(200))
    assertEquals(5L, restarted.record(205))
  }
}

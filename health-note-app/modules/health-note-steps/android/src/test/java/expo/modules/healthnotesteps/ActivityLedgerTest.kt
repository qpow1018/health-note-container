package expo.modules.healthnotesteps

import org.junit.Assert.*
import org.junit.Test
import java.time.Instant
import java.time.ZoneId

class ActivityLedgerTest {
  private val zone = ZoneId.of("Asia/Seoul")
  private val start = Instant.parse("2026-10-19T00:00:00Z").toEpochMilli()
  private fun walk(ledger: ActivityLedger, from: Long, seconds: Int) {
    for (second in 0..seconds) ledger.step(from + second * 1000L)
  }
  @Test fun pausesShorterThanThirtySecondsStayInActivityTime() {
    val ledger = ActivityLedger(zone)
    ledger.step(start)
    ledger.step(start + 29000)
    assertEquals(29000L, ledger.day(start).hours[9].activeMs)
  }
  @Test fun pausesOfThirtySecondsOrMoreDoNotAddWaitingTime() {
    val ledger = ActivityLedger(zone)
    ledger.step(start)
    ledger.step(start + 30000)
    assertEquals(0L, ledger.day(start).hours[9].activeMs)
    ledger.step(start + 31000)
    assertEquals(1000L, ledger.day(start).hours[9].activeMs)
  }
  @Test fun gpsLifetimeSurvivesSignalWaitButStationaryFixesDoNotAddDistance() {
    val ledger = ActivityLedger(zone)
    walk(ledger, start, 10)
    ledger.location(Position(start + 8000, 37.0, 127.0, 5.0))
    assertTrue(ledger.hasActivity(start + 130000))
    ledger.location(Position(start + 130000, 37.00005, 127.0, 5.0))
    assertEquals(0.0, ledger.day(start).hours[9].meters, 0.001)
    assertFalse(ledger.hasActivity(start + 190000))
    ledger.tick(start + 190000)
    assertFalse(ledger.hasActivity(start + 190000))
  }
  @Test fun shortMovementRemainsInHoursButNotSessions() {
    val ledger = ActivityLedger(zone)
    ledger.steps(start, 20)
    walk(ledger, start, 20)
    ledger.tick(start + 200000)
    assertEquals(20L, ledger.day(start).hours[9].steps)
    assertEquals(20000L, ledger.day(start).hours[9].activeMs)
    assertTrue(ledger.day(start).sessions.isEmpty())
  }
  @Test fun trafficWaitIsExcludedAndResumingWithinThreeMinutesKeepsSession() {
    val ledger = ActivityLedger(zone)
    walk(ledger, start, 100)
    walk(ledger, start + 250000, 100)
    ledger.tick(start + 530000)
    val session = ledger.day(start).sessions.single()
    assertEquals(200000L, session.activeMs)
    assertEquals(start, session.start)
    assertEquals(start + 350000, session.end)
    assertEquals(200000L, ledger.day(start).hours.sumOf { it.activeMs })
  }
  @Test fun thresholdAndThreeMinuteStopSplitActivities() {
    val ledger = ActivityLedger(zone)
    walk(ledger, start, 180)
    ledger.step(start + 360000)
    assertEquals(1, ledger.day(start).sessions.size)
    assertEquals(start + 180000, ledger.day(start).sessions[0].end)
    assertEquals(0L, ledger.day(start).current!!.activeMs)
  }
  @Test fun timeIsSplitAtHourAndMidnight() {
    val ledger = ActivityLedger(zone)
    val boundary = Instant.parse("2026-10-19T15:00:00Z").toEpochMilli()
    walk(ledger, boundary - 2000, 4)
    assertEquals(2000L, ledger.day(boundary - 1).hours[23].activeMs)
    assertEquals(2000L, ledger.day(boundary).hours[0].activeMs)
  }
  @Test fun badGpsVehicleAndPauseAreNotAddedAsDistance() {
    val ledger = ActivityLedger(zone)
    walk(ledger, start, 10)
    ledger.location(Position(start + 8000, 37.0, 127.0, 5.0))
    ledger.location(Position(start + 10000, 37.00005, 127.0, 5.0))
    val measured = ledger.day(start).hours[9].meters
    assertTrue(measured in 5.0..6.0)
    ledger.location(Position(start + 11000, 38.0, 127.0, 80.0))
    ledger.location(Position(start + 100000, 38.0, 127.0, 5.0))
    ledger.activity("vehicle")
    ledger.step(start + 101000)
    ledger.location(Position(start + 101000, 38.1, 127.0, 5.0))
    assertEquals(measured, ledger.day(start).hours[9].meters, 0.001)
  }
  @Test fun smallValidDisplacementsAccumulateInsteadOfBeingLostToAccuracyFilter() {
    val ledger = ActivityLedger(zone)
    walk(ledger, start, 10)
    ledger.location(Position(start + 8000, 37.0, 127.0, 10.0))
    ledger.location(Position(start + 9000, 37.00003, 127.0, 10.0))
    ledger.location(Position(start + 10000, 37.00006, 127.0, 10.0))
    assertTrue(ledger.day(start).hours[9].meters in 6.0..7.0)
  }
  @Test fun locationAfterLastStepIsNotCountedDuringSignalWait() {
    val ledger = ActivityLedger(zone)
    walk(ledger, start, 10)
    ledger.location(Position(start + 8000, 37.0, 127.0, 5.0))
    ledger.location(Position(start + 11000, 37.00005, 127.0, 5.0))
    assertEquals(0.0, ledger.day(start).hours[9].meters, 0.001)
    ledger.tick(start + 190000)
    assertEquals(0.0, ledger.day(start).hours[9].meters, 0.001)
  }
  @Test fun resetOnlyClearsTodayAndCannotConnectAcrossReset() {
    val ledger = ActivityLedger(zone)
    ledger.steps(start - 86400000, 50)
    ledger.steps(start, 100)
    walk(ledger, start, 180)
    ledger.reset(start + 181000)
    ledger.step(start + 182000)
    assertEquals(50L, ledger.day(start - 86400000).hours[9].steps)
    assertEquals(0L, ledger.day(start).hours.sumOf { it.steps })
    assertEquals(0L, ledger.day(start).current!!.activeMs)
    assertTrue(ledger.day(start).sessions.isEmpty())
  }
  @Test fun processRecoveryFinishesAtLastObservedMovementWithoutFillingGap() {
    val saved = ActivityDay("2026-10-19", start, current = ActivitySession(start, start + 180000, 180000))
    val ledger = ActivityLedger(zone, load = { _, _ -> saved })
    ledger.recover(start + 3600000)
    assertTrue(saved.sessions.single().interrupted)
    assertEquals(start + 180000, saved.sessions.single().end)
    assertNull(saved.current)
  }
}

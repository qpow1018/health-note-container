package expo.modules.healthnotesteps

import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.exception.Exceptions

class HealthNoteStepsModule : Module() {
  private val context get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("HealthNoteSteps")
    AsyncFunction("snapshot") {
      val store = StepStore(context)
      val supported = (context.getSystemService(Context.SENSOR_SERVICE) as SensorManager)
        .getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null
      val permitted = StepTrackingService.hasPermission(context)
      val status = when {
        !supported -> "unsupported"
        !permitted -> "permission"
        store.failed -> "error"
        !store.enabled -> "disabled"
        StepTrackingService.running -> "tracking"
        else -> "stopped"
      }
      val date = store.date()
      mapOf("date" to date, "steps" to store.steps(date).toDouble(), "status" to status, "enabled" to store.enabled)
    }
    AsyncFunction("start") {
      check(StepTrackingService.hasPermission(context)) { "Activity permission required" }
      val store = StepStore(context)
      store.enabled = true
      store.failed = false
      try { StepTrackingService.start(context) }
      catch (error: Exception) { store.failed = true; throw error }
    }
    AsyncFunction("reset") {
      StepTrackingService.resetToday(context)
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("stop") {
      val store = StepStore(context)
      store.enabled = false
      store.failed = false
      context.stopService(Intent(context, StepTrackingService::class.java))
    }
  }
}

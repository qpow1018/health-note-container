package expo.modules.healthnotesteps

import android.content.Context
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
        StepTrackingService.running -> "tracking"
        else -> "stopped"
      }
      val date = store.date()
      mapOf("date" to date, "steps" to store.steps(date).toDouble(), "status" to status,
        "activity" to ActivityStore(context).snapshot(date),
        "locationStatus" to StepTrackingService.locationStatus(context),
        "recognitionReady" to StepTrackingService.recognitionReady,
        "hasStepDetector" to ((context.getSystemService(Context.SENSOR_SERVICE) as SensorManager).getDefaultSensor(Sensor.TYPE_STEP_DETECTOR) != null))
    }
    AsyncFunction("start") {
      check(StepTrackingService.hasPermission(context)) { "Activity permission required" }
      val store = StepStore(context)
      store.failed = false
      try { StepTrackingService.start(context) }
      catch (error: Exception) { store.failed = true; throw error }
    }
    AsyncFunction("reset") {
      StepTrackingService.resetToday(context)
    }.runOnQueue(Queues.MAIN)
  }
}

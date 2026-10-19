package expo.modules.healthnotesteps

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.ActivityTransitionResult
import com.google.android.gms.location.DetectedActivity

class ActivityReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val result = ActivityTransitionResult.extractResult(intent) ?: return
    result.transitionEvents.forEach {
      if (it.transitionType != ActivityTransition.ACTIVITY_TRANSITION_ENTER) return@forEach
      val kind = when (it.activityType) {
        DetectedActivity.WALKING -> "walking"
        DetectedActivity.RUNNING -> "running"
        DetectedActivity.IN_VEHICLE -> "vehicle"
        else -> "still"
      }
      if (StepTrackingService.hasPermission(context)) {
        val service = Intent(context, StepTrackingService::class.java).putExtra("activity", kind)
        try { context.startForegroundService(service) }
        catch (_: Exception) { StepStore(context).failed = true }
      }
    }
  }
}

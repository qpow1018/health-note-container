package expo.modules.healthnotesteps

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class StepBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
    val store = StepStore(context)
    if (!StepTrackingService.hasPermission(context)) return
    try { StepTrackingService.start(context) }
    catch (_: Exception) { store.failed = true }
  }
}

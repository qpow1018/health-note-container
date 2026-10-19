package expo.modules.healthnotesteps

import android.Manifest
import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.hardware.*
import android.os.Build
import android.os.IBinder
import android.os.SystemClock

class StepTrackingService : Service(), SensorEventListener {
  private lateinit var sensors: SensorManager
  private lateinit var store: StepStore
  private val counter = StepCounter()

  override fun onCreate() {
    super.onCreate()
    instance = this
    store = StepStore(this)
    sensors = getSystemService(Context.SENSOR_SERVICE) as SensorManager
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (!hasPermission(this)) {
      stopSelf()
      return START_NOT_STICKY
    }
    if (running) return START_STICKY
    try {
      val manager = getSystemService(NotificationManager::class.java)
      manager.createNotificationChannel(NotificationChannel(CHANNEL, "자동 걸음 기록", NotificationManager.IMPORTANCE_LOW))
      val openApp = packageManager.getLaunchIntentForPackage(packageName)!!
      val pending = PendingIntent.getActivity(this, 0, openApp, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
      val notification = Notification.Builder(this, CHANNEL)
        .setSmallIcon(android.R.drawable.ic_menu_directions)
        .setContentTitle("Health Note가 걸음을 기록하고 있어요")
        .setContentText("휴대폰을 가지고 걸으면 자동으로 기록해요. 화면을 꺼도 자동으로 기록해요.")
        .setContentIntent(pending).setOngoing(true).build()
      if (Build.VERSION.SDK_INT >= 34) startForeground(701, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH)
      else startForeground(701, notification)
      val sensor = sensors.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
      if (sensor == null || !sensors.registerListener(this, sensor, SensorManager.SENSOR_DELAY_NORMAL, 0)) {
        throw IllegalStateException("Step sensor unavailable")
      }
      running = true
      store.failed = false
      return START_STICKY
    } catch (_: Exception) {
      store.failed = true
      stopSelf()
      return START_NOT_STICKY
    }
  }

  override fun onSensorChanged(event: SensorEvent) {
    if (!hasPermission(this)) { stopSelf(); return }
    val delta = counter.record(event.values[0].toLong(), event.timestamp)
    // Sensor time is monotonic. Use the event time, not delayed delivery time.
    val eventTime = System.currentTimeMillis() - (SystemClock.elapsedRealtimeNanos() - event.timestamp) / 1_000_000
    store.add(store.date(eventTime), delta)
  }
  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
  override fun onBind(intent: Intent?): IBinder? = null
  override fun onDestroy() {
    sensors.unregisterListener(this)
    running = false
    instance = null
    super.onDestroy()
  }

  companion object {
    private var instance: StepTrackingService? = null
    // Runs on the main queue, like sensor callbacks, so reset and writes cannot interleave.
    fun resetToday(context: Context) {
      StepStore(context).resetToday()
      instance?.counter?.reset(SystemClock.elapsedRealtimeNanos())
    }
    private const val CHANNEL = "health-note-steps"
    @Volatile var running = false
      private set
    fun hasPermission(context: Context) = Build.VERSION.SDK_INT < 29 ||
      context.checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED
    fun start(context: Context) {
      context.startForegroundService(Intent(context, StepTrackingService::class.java))
    }
  }
}

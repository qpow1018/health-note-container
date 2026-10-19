package expo.modules.healthnotesteps

import android.Manifest
import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.hardware.*
import android.location.LocationManager
import android.os.*
import com.google.android.gms.location.*

class StepTrackingService : Service(), SensorEventListener {
  private lateinit var sensors: SensorManager
  private lateinit var store: StepStore
  private lateinit var activities: ActivityStore
  private lateinit var ledger: ActivityLedger
  private val counter = StepCounter()
  private val handler = Handler(Looper.getMainLooper())
  private val location by lazy { LocationServices.getFusedLocationProviderClient(this) }
  private var hasDetector = false
  private var locationRequested = false
  private var locationFailed = false
  private var motionHintUntil = 0L
  private var ignoreThrough = Long.MIN_VALUE
  private val locationCallback = object : LocationCallback() {
    override fun onLocationResult(result: LocationResult) {
      if (!hasLocationPermission(this@StepTrackingService)) { updateLocation(); return }
      result.locations.forEach {
        val time = eventTime(it.elapsedRealtimeNanos)
        if (System.currentTimeMillis() - time in 0..15000 && it.elapsedRealtimeNanos > ignoreThrough) {
          ledger.location(Position(time, it.latitude, it.longitude, if (it.hasAccuracy()) it.accuracy.toDouble() else Double.POSITIVE_INFINITY))
        }
      }
      updateLocation()
    }
  }
  private val tick = object : Runnable {
    override fun run() {
      ledger.tick(System.currentTimeMillis())
      updateLocation()
      handler.postDelayed(this, 5000)
    }
  }

  override fun onCreate() {
    super.onCreate()
    instance = this
    store = StepStore(this)
    activities = ActivityStore(this)
    ledger = ActivityLedger(load = activities::load, save = activities::save)
    ledger.recover(System.currentTimeMillis())
    sensors = getSystemService(Context.SENSOR_SERVICE) as SensorManager
  }
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (!hasPermission(this)) { stopSelf(); return START_NOT_STICKY }
    locationFailed = false
    if (!running) {
      try {
        promote(false)
        val sensor = sensors.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        check(sensor != null && sensors.registerListener(this, sensor, SensorManager.SENSOR_DELAY_NORMAL, 0))
        val detector = sensors.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
        hasDetector = detector != null && sensors.registerListener(this, detector, SensorManager.SENSOR_DELAY_NORMAL, 0)
        running = true
        store.failed = false
        registerActivities()
        handler.post(tick)
      } catch (_: Exception) {
        store.failed = true
        stopSelf()
        return START_NOT_STICKY
      }
    }
    intent?.getStringExtra("activity")?.let {
      ledger.activity(it)
      motionHintUntil = if (it == "walking" || it == "running") System.currentTimeMillis() + 15000 else 0
    }
    updateLocation()
    return START_STICKY
  }
  private fun registerActivities() {
    val transitions = listOf(DetectedActivity.WALKING, DetectedActivity.RUNNING, DetectedActivity.STILL, DetectedActivity.IN_VEHICLE).map {
      ActivityTransition.Builder().setActivityType(it).setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_ENTER).build()
    }
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0
    val pending = PendingIntent.getBroadcast(this, 702, Intent(this, ActivityReceiver::class.java), flags)
    ActivityRecognition.getClient(this).requestActivityTransitionUpdates(ActivityTransitionRequest(transitions), pending)
      .addOnSuccessListener { recognitionReady = true }
      .addOnFailureListener { recognitionReady = false }
  }
  private fun promote(withLocation: Boolean) {
    val manager = getSystemService(NotificationManager::class.java)
    manager.createNotificationChannel(NotificationChannel(CHANNEL, "자동 활동 기록", NotificationManager.IMPORTANCE_LOW))
    val pending = PendingIntent.getActivity(this, 0, packageManager.getLaunchIntentForPackage(packageName), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    val notification = Notification.Builder(this, CHANNEL)
      .setSmallIcon(android.R.drawable.ic_menu_directions)
      .setContentTitle(if (withLocation) "움직임을 감지해 이동 거리를 기록하고 있어요" else "Health Note가 활동을 기록하고 있어요")
      .setContentText(if (withLocation) "위치가 확인된 구간의 거리와 속도를 기록해요." else "화면을 꺼도 걸음과 활동 시간을 자동으로 기록해요.")
      .setContentIntent(pending).setOngoing(true).setOnlyAlertOnce(true).build()
    if (Build.VERSION.SDK_INT >= 34) {
      val type = ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH or if (withLocation) ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION else 0
      startForeground(701, notification, type)
    } else if (Build.VERSION.SDK_INT >= 29) {
      startForeground(701, notification, if (withLocation) ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION else 0)
    } else startForeground(701, notification)
  }
  private fun updateLocation() {
    val shouldMeasure = hasLocationPermission(this) && gpsEnabled(this) && (ledger.hasActivity(System.currentTimeMillis()) || System.currentTimeMillis() < motionHintUntil)
    if (!shouldMeasure) {
      if (locationRequested) {
        location.removeLocationUpdates(locationCallback)
        locationRequested = false
        promote(false)
      }
      return
    }
    if (locationRequested || locationFailed) return
    try {
      promote(true)
      locationRequested = true
      location.requestLocationUpdates(LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 3000)
        .setMinUpdateIntervalMillis(1000).setMaxUpdateAgeMillis(0).build(), locationCallback, Looper.getMainLooper())
        .addOnFailureListener { locationRequested = false; locationFailed = true; promote(false) }
    } catch (_: Exception) { locationRequested = false; locationFailed = true; promote(false) }
  }
  override fun onSensorChanged(event: SensorEvent) {
    if (!hasPermission(this)) { stopSelf(); return }
    if (event.timestamp <= ignoreThrough) return
    val time = eventTime(event.timestamp)
    if (event.sensor.type == Sensor.TYPE_STEP_COUNTER) {
      val delta = counter.record(event.values[0].toLong(), event.timestamp)
      store.add(store.date(time), delta)
      ledger.steps(time, delta)
      if (!hasDetector && delta > 0) ledger.step(time)
    } else ledger.step(time)
    updateLocation()
  }
  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
  override fun onBind(intent: Intent?): IBinder? = null
  override fun onDestroy() {
    handler.removeCallbacks(tick)
    sensors.unregisterListener(this)
    location.removeLocationUpdates(locationCallback)
    running = false
    recognitionReady = false
    instance = null
    super.onDestroy()
  }
  companion object {
    private const val CHANNEL = "health-note-steps"
    private var instance: StepTrackingService? = null
    @Volatile var running = false
      private set
    @Volatile var recognitionReady = false
      private set
    private fun eventTime(nanos: Long) = System.currentTimeMillis() - (SystemClock.elapsedRealtimeNanos() - nanos) / 1_000_000
    fun resetToday(context: Context) {
      StepStore(context).resetToday()
      val now = System.currentTimeMillis()
      instance?.let {
        it.ignoreThrough = SystemClock.elapsedRealtimeNanos()
        it.counter.reset(it.ignoreThrough)
        it.motionHintUntil = 0
        it.ledger.reset(now)
        it.locationFailed = false
        it.updateLocation()
      } ?: ActivityStore(context).save(ActivityDay(stepDate(now), now))
    }
    fun hasPermission(context: Context) = Build.VERSION.SDK_INT < 29 ||
      context.checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED
    fun hasFineLocation(context: Context) = context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
    fun hasLocationPermission(context: Context) = hasFineLocation(context) && (Build.VERSION.SDK_INT < 29 ||
      context.checkSelfPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED)
    private fun gpsEnabled(context: Context) = (context.getSystemService(Context.LOCATION_SERVICE) as LocationManager).isProviderEnabled(LocationManager.GPS_PROVIDER)
    fun locationStatus(context: Context): String = when {
      !hasFineLocation(context) -> "permission"
      !hasLocationPermission(context) -> "background-permission"
      !gpsEnabled(context) -> "disabled"
      instance?.locationFailed == true -> "error"
      instance?.locationRequested == true -> "tracking"
      else -> "waiting"
    }
    fun start(context: Context) { context.startForegroundService(Intent(context, StepTrackingService::class.java)) }
  }
}

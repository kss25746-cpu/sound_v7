package expo.modules.outputvolume

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.math.log10

/**
 * 미디어 볼륨이 지금 출력 장치에서 **실제로 몇 dB 감쇠하는지** 알려 준다.
 *
 * 킵얼라이브 잡음을 볼륨과 상관없이 이어폰 DAC에 같은 크기로 닿게 맞추는 데 쓴다
 * (`src/audio/outputKeepAlive.ts`). 볼륨 단계(0~15)가 아니라 dB를 주는 이유: 단계→감쇠
 * 곡선이 장치(스피커 · USB · 블루투스)마다 다르다. `getStreamVolumeDb`는 오디오 정책이
 * 실제로 쓰는 값과 같다(`APM computeVolume` 로그와 일치).
 */
class OutputVolumeModule : Module() {
  private val context: Context?
    get() = appContext.reactContext

  private val audioManager: AudioManager?
    get() = context?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

  private var volumeReceiver: BroadcastReceiver? = null
  private var deviceCallback: AudioDeviceCallback? = null

  override fun definition() = ModuleDefinition {
    Name("OutputVolume")

    Events("onChange")

    /** 미디어 볼륨 감쇠(dB, 0 = 최대). 알 수 없으면 null, 음소거면 -Infinity가 올 수 있다 */
    Function("getMusicVolumeDb") { musicVolumeDb() }

    OnStartObserving { startObserving() }
    OnStopObserving { stopObserving() }
    OnDestroy { stopObserving() }
  }

  private fun musicVolumeDb(): Double? {
    val am = audioManager ?: return null
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
      return null
    }
    return try {
      val index = am.getStreamVolume(AudioManager.STREAM_MUSIC)
      val raw = am.getStreamVolumeDb(AudioManager.STREAM_MUSIC, index, mediaDeviceType(am)).toDouble()
      toDb(index, raw)
    } catch (e: Exception) {
      null
    }
  }

  /**
   * `getStreamVolumeDb` 결과를 dB로 맞춘다. 이름과 달리 **0~1 선형 배율**을 주는 기기가 있다
   * (삼성 SC-01M, 2026-10-15 logcat: 5/15 → 0.0199, 15/15 → 1.0). 양수면 배율로 보고 바꾼다.
   * 0단계(음소거)는 null — −∞는 브리지로 넘기지 않는다. 음소거라 킵얼라이브 크기는 상관없다.
   */
  private fun toDb(index: Int, raw: Double): Double? = when {
    index == 0 -> null
    raw > 0.0 -> 20.0 * log10(raw)
    else -> raw
  }

  /** 미디어 소리가 지금 나가는 장치 종류 */
  private fun mediaDeviceType(am: AudioManager): Int {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      val attrs = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).build()
      am.getAudioDevicesForAttributes(attrs).firstOrNull()?.let { return it.type }
    }
    val outputs = am.getDevices(AudioManager.GET_DEVICES_OUTPUTS).map { it.type }.toSet()
    return FALLBACK_PRIORITY.firstOrNull { it in outputs } ?: AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
  }

  private fun emitChange() {
    sendEvent("onChange", mapOf("db" to musicVolumeDb()))
  }

  private fun startObserving() {
    val ctx = context ?: return
    val am = audioManager ?: return
    if (volumeReceiver == null) {
      val receiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, intent: Intent?) = emitChange()
      }
      val filter = IntentFilter(VOLUME_CHANGED_ACTION)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        ctx.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
      } else {
        ctx.registerReceiver(receiver, filter)
      }
      volumeReceiver = receiver
    }
    if (deviceCallback == null) {
      // 이어폰을 꽂고 빼면 같은 볼륨 단계라도 감쇠 dB가 바뀐다
      val callback = object : AudioDeviceCallback() {
        override fun onAudioDevicesAdded(added: Array<out AudioDeviceInfo>?) = emitChange()
        override fun onAudioDevicesRemoved(removed: Array<out AudioDeviceInfo>?) = emitChange()
      }
      am.registerAudioDeviceCallback(callback, Handler(Looper.getMainLooper()))
      deviceCallback = callback
    }
  }

  private fun stopObserving() {
    volumeReceiver?.let { receiver ->
      try {
        context?.unregisterReceiver(receiver)
      } catch (e: Exception) {
        /* 이미 해제됨 */
      }
    }
    volumeReceiver = null
    deviceCallback?.let { audioManager?.unregisterAudioDeviceCallback(it) }
    deviceCallback = null
  }

  companion object {
    /** 숨은 시스템 브로드캐스트지만 볼륨 변경을 알리는 사실상 표준 */
    private const val VOLUME_CHANGED_ACTION = "android.media.VOLUME_CHANGED_ACTION"

    private val FALLBACK_PRIORITY = listOf(
      AudioDeviceInfo.TYPE_USB_HEADSET,
      AudioDeviceInfo.TYPE_USB_DEVICE,
      AudioDeviceInfo.TYPE_WIRED_HEADSET,
      AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
      AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
      AudioDeviceInfo.TYPE_BUILTIN_SPEAKER,
    )
  }
}

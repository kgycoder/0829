package com.sync.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * WebView/Activity가 백그라운드로 가더라도(홈 버튼, 화면 잠금 등) 음악 재생이
 * 끊기지 않도록 하는 전경(foreground) 서비스.
 *
 * - MediaSessionCompat을 Activity가 아닌 이 서비스가 소유 → Activity가 일시
 *   정지되어도 잠금화면/알림의 재생 컨트롤이 계속 살아있음.
 * - PARTIAL_WAKE_LOCK으로 화면이 꺼져도 CPU가 잠들지 않게 하여 오디오 디코딩이
 *   끊기지 않게 함.
 * - startForeground()로 프로세스 우선순위를 올려 OS가 백그라운드 상태의 앱
 *   프로세스를 freeze/kill 하지 않도록 함(Android의 백그라운드 앱 정지 정책 대응).
 *
 * 실제 재생 자체(YouTube IFrame / 로컬 <audio>)는 여전히 WebView 안의 JS가
 * 담당하며, 이 서비스는 그 재생 상태를 반영한 시스템 미디어 컨트롤만 담당한다.
 */
public class PlaybackService extends Service {

    public interface CommandBridge {
        void onMediaCommand(String cmd);
    }

    private static final String CHANNEL_ID = "sync_playback";
    private static final int NOTI_ID = 1001;

    public static final String ACTION_PLAY = "com.sync.app.action.PLAY";
    public static final String ACTION_PAUSE = "com.sync.app.action.PAUSE";
    public static final String ACTION_NEXT = "com.sync.app.action.NEXT";
    public static final String ACTION_PREV = "com.sync.app.action.PREV";
    public static final String ACTION_STOP = "com.sync.app.action.STOP";

    private final IBinder binder = new LocalBinder();
    private MediaSessionCompat session;
    private PowerManager.WakeLock wakeLock;
    private CommandBridge bridge;

    private String title = "";
    private String artist = "";
    private boolean playing = false;
    private boolean foregroundStarted = false;

    // ── 백그라운드 오디오 폴백 (WebView의 유튜브 iframe 영상 디코딩이
    //    앱 백그라운드 진입 시 끊기는 것을 우회하기 위해 네이티브로 재생) ──
    private static final String TAG = "SYNC-Playback";
    private final ExecutorService bgExecutor = Executors.newSingleThreadExecutor();
    private MediaPlayer nativePlayer;
    private volatile boolean backgroundAudioActive = false;
    private volatile String resolvedVideoId;
    private volatile String resolvedUrl;

    public class LocalBinder extends Binder {
        PlaybackService getService() { return PlaybackService.this; }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();

        session = new MediaSessionCompat(this, "SYNC");
        session.setCallback(new MediaSessionCompat.Callback() {
            @Override public void onPlay()             { dispatch("play"); }
            @Override public void onPause()            { dispatch("pause"); }
            @Override public void onSkipToNext()        { dispatch("next"); }
            @Override public void onSkipToPrevious()     { dispatch("prev"); }
        });
        session.setActive(true);

        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SYNC:playbackWakeLock");
            wakeLock.setReferenceCounted(false);
        }

        // startForegroundService()로 시작된 경우 5초 안에 startForeground()를
        // 호출해야 한다. 아직 재생 트랙 정보가 없어도 우선 자리표시자 알림으로
        // 시작하고, 실제 트랙이 오면 updateMedia()가 내용을 갱신한다.
        startForeground(NOTI_ID, buildNotification());
        foregroundStarted = true;
    }

    public void setCommandBridge(CommandBridge bridge) {
        this.bridge = bridge;
    }

    private void dispatch(String cmd) {
        if (bridge != null) bridge.onMediaCommand(cmd);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        if (action != null) {
            switch (action) {
                case ACTION_PLAY:  dispatch("play");  break;
                case ACTION_PAUSE: dispatch("pause"); break;
                case ACTION_NEXT:  dispatch("next");  break;
                case ACTION_PREV:  dispatch("prev");  break;
                case ACTION_STOP:
                    dispatch("pause");
                    releaseWakeLock();
                    stopForeground(true);
                    foregroundStarted = false;
                    stopSelf();
                    break;
                default: break;
            }
        }
        return START_NOT_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    /** JS -> Native "mediaState" 브릿지 메시지를 그대로 받아 세션/알림/웨이크락을 갱신 */
    public void updateMedia(JSONObject msg) {
        title = msg.optString("title", title);
        artist = msg.optString("artist", artist);
        long positionMs = (long) (msg.optDouble("position", 0) * 1000);
        long durationMs = (long) (msg.optDouble("duration", 0) * 1000);
        playing = msg.optBoolean("playing", false);

        session.setMetadata(new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
                .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, Math.max(0, durationMs))
                .build());

        long actions = PlaybackStateCompat.ACTION_PLAY
                | PlaybackStateCompat.ACTION_PAUSE
                | PlaybackStateCompat.ACTION_PLAY_PAUSE
                | PlaybackStateCompat.ACTION_SKIP_TO_NEXT
                | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS;

        int state = playing
                ? PlaybackStateCompat.STATE_PLAYING
                : PlaybackStateCompat.STATE_PAUSED;

        session.setPlaybackState(new PlaybackStateCompat.Builder()
                .setActions(actions)
                .setState(state, Math.max(0, positionMs), 1f)
                .build());

        if (playing) {
            acquireWakeLock();
        } else {
            releaseWakeLock();
        }

        if (title != null && !title.isEmpty()) {
            startForeground(NOTI_ID, buildNotification());
            foregroundStarted = true;
        }
    }

    private void acquireWakeLock() {
        if (wakeLock != null && !wakeLock.isHeld()) {
            // 안전장치로 최대 6시간 후 자동 해제 (재생 중이면 mediaState가 계속 들어와 재획득됨)
            wakeLock.acquire(6 * 60 * 60 * 1000L);
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }

    /** 트랙이 바뀔 때마다 미리 오디오 스트림 URL을 백그라운드로 캐싱해 전환 지연을 줄인다. */
    public void prefetchStreamUrl(Context appContext, String videoId) {
        if (videoId == null || videoId.isEmpty() || videoId.equals(resolvedVideoId)) return;
        bgExecutor.submit(() -> {
            try {
                String url = LocalMediaDownloader.resolveAudioStreamUrl(appContext, videoId);
                resolvedVideoId = videoId;
                resolvedUrl = url;
            } catch (Exception e) {
                Log.w(TAG, "stream prefetch failed for " + videoId, e);
            }
        });
    }

    /**
     * WebView가 백그라운드로 가서 유튜브 iframe 영상 디코딩이 끊기기 전에,
     * 같은 오디오를 네이티브 MediaPlayer로 이어서 재생한다.
     */
    public void startBackgroundAudio(Context appContext, String videoId, double positionSec) {
        if (videoId == null || videoId.isEmpty()) return;
        stopNativePlayerInternal();
        backgroundAudioActive = true;
        bgExecutor.submit(() -> {
            try {
                String url = (videoId.equals(resolvedVideoId)) ? resolvedUrl : null;
                if (url == null) url = LocalMediaDownloader.resolveAudioStreamUrl(appContext, videoId);

                MediaPlayer mp = new MediaPlayer();
                mp.setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build());
                mp.setDataSource(url);
                mp.setOnPreparedListener(p -> {
                    try {
                        p.seekTo((int) (positionSec * 1000));
                        p.start();
                    } catch (Exception e) {
                        Log.w(TAG, "native resume failed", e);
                    }
                });
                mp.setOnErrorListener((p, w, e2) -> true);
                mp.prepareAsync();
                nativePlayer = mp;
            } catch (Exception e) {
                Log.w(TAG, "startBackgroundAudio failed for " + videoId, e);
                backgroundAudioActive = false;
            }
        });
    }

    /** 포그라운드로 복귀 시 네이티브 재생을 멈추고, WebView 쪽이 이어받을 위치(초)를 돌려준다. */
    public double stopBackgroundAudio() {
        if (!backgroundAudioActive) return -1;
        double pos = stopNativePlayerInternal();
        backgroundAudioActive = false;
        return pos;
    }

    private double stopNativePlayerInternal() {
        double pos = -1;
        MediaPlayer mp = nativePlayer;
        nativePlayer = null;
        if (mp != null) {
            try { pos = mp.getCurrentPosition() / 1000.0; } catch (Exception ignored) {}
            try { mp.stop(); } catch (Exception ignored) {}
            try { mp.release(); } catch (Exception ignored) {}
        }
        return pos;
    }

    private Notification buildNotification() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT
                | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);

        PendingIntent piPlayPause = PendingIntent.getService(this, 1,
                new Intent(this, PlaybackService.class).setAction(playing ? ACTION_PAUSE : ACTION_PLAY),
                flags);
        PendingIntent piNext = PendingIntent.getService(this, 2,
                new Intent(this, PlaybackService.class).setAction(ACTION_NEXT), flags);
        PendingIntent piPrev = PendingIntent.getService(this, 3,
                new Intent(this, PlaybackService.class).setAction(ACTION_PREV), flags);
        PendingIntent piStop = PendingIntent.getService(this, 4,
                new Intent(this, PlaybackService.class).setAction(ACTION_STOP), flags);
        PendingIntent piContent = PendingIntent.getActivity(this, 0,
                new Intent(this, MainActivity.class), flags);

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification_music)
                .setContentTitle(title == null || title.isEmpty() ? "SYNC" : title)
                .setContentText(artist)
                .setContentIntent(piContent)
                .setDeleteIntent(piStop)
                .setOnlyAlertOnce(true)
                .setOngoing(playing)
                .setShowWhen(false)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .addAction(android.R.drawable.ic_media_previous, "이전", piPrev)
                .addAction(
                        playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                        playing ? "일시정지" : "재생",
                        piPlayPause)
                .addAction(android.R.drawable.ic_media_next, "다음", piNext)
                .setStyle(new MediaStyle()
                        .setMediaSession(session.getSessionToken())
                        .setShowActionsInCompactView(0, 1, 2));

        return b.build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null && nm.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel ch = new NotificationChannel(
                        CHANNEL_ID, "SYNC 재생 중", NotificationManager.IMPORTANCE_LOW);
                ch.setShowBadge(false);
                ch.setSound(null, null);
                nm.createNotificationChannel(ch);
            }
        }
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        // 최근앱 목록에서 앱을 스와이프해서 지워도, 재생 중이면 세션(알림 +
        // 미디어세션 + 네이티브 오디오)을 계속 살려둔다. 재생 중이 아닐 때만
        // 실제 음악 앱들과 동일하게 함께 종료한다.
        if (!playing && !backgroundAudioActive) {
            stopNativePlayerInternal();
            releaseWakeLock();
            stopForeground(true);
            stopSelf();
        }
    }

    @Override
    public void onDestroy() {
        stopNativePlayerInternal();
        bgExecutor.shutdownNow();
        releaseWakeLock();
        if (session != null) {
            session.setActive(false);
            session.release();
        }
        super.onDestroy();
    }
}
package com.sync.app;

import android.content.Context;
import android.util.Log;

import com.yausername.youtubedl_android.YoutubeDL;
import com.yausername.youtubedl_android.YoutubeDLRequest;

import java.io.File;
import java.io.IOException;
import java.util.concurrent.atomic.AtomicBoolean;

import kotlin.Unit;
import kotlin.jvm.functions.Function3;

/** yt-dlp 기반 YouTube 오디오 다운로드 */
public final class LocalMediaDownloader {

    private static final String TAG = "SYNC-DL";
    private static final AtomicBoolean INITIALIZED = new AtomicBoolean(false);
    private static final Object INIT_LOCK = new Object();

    public interface ProgressListener {
        void onProgress(int percent);
    }

    private LocalMediaDownloader() {}

    public static void ensureInitialized(Context context) throws Exception {
        if (INITIALIZED.get()) return;
        synchronized (INIT_LOCK) {
            if (INITIALIZED.get()) return;
            Context app = context.getApplicationContext();
            YoutubeDL.getInstance().init(app);
            YoutubeDL.getInstance().updateYoutubeDL(app, YoutubeDL.UpdateChannel._STABLE);
            INITIALIZED.set(true);
            Log.i(TAG, "yt-dlp initialized");
        }
    }

    public static File download(
            Context context,
            LocalMediaStore store,
            String videoId,
            ProgressListener listener) throws Exception {
        ensureInitialized(context);
        store.deleteMedia(videoId);

        String url = "https://www.youtube.com/watch?v=" + videoId;
        YoutubeDLRequest request = new YoutubeDLRequest(url);
        request.addOption("-f", "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best");
        request.addOption("-o", store.outputTemplate(videoId));
        request.addOption("--no-playlist");
        request.addOption("--no-part");
        request.addOption("--newline");

        YoutubeDL.getInstance().execute(request, null, new Function3<Float, Long, String, Unit>() {
            @Override
            public Unit invoke(Float progress, Long etaInSeconds, String line) {
                if (listener != null) listener.onProgress(Math.round(progress));
                return Unit.INSTANCE;
            }
        });

        File file = store.findMediaFile(videoId);
        if (file == null) {
            throw new IOException("다운로드 파일을 찾을 수 없습니다");
        }
        Log.i(TAG, "saved " + videoId + " -> " + file.getName() + " (" + file.length() + " bytes)");
        return file;
    }

    /**
     * 파일로 저장하지 않고, 재생 가능한 오디오 스트림의 직접 URL만 가져온다.
     * 앱이 백그라운드로 갔을 때 WebView의 유튜브 iframe(영상) 디코딩이 끊기는 대신
     * 네이티브 MediaPlayer로 이 URL을 재생해 오디오를 이어가기 위해 사용한다.
     */
    public static String resolveAudioStreamUrl(Context context, String videoId) throws Exception {
        ensureInitialized(context);
        String url = "https://www.youtube.com/watch?v=" + videoId;
        YoutubeDLRequest request = new YoutubeDLRequest(url);
        request.addOption("-f", "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio");
        request.addOption("--no-playlist");

        com.yausername.youtubedl_android.mapper.VideoInfo info =
                YoutubeDL.getInstance().getInfo(request);
        if (info == null || info.getUrl() == null || info.getUrl().isEmpty()) {
            throw new IOException("스트림 URL을 가져오지 못했습니다: " + videoId);
        }
        return info.getUrl();
    }
}
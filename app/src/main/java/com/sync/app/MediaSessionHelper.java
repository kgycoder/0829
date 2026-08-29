package com.sync.app;

import android.content.Context;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import org.json.JSONObject;

/** 잠금 화면·이어폰 등 시스템 미디어 컨트롤 */
public class MediaSessionHelper {

    public interface CommandBridge {
        void onMediaCommand(String cmd);
    }

    private final MediaSessionCompat session;
    private final CommandBridge bridge;

    public MediaSessionHelper(Context context, CommandBridge bridge) {
        this.bridge = bridge;
        session = new MediaSessionCompat(context, "SYNC");
        session.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                bridge.onMediaCommand("play");
            }

            @Override
            public void onPause() {
                bridge.onMediaCommand("pause");
            }

            @Override
            public void onSkipToNext() {
                bridge.onMediaCommand("next");
            }

            @Override
            public void onSkipToPrevious() {
                bridge.onMediaCommand("prev");
            }
        });
        session.setActive(true);
    }

    public void update(JSONObject msg) {
        String title = msg.optString("title", "");
        String artist = msg.optString("artist", "");
        long positionMs = (long) (msg.optDouble("position", 0) * 1000);
        long durationMs = (long) (msg.optDouble("duration", 0) * 1000);
        boolean playing = msg.optBoolean("playing", false);

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
    }

    public void release() {
        session.setActive(false);
        session.release();
    }
}

package com.sync.app;

import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/** 로컬에 저장된 YouTube 오디오/영상 파일 관리 */
public final class LocalMediaStore {

    private static final String[] EXTENSIONS = {
            ".m4a", ".webm", ".opus", ".mp3", ".mp4", ".mkv", ".ogg"
    };

    private final File dir;

    public LocalMediaStore(File baseDir) {
        dir = new File(baseDir, "sync_local");
        //noinspection ResultOfMethodCallIgnored
        dir.mkdirs();
    }

    public File getDir() {
        return dir;
    }

    public File findMediaFile(String videoId) {
        return findMediaFile(dir, videoId);
    }

    public static File findMediaFile(File dir, String videoId) {
        if (videoId == null || videoId.isEmpty()) return null;
        for (String ext : EXTENSIONS) {
            File f = new File(dir, videoId + ext);
            if (f.isFile() && f.length() > 0) return f;
        }
        File[] files = dir.listFiles();
        if (files == null) return null;
        for (File f : files) {
            if (!f.isFile() || f.length() == 0) continue;
            String name = f.getName();
            if (name.startsWith(videoId + ".") || name.equals(videoId)) return f;
        }
        return null;
    }

    public void deleteMedia(String videoId) {
        File f = findMediaFile(videoId);
        if (f != null) //noinspection ResultOfMethodCallIgnored
            f.delete();
    }

    public static String guessMimeType(File file) {
        String name = file.getName().toLowerCase();
        if (name.endsWith(".m4a")) return "audio/mp4";
        if (name.endsWith(".mp3")) return "audio/mpeg";
        if (name.endsWith(".opus") || name.endsWith(".ogg")) return "audio/ogg";
        if (name.endsWith(".webm")) return "audio/webm";
        if (name.endsWith(".mp4") || name.endsWith(".mkv")) return "video/mp4";
        return "application/octet-stream";
    }

    public String outputTemplate(String videoId) {
        return new File(dir, videoId + ".%(ext)s").getAbsolutePath();
    }

    /** Range 요청 지원 — 가사 클릭 seek 등에 필요 */
    public static WebResourceResponse openWithRange(File file, WebResourceRequest request)
            throws IOException {
        String mime = guessMimeType(file);
        long length = file.length();
        Map<String, String> headers = new HashMap<>();
        headers.put("Accept-Ranges", "bytes");

        String rangeHeader = null;
        if (request != null && request.getRequestHeaders() != null) {
            rangeHeader = request.getRequestHeaders().get("Range");
            if (rangeHeader == null) rangeHeader = request.getRequestHeaders().get("range");
        }

        if (rangeHeader == null || !rangeHeader.regionMatches(true, 0, "bytes=", 0, 6)) {
            headers.put("Content-Length", String.valueOf(length));
            return new WebResourceResponse(mime, null, 200, "OK", headers, new FileInputStream(file));
        }

        long start = 0;
        long end = length - 1;
        String spec = rangeHeader.substring(6).trim();
        int dash = spec.indexOf('-');
        if (dash >= 0) {
            if (dash > 0) start = Long.parseLong(spec.substring(0, dash));
            if (dash < spec.length() - 1) end = Long.parseLong(spec.substring(dash + 1));
        }
        start = Math.max(0, start);
        end = Math.min(end, length - 1);
        if (start > end || start >= length) {
            headers.put("Content-Range", "bytes */" + length);
            return new WebResourceResponse(mime, null, 416, "Range Not Satisfiable", headers, null);
        }

        long contentLength = end - start + 1;
        headers.put("Content-Length", String.valueOf(contentLength));
        headers.put("Content-Range", "bytes " + start + "-" + end + "/" + length);

        InputStream stream = new LocalMediaRangeStream(file, start, contentLength);
        return new WebResourceResponse(mime, null, 206, "Partial Content", headers, stream);
    }
}

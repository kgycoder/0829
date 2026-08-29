package com.sync.app;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.RandomAccessFile;

/** 로컬 미디어 파일의 byte-range 읽기 (HTML5 audio seek 지원) */
final class LocalMediaRangeStream extends InputStream {

    private final RandomAccessFile raf;
    private long remaining;

    LocalMediaRangeStream(File file, long start, long length) throws IOException {
        raf = new RandomAccessFile(file, "r");
        raf.seek(start);
        remaining = length;
    }

    @Override
    public int read() throws IOException {
        if (remaining <= 0) return -1;
        int b = raf.read();
        if (b >= 0) remaining--;
        return b;
    }

    @Override
    public int read(byte[] buf, int off, int len) throws IOException {
        if (remaining <= 0) return -1;
        int toRead = (int) Math.min(len, remaining);
        int n = raf.read(buf, off, toRead);
        if (n > 0) remaining -= n;
        return n;
    }

    @Override
    public void close() throws IOException {
        raf.close();
    }
}

package com.brr.medi_pcr.Util;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Component
public class QrCodeUtil {

    private static final int DEFAULT_WIDTH = 350;
    private static final int DEFAULT_HEIGHT = 350;

    /**
     * Generates a PNG byte array for the given text payload using ZXing.
     */
    public byte[] generateQrCodeBytes(String text, int width, int height) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.CHARACTER_SET, StandardCharsets.UTF_8.name());
            hints.put(EncodeHintType.MARGIN, 2);
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.H);

            BitMatrix bitMatrix = qrCodeWriter.encode(text, BarcodeFormat.QR_CODE, width, height, hints);
            ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", pngOutputStream);
            return pngOutputStream.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate QR code: " + e.getMessage(), e);
        }
    }

    public byte[] generateQrCodeBytes(String text) {
        return generateQrCodeBytes(text, DEFAULT_WIDTH, DEFAULT_HEIGHT);
    }

    /**
     * Generates a Base64 Data URL (data:image/png;base64,...) for direct frontend rendering.
     */
    public String generateQrCodeBase64(String text, int width, int height) {
        byte[] bytes = generateQrCodeBytes(text, width, height);
        return "data:image/png;base64," + Base64.getEncoder().encodeToString(bytes);
    }

    public String generateQrCodeBase64(String text) {
        return generateQrCodeBase64(text, DEFAULT_WIDTH, DEFAULT_HEIGHT);
    }
}

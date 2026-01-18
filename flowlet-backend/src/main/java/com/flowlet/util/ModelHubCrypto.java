package com.flowlet.util;

import com.flowlet.config.FlowletProperties;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * 模型配置密钥加密工具
 */
@Component
@RequiredArgsConstructor
public class ModelHubCrypto {

    private static final String AES_GCM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_BITS = 128;
    private static final int IV_LENGTH = 12;
    private static final String VERSION_PREFIX = "v1";

    private final FlowletProperties flowletProperties;
    private SecretKey secretKey;

    @PostConstruct
    public void init() {
        String keySource = flowletProperties.getSecurity().getModelHubKey();
        if (keySource == null || keySource.isBlank()) {
            keySource = "flowlet-default-model-hub-key";
        }
        this.secretKey = new SecretKeySpec(sha256(keySource), "AES");
    }

    public String encrypt(String plainText) {
        if (plainText == null || plainText.isBlank()) {
            return null;
        }
        try {
            byte[] iv = new byte[IV_LENGTH];
            new SecureRandom().nextBytes(iv);
            Cipher cipher = Cipher.getInstance(AES_GCM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            return VERSION_PREFIX
                    + ":"
                    + Base64.getEncoder().encodeToString(iv)
                    + ":"
                    + Base64.getEncoder().encodeToString(cipherText);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to encrypt model provider key", e);
        }
    }

    public String decrypt(String encrypted) {
        if (encrypted == null || encrypted.isBlank()) {
            return null;
        }
        try {
            String[] parts = encrypted.split(":", 3);
            if (parts.length != 3) {
                return null;
            }
            byte[] iv = Base64.getDecoder().decode(parts[1]);
            byte[] cipherText = Base64.getDecoder().decode(parts[2]);
            Cipher cipher = Cipher.getInstance(AES_GCM);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] plain = cipher.doFinal(cipherText);
            return new String(plain, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to decrypt model provider key", e);
        }
    }

    private byte[] sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return digest.digest(input.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to init crypto key", e);
        }
    }
}

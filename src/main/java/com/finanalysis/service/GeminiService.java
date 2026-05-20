package com.finanalysis.service;

import com.finanalysis.config.GeminiProperties;
import com.finanalysis.dto.InterpretRequestDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class GeminiService {

    private final GeminiProperties props;

    private static final String API_BASE =
            "https://generativelanguage.googleapis.com/v1beta/models";

    private static final RestClient REST_CLIENT;

    static {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(15_000);
        factory.setReadTimeout(120_000);
        REST_CLIENT = RestClient.builder().requestFactory(factory).build();
    }

    @SuppressWarnings("unchecked")
    public String interpret(InterpretRequestDto request) {
        if (props.apiKey() == null || props.apiKey().isBlank()) {
            throw new IllegalArgumentException(
                    "Gemini API anahtarı tanımlanmamış. " +
                    "GEMINI_API_KEY ortam değişkenini veya gemini.api-key özelliğini ayarlayın.");
        }

        String url = API_BASE + "/" + props.model() + ":generateContent?key=" + props.apiKey();

        String prompt = buildPrompt(request);
        System.out.println("=== GEMINI PROMPT (chars=" + prompt.length() + ") ===");
        System.out.println(prompt);
        System.out.println("=== END PROMPT ===");
        log.info("=== GEMINI PROMPT (chars={}) ===\n{}", prompt.length(), prompt);

        var body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of(
                        "temperature", 0.3,
                        "maxOutputTokens", 16384,
                        "thinkingConfig", Map.of("thinkingBudget", 0)
                )
        );

        Map<String, Object> response = callWithRetry(url, body);

        if (response == null) {
            throw new RuntimeException("Gemini API boş yanıt döndü");
        }

        var error = (Map<?, ?>) response.get("error");
        if (error != null) {
            throw new RuntimeException("Gemini API hatası: " + error.get("message"));
        }

        var candidates = (List<Map<String, Object>>) response.get("candidates");
        if (candidates == null || candidates.isEmpty()) {
            throw new RuntimeException("Gemini API geçerli bir aday yanıt döndürmedi");
        }

        var content = (Map<String, Object>) candidates.get(0).get("content");
        var parts = (List<Map<String, Object>>) content.get("parts");
        var finishReason = (String) candidates.get(0).get("finishReason");
        String result = (String) parts.get(0).get("text");
        System.out.println("=== GEMINI RESPONSE (chars=" + (result != null ? result.length() : 0) + ", finishReason=" + finishReason + ") ===");
        log.info("Gemini response: chars={}, finishReason={}", result != null ? result.length() : 0, finishReason);
        return result;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> callWithRetry(String url, Map<String, Object> body) {
        int[] delaysSeconds = {2, 5, 10};
        Exception lastEx = null;
        for (int attempt = 0; attempt <= delaysSeconds.length; attempt++) {
            try {
                return REST_CLIENT.post()
                        .uri(url)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(Map.class);
            } catch (Exception e) {
                lastEx = e;
                String msg = e.getMessage() != null ? e.getMessage() : "";
                boolean retryable = msg.contains("503") || msg.contains("429") || msg.contains("UNAVAILABLE");
                if (!retryable || attempt == delaysSeconds.length) break;
                try { TimeUnit.SECONDS.sleep(delaysSeconds[attempt]); } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        throw new RuntimeException("Gemini API çağrısı başarısız: " + (lastEx != null ? lastEx.getMessage() : "bilinmeyen hata"), lastEx);
    }

    private String buildPrompt(InterpretRequestDto req) {
        var sb = new StringBuilder();

        sb.append("Sen deneyimli bir finansal analist ve kredi uzmanısın. ")
          .append("Aşağıdaki finansal analiz verilerini değerlendir.\n\n")
          .append("ŞİRKET: ").append(req.companyName()).append("\n")
          .append("DÖNEM(LER): ").append(String.join(", ", req.periods())).append("\n\n");

        if (req.ratioRows() != null && !req.ratioRows().isEmpty()) {
            sb.append("=== RASYO ANALİZİ ===\n");
            for (var row : req.ratioRows()) {
                sb.append(row.name());
                if (row.category() != null && !row.category().isBlank()) {
                    sb.append(" [").append(translateCategory(row.category())).append("]");
                }
                sb.append(":\n");
                for (var period : req.periods()) {
                    Double val = row.periodValues() != null ? row.periodValues().get(period) : null;
                    String err = row.errors() != null ? row.errors().get(period) : null;
                    sb.append("  ").append(period).append(": ");
                    if (err != null && !err.isBlank()) sb.append("hesaplanamadı");
                    else if (val != null)               sb.append(String.format("%.4f", val));
                    else                                sb.append("-");
                    sb.append("\n");
                }
            }
            sb.append("\n");
        }

        if (req.summaryTables() != null && !req.summaryTables().isEmpty()) {
            for (var table : req.summaryTables()) {
                sb.append("=== ").append(table.tableType().toUpperCase(java.util.Locale.ROOT)).append(" ===\n");
                sb.append(String.format("%-35s %15s", "Kalem", table.period1()));
                if (table.period2() != null && !table.period2().isBlank())
                    sb.append(String.format(" %15s %10s", table.period2(), "Değişim%"));
                sb.append("\n");
                for (var item : table.items()) {
                    sb.append(String.format("%-35s %15s",
                            item.label(),
                            item.val1() != null ? String.format("%,.0f", item.val1()) : "-"));
                    if (table.period2() != null && !table.period2().isBlank()) {
                        String v2 = item.val2() != null ? String.format("%,.0f", item.val2()) : "-";
                        String pct = "-";
                        if (item.val1() != null && item.val2() != null && item.val2() != 0) {
                            double change = (item.val1() - item.val2()) / Math.abs(item.val2()) * 100;
                            pct = String.format("%+.1f%%", change);
                        }
                        sb.append(String.format(" %15s %10s", v2, pct));
                    }
                    sb.append("\n");
                }
                sb.append("\n");
            }
        }

        if (req.adjustmentRows() != null && !req.adjustmentRows().isEmpty()) {
            sb.append("=== ARINDIRMA / DÜZELTME SONUÇLARI ===\n");
            for (var adj : req.adjustmentRows()) {
                sb.append(adj.ruleName()).append(":\n");
                for (var item : adj.items()) {
                    sb.append("  ").append(item.name()).append(": ");
                    if (item.value() != null) sb.append(String.format("%,.2f", item.value()));
                    else sb.append("-");
                    sb.append("\n");
                }
            }
            sb.append("\n");
        }

        sb.append("""
                === GÖREV ===
                Yukarıdaki verilere dayanarak aşağıdaki 7 başlık altında kapsamlı bir finansal yorum yaz.
                Her başlığı büyük harfle ve numarayla yaz, altına paragraf halinde açıklama ekle.
                Markdown sembolleri (**, #, *, `) KULLANMA; sade düz metin yaz.
                Dönem kıyaslaması varsa trendi belirt (iyileşme / kötüleşme).
                Sayısal değerlere doğrudan atıfta bulun.

                1. GENEL FİNANSAL SAĞLIK DEĞERLENDİRMESİ
                2. LİKİDİTE DURUMU
                3. BORÇ VE KALDIRAC YAPISI
                4. KARLILIK VE VERİMLİLİK
                5. GÜÇLÜ YÖNLER
                6. ZAYIF YÖNLER VE RİSKLER
                7. ÖNERİLER
                """);

        return sb.toString();
    }

    private String translateCategory(String category) {
        return switch (category) {
            case "LIQUIDITY"     -> "Likidite";
            case "LEVERAGE"      -> "Kaldıraç";
            case "PROFITABILITY" -> "Karlılık";
            case "ACTIVITY"      -> "Faaliyet";
            default              -> category;
        };
    }
}

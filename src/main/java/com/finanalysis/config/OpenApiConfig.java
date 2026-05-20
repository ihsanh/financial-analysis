package com.finanalysis.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI financialAnalysisOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Finansal Analiz API")
                        .description("""
                                Kredi analizi ve finansal tablo işleme için REST API.

                                ## Temel Kullanım Akışı

                                1. `POST /api/companies` — firma kaydı oluştur (vergi no: 10 haneli sayısal)
                                2. `POST /api/statements/upload-multi` — Excel'den tüm dönemleri yükle
                                3. `GET /api/item-defs` — yüklenen kalem kodlarını görüntüle
                                4. `POST /api/ratio-rules` — oran analizi kuralı tanımla
                                5. `POST /api/adjustment-rules` — düzeltme adımı tanımla
                                6. `POST /api/analysis` — rasyo ve düzeltme hesaplamalarını çalıştır
                                7. `POST /api/analysis/interpret` — tüm verileri Gemini AI ile yorumla

                                ## Formül Sözdizimi

                                Formüller `{KOD}` token'leri ile yazılır.
                                - Örnek: `{FI0001} / {FI0002}`
                                - Operatörler: `+` `-` `*` `/` `(` `)`
                                - Kalem kodları `/api/item-defs` endpoint'inden alınır.

                                ## Dönem Formatı

                                Dönemler `YYYY/M` formatında belirtilir.
                                - Örnek: `2025/9` (Eylül 2025), `2024/12` (Aralık 2024)

                                ## AI Finansal Yorum

                                `POST /api/analysis/interpret` endpoint'i rasyo sonuçları, düzeltme kalemleri
                                ve finansal tablo özetini (Gelir Tablosu + Bilanço + Nakit Akım) alıp
                                Google Gemini 2.5 Flash modeli üzerinden Türkçe yorumlama üretir.
                                Gereksinim: `GEMINI_API_KEY` ortam değişkeni tanımlı olmalıdır.
                                """)
                        .version("1.0.0")
                        .contact(new Contact().name("Finansal Analiz Platformu"))
                )
                .tags(List.of(
                        new Tag().name("Firma")
                                .description("Firma oluşturma, güncelleme ve silme"),
                        new Tag().name("Finansal Tablolar")
                                .description("Excel yükleme (tekli / çok dönemli), dönem listeleme, kalem görüntüleme"),
                        new Tag().name("Kalem Tanımları")
                                .description("Yüklenen tablolardan otomatik oluşan kod–isim sözlüğü"),
                        new Tag().name("Rasyo Kuralları")
                                .description("Formül bazlı oran analizi kuralları (Cari Oran, FAVÖK/Borç vb.)"),
                        new Tag().name("Düzeltme Kuralları")
                                .description("Adım adım finansal tablo düzeltme / yeniden sınıflandırma kuralları"),
                        new Tag().name("Analiz")
                                .description("Seçili dönem için rasyo ve düzeltme hesaplamalarını tek seferde çalıştırma; `POST /interpret` ile Gemini AI yorumu alma")
                ));
    }
}

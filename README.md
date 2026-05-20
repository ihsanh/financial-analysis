# Finansal Analiz Platformu

Kredi analizi ve finansal tablo işleme uygulaması. Şirketlere ait bilanço, gelir tablosu ve mizan verilerini Excel'den yükler; kullanıcı tanımlı formüllerle rasyo hesaplar ve finansal tablo düzeltmeleri uygular.

---

## İçindekiler

- [Teknoloji Yığını](#teknoloji-yığını)
- [Mimari](#mimari)
- [Özellikler](#özellikler)
- [Yerel Geliştirme](#yerel-geliştirme)
- [Excel Dosya Formatı](#excel-dosya-formatı)
- [Formül Sözdizimi](#formül-sözdizimi)
- [API Kataloğu](#api-kataloğu)
- [Docker ile Çalıştırma](#docker-ile-çalıştırma)
- [OpenShift Deployment](#openshift-deployment)
- [Yapılandırma Referansı](#yapılandırma-referansı)

---

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Backend | Spring Boot 3.2.3 · Java 17 · Spring Data JPA |
| Veritabanı | H2 (dosya tabanlı, geliştirme) · PostgreSQL (üretim) |
| Frontend | React 18 · TypeScript · Vite · Ant Design 5 |
| Excel okuma | Apache POI 5.2.5 |
| Formül motoru | Spring Expression Language (SpEL) |
| API dokümantasyonu | SpringDoc OpenAPI 2.5 (Swagger UI) |
| Build | Maven 3 · frontend-maven-plugin |
| Container | Docker (multi-stage) · OpenShift |

---

## Mimari

```
┌─────────────────────────────────────────┐
│               Tarayıcı                  │
│   React + Ant Design (Vite → JAR içi)  │
└────────────────────┬────────────────────┘
                     │ HTTP /api/**
┌────────────────────▼────────────────────┐
│           Spring Boot (8080)            │
│                                         │
│  Controllers → Services → Repositories  │
│                                         │
│  ┌──────────────┐  ┌──────────────────┐ │
│  │ ExcelParser  │  │  AnalysisService │ │
│  │  (Apache POI)│  │  (SpEL formüller)│ │
│  └──────────────┘  └──────────────────┘ │
└────────────────────┬────────────────────┘
                     │ JPA
┌────────────────────▼────────────────────┐
│    H2 (geliştirme) / PostgreSQL (üretim) │
└─────────────────────────────────────────┘
```

React uygulaması Maven build sırasında derlenir ve Spring Boot JAR'ının `/static` klasörüne gömülür. Tek bir JAR dağıtımı yeterlidir.

---

## Özellikler

### Firma Yönetimi
- Firma oluşturma, güncelleme, silme
- Sektör ve vergi numarası bilgisi

### Finansal Tablo Yükleme
- **Tekli yükleme** — bir Excel dosyası, bir dönem
- **Çoklu yükleme** — Excel başlık satırındaki tüm dönem sütunları otomatik okunur, her dönem için ayrı kayıt oluşturulur
- Desteklenen tablo tipleri: `BALANCE_SHEET` (Bilanço), `INCOME_STATEMENT` (Gelir Tablosu), `TRIAL_BALANCE` (Mizan)
- Aynı firma + dönem + tip kombinasyonu varsa güncelleme yapılır
- Her kalem için Excel'deki girinti seviyesi (`level`) korunur; formül önerilerinde ve kalem eşleştirmesinde kullanılır

### Kalem Tanımları (Item Defs)
- Yükleme sırasında her benzersiz kalem ismi `FI0001`, `FI0002` … şeklinde otomatik bir koda bağlanır
- Kod–isim sözlüğü `GET /api/item-defs` ile sorgulanır
- Kalem kodları Excel'e özgü değildir; aynı isim her yüklemede aynı kodu alır
- Hiçbir tabloda kullanılmayan tanımlar `DELETE /api/item-defs/orphans` ile temizlenir

### Rasyo Analizi
- Kullanıcı tanımlı formüller (`{FI0001} / {FI0002}` sözdizimi)
- Kategori desteği: `LIQUIDITY`, `LEVERAGE`, `PROFITABILITY`, `ACTIVITY`, `OTHER`
- Aktif/pasif yönetimi (pasif kurallar analizde atlanır)
- Analiz sırasında her token çözümlenir; bulunamayan kalemler hata mesajıyla raporlanır

### Finansal Tablo Düzeltme
- Adım adım hesaplama kuralları (her adım önceki adımın çıktısını kullanabilir)
- FAVÖK, Net Borç gibi türetilmiş kalemlerin oluşturulması için kullanılır

### Analiz Sayfası
- **Özet Finansallar** — seçili iki dönemi karşılaştıran özet tablo (Özet Gelir Tablosu + Özet Bilanço)
- **Finansal Tablo Görünümü** — orijinal veya arındırılmış görünüm, çok dönemli karşılaştırma
- **Rasyo Analizi** — çok dönemli rasyo tablosu, hesaplama detayı tooltip'i

### Formül Editörü
- Otomatik tamamlama: kalem adı yazılırken canlı filtreleme
- `{KOD}` sözdizimi arka planda tutulur, ön yüzde kalem adları gösterilir
- Klavye navigasyonu (↑ ↓ Enter Escape)

---

## Yerel Geliştirme

### Gereksinimler

- Java 17+
- Maven 3.8+
- Node.js 20+ (frontend-maven-plugin otomatik indirir)

### Çalıştırma

```bash
# H2 profiliyle başlat (veri ./data/financial_analysis dosyasında tutulur)
mvn spring-boot:run -Dspring-boot.run.profiles=h2
```

Uygulama `http://localhost:8080` adresinde açılır.

### Frontend Geliştirme (hot-reload)

```bash
cd src/main/frontend
npm install
npm run dev   # → http://localhost:5173  (proxy: localhost:8080)
```

`vite.config.ts` içindeki proxy ayarı `/api` isteklerini otomatik olarak backend'e yönlendirir.

### H2 Konsolu

`http://localhost:8080/h2-console`

| Alan | Değer |
|---|---|
| JDBC URL | `jdbc:h2:file:./data/financial_analysis` |
| Kullanıcı | `sa` |
| Şifre | _(boş)_ |

### Veri Sıfırlama

```bash
# Uygulama kapalıyken
rm -rf data/
```

---

## Excel Dosya Formatı

Uygulama `.xlsx` formatını bekler. İlk sekme (Sheet 0) okunur.

### Çok Dönemli Format (Önerilen)

```
| A (Kod) | B (Kalem Adı)          | 2025/9     | 2024/9     | 2024/6     |
|---------|------------------------|------------|------------|------------|
| 100     | Dönen Varlıklar        |            |            |            |
| 101     |   Nakit ve Benzerleri  | 5.000.000  | 4.200.000  | 3.800.000  |
| 102     |   Ticari Alacaklar     | 12.000.000 | 10.500.000 | 9.800.000  |
```

- **A sütunu**: İsteğe bağlı kod (boşsa kalem adından üretilir)
- **B sütunu**: Kalem adı (girinti seviyesi = öndeki boşluk sayısı / 2)
- **C+ sütunları**: `YYYY/M` veya `YYYY/MM` formatında dönem başlıkları

### Mizan Formatı

```
| A (Kod) | B (Kalem Adı) | 2025/9 Borç | 2025/9 Alacak | 2024/9 Borç | 2024/9 Alacak |
```

Dönem sütunları çiftler halinde gelir. Başlıkta `Borç`/`Alacak` (veya `D`/`C`, `Debit`/`Credit`) anahtar sözcükleri aranır.

### Girinti Seviyesi (level)

Excel'de kalem adının önündeki boşluk miktarı girinti seviyesini belirler:

- `level = 0` → bölüm başlığı (örn. "DÖNEN VARLIKLAR")
- `level ≥ 1` → detay kalem veya toplam satırı

Rasyo önerileri ve kalem eşleştirmesi `level ≥ 1` olan satırları tercih eder.

---

## Formül Sözdizimi

### Temel Kullanım

```
{FI0001} / {FI0002}
({FI0003} + {FI0004}) * 100
{FI0010} - {FI0011} - {FI0012}
```

### Token Çözümleme

Her `{KOD}` analiz sırasında yüklenen finansal tablodaki kalem değeriyle eşleştirilir.  
Kalem bulunamazsa `error` alanı dolu, `value` alanı `null` döner.

### Kalem Kodlarını Bulma

```http
GET /api/item-defs?type=BALANCE_SHEET
```

Veya arayüzde formül editöründe kalem adı yazmaya başlayın — otomatik tamamlama açılır.

### Düzeltme Adımlarında Zincirleme

```
Adım 1: outputCode = ADJ_BRUT_KAR
        formula    = {FI0100} - {FI0200}

Adım 2: outputCode = ADJ_FAVOK
        formula    = {ADJ_BRUT_KAR} + {FI0300} + {FI0301}
```

---

## API Kataloğu

Uygulama çalışırken Swagger UI'ya erişin:

```
http://localhost:8080/swagger-ui.html
```

Ham OpenAPI tanımı:

```
http://localhost:8080/v3/api-docs        (JSON)
http://localhost:8080/v3/api-docs.yaml   (YAML)
```

### Endpoint Özeti

| Grup | Metot | Yol | Açıklama |
|---|---|---|---|
| **Firma** | GET | `/api/companies` | Tüm firmaları listele |
| | GET | `/api/companies/{id}` | Firma detayı |
| | POST | `/api/companies` | Firma oluştur |
| | PUT | `/api/companies/{id}` | Firma güncelle |
| | DELETE | `/api/companies/{id}` | Firma sil |
| **Tablolar** | GET | `/api/statements?companyId=` | Firma tablolarını listele |
| | GET | `/api/statements/{id}` | Tablo detayı (kalemlerle birlikte) |
| | GET | `/api/statements/periods?companyId=` | Dönem listesi |
| | POST | `/api/statements/upload` | Tekli Excel yükleme |
| | POST | `/api/statements/upload-multi` | Çok dönemli Excel yükleme |
| | DELETE | `/api/statements/{id}` | Tablo sil |
| **Kalem Tanımları** | GET | `/api/item-defs` | Kod–isim sözlüğü |
| | DELETE | `/api/item-defs/orphans` | Sahipsiz tanımları temizle |
| **Rasyo Kuralları** | GET | `/api/ratio-rules` | Kuralları listele |
| | POST | `/api/ratio-rules` | Kural oluştur |
| | PUT | `/api/ratio-rules/{id}` | Kural güncelle |
| | PATCH | `/api/ratio-rules/{id}/toggle` | Aktif/pasif yap |
| | DELETE | `/api/ratio-rules/{id}` | Kural sil |
| **Düzeltme Kuralları** | GET | `/api/adjustment-rules` | Kuralları listele |
| | POST | `/api/adjustment-rules` | Kural oluştur |
| | PUT | `/api/adjustment-rules/{id}` | Kural güncelle |
| | PATCH | `/api/adjustment-rules/{id}/toggle` | Aktif/pasif yap |
| | DELETE | `/api/adjustment-rules/{id}` | Kural sil |
| **Analiz** | POST | `/api/analysis` | Analiz çalıştır |

---

## Docker ile Çalıştırma

### Hızlı Başlangıç (H2)

```bash
# Image oluştur
docker build -t financial-analysis:latest .

# Çalıştır — veri /app/data içinde tutulur
docker run -p 8080:8080 \
  -v fa-data:/app/data \
  financial-analysis:latest
```

### PostgreSQL ile (Docker Compose)

```bash
docker compose up --build
```

`docker-compose.yml` içinde uygulama + PostgreSQL birlikte ayağa kalkar.  
Veriler `postgres-data` adlı Docker volume'unda kalıcı olarak saklanır.

### Ortam Değişkenleri

| Değişken | Açıklama | Varsayılan |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `h2` veya `postgres` | `h2` |
| `DB_URL` | PostgreSQL JDBC URL'si | `jdbc:postgresql://localhost:5432/financial_analysis` |
| `DB_USERNAME` | PostgreSQL kullanıcı adı | `postgres` |
| `DB_PASSWORD` | PostgreSQL şifresi | `postgres` |
| `H2_DATA_PATH` | H2 dosya yolu (profil: h2) | `./data/financial_analysis` |
| `JAVA_TOOL_OPTIONS` | JVM parametreleri | _(boş)_ |

---

## OpenShift Deployment

`openshift/` dizininde hazır Kubernetes/OpenShift manifest dosyaları bulunur.

### H2 Profiliyle Deploy (En Basit)

```bash
# 1. Image oluştur ve registry'ye gönder
docker build -t quay.io/<namespace>/financial-analysis:latest .
docker push quay.io/<namespace>/financial-analysis:latest

# 2. deployment.yaml içindeki image satırını güncelleyin, sonra:
oc new-project finansal-analiz

oc apply -f openshift/pvc.yaml          # Kalıcı depolama
oc apply -f openshift/deployment.yaml   # Uygulama pod'u
oc apply -f openshift/service.yaml      # Cluster içi servis
oc apply -f openshift/route.yaml        # Dış erişim URL'si

# 3. URL'yi öğren
oc get route financial-analysis
```

### PostgreSQL Profiliyle Deploy

```bash
# 1. Şifreleri düzenleyin
vi openshift/secret.yaml

# 2. Tüm kaynakları uygulayın
oc apply -f openshift/secret.yaml
oc apply -f openshift/db-deployment.yaml   # PostgreSQL pod + service
oc apply -f openshift/service.yaml
oc apply -f openshift/route.yaml

# deployment.yaml içinde SPRING_PROFILES_ACTIVE=postgres bloğunu aktif edin
oc apply -f openshift/deployment.yaml
```

### Manifest Dosyaları

| Dosya | İçerik |
|---|---|
| `pvc.yaml` | H2 verisi için 2 GB PersistentVolumeClaim |
| `deployment.yaml` | Uygulama Deployment (liveness/readiness probe dahil) |
| `service.yaml` | ClusterIP Service (port 8080) |
| `route.yaml` | TLS terminate eden OpenShift Route |
| `secret.yaml` | PostgreSQL kimlik bilgileri (Secret) |
| `db-deployment.yaml` | PostgreSQL Deployment + Service + PVC |
| `deploy.sh` | Tek komutla H2 deploy betiği |

### Kaynak Limitleri (Varsayılan)

```
requests:  512 Mi RAM  /  250m CPU
limits:    1 Gi RAM    /  1000m CPU
```

---

## Yapılandırma Referansı

### Profiller

| Profil | Veritabanı | Kullanım |
|---|---|---|
| `h2` | H2 dosya tabanlı | Yerel geliştirme, single-container Docker |
| `postgres` | PostgreSQL | Üretim, Docker Compose, OpenShift |

Profil seçimi:
```bash
# Uygulama argümanı
java -jar app.jar --spring.profiles.active=postgres

# Ortam değişkeni
export SPRING_PROFILES_ACTIVE=postgres
```

### Dosya Yükleme Limitleri

`application.properties`:
```properties
spring.servlet.multipart.max-file-size=50MB
spring.servlet.multipart.max-request-size=50MB
```

### Log Dosyaları

Loglar `logs/financial-analysis.log` dosyasına yazılır (7 günlük rotasyon).  
Container ortamında `logs/` dizini kalıcı volume'a bağlanabilir veya stdout yeterlidir.

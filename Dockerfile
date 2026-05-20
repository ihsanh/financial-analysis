# ─── Stage 1: React frontend ────────────────────────────────────────────────
FROM node:20-alpine AS frontend
WORKDIR /frontend

# Bağımlılıkları ayrı katmana al (package.json değişmediğinde cache'den gelir)
COPY src/main/frontend/package*.json ./
RUN npm ci --silent

COPY src/main/frontend/ .
RUN npm run build

# ─── Stage 2: Spring Boot JAR ────────────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-17 AS backend
WORKDIR /build

# Maven bağımlılıklarını önce indir (pom.xml değişmediğinde cache'den gelir)
COPY pom.xml .
RUN mvn -B dependency:go-offline -q 2>/dev/null || true

# Kaynak kod
COPY src/main/java       ./src/main/java
COPY src/main/resources  ./src/main/resources

# Stage 1'den gelen derlenmiş React dosyalarını yerleştir
COPY --from=frontend /frontend/dist ./src/main/frontend/dist

# -Pdocker: frontend-maven-plugin adımlarını atla (dist zaten hazır)
RUN mvn -B package -DskipTests -Pdocker

# ─── Stage 3: Runtime ────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-jammy
LABEL org.opencontainers.image.title="Financial Analysis"
LABEL org.opencontainers.image.description="Finansal Analiz Platformu"

# OpenShift: rastgele UID ile çalışabilmek için root grubuna yazma izni ver
RUN mkdir -p /app/data /app/logs && \
    chown -R 1001:0 /app && \
    chmod -R g+rwX /app

WORKDIR /app

COPY --from=backend --chown=1001:0 /build/target/financial-analysis-1.0.0.jar app.jar
RUN chmod g+rx app.jar

USER 1001

EXPOSE 8080

# Varsayılan profil: H2 (PVC bağlıysa kalıcı, bağlı değilse geçici)
# PostgreSQL için: -e SPRING_PROFILES_ACTIVE=postgres
ENV SPRING_PROFILES_ACTIVE=h2

# JAVA_TOOL_OPTIONS ortam değişkeni JVM tarafından otomatik okunur
# Örnek: -e JAVA_TOOL_OPTIONS="-Xmx512m"
ENTRYPOINT ["java", \
            "-XX:+UseContainerSupport", \
            "-XX:MaxRAMPercentage=75.0", \
            "-jar", "/app/app.jar"]

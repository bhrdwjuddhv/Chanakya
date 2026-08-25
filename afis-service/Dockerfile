# Build the shaded jar, then ship it on a JRE — the Maven layer never reaches the runtime image.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
# Dependencies resolve in their own layer so a source edit doesn't re-download the world.
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /build/target/afis-service.jar ./afis-service.jar
ENV AFIS_PORT=8090
EXPOSE 8090
HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD wget -qO- http://localhost:8090/health || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/afis-service.jar"]

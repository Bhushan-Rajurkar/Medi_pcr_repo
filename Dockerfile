# ==========================================
# Stage 1: Build stage
# ==========================================
FROM maven:3.9.9-eclipse-temurin-17 AS build

WORKDIR /app

# Copy pom.xml and source code
COPY pom.xml .
COPY src ./src

# Build the executable jar without running tests
RUN mvn clean package -DskipTests

# ==========================================
# Stage 2: Runtime stage
# ==========================================
FROM eclipse-temurin:17-jre

WORKDIR /app

# Copy the packaged Spring Boot jar from build stage
COPY --from=build /app/target/*.jar app.jar

# Spring Boot application default port (matches application.properties SERVER_PORT:8080)
EXPOSE 8080

# Execute the application
ENTRYPOINT ["java", "-jar", "app.jar"]

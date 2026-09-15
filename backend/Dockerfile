FROM rust:1-slim
WORKDIR /app
# cargo-watch = équivalent du --reload d'uvicorn : recompile et relance à chaque modif
RUN cargo install cargo-watch --locked
COPY . .

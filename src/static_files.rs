use axum::{
    http::{header, StatusCode},
    response::{Html, IntoResponse, Response},
};
use tower_http::services::ServeDir;

use crate::paths;

pub fn init_public_dir() {
    let dir = paths::public_dir();
    tracing::info!("serving frontend from {}", dir.display());
    if !dir.join("index.html").is_file() {
        tracing::warn!(
            "public/index.html not found next to executable; run `pnpm build` in frontend/"
        );
    }
}

pub fn assets_service() -> ServeDir {
    ServeDir::new(paths::public_dir().join("assets"))
}

pub async fn spa_index() -> Response {
    let index_path = paths::public_dir().join("index.html");
    match tokio::fs::read_to_string(&index_path).await {
        Ok(html) => Html(html).into_response(),
        Err(err) => {
            tracing::warn!("{} not found: {err}", index_path.display());
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "frontend not built; run `pnpm build` in frontend/",
            )
                .into_response()
        }
    }
}

pub async fn serve_public_file(path: &str) -> Response {
    let file_path = paths::public_dir().join(path);
    match tokio::fs::read(&file_path).await {
        Ok(bytes) => {
            let content_type = match path.rsplit('.').next() {
                Some("svg") => "image/svg+xml",
                Some("ico") => "image/x-icon",
                Some("png") => "image/png",
                Some("webp") => "image/webp",
                Some("json") => "application/json",
                Some("txt") => "text/plain; charset=utf-8",
                _ => "application/octet-stream",
            };
            (
                [(header::CONTENT_TYPE, content_type)],
                bytes,
            )
                .into_response()
        }
        Err(_) => StatusCode::NOT_FOUND.into_response(),
    }
}

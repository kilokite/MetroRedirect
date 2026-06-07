use axum::response::IntoResponse;
use axum::http::StatusCode;

pub async fn health() -> impl IntoResponse {
    (StatusCode::OK, "ok")
}

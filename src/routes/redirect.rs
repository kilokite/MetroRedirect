use axum::{
    extract::{Path, State},
    http::{header, HeaderMap},
    response::Redirect,
};

use crate::{
    error::{AppError, AppResult},
    models::normalize_hostname,
    state::AppState,
};

pub async fn redirect_by_slug(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
) -> AppResult<Redirect> {
    let host = headers
        .get(header::HOST)
        .and_then(|v| v.to_str().ok())
        .map(normalize_hostname)
        .unwrap_or_else(|| "localhost".to_string());

    let domain_id = resolve_domain_id(&state.db, &host).await?;

    let row: Option<(String,)> = sqlx::query_as(
        "SELECT target_url FROM links WHERE domain_id = ? AND slug = ? AND enabled = 1",
    )
    .bind(domain_id)
    .bind(&slug)
    .fetch_optional(&state.db)
    .await?;

    let target_url = row
        .map(|r| r.0)
        .ok_or_else(|| AppError::not_found("link not found"))?;

    sqlx::query(
        "UPDATE links SET click_count = click_count + 1, updated_at = datetime('now') WHERE domain_id = ? AND slug = ?",
    )
    .bind(domain_id)
    .bind(&slug)
    .execute(&state.db)
    .await?;

    Ok(Redirect::temporary(&target_url))
}

async fn resolve_domain_id(
    pool: &sqlx::SqlitePool,
    host: &str,
) -> AppResult<i64> {
    let exact: Option<(i64,)> =
        sqlx::query_as("SELECT id FROM domains WHERE hostname = ?")
            .bind(host)
            .fetch_optional(pool)
            .await?;

    if let Some(row) = exact {
        return Ok(row.0);
    }

    let default: Option<(i64,)> =
        sqlx::query_as("SELECT id FROM domains WHERE is_default = 1 LIMIT 1")
            .fetch_optional(pool)
            .await?;

    default
        .map(|r| r.0)
        .ok_or_else(|| AppError::not_found("domain not found"))
}

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sqlx::SqlitePool;

use crate::{
    error::{AppError, AppResult},
    models::{CreateDomainRequest, Domain, UpdateDomainRequest},
    state::AppState,
};

pub async fn list_domains(State(state): State<AppState>) -> AppResult<Json<Vec<Domain>>> {
    let domains = sqlx::query_as::<_, Domain>(
        "SELECT id, hostname, is_default, is_open, created_at FROM domains ORDER BY id",
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(domains))
}

pub async fn get_domain(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> AppResult<Json<Domain>> {
    let domain = fetch_domain(&state.db, id).await?;
    Ok(Json(domain))
}

pub async fn create_domain(
    State(state): State<AppState>,
    Json(body): Json<CreateDomainRequest>,
) -> AppResult<(StatusCode, Json<Domain>)> {
    let hostname = body.hostname.trim().to_lowercase();
    if hostname.is_empty() {
        return Err(AppError::bad_request("hostname is required"));
    }

    let mut tx = state.db.begin().await?;

    if body.is_default {
        sqlx::query("UPDATE domains SET is_default = 0")
            .execute(&mut *tx)
            .await?;
    }

    let result = sqlx::query(
        "INSERT INTO domains (hostname, is_default, is_open) VALUES (?, ?, ?)",
    )
    .bind(&hostname)
    .bind(body.is_default)
    .bind(body.is_open)
    .execute(&mut *tx)
    .await?;

    let id = result.last_insert_rowid();
    let domain = fetch_domain_in_tx(&mut tx, id).await?;
    tx.commit().await?;

    Ok((StatusCode::CREATED, Json(domain)))
}

pub async fn update_domain(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(body): Json<UpdateDomainRequest>,
) -> AppResult<Json<Domain>> {
    if body.hostname.is_none() && body.is_default.is_none() && body.is_open.is_none() {
        return Err(AppError::bad_request("no fields to update"));
    }

    let existing = fetch_domain(&state.db, id).await?;
    let hostname = body
        .hostname
        .map(|h| h.trim().to_lowercase())
        .unwrap_or(existing.hostname);

    if hostname.is_empty() {
        return Err(AppError::bad_request("hostname cannot be empty"));
    }

    let is_default = body.is_default.unwrap_or(existing.is_default);
    let is_open = body.is_open.unwrap_or(existing.is_open);

    let mut tx = state.db.begin().await?;

    if is_default {
        sqlx::query("UPDATE domains SET is_default = 0")
            .execute(&mut *tx)
            .await?;
    }

    sqlx::query("UPDATE domains SET hostname = ?, is_default = ?, is_open = ? WHERE id = ?")
        .bind(&hostname)
        .bind(is_default)
        .bind(is_open)
        .bind(id)
        .execute(&mut *tx)
        .await?;

    let domain = fetch_domain_in_tx(&mut tx, id).await?;
    tx.commit().await?;

    Ok(Json(domain))
}

pub async fn delete_domain(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> AppResult<StatusCode> {
    let _ = fetch_domain(&state.db, id).await?;

    let link_count: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM links WHERE domain_id = ?")
            .bind(id)
            .fetch_one(&state.db)
            .await?;

    if link_count.0 > 0 {
        return Err(AppError::conflict("domain has associated links"));
    }

    sqlx::query("DELETE FROM domains WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}

async fn fetch_domain(pool: &SqlitePool, id: i64) -> AppResult<Domain> {
    sqlx::query_as::<_, Domain>(
        "SELECT id, hostname, is_default, is_open, created_at FROM domains WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::not_found("domain not found"))
}

async fn fetch_domain_in_tx(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    id: i64,
) -> AppResult<Domain> {
    sqlx::query_as::<_, Domain>(
        "SELECT id, hostname, is_default, is_open, created_at FROM domains WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(&mut **tx)
    .await?
    .ok_or_else(|| AppError::not_found("domain not found"))
}

pub async fn domain_exists(pool: &SqlitePool, id: i64) -> AppResult<()> {
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM domains WHERE id = ?")
        .bind(id)
        .fetch_one(pool)
        .await?;
    if count.0 == 0 {
        return Err(AppError::not_found("domain not found"));
    }
    Ok(())
}

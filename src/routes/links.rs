use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};

use crate::{
    error::{AppError, AppResult},
    models::{
        generate_slug, validate_slug, validate_target_url, CreateLinkRequest, Link,
        ListLinksQuery, PaginatedLinks, UpdateLinkRequest,
    },
    routes::domains::domain_exists,
    state::AppState,
};

pub async fn list_links(
    State(state): State<AppState>,
    Query(query): Query<ListLinksQuery>,
) -> AppResult<Json<PaginatedLinks>> {
    let page = query.page.max(1);
    let limit = query.limit.clamp(1, 100);
    let offset = (page - 1) * limit;

    let search = query
        .q
        .as_ref()
        .map(|q| q.trim())
        .filter(|q| !q.is_empty())
        .map(|q| format!("%{q}%"));

    let (total, items) = if let Some(domain_id) = query.domain_id {
        if let Some(ref pattern) = search {
            let total: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM links WHERE domain_id = ? AND (slug LIKE ? OR title LIKE ?)",
            )
            .bind(domain_id)
            .bind(pattern)
            .bind(pattern)
            .fetch_one(&state.db)
            .await?;

            let items = sqlx::query_as::<_, Link>(
                "SELECT id, domain_id, slug, target_url, title, enabled, click_count, created_at, updated_at \
                 FROM links WHERE domain_id = ? AND (slug LIKE ? OR title LIKE ?) \
                 ORDER BY id DESC LIMIT ? OFFSET ?",
            )
            .bind(domain_id)
            .bind(pattern)
            .bind(pattern)
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db)
            .await?;

            (total.0, items)
        } else {
            let total: (i64,) =
                sqlx::query_as("SELECT COUNT(*) FROM links WHERE domain_id = ?")
                    .bind(domain_id)
                    .fetch_one(&state.db)
                    .await?;

            let items = sqlx::query_as::<_, Link>(
                "SELECT id, domain_id, slug, target_url, title, enabled, click_count, created_at, updated_at \
                 FROM links WHERE domain_id = ? ORDER BY id DESC LIMIT ? OFFSET ?",
            )
            .bind(domain_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db)
            .await?;

            (total.0, items)
        }
    } else if let Some(ref pattern) = search {
        let total: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM links WHERE slug LIKE ? OR title LIKE ?",
        )
        .bind(pattern)
        .bind(pattern)
        .fetch_one(&state.db)
        .await?;

        let items = sqlx::query_as::<_, Link>(
            "SELECT id, domain_id, slug, target_url, title, enabled, click_count, created_at, updated_at \
             FROM links WHERE slug LIKE ? OR title LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?",
        )
        .bind(pattern)
        .bind(pattern)
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.db)
        .await?;

        (total.0, items)
    } else {
        let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM links")
            .fetch_one(&state.db)
            .await?;

        let items = sqlx::query_as::<_, Link>(
            "SELECT id, domain_id, slug, target_url, title, enabled, click_count, created_at, updated_at \
             FROM links ORDER BY id DESC LIMIT ? OFFSET ?",
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.db)
        .await?;

        (total.0, items)
    };

    Ok(Json(PaginatedLinks {
        items,
        total,
        page,
        limit,
    }))
}

pub async fn get_link(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> AppResult<Json<Link>> {
    let link = fetch_link(&state.db, id).await?;
    Ok(Json(link))
}

pub async fn create_link(
    State(state): State<AppState>,
    Json(body): Json<CreateLinkRequest>,
) -> AppResult<(StatusCode, Json<Link>)> {
    validate_target_url(&body.target_url).map_err(AppError::bad_request)?;
    domain_exists(&state.db, body.domain_id).await?;

    let slug = match body.slug {
        Some(slug) => slug,
        None => generate_slug(),
    };
    validate_slug(&slug).map_err(AppError::bad_request)?;

    let result = sqlx::query(
        "INSERT INTO links (domain_id, slug, target_url, title, enabled) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(body.domain_id)
    .bind(&slug)
    .bind(&body.target_url)
    .bind(&body.title)
    .bind(body.enabled)
    .execute(&state.db)
    .await?;

    let id = result.last_insert_rowid();
    let link = fetch_link(&state.db, id).await?;
    Ok((StatusCode::CREATED, Json(link)))
}

pub async fn update_link(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(body): Json<UpdateLinkRequest>,
) -> AppResult<Json<Link>> {
    let existing = fetch_link(&state.db, id).await?;

    if let Some(domain_id) = body.domain_id {
        domain_exists(&state.db, domain_id).await?;
    }

    let domain_id = body.domain_id.unwrap_or(existing.domain_id);
    let target_url = body
        .target_url
        .unwrap_or_else(|| existing.target_url.clone());
    validate_target_url(&target_url).map_err(AppError::bad_request)?;

    let slug = body.slug.unwrap_or_else(|| existing.slug.clone());
    validate_slug(&slug).map_err(AppError::bad_request)?;

    let title = body.title.or(existing.title);
    let enabled = body.enabled.unwrap_or(existing.enabled);

    sqlx::query(
        "UPDATE links SET domain_id = ?, slug = ?, target_url = ?, title = ?, enabled = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .bind(domain_id)
    .bind(&slug)
    .bind(&target_url)
    .bind(&title)
    .bind(enabled)
    .bind(id)
    .execute(&state.db)
    .await?;

    let link = fetch_link(&state.db, id).await?;
    Ok(Json(link))
}

pub async fn delete_link(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> AppResult<StatusCode> {
    let _ = fetch_link(&state.db, id).await?;
    sqlx::query("DELETE FROM links WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn fetch_link(pool: &sqlx::SqlitePool, id: i64) -> AppResult<Link> {
    sqlx::query_as::<_, Link>(
        "SELECT id, domain_id, slug, target_url, title, enabled, click_count, created_at, updated_at FROM links WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::not_found("link not found"))
}

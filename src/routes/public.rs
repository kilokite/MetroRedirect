use axum::{
    extract::State,
    http::StatusCode,
    Json,
};

use crate::{
    error::{AppError, AppResult},
    models::{
        generate_slug, validate_target_url, PublicCreateLinkRequest, PublicCreateLinkResponse,
        PublicDomain,
    },
    state::AppState,
};

pub async fn list_open_domains(State(state): State<AppState>) -> AppResult<Json<Vec<PublicDomain>>> {
    let domains = sqlx::query_as::<_, PublicDomain>(
        "SELECT hostname FROM domains WHERE is_open = 1 ORDER BY id",
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(domains))
}

pub async fn create_public_link(
    State(state): State<AppState>,
    Json(body): Json<PublicCreateLinkRequest>,
) -> AppResult<(StatusCode, Json<PublicCreateLinkResponse>)> {
    validate_target_url(&body.target_url).map_err(AppError::bad_request)?;

    let hostname = body.hostname.trim().to_lowercase();
    if hostname.is_empty() {
        return Err(AppError::bad_request("hostname is required"));
    }

    let domain: Option<(i64, String)> = sqlx::query_as(
        "SELECT id, hostname FROM domains WHERE hostname = ? AND is_open = 1",
    )
    .bind(&hostname)
    .fetch_optional(&state.db)
    .await?;

    let (domain_id, hostname) = domain.ok_or_else(|| {
        AppError::not_found("domain not found or not open for public link creation")
    })?;

    let slug = generate_slug();

    sqlx::query(
        "INSERT INTO links (domain_id, slug, target_url, enabled) VALUES (?, ?, ?, 1)",
    )
    .bind(domain_id)
    .bind(&slug)
    .bind(&body.target_url)
    .execute(&state.db)
    .await?;

    let short_url = format!("https://{hostname}/{slug}");
    Ok((
        StatusCode::CREATED,
        Json(PublicCreateLinkResponse { short_url }),
    ))
}

use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

use crate::{
    error::{AppError, AppResult},
    state::{get_admin_password_hash, set_admin_password_hash, AppState},
};

const TOKEN_EXPIRES_SECS: i64 = 86400;

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,
    exp: i64,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub password: String,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub expires_in: i64,
}

#[derive(Deserialize)]
pub struct ChangePasswordRequest {
    pub old_password: String,
    pub new_password: String,
}

pub async fn login(
    State(state): State<AppState>,
    axum::Json(body): axum::Json<LoginRequest>,
) -> AppResult<axum::Json<LoginResponse>> {
    let hash = get_admin_password_hash(&state.db).await?;
    let valid = bcrypt::verify(&body.password, &hash)?;
    if !valid {
        return Err(AppError::unauthorized("invalid password"));
    }

    let token = issue_token(&state.jwt_secret)?;
    Ok(axum::Json(LoginResponse {
        token,
        expires_in: TOKEN_EXPIRES_SECS,
    }))
}

pub async fn change_password(
    State(state): State<AppState>,
    axum::Json(body): axum::Json<ChangePasswordRequest>,
) -> AppResult<axum::Json<serde_json::Value>> {
    if body.new_password.len() < 4 {
        return Err(AppError::bad_request(
            "new_password must be at least 4 characters",
        ));
    }

    let hash = get_admin_password_hash(&state.db).await?;
    let valid = bcrypt::verify(&body.old_password, &hash)?;
    if !valid {
        return Err(AppError::unauthorized("invalid old password"));
    }

    let new_hash = bcrypt::hash(&body.new_password, bcrypt::DEFAULT_COST)?;
    set_admin_password_hash(&state.db, &new_hash).await?;

    Ok(axum::Json(serde_json::json!({ "message": "password updated" })))
}

pub async fn require_auth(
    State(state): State<AppState>,
    req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let auth_header = req
        .headers()
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| AppError::unauthorized("missing authorization header"))?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or_else(|| AppError::unauthorized("invalid authorization scheme"))?;

    verify_token(token, &state.jwt_secret)?;
    Ok(next.run(req).await)
}

fn issue_token(secret: &str) -> AppResult<String> {
    let exp = (Utc::now() + Duration::seconds(TOKEN_EXPIRES_SECS)).timestamp();
    let claims = Claims {
        sub: "admin".to_string(),
        exp,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(Into::into)
}

fn verify_token(token: &str, secret: &str) -> AppResult<()> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )?;
    Ok(())
}

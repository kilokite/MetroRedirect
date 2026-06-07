use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::str::FromStr;

#[derive(Clone)]
pub struct AppState {
    pub db: SqlitePool,
    pub jwt_secret: String,
}

const ADMIN_PASSWORD_KEY: &str = "admin_password_hash";
const DEFAULT_PASSWORD: &str = "admin";
const DEFAULT_DOMAIN: &str = "localhost";

pub async fn init_db(database_url: &str) -> Result<SqlitePool, sqlx::Error> {
    ensure_db_directory(database_url)?;

    let options = SqliteConnectOptions::from_str(database_url)?.create_if_missing(true);
    let pool = SqlitePoolOptions::new().connect_with(options).await?;
    sqlx::migrate!().run(&pool).await?;
    seed_defaults(&pool).await?;
    Ok(pool)
}

fn ensure_db_directory(database_url: &str) -> Result<(), sqlx::Error> {
    let path = database_url
        .strip_prefix("sqlite://")
        .or_else(|| database_url.strip_prefix("sqlite:"))
        .unwrap_or(database_url);
    let path = path.split('?').next().unwrap_or(path);

    if let Some(parent) = std::path::Path::new(path).parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).map_err(|e| {
                sqlx::Error::Configuration(format!("failed to create data directory: {e}").into())
            })?;
        }
    }

    Ok(())
}

async fn seed_defaults(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    let password_exists: Option<(String,)> =
        sqlx::query_as("SELECT value FROM settings WHERE key = ?")
            .bind(ADMIN_PASSWORD_KEY)
            .fetch_optional(pool)
            .await?;

    if password_exists.is_none() {
        let hash = bcrypt::hash(DEFAULT_PASSWORD, bcrypt::DEFAULT_COST)
            .map_err(|e| sqlx::Error::Protocol(format!("bcrypt error: {e}")))?;
        sqlx::query("INSERT INTO settings (key, value) VALUES (?, ?)")
            .bind(ADMIN_PASSWORD_KEY)
            .bind(hash)
            .execute(pool)
            .await?;
        tracing::info!("initialized default admin password");
    }

    let domain_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM domains")
        .fetch_one(pool)
        .await?;

    if domain_count.0 == 0 {
        sqlx::query(
            "INSERT INTO domains (hostname, is_default) VALUES (?, 1)",
        )
        .bind(DEFAULT_DOMAIN)
        .execute(pool)
        .await?;
        tracing::info!("initialized default domain: {DEFAULT_DOMAIN}");
    }

    Ok(())
}

pub async fn get_admin_password_hash(pool: &SqlitePool) -> Result<String, sqlx::Error> {
    let row: (String,) = sqlx::query_as("SELECT value FROM settings WHERE key = ?")
        .bind(ADMIN_PASSWORD_KEY)
        .fetch_one(pool)
        .await?;
    Ok(row.0)
}

pub async fn set_admin_password_hash(
    pool: &SqlitePool,
    hash: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE settings SET value = ? WHERE key = ?")
        .bind(hash)
        .bind(ADMIN_PASSWORD_KEY)
        .execute(pool)
        .await?;
    Ok(())
}

pub fn jwt_secret_from_env() -> String {
    std::env::var("JWT_SECRET").unwrap_or_else(|_| {
        let secret = nanoid::nanoid!(32);
        tracing::warn!("JWT_SECRET not set, using generated secret (tokens invalid after restart)");
        secret
    })
}

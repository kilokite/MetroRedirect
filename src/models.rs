use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Domain {
    pub id: i64,
    pub hostname: String,
    pub is_default: bool,
    pub is_open: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct PublicDomain {
    pub hostname: String,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Link {
    pub id: i64,
    pub domain_id: i64,
    pub slug: String,
    pub target_url: String,
    pub title: Option<String>,
    pub enabled: bool,
    pub click_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDomainRequest {
    pub hostname: String,
    #[serde(default)]
    pub is_default: bool,
    #[serde(default)]
    pub is_open: bool,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDomainRequest {
    pub hostname: Option<String>,
    pub is_default: Option<bool>,
    pub is_open: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct PublicCreateLinkRequest {
    pub hostname: String,
    pub target_url: String,
}

#[derive(Debug, Serialize)]
pub struct PublicCreateLinkResponse {
    pub short_url: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateLinkRequest {
    pub domain_id: i64,
    pub target_url: String,
    pub slug: Option<String>,
    pub title: Option<String>,
    #[serde(default = "default_enabled")]
    pub enabled: bool,
}

fn default_enabled() -> bool {
    true
}

#[derive(Debug, Deserialize)]
pub struct UpdateLinkRequest {
    pub domain_id: Option<i64>,
    pub target_url: Option<String>,
    pub slug: Option<String>,
    pub title: Option<String>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ListLinksQuery {
    pub domain_id: Option<i64>,
    pub q: Option<String>,
    #[serde(default = "default_page")]
    pub page: i64,
    #[serde(default = "default_limit")]
    pub limit: i64,
}

fn default_page() -> i64 {
    1
}

fn default_limit() -> i64 {
    20
}

#[derive(Debug, Serialize)]
pub struct PaginatedLinks {
    pub items: Vec<Link>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}

pub fn validate_target_url(url: &str) -> Result<(), String> {
    if url.starts_with("http://") || url.starts_with("https://") {
        Ok(())
    } else {
        Err("target_url must start with http:// or https://".into())
    }
}

pub fn validate_slug(slug: &str) -> Result<(), String> {
    if slug.is_empty() || slug.len() > 64 {
        return Err("slug must be 1-64 characters".into());
    }
    if slug
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
    {
        Ok(())
    } else {
        Err("slug may only contain letters, numbers, underscore and hyphen".into())
    }
}

pub fn normalize_hostname(host: &str) -> String {
    host.split(':').next().unwrap_or(host).to_lowercase()
}

const SLUG_ALPHABET: [char; 62] = [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i',
    'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B',
    'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U',
    'V', 'W', 'X', 'Y', 'Z',
];

pub fn generate_slug() -> String {
    nanoid::nanoid!(8, &SLUG_ALPHABET)
}

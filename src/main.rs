mod auth;
mod error;
mod models;
mod paths;
mod routes;
mod state;
mod static_files;

use axum::{
    middleware,
    routing::{get, post, put},
    Router,
};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use auth::{change_password, login, require_auth};
use routes::{
    domains::{create_domain, delete_domain, get_domain, list_domains, update_domain},
    health::health,
    links::{create_link, delete_link, get_link, list_links, update_link},
    probe::memory_probe,
    public::{create_public_link, list_open_domains},
    redirect::redirect_by_slug,
};
use state::{init_db, jwt_secret_from_env, AppState};
use static_files::{assets_service, init_public_dir, serve_public_file, spa_index};

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "urlRedirect=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    init_public_dir();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| paths::default_database_url());
    tracing::info!("database at {}", paths::database_path().display());
    let jwt_secret = jwt_secret_from_env();

    let db = init_db(&database_url)
        .await
        .expect("failed to initialize database");

    let state = AppState { db, jwt_secret };

    let cors = CorsLayer::new()
        .allow_origin([
            "http://localhost:5173".parse().unwrap(),
            "http://127.0.0.1:5173".parse().unwrap(),
        ])
        .allow_methods(Any)
        .allow_headers(Any);

    let protected = Router::new()
        .route("/auth/password", put(change_password))
        .route("/domains", get(list_domains).post(create_domain))
        .route(
            "/domains/{id}",
            get(get_domain)
                .put(update_domain)
                .delete(delete_domain),
        )
        .route("/links", get(list_links).post(create_link))
        .route(
            "/links/{id}",
            get(get_link).put(update_link).delete(delete_link),
        )
        .route("/probe/memory", get(memory_probe))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            require_auth,
        ));

    let api = Router::new()
        .route("/auth/login", post(login))
        .route("/public/domains", get(list_open_domains))
        .route("/public/links", post(create_public_link))
        .merge(protected)
        .layer(cors);

    let app = Router::new()
        .route("/health", get(health))
        .nest("/api", api)
        .nest_service("/assets", assets_service())
        .route(
            "/logo.svg",
            get(|| async { serve_public_file("logo.svg").await }),
        )
        .route(
            "/favicon.svg",
            get(|| async { serve_public_file("favicon.svg").await }),
        )
        .route("/", get(spa_index))
        .route("/login", get(spa_index))
        .route("/create", get(spa_index))
        .route("/admin", get(spa_index))
        .route("/admin/{*path}", get(spa_index))
        .route("/{slug}", get(redirect_by_slug))
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], 23564));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();

    tracing::info!("listening on http://{addr}");
    tracing::info!("default admin password: admin (change via PUT /api/auth/password)");

    axum::serve(listener, app).await.unwrap();
}

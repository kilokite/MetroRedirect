use std::path::{Path, PathBuf};
use std::sync::LazyLock;

static EXECUTABLE_DIR: LazyLock<PathBuf> = LazyLock::new(resolve_executable_dir);

fn resolve_executable_dir() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(|dir| dir.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."))
}

pub fn executable_dir() -> &'static Path {
    EXECUTABLE_DIR.as_path()
}

pub fn public_dir() -> PathBuf {
    executable_dir().join("public")
}

pub fn database_path() -> PathBuf {
    executable_dir().join("data").join("url_redirect.db")
}

pub fn default_database_url() -> String {
    let path = database_path().to_string_lossy().replace('\\', "/");
    format!("sqlite://{path}")
}

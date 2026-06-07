use axum::Json;
use serde::Serialize;
use sysinfo::{ProcessesToUpdate, System};

use crate::error::{AppError, AppResult};

#[derive(Serialize)]
pub struct MemoryProbeResponse {
    pub pid: u32,
    pub rss_bytes: u64,
    pub virtual_memory_bytes: u64,
    pub rss: String,
    pub virtual_memory: String,
}

pub async fn memory_probe() -> AppResult<Json<MemoryProbeResponse>> {
    let pid = sysinfo::get_current_pid()
        .map_err(|err| AppError::internal(format!("failed to get current pid: {err}")))?;

    let mut system = System::new();
    system.refresh_processes(ProcessesToUpdate::All, true);

    let process = system
        .process(pid)
        .ok_or_else(|| AppError::internal("current process not found"))?;

    let rss_bytes = process.memory();
    let virtual_memory_bytes = process.virtual_memory();

    Ok(Json(MemoryProbeResponse {
        pid: pid.as_u32(),
        rss_bytes,
        virtual_memory_bytes,
        rss: format_bytes(rss_bytes),
        virtual_memory: format_bytes(virtual_memory_bytes),
    }))
}

fn format_bytes(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2} KB", bytes as f64 / KB as f64)
    } else {
        format!("{bytes} B")
    }
}

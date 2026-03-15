use std::fs;
use std::io::Write;
use std::path::Path;
use std::time::UNIX_EPOCH;

/// Maximum binary file size we will read (50 MB).
const MAX_BINARY_FILE_SIZE: u64 = 50 * 1024 * 1024;

/// Maximum file size we will read (50 MB).
const MAX_FILE_SIZE: u64 = 50 * 1024 * 1024;

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    let meta = fs::metadata(&path).map_err(|e| format!("Failed to read file: {e}"))?;
    if meta.len() > MAX_FILE_SIZE {
        let size_mb = meta.len() as f64 / (1024.0 * 1024.0);
        return Err(format!(
            "File too large ({:.1} MB). LiveMark supports files up to 50 MB.",
            size_mb
        ));
    }
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {e}"))
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    let target = Path::new(&path);

    // Use a unique temp filename to prevent concurrent write conflicts
    let tmp_name = format!(
        ".{}.{}.tmp",
        target.file_name().unwrap_or_default().to_string_lossy(),
        std::process::id()
    );
    let tmp_path = target.with_file_name(&tmp_name);

    // Write to temporary file first
    let mut file =
        fs::File::create(&tmp_path).map_err(|e| format!("Failed to create temp file: {e}"))?;
    file.write_all(content.as_bytes())
        .map_err(|e| format!("Failed to write temp file: {e}"))?;
    file.sync_all()
        .map_err(|e| format!("Failed to sync temp file: {e}"))?;
    drop(file);

    // Atomic rename
    fs::rename(&tmp_path, target).map_err(|e| {
        // Clean up temp file on rename failure
        let _ = fs::remove_file(&tmp_path);
        format!("Failed to save file: {e}")
    })?;

    Ok(())
}

#[tauri::command]
pub fn write_temp_html(content: String, name: String) -> Result<String, String> {
    let dir = std::env::temp_dir().join("livemark-export");
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create temp dir: {e}"))?;
    let safe_name = Path::new(&name)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("export.html");
    let target = dir.join(safe_name);
    fs::write(&target, content.as_bytes())
        .map_err(|e| format!("Failed to write temp HTML: {e}"))?;
    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
pub fn write_binary_file(path: String, data: Vec<u8>) -> Result<(), String> {
    let target = Path::new(&path);

    let tmp_name = format!(
        ".{}.{}.tmp",
        target.file_name().unwrap_or_default().to_string_lossy(),
        std::process::id()
    );
    let tmp_path = target.with_file_name(&tmp_name);

    let mut file =
        fs::File::create(&tmp_path).map_err(|e| format!("Failed to create temp file: {e}"))?;
    file.write_all(&data)
        .map_err(|e| format!("Failed to write temp file: {e}"))?;
    file.sync_all()
        .map_err(|e| format!("Failed to sync temp file: {e}"))?;
    drop(file);

    fs::rename(&tmp_path, target).map_err(|e| {
        let _ = fs::remove_file(&tmp_path);
        format!("Failed to save file: {e}")
    })?;

    Ok(())
}

#[tauri::command]
pub fn read_file_binary(path: String) -> Result<Vec<u8>, String> {
    let meta = fs::metadata(&path).map_err(|e| format!("Failed to read file: {e}"))?;
    if meta.len() > MAX_BINARY_FILE_SIZE {
        let size_mb = meta.len() as f64 / (1024.0 * 1024.0);
        return Err(format!(
            "File too large ({:.1} MB). Maximum supported size is 50 MB.",
            size_mb
        ));
    }
    fs::read(&path).map_err(|e| format!("Failed to read file: {e}"))
}

#[tauri::command]
pub fn is_file_readonly(path: String) -> Result<bool, String> {
    let meta = fs::metadata(&path).map_err(|e| format!("Failed to read metadata: {e}"))?;
    Ok(meta.permissions().readonly())
}

#[tauri::command]
pub fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    let target = Path::new(&new_path);
    if target.exists() {
        return Err(format!(
            "A file named \"{}\" already exists in this location.",
            target.file_name().unwrap_or_default().to_string_lossy()
        ));
    }
    fs::rename(&old_path, &new_path).map_err(|e| format!("Failed to rename file: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn get_file_mtime(path: String) -> Result<f64, String> {
    let meta = fs::metadata(&path).map_err(|e| format!("Failed to read metadata: {e}"))?;
    let modified = meta
        .modified()
        .map_err(|e| format!("Failed to get mtime: {e}"))?;
    let millis = modified
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("Invalid mtime: {e}"))?
        .as_millis() as f64;
    Ok(millis)
}

use std::fs;
use std::path::Path;

#[tauri::command]
pub fn save_image(filename: String, data: Vec<u8>) -> Result<String, String> {
    // Sanitize filename: extract only the file name component, rejecting path separators
    let safe_name = Path::new(&filename)
        .file_name()
        .and_then(|n| n.to_str())
        .filter(|n| !n.is_empty() && !n.starts_with('.'))
        .ok_or_else(|| "Invalid filename".to_string())?;

    let dir = std::env::temp_dir().join("livemark-images");
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create image directory: {e}"))?;

    let target = dir.join(safe_name);

    // Deduplicate filenames with a bounded counter
    let target = if target.exists() {
        let stem = target
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let ext = target
            .extension()
            .map(|e| format!(".{}", e.to_string_lossy()))
            .unwrap_or_default();
        let mut counter = 1u32;
        loop {
            if counter > 10_000 {
                return Err("Too many files with the same name".to_string());
            }
            let candidate = dir.join(format!("{stem}-{counter}{ext}"));
            if !candidate.exists() {
                break candidate;
            }
            counter += 1;
        }
    } else {
        target
    };

    fs::write(&target, &data).map_err(|e| format!("Failed to write image: {e}"))?;

    Ok(target.to_string_lossy().to_string())
}

use std::fs;
use std::path::{Path, PathBuf};

/// Deduplicate a target path by appending -1, -2, etc. if needed.
fn deduplicate(target: PathBuf) -> Result<PathBuf, String> {
    if !target.exists() {
        return Ok(target);
    }
    let stem = target
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let ext = target
        .extension()
        .map(|e| format!(".{}", e.to_string_lossy()))
        .unwrap_or_default();
    let dir = target.parent().unwrap_or(Path::new("."));
    let mut counter = 1u32;
    loop {
        if counter > 10_000 {
            return Err("Too many files with the same name".to_string());
        }
        let candidate = dir.join(format!("{stem}-{counter}{ext}"));
        if !candidate.exists() {
            return Ok(candidate);
        }
        counter += 1;
    }
}

#[tauri::command]
pub fn save_image(
    filename: String,
    data: Vec<u8>,
    doc_dir: Option<String>,
) -> Result<String, String> {
    // Sanitize filename: extract only the file name component, rejecting path separators
    let safe_name = Path::new(&filename)
        .file_name()
        .and_then(|n| n.to_str())
        .filter(|n| !n.is_empty() && !n.starts_with('.'))
        .ok_or_else(|| "Invalid filename".to_string())?;

    // Choose save directory: alongside the document or temp dir as fallback
    let (dir, relative) = if let Some(ref dd) = doc_dir {
        let images_dir = Path::new(dd).join("images");
        (images_dir, true)
    } else {
        (std::env::temp_dir().join("livemark-images"), false)
    };

    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create image directory: {e}"))?;

    let target = deduplicate(dir.join(safe_name))?;
    fs::write(&target, &data).map_err(|e| format!("Failed to write image: {e}"))?;

    if relative {
        // Return relative path from document directory: ./images/filename.ext
        let name = target
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        Ok(format!("./images/{name}"))
    } else {
        Ok(target.to_string_lossy().to_string())
    }
}

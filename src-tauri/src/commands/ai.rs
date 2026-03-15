use std::time::Duration;

use reqwest::StatusCode;
use serde_json::{Value, json};

const TIMEOUT_SECS: u64 = 30;

/// Extract the first "text" content block from an Anthropic-format response.
/// Skips "thinking" blocks (e.g. MiniMax-M2.5 extended thinking).
fn extract_text(json: &Value) -> Option<String> {
    json["content"]
        .as_array()
        .and_then(|arr| {
            arr.iter()
                .find(|c| c["type"].as_str() == Some("text"))
                .or_else(|| arr.first())
        })
        .and_then(|c| c["text"].as_str())
        .map(|s| s.to_string())
}

#[tauri::command]
pub async fn ai_revise(
    base_url: String,
    api_key: String,
    model: String,
    prompt: String,
    text: String,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(TIMEOUT_SECS))
        .build()
        .map_err(|e| format!("AI revision failed — {e}"))?;

    let body = json!({
        "model": model,
        "max_tokens": 4096,
        "system": prompt,
        "messages": [{ "role": "user", "content": text }]
    });

    #[cfg(debug_assertions)]
    eprintln!("[ai_revise] url: {base_url}");

    let response = client
        .post(&base_url)
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "AI revision timed out — try a shorter selection".to_string()
            } else if e.is_connect() {
                "AI revision failed — check your connection".to_string()
            } else {
                format!("AI revision failed — {e}")
            }
        })?;

    let status = response.status();
    if !status.is_success() {
        return Err(match status {
            StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => {
                "Invalid API key — check Settings → AI".to_string()
            }
            StatusCode::TOO_MANY_REQUESTS => "Rate limited — try again in a moment".to_string(),
            _ => format!("AI revision failed ({status})"),
        });
    }

    let json: Value = response
        .json()
        .await
        .map_err(|e| format!("AI revision failed — invalid response: {e}"))?;

    #[cfg(debug_assertions)]
    eprintln!("[ai_revise] response: {json}");

    let revised = extract_text(&json)
        .ok_or_else(|| {
            let raw = json.to_string();
            let preview = if raw.len() > 200 { &raw[..200] } else { &raw };
            format!("AI revision failed — unexpected response format: {preview}")
        })?;

    Ok(revised)
}

const CHECK_TIMEOUT_SECS: u64 = 10;

#[tauri::command]
pub async fn ai_check(
    base_url: String,
    api_key: String,
    model: String,
) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(CHECK_TIMEOUT_SECS))
        .build()
        .map_err(|e| format!("Connection check failed — {e}"))?;

    let body = json!({
        "model": model,
        "max_tokens": 128,
        "messages": [{ "role": "user", "content": "hi" }]
    });

    let response = client
        .post(&base_url)
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "Connection timed out".to_string()
            } else if e.is_connect() {
                "Cannot reach server — check the URL".to_string()
            } else {
                format!("Connection failed — {e}")
            }
        })?;

    let status = response.status();
    if !status.is_success() {
        return Err(match status {
            StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => "Invalid API key".to_string(),
            StatusCode::TOO_MANY_REQUESTS => "Rate limited — try again in a moment".to_string(),
            StatusCode::NOT_FOUND => "Endpoint not found (404) — check the URL".to_string(),
            _ => format!("Server returned {status}"),
        });
    }

    Ok(())
}

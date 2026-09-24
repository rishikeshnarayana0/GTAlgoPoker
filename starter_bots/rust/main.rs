// Minimal uploadable Rust bot for AlgoPoker @ GT.

use std::io::{self, BufRead, Write};

fn is_true(observation: &str, field: &str) -> bool {
    observation.contains(&format!("\"{}\":true", field))
}

fn choose_action(observation: &str) -> &'static str {
    // YOUR JOB: Replace this check/call strategy with your own logic.
    // The program receives the complete observation as one compact JSON line.
    if is_true(observation, "can_check") {
        r#"{"action":"check"}"#
    } else if is_true(observation, "can_call") {
        r#"{"action":"call"}"#
    } else {
        r#"{"action":"fold"}"#
    }
}

// DO NOT CHANGE BELOW. IT WILL ABSOLUTELY BREAK YOUR BOT. PLS AND THANK YOU
fn main() {
    let stdin = io::stdin();
    let mut stdout = io::BufWriter::new(io::stdout().lock());

    for line in stdin.lock().lines() {
        match line {
            Ok(observation) => {
                writeln!(stdout, "{}", choose_action(&observation)).unwrap();
                stdout.flush().unwrap();
            }
            Err(_) => break,
        }
    }
}


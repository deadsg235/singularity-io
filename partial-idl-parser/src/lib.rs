#![deny(unsafe_code)]
#![deny(missing_docs)]
#![doc = include_str!(concat!(std::env!("CARGO_MANIFEST_DIR"), "/README.md"))]

mod path_macro;

mod parser;
pub use parser::*;

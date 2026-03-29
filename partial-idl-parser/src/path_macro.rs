/// Get the IDL from the target/idl/temp.json directory within the workspace root
#[macro_export]
macro_rules! get_idl {
    () => {
        include_str!(concat!(
            env!("CARGO_WORKSPACE_DIR"),
            "/target/idl/",
            "temp.json"
        ))
    };
}

/// Get the IDL from the custom directory given a program name.
#[macro_export]
macro_rules! idl_custom_path {
    ($custom_path:expr) => {
        include_str!($custom_path)
    };
}

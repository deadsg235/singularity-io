## Simple anchor IDL Parser
A simple parser for partial part of anchor IDL without importing anchor types or causing build panics for WASM targets.

It only parses the `address` of the program and the `instructions` containing the instruction `name` and the `discriminant` which are useful for the scope of the `wallet-adapter` templates.


### Macro for creating a path to the IDL
the `partial-idl-parser` crate is used to read the IDL from the `CARGO_WORKSPACE_DIR/target/temp.json` file using a `.cargo/config.toml` in the root

```toml
[env]
CARGO_WORKSPACE_DIR = { value = "", relative = true }
```

Get the `AnchorIdlPartialData` data structure containing the IDL of an anchor example called `temp`

```rust,ignore
use partial_idl_parser::*;

const IDL: &str = get_idl!();
```

If the directory is different you can use `idl_custom_path` macro:
```rust,ignore
use partial_idl_parser::*;

const IDL: &str = idl_custom_path!("../../target/custom_idl_dir/idl.json");
```

### The `AnchorIdlPartialData`
Parsed IDL is stored within a `AnchorIdlPartialData` struct.

```rust,ignore
fn foo() -> Result<(), serde_json::Error> {
    use partial_idl_parser::*;

    // Get the JSON IDL data
    const IDL_RAW_DATA: &str = idl_path!("temp");

    // Parse the JSON IDL
    let parsed_idl = AnchorIdlPartialData::parse(IDL_RAW_DATA)?;

    // Get program ID
    parsed_idl.program_id();


    // Get An Instruction by it's identifier assuming the instruction is
    // labeled by the name `initialize`
    parsed_idl.get_instruction("initialize");


    // Get the instruction discriminant assuming the instruction is
    // labeled by the name `initialize`
    parsed_idl.get_discriminant("initialize");

    Ok(())
}
```

### LICENSE
MIT OR APACHE-2.0
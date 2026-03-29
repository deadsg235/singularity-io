# Error Handling

The error handling enum is [WalletError](https://docs.rs/wallet-adapter/latest/wallet_adapter/enum.WalletError.html). Since Rust error handling requires a `Result<T, WalletError` this type is wrapped in a [pub type WalletResult<T> = Result<T, WalletError>;](https://docs.rs/wallet-adapter/latest/wallet_adapter/type.WalletResult.html) type.

## Formatting

The `WalletError` type implements `std::fmt::Debug` `{:?}` trait and user friendly `std::fmt::Display` `{}` trait. The [WalletError::JsError{name: String, message: String, stack: String}](https://docs.rs/wallet-adapter/latest/wallet_adapter/enum.WalletError.html#variant.JsError) variant has an exception for `std::fmt::Display` `{}` which only takes the `message` field from and uses that for `std::fmt::Display` in order to avoid overwhelming the user with the `stack` part of the error.

If a developer wishes to show the `name`, and `stack` messages too, the should use the `std::fmt::Debug` `{:?}` option.

## Re-usable error handling

The variant [WalletError::Op(String)](https://docs.rs/wallet-adapter/latest/wallet_adapter/enum.WalletError.html#variant.Op) is a convenience variant for error that happen outside of this `wallet-adapter` library. This variant is useful when you want to return a `String` error but don't want to implement custom error handling for `?` .

Example:

```rust,no_run
use wallet_adapter::WalletAdapter;

// Without WalletError::Op variant
async fn foo() -> Result<(), CustomError> {
    let adapter = WalletAdapter::init()?; // This returns a `WalletError`
    let connect = adapter.connect(wallet).await?; // This returns a `WalletError`
    let task_that_returns_error = process().await?; // This returns a `String` as error
}

async fn process() -> Result<(), String> {
    // A background task that may return an error
}
```

In this code one has to implement `From` or `TryFrom` trait in order to convert a `WalletError` to a `Result<(), CustomError>` whenever they call `?` on `process.await()`.

Instead, if the error implements `std::fmt::Display` like `String`, you can use `WalletEvent::Op(String)` instead:

```rust,no_run
use wallet_adapter::{WalletAdapter, WalletResult, WalletError};

// Without WalletError::Op variant
async fn foo() -> WalletResult<()> {
    let adapter = WalletAdapter::init()?; // This returns a `WalletError`
    let connect = adapter.connect(wallet).await?; // This returns a `WalletError`
    
    // Map the `String` as error into `WalletError::Op(String)`
    let task_that_returns_error = process().await.map_err(|error| WalletError(error))?; 
}

async fn process() -> Result<(), String> {
    // A background task that may return an error
}
```

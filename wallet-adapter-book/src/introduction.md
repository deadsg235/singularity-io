# Rust Wallet Adapter for Solana Dapps.

<img src="https://raw.githubusercontent.com/JamiiDao/SolanaWalletAdapter/refs/heads/master/LOGO.svg" alt="Rust Wallet-Adapter Logo" style="zoom:5%;" />

[![crates.io](https://img.shields.io/crates/v/wallet-adapter.svg)](https://crates.io/crates/wallet-adapter)[![Docs](https://docs.rs/wallet-adapter/badge.svg)](https://docs.rs/wallet-adapter)[![Rust](https://github.com/JamiiDao/SolanaWalletAdapter/actions/workflows/rust.yml/badge.svg?branch=master)](https://github.com/JamiiDao/SolanaWalletAdapter/actions/workflows/rust.yml)![License](https://img.shields.io/crates/l/wallet-adapter)![Passively Maintained](https://img.shields.io/badge/status-passively%20maintained-cyan)

The wallet-adapter library is a Rust crate that performs actions between a Rust WebAssembly frontend and browser wallet extensions that implement the [wallet-standard](https://github.com/wallet-standard/wallet-standard).

### Links

1. [Github](https://github.com/JamiiDao/SolanaWalletAdapter)
2. [Github Templates](https://github.com/JamiiDao/SolanaWalletAdapter/tree/master/templates)
3. [crates.io](https://crates.io/crates/wallet-adapter)
4. [docs.rs](https://docs.rs/wallet-adapter/)

### Features
It implements the following from [wallet-standard](https://github.com/wallet-standard/wallet-standard):
- [x] `standard:connect` - Performs a connection operation to a browser wallet 
- [x] `standard:disconnect` - Performs a connection operation to a browser wallet 
- [x] `standard:events` - Listens for connected and disconnected events emitted from a wallet.
- [x] `solana:signIn` - Performs a Sign In With Solana (SIWS) operations for wallet authentication/authorization.
- [x] `solana:signMessage` - An operation that signs a message
- [x] `solana:signTransaction` - An operation that signs a transaction
- [x] `solana:signAndSendTransaction` - an operation that signs a transaction and sends it to a Solana RPC.

Any wallet that implements the [wallet-standard](https://github.com/wallet-standard/wallet-standard) will be detected by this crate.


### Events
Wallets register themselves by listening for one or both of these browser custom events as defined by the wallet-standard.
- [x] `wallet-standard:register-wallet` - listens for wallets that emit browser window event as a way to register themselves.
- [x] `wallet-standard:app-ready` - the library dispatches this event in order to inform browser extension wallets that the frontend application is ready to receive registration events.



### Building the library without a template

The `wallet-adapter` crate uses the browser's cryptographically secure random number generator to generate random values using the `getrandom`,`rand-core` and `rand-chacha` crates.

The `getrandom` crate needs to understand the [backend]((https://docs.rs/getrandom/latest/getrandom/#opt-in-backends)) to use as described in their docs which require the use of rustc flag `RUSTFLAGS='--cfg getrandom_backend="wasm_js"'` to be specified when running `cargo build --target wasm32-unknown-unknown`. 

```sh
RUSTFLAGS='--cfg getrandom_backend="wasm_js"' cargo build --target wasm32-unknown-unknown
```

Therefore, if you are not using the template which automatically generates the [config file](https://github.com/JamiiDao/SolanaWalletAdapter/blob/master/.cargo/config.toml) for you, you need to add a `.cargo/config.toml` file in your root directory (the config file needs to be in the workspace root if you are using a cargo workspace).

See the structure of the `.cargo` [Rust config dir](https://github.com/JamiiDao/SolanaWalletAdapter/tree/master/.cargo).

The `.cargo/config.toml` file should contain this.

```toml
[target.wasm32-unknown-unknown]
rustflags = ["--cfg", "getrandom_backend=\"wasm_js\""]
```


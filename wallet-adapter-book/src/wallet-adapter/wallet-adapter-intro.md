# wallet-adapter Library
The wallet-adapter library listens for events from browser wallet and dispatches events to the browser window by calling browser APIs using Rust compiled for WebAssembly.

The library is async first and uses Rust [RwLock](https://docs.rs/async-lock/latest/async_lock/struct.RwLock.html) wrapped in a Rust [Arc](https://doc.rust-lang.org/std/sync/struct.Arc.html) which also implement [Send](std::marker::Send) and [Sync](https://doc.rust-lang.org/std/marker/trait.Sync.html) traits to guarantee type safety and strong consistency when used in browser background tasks. For events, [async channels](https://docs.rs/async-channel/latest/async_channel/) are also used.

It contains the following parts:
1. [WalletAdapter](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.WalletAdapter.html) - This is a struct that combines all other components and provides methods for performing operations as specified by the wallet-standard.
2. [ConnectionInfo](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.ConnectionInfo.html) - A struct containing the [connected wallet](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.Wallet.html) and [connected account](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.WalletAccount.html).
3. [Wallet](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.Wallet.html) - A struct describing a registered wallet. It's fields include:
    -  the name of the wallet
    -  the [SemVer](https://semver.org/) version of the wallet-standard supported by the wallet
    -  an optional icon
    -  the wallet accounts of a connected wallet
    -  the chains supported by the wallet (`solana:mainnet`, `solana:devnet`, `solana:testnet` and `solana:localnet`).
    -  the features of the `wallet-standard` that the wallet supports
4. [Wallet Account](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.WalletAccount.html) - A struct describing a connected `Account`. Unlike the [Wallet](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.Wallet.html), this struct only exists if a browser wallet is connected when it performed a `connect` operation. The struct contains the:
    - Account Icon (Optional)
    - Account Label (Optional)
    - The public key in bytes
    - The Base58 address of the account
    - The features of the `wallet-standard` that the account supports (`standard:connect`, `standard-disconnect`, `standard:events`, `solana:signin`, `solana:signMessage`, `solana:signTransaction`, `solana:signAndSendTransaction`).
5. [Wallet Storage](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.WalletStorage.html) - Where the registered wallets are stored.
6. [Wallet Events](https://docs.rs/wallet-adapter/latest/wallet_adapter/enum.WalletEvent.html) - Used for sending an receiving the following events:
    - Connected
    - Reconnected
    - Disconnected
    - AccountChanged
    - Background Task Error
7. [Error Handling](https://docs.rs/wallet-adapter/latest/wallet_adapter/enum.WalletError.html) - Error handling enum
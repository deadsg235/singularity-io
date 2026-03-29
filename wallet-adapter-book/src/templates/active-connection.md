# The Active Connection

The ActiveConnection is used to store the [ConnectionInfo](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.ConnectionInfo.html). Since the [ConnectionInfo](https://docs.rs/wallet-adapter/latest/wallet_adapter/struct.ConnectionInfo.html) is wrapped in an `Arc<async_lock::RwLock<T>>` , storing the connection info inside its own type can help in cases where you don't want to perform an async call inside a component by use of a hook or effect.

## Type definition

{{#tabs }}
{{#tab name="Dioxus" }}
```rust,no_run
use dioxus::prelude::*;
use wallet_adapter::ConnectionInfo;

// defined as a global variable
pub(crate) static ACTIVE_CONNECTION: GlobalSignal<ConnectionInfo> =
    Signal::global(|| ConnectionInfo::default());

#[component]
pub(crate) fn App() -> Element {
    let wallet_event_listener = WALLET_ADAPTER.read().events().clone();

    // Whenever a `WalletEvent` occurs, the `ACTIVE_CONNECTION` is modified
    spawn(async move {
        while let Ok(wallet_event) = wallet_event_listener.recv().await {
            *ACCOUNT_STATE.write() = AccountState::default();

            // The connection information is extracted here within an async scope
            let connection_info = (*WALLET_ADAPTER.read().connection_info().await).clone();
            // the connection_info is set
            *ACTIVE_CONNECTION.write() = connection_info;
        }
    });
	
    mod another_scope {
        use dioxus::prelude::*;
        use crate::ACTIVE_CONNECTION;
        
        #[component]
        pub fn MyComponent() -> Element {
            // Now `ConnectionInfo` is `reactive` and can be accessed 
            // without the need for an async scope
           if let Ok(wallet_account) = ACTIVE_CONNECTION.read().connected_account() {
                address = wallet_account.address().to_string();
                shortened_address = wallet_account
                    .shorten_address()
                    .unwrap_or_default()
                    .to_string();
                public_key_bytes = wallet_account.public_key();
            }
        }
    }
```
{{#endtab }}

{{#tab name="Sycamore" }}
```rust,no_run
use sycamore::prelude::*;

#[component]
fn App() -> View {
	// ConnectionInfo is wrapped in a `provide_context` to expose it to the global scope
    provide_context(create_signal(ConnectionInfo::default()));
    
   let adapter = use_context::<Signal<WalletAdapter>>();
	// use the active connection here in order to listen for events
    let active_connection = use_context::<Signal<ConnectionInfo>>();

    spawn_local(async move {
        while let Ok(wallet_event) = adapter.get_clone().events().recv().await {
            account_state.set(AccountState::default());
				// Access the `ConnectionInfo` within a async scope
            let connection_info = (adapter.get_clone().connection_info().await).clone();
            // Set the `connection_info` to the `active_connection`
            active_connection.set(connection_info);
        }
    });
}

mod another_scope {
    use sycamore::prelude::*;   
   	use wallet_adapter::ConnectionInfo;
    
    #[component]
    pub fn Accounts() -> View {
        let active_connection = use_context::<Signal<ConnectionInfo>>();
        
        if let Ok(wallet_account) = active_connection.get_clone().connected_account() {
            
        }else {
            
        }
    }
}
```
{{#endtab }}

{{#tab name="Yew" }}
```rust,no_run
use yew::prelude::*;

#[function_component(App)]
pub fn app() -> Html {
    let adapter = WalletAdapter::init().unwrap();
    let events = adapter.events().clone();

    // The active connection is part of the `GlobalAppInfo` type
     let init_state = GlobalAppInfo::new(adapter);
    // Use a reducer to make the state global
    let global_state = use_reducer(|| init_state);
    
    html! {
        <ContextProvider<GlobalAppState> context={global_state.clone()}>
            <ContextProvider<ClusterStoreState> context={cluster_store_state.clone()}>
               // All child components of this element have access to the `GlobalAppInfo`
        		<MyComponent/>
        </ContextProvider<GlobalAppState>>
    }
}

mod another_scope {
   use yew::prelude::*;
    use crate::GlobalAppState;
    
    #[function_component]
    pub fn MyComponent() -> Html {
        // Accessible from global scope
        let global_state =
            use_context::<GlobalAppState>().expect("no global ctx `GlobalAppState` found");
        // Access the active connection
        // an get the `connected_account` for this example
        if let Ok(connected_account) = global_state.active_connection.borrow().connected_account(){}
    }
}
```
{{#endtab }}
{{#endtabs }}

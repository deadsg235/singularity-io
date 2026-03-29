# The Cluster Storage

This stores the active cluster and registered clusters. It also allows a user to define a custom cluster with a custom name and endpoint.

## Definition

{{#tabs }}
{{#tab name="Dioxus" }}
```rust,no_run
use dioxus::prelude::*;
use crate::{AdapterCluster, ClusterStore};

pub(crate) static CLUSTER_STORAGE: GlobalSignal<ClusterStore> =
    Signal::global(|| ClusterStore::new(Vec::default()));

#[component]
pub(crate) fn App() -> Element {
    // Default clusters are defined here
    let clusters = vec![
        AdapterCluster::devnet(),
        AdapterCluster::mainnet(),
        AdapterCluster::testnet(),
        AdapterCluster::localnet(),
    ];

    // Default clusters are added here
    if CLUSTER_STORAGE.write().add_clusters(clusters).is_err() {}
}
```
{{#endtab }}

{{#tab name="Sycamore" }}
```rust,no_run
use sycamore::prelude::*;
use crate::{AdapterCluster, ClusterStore};

#[component]
fn App() -> View {
    // The store is initialized 
	let mut cluster_storage = ClusterStore::default();
    // Default clusters are created here
	let clusters = vec![
        AdapterCluster::devnet(),
        AdapterCluster::mainnet(),
        AdapterCluster::testnet(),
        AdapterCluster::localnet(),
    ];
    
    // Now the default clusters are added to the storage
	if cluster_storage.add_clusters(clusters).is_err() {}

	// The clusters are exposed to the global state here
    provide_context(create_signal(cluster_storage));
    
}
```
{{#endtab }}

{{#tab name="Yew" }}
```rust,no_run
use yew::{platform::spawn_local, prelude::*};
use yew_router::prelude::*;

use crate::{ClusterStore, ClusterStoreState};

#[function_component(App)]
pub fn app() -> Html {
    //.. 
    let cluster_store_state = use_reducer(|| ClusterStore::new());
   //..
    html! {
        <ContextProvider<GlobalAppState> context={global_state.clone()}>
            <ContextProvider<ClusterStoreState> context={cluster_store_state.clone()}>
                // Any components within this element can access the `cluster_store_state`
            </ContextProvider<ClusterStoreState>>
        </ContextProvider<GlobalAppState>>
    }
}
```
{{#endtab }}
{{#endtabs }}

### Accessing the ClusterStore state

Note that the Cluster name is a unique identifier which the `Cluster` type (also known as the network) is defined by the wallet-standard for Solana as one of these values: `solana:mainnet`, `solana:testnet`, `solana:devnet` and `solana:localnet`. Note that the name (unique identifier) of the cluster is a case-sensitive String so no two clusters have the same name.

{{#tabs }}
{{#tab name="Dioxus" }}
```rust,no_run
use crate::CLUSTER_STORAGE;

#[component]
fn MyComponent {
    // Get the active cluster name
    CLUSTER_STORAGE.read().active_cluster().name();
    
    // Get the active cluster endpoint
    CLUSTER_STORAGE.read().active_cluster().endpoint();
    
    // Get the active cluster
    CLUSTER_STORAGE.read().active_cluster().cluster();
    
    // Get all the clusters
    CLUSTER_STORAGE.read().get_clusters();
    
    // Get a cluster or check if the cluster exists.
    CLUSTER_STORAGE.read().get_cluster("mainnet");
}
```
{{#endtab }}

{{#tab name="Sycamore" }}
```rust,no_run
use sycamore::prelude::*;
use crate::ClusterStore;

#[component]
fn MyComponent() -> View {
    let cluster_storage = use_context::<Signal<ClusterStore>>();
    
    // Get the active cluster name
    cluster_storage.get_clone().active_cluster().name();
    
    // Get the active cluster endpoint
    cluster_storage.get_clone().active_cluster().endpoint();
    
    // Get the active cluster
    cluster_storage.get_clone().active_cluster().cluster();
    
    // Get all the clusters
    cluster_storage.get_clone().get_clusters();
    
    // Get a cluster or check if the cluster exists.
    cluster_storage.get_clone().get_cluster("mainnet");
}
```
{{#endtab }}

{{#tab name="Yew" }}
```rust,no_run
use wallet_adapter::Cluster;
use yew::prelude::*;

use crate::ClusterStoreState;

#[function_component]
pub fn Clusters() -> Html {
    let cluster_store_state =
        use_context::<ClusterStoreState>().expect("no global ctx `ClusterStoreState` found");
    
     // Get the active cluster name
    cluster_store_state.active_cluster().name();
    
    // Get the active cluster endpoint
    cluster_store_state.active_cluster().endpoint();
    
    // Get the active cluster
    cluster_store_state.active_cluster().cluster();
    
    // Get all the clusters
    cluster_store_state.get_clusters();
    
    // Get a cluster or check if the cluster exists.
    cluster_store_state.get_cluster("mainnet");    
}
```
{{#endtab }}
{{#endtabs }}

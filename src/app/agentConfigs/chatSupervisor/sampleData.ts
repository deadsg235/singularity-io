export const exampleAccountInfo = {
  account_id: "CUST-001",
  name: "Alex Johnson",
  tier: "Gold",
  email: "alex.johnson@example.com",
  phone_number: "(555) 867-5309",
  outstandingBalanceUsd: 0,
  recentOrders: [
    { orderId: "ORD-9042", status: "Delivered", totalUsd: 129.95 },
    { orderId: "ORD-9028", status: "Delivered", totalUsd: 89.49 },
  ],
};

export const examplePolicyDocs = [
  {
    title: "Return & Exchange Policy",
    summary:
      "Customers have 30 days from the delivery date to request returns or exchanges. Items must be unused and in original packaging.",
    link: "https://docs.dexter.cash/policies/return-exchange",
  },
  {
    title: "Extended Warranty Program",
    summary:
      "Extended coverage can be purchased within 14 days of delivery and adds 12 months of hardware protection on eligible products.",
    link: "https://docs.dexter.cash/policies/extended-warranty",
  },
];

export const exampleStoreLocations = [
  {
    name: "Dexter Flagship - Midtown",
    address: "1400 Market Street, San Francisco, CA 94102",
    phone: "(415) 555-0140",
    hours: "Mon–Sat 10a–8p, Sun 11a–6p",
    distanceMiles: 2.1,
  },
  {
    name: "Dexter Outlet - Emeryville",
    address: "5800 Christie Ave, Emeryville, CA 94608",
    phone: "(510) 555-0234",
    hours: "Mon–Sun 10a–7p",
    distanceMiles: 8.4,
  },
];
